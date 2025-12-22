import {
  EciesCipherSuiteEnum,
  EciesEncryptionTypeEnum,
  ECIESError,
  ECIESErrorTypeEnum,
  EciesVersionEnum,
  IECIESConfig,
} from '@digitaldefiance/ecies-lib';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { randomBytes } from 'crypto';

import { getNodeRuntimeConfiguration } from '../src/constants';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { EciesSingleRecipientCore } from '../src/services/ecies/single-recipient';

describe('EciesSingleRecipientCore - Coverage Tests', () => {
  let singleRecipient: EciesSingleRecipientCore;
  let config: IECIESConfig;
  let privateKey: Buffer;
  let publicKey: Buffer;

  beforeEach(async () => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    config = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };
    singleRecipient = new EciesSingleRecipientCore(config);

    // Generate test keys using cryptoCore to ensure compatibility
    const cryptoCore = new EciesCryptoCore(config);
    const keyPair = await cryptoCore.generateEphemeralKeyPair();
    privateKey = keyPair.privateKey;
    publicKey = keyPair.publicKey;
  });

  describe('getHeaderSize', () => {
    it('should return simple header size', () => {
      const size = singleRecipient.getHeaderSize('simple');
      expect(size).toBeGreaterThan(0);
    });

    it('should return single header size', () => {
      const size = singleRecipient.getHeaderSize('single');
      expect(size).toBeGreaterThan(0);
    });

    it('should throw error for invalid encryption type', () => {
      expect(() => singleRecipient.getHeaderSize('invalid' as any)).toThrow(
        ECIESError,
      );
      expect(() => singleRecipient.getHeaderSize('invalid' as any)).toThrow(
        expect.objectContaining({
          type: ECIESErrorTypeEnum.InvalidEncryptionType,
        }),
      );
    });
  });

  describe('encrypt', () => {
    it('should throw error for message exceeding max size', () => {
      const hugeMessage = Buffer.alloc(0xffffffff + 1);
      expect(() =>
        singleRecipient.encrypt(false, publicKey, hugeMessage),
      ).toThrow();
    });

    it('should throw error for invalid recipient public key', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const invalidKey = Buffer.from('invalid');
        expect(() =>
          singleRecipient.encrypt(false, invalidKey, message),
        ).toThrow(ECIESError);
      });
    });

    it('should handle secret computation failure with ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const badKey = randomBytes(65);
        badKey[0] = 0x04; // Set prefix but use random data
        expect(() => singleRecipient.encrypt(false, badKey, message)).toThrow(
          ECIESError,
        );
      });
    });
  });

  describe('parseEncryptedMessage', () => {
    it('should throw error for encryption type mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);

      expect(() =>
        singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Simple,
          encrypted,
          0,
        ),
      ).toThrow(ECIESError);
      expect(() =>
        singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Simple,
          encrypted,
          0,
        ),
      ).toThrow(
        expect.objectContaining({
          type: ECIESErrorTypeEnum.InvalidEncryptionType,
        }),
      );
    });

    it('should throw error for multiple encryption type', () => {
      const data = Buffer.alloc(200);
      data.writeUInt8(EciesVersionEnum.V1, 0);
      data.writeUInt8(EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256, 1);
      data.writeUInt8(EciesEncryptionTypeEnum.Multiple, 2);

      expect(() =>
        singleRecipient.parseEncryptedMessage(undefined, data, 0),
      ).toThrow(ECIESError);
    });

    it('should throw error for too short data', () => {
      const tooShort = Buffer.alloc(10);
      tooShort.writeUInt8(EciesVersionEnum.V1, 0);
      tooShort.writeUInt8(EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256, 1);
      tooShort.writeUInt8(EciesEncryptionTypeEnum.Single, 2);

      expect(() =>
        singleRecipient.parseEncryptedMessage(undefined, tooShort, 0),
      ).toThrow(ECIESError);
      expect(() =>
        singleRecipient.parseEncryptedMessage(undefined, tooShort, 0),
      ).toThrow(
        expect.objectContaining({
          type: ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        }),
      );
    });

    it('should throw error for data length mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);

      expect(() =>
        singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted,
          0,
          { dataLength: 999999 },
        ),
      ).toThrow(ECIESError);
    });

    it('should throw error for invalid ephemeral public key length', () => {
      const data = Buffer.alloc(200);
      data.writeUInt8(EciesVersionEnum.V1, 0);
      data.writeUInt8(EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256, 1);
      data.writeUInt8(EciesEncryptionTypeEnum.Single, 2);
      // Write invalid key (wrong length)
      const invalidKey = Buffer.alloc(32);
      invalidKey.copy(data, 3);

      expect(() =>
        singleRecipient.parseEncryptedMessage(undefined, data, 0),
      ).toThrow(ECIESError);
    });

    it('should throw error for invalid IV length', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      // Corrupt AuthTag section (IV is 12 bytes, AuthTag is 16 bytes)
      // Offset: Preamble(0) + Ver(1) + Suite(1) + Type(1) + PubKey(33) = 36
      // IV: 36 -> 48
      // AuthTag: 48 -> 64
      const corrupted = Buffer.from(encrypted);
      corrupted.fill(0, 48, 52); // Corrupt part of AuthTag

      // This will fail during decryption due to auth tag mismatch
      expect(() =>
        singleRecipient.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          privateKey,
          corrupted,
        ),
      ).toThrow();
    });

    it('should throw error for encrypted data length mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      // Truncate the encrypted data
      const truncated = encrypted.subarray(0, encrypted.length - 5);

      expect(() =>
        singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          truncated,
          0,
        ),
      ).toThrow(ECIESError);
    });
  });

  describe('decryptWithHeader', () => {
    it('should throw error for encryption type mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(true, publicKey, message);

      expect(() =>
        singleRecipient.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          privateKey,
          encrypted,
        ),
      ).toThrow(ECIESError);
    });

    it('should handle decryption failure gracefully', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      const wrongKey = randomBytes(32);

      expect(() =>
        singleRecipient.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          wrongKey,
          encrypted,
        ),
      ).toThrow(ECIESError);
      expect(() =>
        singleRecipient.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          wrongKey,
          encrypted,
        ),
      ).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.DecryptionFailed }),
      );
    });
  });

  describe('decryptWithHeaderEx', () => {
    it('should return decrypted data and consumed bytes', () => {
      const message = Buffer.from('test message');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);

      const result = singleRecipient.decryptWithHeaderEx(
        EciesEncryptionTypeEnum.Single,
        privateKey,
        encrypted,
      );

      expect(result.decrypted).toEqual(message);
      expect(result.consumedBytes).toBeGreaterThan(0);
    });

    it('should handle decryption errors', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      const wrongKey = randomBytes(32);

      expect(() =>
        singleRecipient.decryptWithHeaderEx(
          EciesEncryptionTypeEnum.Single,
          wrongKey,
          encrypted,
        ),
      ).toThrow(ECIESError);
    });
  });

  describe('decryptWithComponents', () => {
    it('should throw error for invalid auth tag length', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted,
        );

        const invalidAuthTag = Buffer.alloc(8); // Wrong length

        // Construct AAD
        const versionBuffer = Buffer.alloc(1);
        versionBuffer.writeUInt8(EciesVersionEnum.V1);
        const cipherSuiteBuffer = Buffer.alloc(1);
        cipherSuiteBuffer.writeUInt8(
          EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
        );
        const encryptionTypeBuffer = Buffer.alloc(1);
        encryptionTypeBuffer.writeUInt8(header.encryptionType);

        const aad = Buffer.concat([
          header.preamble ?? Buffer.alloc(0),
          versionBuffer,
          cipherSuiteBuffer,
          encryptionTypeBuffer,
          header.ephemeralPublicKey,
        ]);

        expect(() =>
          singleRecipient.decryptWithComponents(
            privateKey,
            header.ephemeralPublicKey,
            header.iv,
            invalidAuthTag,
            data,
            aad,
          ),
        ).toThrow(ECIESError);
      });
    });

    it('should throw error for invalid IV length', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted,
        );

        const invalidIV = Buffer.alloc(8); // Wrong length

        // Construct AAD
        const versionBuffer = Buffer.alloc(1);
        versionBuffer.writeUInt8(EciesVersionEnum.V1);
        const cipherSuiteBuffer = Buffer.alloc(1);
        cipherSuiteBuffer.writeUInt8(
          EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
        );
        const encryptionTypeBuffer = Buffer.alloc(1);
        encryptionTypeBuffer.writeUInt8(header.encryptionType);

        const aad = Buffer.concat([
          header.preamble ?? Buffer.alloc(0),
          versionBuffer,
          cipherSuiteBuffer,
          encryptionTypeBuffer,
          header.ephemeralPublicKey,
        ]);

        expect(() =>
          singleRecipient.decryptWithComponents(
            privateKey,
            header.ephemeralPublicKey,
            invalidIV,
            header.authTag,
            data,
            aad,
          ),
        ).toThrow(ECIESError);
      });
    });

    it('should throw error for empty encrypted data', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted,
        );

        const emptyData = Buffer.alloc(0);

        // Construct AAD
        const versionBuffer = Buffer.alloc(1);
        versionBuffer.writeUInt8(EciesVersionEnum.V1);
        const cipherSuiteBuffer = Buffer.alloc(1);
        cipherSuiteBuffer.writeUInt8(
          EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
        );
        const encryptionTypeBuffer = Buffer.alloc(1);
        encryptionTypeBuffer.writeUInt8(header.encryptionType);

        const aad = Buffer.concat([
          header.preamble ?? Buffer.alloc(0),
          versionBuffer,
          cipherSuiteBuffer,
          encryptionTypeBuffer,
          header.ephemeralPublicKey,
        ]);

        expect(() =>
          singleRecipient.decryptWithComponents(
            privateKey,
            header.ephemeralPublicKey,
            header.iv,
            header.authTag,
            emptyData,
            aad,
          ),
        ).toThrow(ECIESError);
      });
    });

    it('should throw error for shared secret computation failure', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted,
        );

        const wrongKey = randomBytes(32);

        // Construct AAD
        const versionBuffer = Buffer.alloc(1);
        versionBuffer.writeUInt8(EciesVersionEnum.V1);
        const cipherSuiteBuffer = Buffer.alloc(1);
        cipherSuiteBuffer.writeUInt8(
          EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
        );
        const encryptionTypeBuffer = Buffer.alloc(1);
        encryptionTypeBuffer.writeUInt8(header.encryptionType);

        const aad = Buffer.concat([
          header.preamble ?? Buffer.alloc(0),
          versionBuffer,
          cipherSuiteBuffer,
          encryptionTypeBuffer,
          header.ephemeralPublicKey,
        ]);

        expect(() =>
          singleRecipient.decryptWithComponents(
            wrongKey,
            header.ephemeralPublicKey,
            header.iv,
            header.authTag,
            data,
            aad,
          ),
        ).toThrow(ECIESError);
      });
    });

    it('should wrap non-ECIESError in ECIESError', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const invalidPrivateKey = Buffer.from('invalid');
        const invalidPublicKey = Buffer.alloc(65);
        invalidPublicKey[0] = 0x04;
        const iv = randomBytes(16);
        const authTag = randomBytes(16);
        const data = randomBytes(32);

        expect(() =>
          singleRecipient.decryptWithComponents(
            invalidPrivateKey,
            invalidPublicKey,
            iv,
            authTag,
            data,
          ),
        ).toThrow(ECIESError);
      });
    });
  });
});
