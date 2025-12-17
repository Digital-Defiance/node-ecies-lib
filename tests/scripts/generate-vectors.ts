import {
  ECIESService,
  IECIESConfig,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import * as fs from 'fs';
import * as path from 'path';

import { getNodeRuntimeConfiguration } from '../../src/constants';

describe('Generate Vectors', () => {
  it('should generate enterprise vectors', async () => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    const config: IECIESConfig = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };

    const service = new ECIESService(config);
    const mnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    );
    const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = Buffer.from(wallet.getPrivateKey()).toString('hex');
    const publicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(wallet.getPublicKey()),
    ]).toString('hex');

    const vectors = [];

    // Vector 1: Simple Text
    const textMessage = 'Hello, Enterprise Grade Security!';
    const encryptedText = await service.encryptSimpleOrSingle(
      false,
      new Uint8Array(Buffer.from(publicKey, 'hex')),
      new Uint8Array(Buffer.from(textMessage))
    );
    vectors.push({
      id: 'simple-text',
      description: 'Simple ASCII text encryption',
      input: Buffer.from(textMessage).toString('base64'),
      encrypted: Buffer.from(encryptedText).toString('base64'),
      privateKey: privateKey,
      publicKey: publicKey,
    });

    // Vector 2: Unicode
    const unicodeMessage = '🔒 安全 Security 🔒';
    const encryptedUnicode = await service.encryptSimpleOrSingle(
      false,
      new Uint8Array(Buffer.from(publicKey, 'hex')),
      new Uint8Array(Buffer.from(unicodeMessage))
    );
    vectors.push({
      id: 'unicode-text',
      description: 'Unicode text encryption',
      input: Buffer.from(unicodeMessage).toString('base64'),
      encrypted: Buffer.from(encryptedUnicode).toString('base64'),
      privateKey: privateKey,
      publicKey: publicKey,
    });

    // Vector 3: Binary Data
    const binaryMessage = Buffer.from([0x00, 0xff, 0xaa, 0x55, 0x12, 0x34]);
    const encryptedBinary = await service.encryptSimpleOrSingle(
      false,
      new Uint8Array(Buffer.from(publicKey, 'hex')),
      new Uint8Array(binaryMessage)
    );
    vectors.push({
      id: 'binary-data',
      description: 'Binary data encryption',
      input: binaryMessage.toString('base64'),
      encrypted: Buffer.from(encryptedBinary).toString('base64'),
      privateKey: privateKey,
      publicKey: publicKey,
    });

    // Vector 5: Large Data (10KB)
    const largeMessage = Buffer.alloc(1024 * 10, 'a');
    const encryptedLarge = await service.encryptSimpleOrSingle(
      false,
      new Uint8Array(Buffer.from(publicKey, 'hex')),
      new Uint8Array(largeMessage)
    );
    vectors.push({
      id: 'large-data',
      description: '10KB data encryption',
      input: largeMessage.toString('base64'),
      encrypted: Buffer.from(encryptedLarge).toString('base64'),
      privateKey: privateKey,
      publicKey: publicKey,
    });

    const outputPath = path.join(
      __dirname,
      '../fixtures/enterprise-vectors.json'
    );
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(vectors, null, 2));
    console.log(`Generated ${vectors.length} vectors to ${outputPath}`);
  });
});
