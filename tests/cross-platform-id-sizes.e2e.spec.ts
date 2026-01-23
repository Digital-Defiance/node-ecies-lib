import {
  ObjectIdProvider,
  SecureBuffer,
} from '@digitaldefiance/ecies-lib';
import { Constants } from '@digitaldefiance/node-ecies-lib';

import { registerNodeRuntimeConfiguration } from '../src/constants';
import { IMember } from '../src/interfaces/member';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService } from '../src/services/ecies/service';
import { EncryptionStream } from '../src/services/encryption-stream';
import { MultiRecipientProcessor } from '../src/services/multi-recipient-processor';
import { GuidV4Buffer } from '../src/types/guid-versions';
import { GuidV4Provider } from '../src/lib/id-providers/guidv4-provider';

describe('Cross-Platform ID Size Compatibility', () => {
  let originalConfig: ReturnType<typeof registerNodeRuntimeConfiguration>;

  beforeEach(() => {
    // Save original config to restore later
    originalConfig = registerNodeRuntimeConfiguration('object-id-config', {
      idProvider: new ObjectIdProvider(),
    });
  });

  afterEach(() => {
    // Restore default ObjectIdProvider (12 bytes) to prevent test interference
    registerNodeRuntimeConfiguration('object-id-config', {
      idProvider: new ObjectIdProvider(),
    });
  });

  it('should support 16-byte GUIDs for multi-recipient encryption', async () => {
    // 1. Configure to use GUIDs
    const guidProvider = new GuidV4Provider();
    const config = registerNodeRuntimeConfiguration('guid-config', {
      idProvider: guidProvider,
    });

    expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);

    // Pass the full configuration to the service
    const nodeEcies = new ECIESService(config);
    const nodeStream = new EncryptionStream(
      Constants,
      Constants.ECIES_CONFIG,
      nodeEcies,
    );

    // 2. Generate keys and recipients
    const mnemonic1 = nodeEcies.generateNewMnemonic();
    const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic1);
    const id1 = guidProvider.generate(); // 16 bytes

    const recipients = [{ id: id1, publicKey: keyPair1.publicKey }];

    const data = Buffer.from('GUID Test Data');
    const source = (async function* () {
      yield data;
    })();

    // 3. Encrypt
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream.encryptStreamMultiple(
      source,
      recipients,
    )) {
      chunks.push(chunk.data);
    }

    // 4. Decrypt
    const decryptSource = (async function* () {
      for (const chunk of chunks) {
        yield chunk;
      }
    })();

    const decryptedChunks: Buffer[] = [];
    for await (const chunk of nodeStream.decryptStreamMultiple(
      decryptSource,
      id1,
      keyPair1.privateKey,
    )) {
      decryptedChunks.push(chunk);
    }

    const result = Buffer.concat(decryptedChunks);
    expect(result).toEqual(data);
  });

  it('should support 16-byte GUIDs for non-streaming Multiple mode', async () => {
    // 1. Configure to use GUIDs
    const guidProvider = new GuidV4Provider();
    const config = registerNodeRuntimeConfiguration('guid-config', {
      idProvider: guidProvider,
    });

    const fullConfig = {
      curveName: config.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: config.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: config.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: config.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: config.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: config.ECIES.SYMMETRIC.MODE,
    };

    const cryptoCore = new EciesCryptoCore(fullConfig, config.ECIES);
    // Pass guidProvider to processor
    const processor = new MultiRecipientProcessor<GuidV4Buffer>(
      Constants,
      Constants.ECIES_CONFIG,
      cryptoCore,
      guidProvider,
      config.ECIES,
    );

    const keyPair = await cryptoCore.generateEphemeralKeyPair();
    const id1 = guidProvider.generate(); // This is a GuidV4 object
    const id1Guid = guidProvider.fromBytes(id1);

    const recipients = [
      { id: id1Guid, publicKey: Buffer.from(keyPair.publicKey) },
    ];

    const message = Buffer.from('Test message');
    const encrypted = await processor.encryptMultiple(recipients, message);

    // Use decryptMultipleECIEForRecipient with proper parameters
    const member: Partial<IMember<GuidV4Buffer>> = {
      id: id1Guid, // Use the GuidV4 object for consistency
      publicKey: Buffer.from(keyPair.publicKey),
      privateKey: new SecureBuffer(Buffer.from(keyPair.privateKey)),
      idBytes: id1,
    };

    const decrypted = await processor[
      'eciesMultiRecipient'
    ].decryptMultipleECIEForRecipient(encrypted, member as IMember<GuidV4Buffer>);

    expect(decrypted).toEqual(message);
  });
});
