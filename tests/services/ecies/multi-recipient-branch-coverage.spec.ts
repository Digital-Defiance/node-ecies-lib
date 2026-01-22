/**
 * Comprehensive Branch Coverage Tests for Node ECIES Multi-Recipient
 * Addresses: 35.84% branch coverage in multi-recipient.ts
 */

import { randomBytes } from 'crypto';

import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';

import { Constants } from '../../../src/constants';
import { BufferIdProvider } from '../../../src/lib/id-providers/buffer-provider';
import { EciesCryptoCore } from '../../../src/services/ecies/crypto-core';
import { EciesMultiRecipient } from '../../../src/services/ecies/multi-recipient';

describe('Node ECIES Multi-Recipient - Branch Coverage', () => {
  let multiRecipient: EciesMultiRecipient<Buffer>;
  let cryptoCore: EciesCryptoCore;
  let idProvider: BufferIdProvider;
  let config: IECIESConfig;
  let keyPair1: { privateKey: Buffer; publicKey: Buffer };
  let keyPair2: { privateKey: Buffer; publicKey: Buffer };

  beforeAll(async () => {
    config = {
      curveName: Constants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: Constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: Constants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: Constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: Constants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: Constants.ECIES.SYMMETRIC.MODE,
    };
    cryptoCore = new EciesCryptoCore(config);
    idProvider = new BufferIdProvider(
      Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE,
    );
    multiRecipient = new EciesMultiRecipient(
      Constants,
      Constants.ECIES_CONFIG,
      cryptoCore.consts,
      idProvider,
    );

    const kp1 = await cryptoCore.generateEphemeralKeyPair();
    const kp2 = await cryptoCore.generateEphemeralKeyPair();

    keyPair1 = {
      privateKey: Buffer.from(kp1.privateKey),
      publicKey: Buffer.from(kp1.publicKey),
    };
    keyPair2 = {
      privateKey: Buffer.from(kp2.privateKey),
      publicKey: Buffer.from(kp2.publicKey),
    };
  });

  describe('Error Path Coverage', () => {
    it('should handle invalid encrypted key length in decryptKey', async () => {
      const invalidKey = Buffer.alloc(20); // Too short
      const ephemeralPublicKey = Buffer.alloc(33);
      expect(() =>
        multiRecipient.decryptKey(
          keyPair1.privateKey,
          invalidKey,
          ephemeralPublicKey,
        ),
      ).toThrow();
    });

    it('should handle decryption failure with wrong private key', async () => {
      const symmetricKey = randomBytes(32);
      const ephemeralKeyPair = await cryptoCore.generateEphemeralKeyPair();
      const encryptedKey = multiRecipient.encryptKey(
        keyPair1.publicKey,
        symmetricKey,
        Buffer.from(ephemeralKeyPair.privateKey),
      );

      // Try to decrypt with wrong key
      expect(() =>
        multiRecipient.decryptKey(
          keyPair2.privateKey,
          encryptedKey,
          Buffer.from(ephemeralKeyPair.publicKey),
        ),
      ).toThrow();
    });

    it('should handle too many recipients in encryptMultiple', async () => {
      const message = Buffer.from('test');
      const recipients = [];

      // Create more recipients than allowed
      for (let i = 0; i < Constants.ECIES.MULTIPLE.MAX_RECIPIENTS + 1; i++) {
        recipients.push({
          id: idProvider.generate(),
          publicKey: keyPair1.publicKey,
        });
      }

      expect(() =>
        multiRecipient.encryptMultiple(recipients, message),
      ).toThrow();
    });

    it('should handle empty recipients array', async () => {
      const message = Buffer.from('test');
      const recipients: any[] = [];

      expect(() =>
        multiRecipient.encryptMultiple(recipients, message),
      ).toThrow();
    });

    it('should handle invalid recipient ID size', async () => {
      const message = Buffer.from('test');
      const recipients = [
        {
          id: Buffer.alloc(8), // Wrong size
          publicKey: keyPair1.publicKey,
        },
      ];

      expect(() =>
        multiRecipient.encryptMultiple(recipients, message),
      ).toThrow();
    });

    it('should handle recipient not found in decryptMultipleForRecipient', async () => {
      const message = Buffer.from('test');
      const recipient = {
        id: idProvider.generate(),
        publicKey: keyPair1.publicKey,
      };

      const encrypted = await multiRecipient.encryptMultiple(
        [recipient],
        message,
      );

      // Try to decrypt with a different recipient ID
      const wrongRecipientId = idProvider.generate();
      expect(() =>
        multiRecipient.decryptMultipleECIEForRecipient(
          encrypted.encryptedMessage,
          encrypted.recipientIds,
          encrypted.recipientKeys,
          encrypted.ephemeralPublicKey || Buffer.alloc(33),
          wrongRecipientId,
          keyPair1.privateKey,
        ),
      ).toThrow();
    });
  });

  describe('Edge Case Coverage', () => {
    it('should handle maximum message size', async () => {
      const maxSize = Constants.ECIES.MULTIPLE.MAX_DATA_SIZE;
      const message = Buffer.alloc(maxSize);
      const recipient = {
        id: idProvider.generate(),
        publicKey: keyPair1.publicKey,
      };

      const encrypted = await multiRecipient.encryptMultiple(
        [recipient],
        message,
      );
      expect(encrypted.dataLength).toBe(maxSize);

      const decrypted = await multiRecipient.decryptMultipleECIEForRecipient(
        encrypted.encryptedMessage,
        encrypted.recipientIds,
        encrypted.recipientKeys,
        encrypted.ephemeralPublicKey || Buffer.alloc(33),
        recipient.id,
        keyPair1.privateKey,
      );
      expect(decrypted).toEqual(message);
    });

    it('should handle minimum message size (empty)', async () => {
      const message = Buffer.alloc(0);
      const recipient = {
        id: idProvider.generate(),
        publicKey: keyPair1.publicKey,
      };

      const encrypted = await multiRecipient.encryptMultiple(
        [recipient],
        message,
      );
      expect(encrypted.dataLength).toBe(0);

      const decrypted = await multiRecipient.decryptMultipleECIEForRecipient(
        encrypted.encryptedMessage,
        encrypted.recipientIds,
        encrypted.recipientKeys,
        encrypted.ephemeralPublicKey || Buffer.alloc(33),
        recipient.id,
        keyPair1.privateKey,
      );
      expect(decrypted.length).toBe(0);
    });

    it('should handle maximum recipients', async () => {
      const message = Buffer.from('test');
      const recipients = [];

      for (let i = 0; i < Constants.ECIES.MULTIPLE.MAX_RECIPIENTS; i++) {
        recipients.push({
          id: idProvider.generate(),
          publicKey: keyPair1.publicKey,
        });
      }

      const encrypted = await multiRecipient.encryptMultiple(
        recipients,
        message,
      );
      expect(encrypted.recipientCount).toBe(
        Constants.ECIES.MULTIPLE.MAX_RECIPIENTS,
      );
    });

    it('should handle duplicate recipient IDs', async () => {
      const message = Buffer.from('test');
      const sameId = idProvider.generate();
      const recipients = [
        { id: sameId, publicKey: keyPair1.publicKey },
        { id: sameId, publicKey: keyPair2.publicKey },
      ];

      const encrypted = await multiRecipient.encryptMultiple(
        recipients,
        message,
      );
      expect(encrypted.recipientCount).toBe(2);
    });

    it('should handle malformed public keys', async () => {
      const message = Buffer.from('test');
      const invalidPublicKey = Buffer.alloc(10); // Too short
      const recipients = [
        {
          id: idProvider.generate(),
          publicKey: invalidPublicKey,
        },
      ];

      expect(() =>
        multiRecipient.encryptMultiple(recipients, message),
      ).toThrow();
    });
  });

  describe('Boundary Condition Coverage', () => {
    it('should handle ID at exact byte boundaries', async () => {
      const message = Buffer.from('boundary test');
      const recipient = {
        id: idProvider.generate(),
        publicKey: keyPair1.publicKey,
      };

      const encrypted = await multiRecipient.encryptMultiple(
        [recipient],
        message,
      );
      const decrypted = await multiRecipient.decryptMultipleECIEForRecipient(
        encrypted.encryptedMessage,
        encrypted.recipientIds,
        encrypted.recipientKeys,
        encrypted.ephemeralPublicKey || Buffer.alloc(33),
        recipient.id,
        keyPair1.privateKey,
      );

      expect(decrypted).toEqual(message);
    });

    it('should handle header size calculations correctly', () => {
      const recipientCounts = [1, 2, 5, 10];

      for (const count of recipientCounts) {
        const headerSize = multiRecipient.getHeaderSize(count);
        expect(headerSize).toBeGreaterThan(0);
        // Header size should account for version, cipher suite, public key, data length, recipient count
        // Plus recipient ID and encrypted key for each recipient
        const expectedMinSize =
          Constants.ECIES.VERSION_SIZE +
          Constants.ECIES.CIPHER_SUITE_SIZE +
          Constants.ECIES.ENCRYPTION_TYPE_SIZE +
          Constants.ECIES.PUBLIC_KEY_LENGTH +
          Constants.ECIES.MULTIPLE.DATA_LENGTH_SIZE +
          Constants.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE;
        expect(headerSize).toBeGreaterThanOrEqual(expectedMinSize);
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle rapid encrypt/decrypt cycles', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('rapid test');
        const recipients = [
          { id: Buffer.alloc(12, 1), publicKey: keyPair1.publicKey },
        ];

        const cycles = 100;
        const startTime = Date.now();

        for (let i = 0; i < cycles; i++) {
          const encrypted = await multiRecipient.encryptMultiple(
            recipients,
            message,
          );
          const decrypted =
            await multiRecipient.decryptMultipleECIEForRecipient(
              encrypted.encryptedMessage,
              encrypted.recipientIds,
              encrypted.recipientKeys,
              encrypted.ephemeralPublicKey || Buffer.alloc(33),
              recipients[0].id,
              keyPair1.privateKey,
            );

          expect(decrypted).toEqual(message);
        }

        const duration = Date.now() - startTime;
        console.log(`${cycles} cycles completed in ${duration}ms`);

        // Should complete reasonably quickly
        expect(duration).toBeLessThan(30000); // 30 seconds
      });
    }, 35000);

    it('should handle memory pressure during large operations', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const largeMessage = Buffer.alloc(1024 * 1024, 0xaa); // 1MB
        const recipients = Array.from({ length: 10 }, (_, i) => ({
          id: Buffer.alloc(12, i),
          publicKey: keyPair1.publicKey,
        }));

        const initialMemory = process.memoryUsage().heapUsed;

        const encrypted = await multiRecipient.encryptMultiple(
          recipients,
          largeMessage,
        );

        const afterEncryptMemory = process.memoryUsage().heapUsed;

        // Decrypt for all recipients
        for (const recipient of recipients) {
          const decrypted =
            await multiRecipient.decryptMultipleECIEForRecipient(
              encrypted.encryptedMessage,
              encrypted.recipientIds,
              encrypted.recipientKeys,
              encrypted.ephemeralPublicKey || Buffer.alloc(33),
              recipient.id,
              keyPair1.privateKey,
            );
          expect(decrypted).toEqual(largeMessage);
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        console.log(
          `Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`,
        );

        // Memory increase should be reasonable while allowing GC slack
        expect(memoryIncrease).toBeLessThan(1500 * 1024 * 1024); // Less than 1.5GB
      });
    }, 30000);
  });

  describe('Error Recovery Coverage', () => {
    it('should handle partial encryption failures gracefully', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('test');

        // Mix valid and invalid recipients
        const recipients = [
          { id: Buffer.alloc(12, 1), publicKey: keyPair1.publicKey }, // Valid
          { id: Buffer.alloc(12, 2), publicKey: Buffer.alloc(33, 0xff) }, // Invalid key
        ];

        // Should fail due to invalid recipient
        expect(() =>
          multiRecipient.encryptMultiple(recipients, message),
        ).toThrow();
      });
    });

    it('should handle corrupted encrypted data', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('corruption test');
        const recipients = [
          { id: Buffer.alloc(12, 1), publicKey: keyPair1.publicKey },
        ];

        const encrypted = await multiRecipient.encryptMultiple(
          recipients,
          message,
        );

        // Corrupt the encrypted message
        const corrupted = { ...encrypted };
        corrupted.encryptedMessage = Buffer.from(encrypted.encryptedMessage);
        corrupted.encryptedMessage[0] ^= 0xff; // Flip bits

        expect(() =>
          multiRecipient.decryptMultipleECIEForRecipient(
            corrupted.encryptedMessage,
            corrupted.recipientIds,
            corrupted.recipientKeys,
            corrupted.ephemeralPublicKey || Buffer.alloc(33),
            recipients[0].id,
            keyPair1.privateKey,
          ),
        ).toThrow();
      });
    });

    it('should handle corrupted recipient keys', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const message = Buffer.from('key corruption test');
        const recipients = [
          { id: Buffer.alloc(12, 1), publicKey: keyPair1.publicKey },
        ];

        const encrypted = await multiRecipient.encryptMultiple(
          recipients,
          message,
        );

        // Corrupt a recipient key
        const corrupted = { ...encrypted };
        corrupted.recipientKeys = [...encrypted.recipientKeys];
        corrupted.recipientKeys[0] = Buffer.from(encrypted.recipientKeys[0]);
        corrupted.recipientKeys[0][0] ^= 0xff; // Flip bits

        expect(() =>
          multiRecipient.decryptMultipleECIEForRecipient(
            corrupted.encryptedMessage,
            corrupted.recipientIds,
            corrupted.recipientKeys,
            corrupted.ephemeralPublicKey || Buffer.alloc(33),
            recipients[0].id,
            keyPair1.privateKey,
          ),
        ).toThrow();
      });
    });
  });
});
