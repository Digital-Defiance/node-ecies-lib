import { ECIESError, ECIESErrorTypeEnum, EciesEncryptionTypeEnum, IECIESConfig } from '@digitaldefiance/ecies-lib';
import { EciesSingleRecipientCore } from '../src/services/ecies/single-recipient';
import { getNodeRuntimeConfiguration } from '../src/constants';
import { randomBytes } from 'crypto';
import { withConsoleMocks } from './support/console';

describe('EciesSingleRecipientCore - Coverage Tests', () => {
  let singleRecipient: EciesSingleRecipientCore;
  let config: IECIESConfig;
  let privateKey: Buffer;
  let publicKey: Buffer;

  beforeEach(() => {
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
    
    // Generate test keys
    const { createECDH } = require('crypto');
    const ecdh = createECDH(config.curveName);
    ecdh.generateKeys();
    privateKey = ecdh.getPrivateKey();
    publicKey = ecdh.getPublicKey();
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
      expect(() => singleRecipient.getHeaderSize('invalid' as any)).toThrow(ECIESError);
      expect(() => singleRecipient.getHeaderSize('invalid' as any)).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptionType })
      );
    });
  });

  describe('encrypt', () => {
    it('should throw error for message exceeding max size', () => {
      const hugeMessage = Buffer.alloc(0xFFFFFFFF + 1);
      expect(() => singleRecipient.encrypt(false, publicKey, hugeMessage)).toThrow();
    });

    it('should throw error for invalid recipient public key', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const invalidKey = Buffer.from('invalid');
        expect(() => singleRecipient.encrypt(false, invalidKey, message)).toThrow(ECIESError);
      });
    });

    it('should handle secret computation failure with ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const badKey = randomBytes(65);
        badKey[0] = 0x04; // Set prefix but use random data
        expect(() => singleRecipient.encrypt(false, badKey, message)).toThrow(ECIESError);
      });
    });
  });

  describe('parseEncryptedMessage', () => {
    it('should throw error for encryption type mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      
      expect(() => singleRecipient.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Simple,
        encrypted,
        0
      )).toThrow(ECIESError);
      expect(() => singleRecipient.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Simple,
        encrypted,
        0
      )).toThrow(expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptionType }));
    });

    it('should throw error for multiple encryption type', () => {
      const data = Buffer.alloc(200);
      data.writeUInt8(EciesEncryptionTypeEnum.Multiple, 0);
      
      expect(() => singleRecipient.parseEncryptedMessage(undefined, data, 0)).toThrow(ECIESError);
    });

    it('should throw error for too short data', () => {
      const tooShort = Buffer.alloc(10);
      tooShort.writeUInt8(EciesEncryptionTypeEnum.Single, 0);
      
      expect(() => singleRecipient.parseEncryptedMessage(undefined, tooShort, 0)).toThrow(ECIESError);
      expect(() => singleRecipient.parseEncryptedMessage(undefined, tooShort, 0)).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptedDataLength })
      );
    });

    it('should throw error for data length mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      
      expect(() => singleRecipient.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        encrypted,
        0,
        { dataLength: 999999 }
      )).toThrow(ECIESError);
    });

    it('should throw error for invalid ephemeral public key length', () => {
      const data = Buffer.alloc(200);
      data.writeUInt8(EciesEncryptionTypeEnum.Single, 0);
      // Write invalid key (wrong length)
      const invalidKey = Buffer.alloc(32);
      invalidKey.copy(data, 1);
      
      expect(() => singleRecipient.parseEncryptedMessage(undefined, data, 0)).toThrow(ECIESError);
    });

    it('should throw error for invalid IV length', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      // Corrupt IV section
      const corrupted = Buffer.from(encrypted);
      corrupted.fill(0, 66, 70); // Corrupt part of IV
      
      // This will fail during decryption, not parsing
      expect(() => singleRecipient.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        privateKey,
        corrupted
      )).toThrow();
    });

    it('should throw error for encrypted data length mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      // Truncate the encrypted data
      const truncated = encrypted.subarray(0, encrypted.length - 5);
      
      expect(() => singleRecipient.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        truncated,
        0
      )).toThrow(ECIESError);
    });
  });

  describe('decryptWithHeader', () => {
    it('should throw error for encryption type mismatch', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(true, publicKey, message);
      
      expect(() => singleRecipient.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        privateKey,
        encrypted
      )).toThrow(ECIESError);
    });

    it('should handle decryption failure gracefully', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      const wrongKey = randomBytes(32);
      
      expect(() => singleRecipient.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        wrongKey,
        encrypted
      )).toThrow(ECIESError);
      expect(() => singleRecipient.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        wrongKey,
        encrypted
      )).toThrow(expect.objectContaining({ type: ECIESErrorTypeEnum.DecryptionFailed }));
    });
  });

  describe('decryptWithHeaderEx', () => {
    it('should return decrypted data and consumed bytes', () => {
      const message = Buffer.from('test message');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      
      const result = singleRecipient.decryptWithHeaderEx(
        EciesEncryptionTypeEnum.Single,
        privateKey,
        encrypted
      );
      
      expect(result.decrypted).toEqual(message);
      expect(result.consumedBytes).toBeGreaterThan(0);
    });

    it('should handle decryption errors', () => {
      const message = Buffer.from('test');
      const encrypted = singleRecipient.encrypt(false, publicKey, message);
      const wrongKey = randomBytes(32);
      
      expect(() => singleRecipient.decryptWithHeaderEx(
        EciesEncryptionTypeEnum.Single,
        wrongKey,
        encrypted
      )).toThrow(ECIESError);
    });
  });

  describe('decryptWithComponents', () => {
    it('should throw error for invalid auth tag length', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted
        );
        
        const invalidAuthTag = Buffer.alloc(8); // Wrong length
        
        expect(() => singleRecipient.decryptWithComponents(
          privateKey,
          header.ephemeralPublicKey,
          header.iv,
          invalidAuthTag,
          data
        )).toThrow(ECIESError);
      });
    });

    it('should throw error for invalid IV length', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted
        );
        
        const invalidIV = Buffer.alloc(8); // Wrong length
        
        expect(() => singleRecipient.decryptWithComponents(
          privateKey,
          header.ephemeralPublicKey,
          invalidIV,
          header.authTag,
          data
        )).toThrow(ECIESError);
      });
    });

    it('should throw error for empty encrypted data', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted
        );
        
        const emptyData = Buffer.alloc(0);
        
        expect(() => singleRecipient.decryptWithComponents(
          privateKey,
          header.ephemeralPublicKey,
          header.iv,
          header.authTag,
          emptyData
        )).toThrow(ECIESError);
      });
    });

    it('should throw error for shared secret computation failure', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');
        const encrypted = singleRecipient.encrypt(false, publicKey, message);
        const { header, data } = singleRecipient.parseEncryptedMessage(
          EciesEncryptionTypeEnum.Single,
          encrypted
        );
        
        const wrongKey = randomBytes(32);
        
        expect(() => singleRecipient.decryptWithComponents(
          wrongKey,
          header.ephemeralPublicKey,
          header.iv,
          header.authTag,
          data
        )).toThrow(ECIESError);
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
        
        expect(() => singleRecipient.decryptWithComponents(
          invalidPrivateKey,
          invalidPublicKey,
          iv,
          authTag,
          data
        )).toThrow(ECIESError);
      });
    });
  });
});
