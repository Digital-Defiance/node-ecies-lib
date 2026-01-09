import { ECIESError } from '@digitaldefiance/ecies-lib';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';

import { Constants } from '../src/constants';
import { AESGCMService } from '../src/services/aes-gcm';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService } from '../src/services/ecies/service';
import { EncryptionStream } from '../src/services/encryption-stream';
import { MultiRecipientProcessor } from '../src/services/multi-recipient-processor';

describe('Security Fixes - Comprehensive', () => {
  let ecies: ECIESService;
  let stream: EncryptionStream;
  let publicKey: Buffer;
  let privateKey: Buffer;

  beforeEach(() => {
    ecies = new ECIESService();
    stream = new EncryptionStream(ecies);
    const mnemonic = ecies.generateNewMnemonic();
    const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  describe('AES-GCM validations', () => {
    it('should reject invalid key length', () => {
      const invalidKey = Buffer.alloc(15);
      const data = Buffer.from('test');

      expect(() => {
        ecies.aesGcmService.encrypt(data, invalidKey);
      }).toThrow();
    });

    it('should reject null data for encryption', () => {
      const key = Buffer.alloc(32);

      expect(() => {
        ecies.aesGcmService.encrypt(null as any, key);
      }).toThrow();
    });

    it('should reject undefined data for encryption', () => {
      const key = Buffer.alloc(32);

      expect(() => {
        ecies.aesGcmService.encrypt(undefined as any, key);
      }).toThrow();
    });

    it('should reject data exceeding 2GB', () => {
      const key = Buffer.alloc(32);
      const largeData = Buffer.alloc(0x7fffffff + 1);

      expect(() => {
        ecies.aesGcmService.encrypt(largeData, key);
      }).toThrow();
    });

    it('should reject invalid IV length for decryption', () => {
      const key = Buffer.alloc(32);
      const invalidIv = Buffer.alloc(15);
      const data = Buffer.from('test');

      expect(() => {
        ecies.aesGcmService.decrypt(invalidIv, data, key);
      }).toThrow();
    });
  });

  describe('ECIES key validations', () => {
    it('should reject all-zeros public key', () => {
      withConsoleMocks({ mute: true }, () => {
        const zeroKey = Buffer.alloc(65);
        zeroKey[0] = 0x04;
        const data = Buffer.from('test');

        expect(() => {
          ecies.encryptSimpleOrSingle(false, zeroKey, data);
        }).toThrow(ECIESError);
      });
    });

    it('should reject all-zeros private key', () => {
      withConsoleMocks({ mute: true }, () => {
        const zeroKey = Buffer.alloc(32);
        const data = Buffer.from('test');
        const encrypted = ecies.encryptSimpleOrSingle(false, publicKey, data);

        expect(() => {
          ecies.decryptSimpleOrSingleWithHeader(false, zeroKey, encrypted);
        }).toThrow(ECIESError);
      });
    });

    it('should reject empty message', () => {
      const emptyData = Buffer.alloc(0);

      expect(() => {
        ecies.encryptSimpleOrSingle(false, publicKey, emptyData);
      }).toThrow(ECIESError);
    });

    it('should reject message exceeding 2GB', () => {
      const largeData = Buffer.alloc(0x7fffffff + 1);

      expect(() => {
        ecies.encryptSimpleOrSingle(false, publicKey, largeData);
      }).toThrow();
    });
  });

  describe('streaming key validation', () => {
    it('should reject invalid public key (empty)', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      await expect(async () => {
        for await (const chunk of stream.encryptStream(
          source,
          Buffer.alloc(0),
        )) {
          // Should throw
        }
      }).rejects.toThrow('Invalid public key');
    });

    it('should reject invalid public key (wrong length)', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      await expect(async () => {
        for await (const chunk of stream.encryptStream(
          source,
          Buffer.alloc(32),
        )) {
          // Should throw
        }
      }).rejects.toThrow('Invalid public key');
    });

    it('should reject invalid private key (empty)', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      await expect(async () => {
        for await (const chunk of stream.decryptStream(
          source,
          Buffer.alloc(0),
        )) {
          // Should throw
        }
      }).rejects.toThrow('Invalid private key');
    });

    it('should reject invalid private key (wrong length)', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      await expect(async () => {
        for await (const chunk of stream.decryptStream(
          source,
          Buffer.alloc(33),
        )) {
          // Should throw
        }
      }).rejects.toThrow('Invalid private key');
    });
  });

  describe('buffer exhaustion protection', () => {
    it('should reject source that exceeds buffer limit', async () => {
      const maxSingleChunk = 100 * 1024 * 1024; // 100MB

      const source = (async function* () {
        yield Buffer.alloc(maxSingleChunk + 1);
      })();

      await expect(async () => {
        for await (const chunk of stream.encryptStream(source, publicKey)) {
          // Should throw
        }
      }).rejects.toThrow('Buffer overflow');
    });
  });

  describe('multi-recipient validations', () => {
    it('should reject empty recipients', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      await expect(async () => {
        for await (const chunk of stream.encryptStreamMultiple(source, [])) {
          // Should throw
        }
      }).rejects.toThrow('At least one recipient required');
    });

    it('should reject too many recipients', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      const recipients = Array.from({ length: 65536 }, (_, i) => ({
        id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
        publicKey: Buffer.alloc(65),
      }));

      await expect(async () => {
        for await (const chunk of stream.encryptStreamMultiple(
          source,
          recipients,
        )) {
          // Should throw
        }
      }).rejects.toThrow('Maximum 65535 recipients');
    });

    it('should reject invalid recipient ID length', async () => {
      const data = Buffer.from('test');
      const source = (async function* () {
        yield data;
      })();

      const recipients = [
        {
          id: Buffer.alloc(16), // Wrong length
          publicKey,
        },
      ];

      await expect(async () => {
        for await (const chunk of stream.encryptStreamMultiple(
          source,
          recipients,
        )) {
          // Should throw
        }
      }).rejects.toThrow('Invalid recipient ID');
    });
  });

  describe('Additional Security Validations', () => {
    it('should reject all-zeros public key', async () => {
      withConsoleMocks({ mute: true }, () => {
        const ecies = new ECIESService();
        const message = Buffer.from('Test');
        const zeroKey = Buffer.alloc(65);

        expect(() =>
          ecies.encryptSimpleOrSingle(false, zeroKey, message),
        ).toThrow();
      });
    });

    it('should reject all-zeros private key', async () => {
      withConsoleMocks({ mute: true }, () => {
        const ecies = new ECIESService();
        const mnemonic = ecies.generateNewMnemonic();
        const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
        const encrypted = ecies.encryptSimpleOrSingle(
          false,
          keyPair.publicKey,
          Buffer.from('Test'),
        );
        const zeroKey = Buffer.alloc(32);

        expect(() =>
          ecies.decryptSimpleOrSingleWithHeader(false, zeroKey, encrypted),
        ).toThrow();
      });
    });

    it('should validate IV length strictly', () => {
      const aesGcm = new AESGCMService();
      const key = Buffer.alloc(32);
      const data = Buffer.from('Test');

      const shortIV = Buffer.alloc(12);
      expect(() => aesGcm.decrypt(shortIV, data, key, false)).toThrow();

      const longIV = Buffer.alloc(20);
      expect(() => aesGcm.decrypt(longIV, data, key, false)).toThrow();
    });

    it('should validate key length strictly', () => {
      const aesGcm = new AESGCMService();
      const iv = Buffer.alloc(16);
      const data = Buffer.from('Test');

      const invalidKey = Buffer.alloc(31);
      expect(() => aesGcm.encrypt(data, invalidKey, false)).toThrow();
    });

    it('should reject null/undefined data', () => {
      const aesGcm = new AESGCMService();
      const key = Buffer.alloc(32);

      expect(() => aesGcm.encrypt(null as any, key, false)).toThrow();
      expect(() => aesGcm.encrypt(undefined as any, key, false)).toThrow();
    });

    it('should validate encrypted size bounds', async () => {
      const ecies = new ECIESService();
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from('Test');

      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message,
      );
      expect(encrypted.length).toBeLessThan(message.length + 1024);
    });

    it('should validate decrypted data is not empty', async () => {
      const ecies = new ECIESService();
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from('Test');

      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message,
      );
      const decrypted = ecies.decryptSimpleOrSingleWithHeader(
        false,
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted.length).toBeGreaterThan(0);
    });

    it('should validate component extraction', async () => {
      const ecies = new ECIESService();
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from('Test');

      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message,
      );

      // Truncate to invalid size
      const truncated = encrypted.subarray(0, 50);
      expect(() =>
        ecies.decryptSimpleOrSingleWithHeader(
          false,
          keyPair.privateKey,
          truncated,
        ),
      ).toThrow();
    });

    it('should validate shared secret is not all zeros', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      const sharedSecret = await cryptoCore.computeSharedSecret(
        Buffer.from(keyPair.privateKey),
        Buffer.from(keyPair.publicKey),
      );

      const allZeros = sharedSecret.every((byte) => byte === 0);
      expect(allZeros).toBe(false);
    });

    it('should validate data size limits', async () => {
      const ecies = new ECIESService();
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);

      const tooLarge = Buffer.alloc(0x80000000);
      expect(() =>
        ecies.encryptSimpleOrSingle(false, keyPair.publicKey, tooLarge),
      ).toThrow();
    });

    it('should validate minimum encrypted data size', async () => {
      const ecies = new ECIESService();
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);

      const tooSmall = Buffer.alloc(10);
      expect(() =>
        ecies.decryptSimpleOrSingleWithHeader(
          false,
          keyPair.privateKey,
          tooSmall,
        ),
      ).toThrow();
    });

    it('should validate auth tag presence', () => {
      const aesGcm = new AESGCMService();
      const key = Buffer.alloc(32);
      const data = Buffer.from('Test');

      const result = aesGcm.encrypt(data, key, true);
      expect(result.tag).toBeDefined();
      expect(result.tag!.length).toBe(16);
    });

    it('should validate recipient count bounds', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const message = Buffer.from('Test');
      const recipients = [];

      // MAX_RECIPIENTS is 255, so 256 should fail
      const tooMany = Constants.ECIES.MULTIPLE.MAX_RECIPIENTS + 1;
      for (let i = 0; i < tooMany; i++) {
        const keyPair = await cryptoCore.generateEphemeralKeyPair();
        recipients.push({
          id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE, i),
          publicKey: Buffer.from(keyPair.publicKey),
        });
      }

      await expect(
        processor.encryptMultiple(recipients, message),
      ).rejects.toThrow();
    });

    it('should validate chunk index bounds', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const data = Buffer.from('Test');
      const symmetricKey = Buffer.alloc(32);
      const keyPair = await cryptoCore.generateEphemeralKeyPair();
      const recipients = [
        {
          id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      await expect(
        processor.encryptChunk(data, recipients, -1, false, symmetricKey),
      ).rejects.toThrow();

      await expect(
        processor.encryptChunk(
          data,
          recipients,
          0x100000000,
          false,
          symmetricKey,
        ),
      ).rejects.toThrow();
    });

    it('should validate encrypted key length', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const keyPair = await cryptoCore.generateEphemeralKeyPair();
      const invalidKey = Buffer.alloc(100);

      await expect(
        processor.decryptKey(Buffer.from(keyPair.privateKey), invalidKey),
      ).rejects.toThrow();
    });
  });
});
