import { GuidV4Provider, ObjectIdProvider } from '@digitaldefiance/ecies-lib';

import { registerNodeRuntimeConfiguration } from '../src/constants';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService } from '../src/services/ecies/service';
import { EncryptionStream } from '../src/services/encryption-stream';
import { MultiRecipientProcessor } from '../src/services/multi-recipient-processor';

describe('Cross-Platform ID Size Compatibility', () => {
  beforeAll(() => {
    // Save original config to restore later if needed
  });

  afterEach(() => {
    // Restore default ObjectIdProvider (12 bytes)
    registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
  });

  it('should support 16-byte GUIDs for multi-recipient encryption', async () => {
    // 1. Configure to use GUIDs
    const config = registerNodeRuntimeConfiguration({
      idProvider: new GuidV4Provider(),
    });

    expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);

    // Pass the configuration to the service
    const nodeEcies = new ECIESService({}, config.ECIES);
    const nodeStream = new EncryptionStream(nodeEcies);

    // 2. Generate keys and recipients
    const mnemonic1 = nodeEcies.generateNewMnemonic();
    const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic1);
    const id1 = new GuidV4Provider().generate(); // 16 bytes

    const recipients = [
      { id: Buffer.from(id1), publicKey: keyPair1.publicKey },
    ];

    const data = Buffer.from('GUID Test Data');
    const source = (async function* () {
      yield data;
    })();

    // 3. Encrypt
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream.encryptStreamMultiple(
      source,
      recipients
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
      Buffer.from(id1),
      keyPair1.privateKey
    )) {
      decryptedChunks.push(chunk);
    }

    const result = Buffer.concat(decryptedChunks);
    expect(result).toEqual(data);
  });

  it('should support 16-byte GUIDs for non-streaming Multiple mode', async () => {
    // 1. Configure to use GUIDs
    const config = registerNodeRuntimeConfiguration({
      idProvider: new GuidV4Provider(),
    });

    const cryptoCore = new EciesCryptoCore(
      { curveName: 'secp256k1' },
      config.ECIES
    );
    // Pass config.ECIES to processor
    const processor = new MultiRecipientProcessor(cryptoCore, config.ECIES);

    const keyPair = await cryptoCore.generateEphemeralKeyPair();
    const id = new GuidV4Provider().generate(); // 16 bytes

    const recipients = [
      { id: Buffer.from(id), publicKey: Buffer.from(keyPair.publicKey) },
    ];

    const message = Buffer.from('Test message');
    const encrypted = await processor.encryptMultiple(recipients, message);

    // Regardless of internal structure, it should decrypt correctly.
    const decrypted = await processor.decryptMultipleForRecipient(
      encrypted,
      Buffer.from(id),
      Buffer.from(keyPair.privateKey)
    );

    expect(decrypted).toEqual(message);
  });
});
