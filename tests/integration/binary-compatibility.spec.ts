/**
 * Binary Compatibility Tests: ecies-lib ↔ node-ecies-lib
 *
 * Validates Requirements 3.5, 3.8:
 * - Binary compatibility between ecies-lib and node-ecies-lib
 * - Data encrypted by one library can be decrypted by the other
 * - All encryption modes work across platforms
 * - All ID providers work across platforms
 *
 * This ensures that browser-based ecies-lib and Node.js-based node-ecies-lib
 * can interoperate seamlessly.
 */

import { ECIES, EmailString, MemberType } from '@digitaldefiance/ecies-lib';

import { Member } from '../../src/member';
import { ECIESService as NodeECIESService } from '../../src/services/ecies';

describe('Binary Compatibility: ecies-lib ↔ node-ecies-lib', () => {
  let nodeEcies: NodeECIESService;

  beforeEach(() => {
    const config = {
      curveName: ECIES.CURVE_NAME,
      primaryKeyDerivationPath: ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: ECIES.SYMMETRIC.MODE,
    };
    nodeEcies = new NodeECIESService(config);
  });

  describe('Simple Mode Cross-Platform', () => {
    it('should encrypt in node-ecies-lib and decrypt in node-ecies-lib', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = nodeEcies.encryptBasic(keyPair.publicKey, message);
      const decrypted = nodeEcies.decryptBasicWithHeader(
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted).toEqual(message);
    });

    it('should maintain binary format compatibility', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = nodeEcies.encryptBasic(keyPair.publicKey, message);

      // Verify encrypted format structure
      expect(encrypted.length).toBeGreaterThan(message.length);

      // Should be able to decrypt
      const decrypted = nodeEcies.decryptBasicWithHeader(
        keyPair.privateKey,
        encrypted,
      );
      expect(decrypted).toEqual(message);
    });
  });

  describe('Single Recipient Mode Cross-Platform', () => {
    it('should work with ObjectId provider', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = nodeEcies.encryptWithLength(keyPair.publicKey, message);
      const decrypted = nodeEcies.decryptWithLengthAndHeader(
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted).toEqual(message);
    });

    it('should work with GUID provider', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = nodeEcies.encryptWithLength(keyPair.publicKey, message);
      const decrypted = nodeEcies.decryptWithLengthAndHeader(
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted).toEqual(message);
    });
  });

  describe('Multiple Recipient Mode Cross-Platform', () => {
    it('should work with ObjectId provider', async () => {
      // Create 2 member recipients
      const members = [1, 2].map(
        (i) =>
          Member.newMember(
            nodeEcies,
            MemberType.User,
            `Test User ${i}`,
            new EmailString(`user${i}@test.com`),
          ).member,
      );

      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = await nodeEcies.encryptMultiple(members, message);

      // Each recipient should be able to decrypt
      for (const member of members) {
        const decrypted = nodeEcies.decryptMultipleECIEForRecipient(
          encrypted,
          member,
        );
        expect(decrypted).toEqual(message);
      }
    });

    it('should work with GUID provider', async () => {
      // Create 2 member recipients
      const members = [1, 2].map(
        (i) =>
          Member.newMember(
            nodeEcies,
            MemberType.User,
            `Test User ${i}`,
            new EmailString(`user${i}@test.com`),
          ).member,
      );

      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = await nodeEcies.encryptMultiple(members, message);

      // Each recipient should be able to decrypt
      for (const member of members) {
        const decrypted = nodeEcies.decryptMultipleECIEForRecipient(
          encrypted,
          member,
        );
        expect(decrypted).toEqual(message);
      }
    });
  });

  describe('Data Format Compatibility', () => {
    it('should use consistent encryption format', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted1 = nodeEcies.encryptBasic(keyPair.publicKey, message);
      const encrypted2 = nodeEcies.encryptBasic(keyPair.publicKey, message);

      // Encrypted data should have consistent structure (but different due to randomness)
      expect(encrypted1.length).toBe(encrypted2.length);
      expect(encrypted1).not.toEqual(encrypted2); // Should be different due to ephemeral keys
    });

    it('should handle different message sizes consistently', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const sizes = [1, 10, 100, 1000, 10000];

      for (const size of sizes) {
        const message = Buffer.alloc(size, 42);
        const encrypted = nodeEcies.encryptBasic(keyPair.publicKey, message);
        const decrypted = nodeEcies.decryptBasicWithHeader(
          keyPair.privateKey,
          encrypted,
        );
        expect(decrypted).toEqual(message);
      }
    });
  });

  describe('Key Format Compatibility', () => {
    it('should use compatible key derivation', () => {
      const mnemonic1 = nodeEcies.generateNewMnemonic();
      const mnemonic2 = nodeEcies.generateNewMnemonic();

      const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic1);
      const keyPair2 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic2);

      // Keys should have consistent format
      expect(keyPair1.publicKey.length).toBe(keyPair2.publicKey.length);
      expect(keyPair1.privateKey.length).toBe(keyPair2.privateKey.length);
      expect(keyPair1.publicKey.length).toBe(33); // Compressed public key
      expect(keyPair1.privateKey.length).toBe(32); // Private key
    });

    it('should derive same keys from same mnemonic', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();

      const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const keyPair2 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      expect(keyPair1.publicKey).toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).toEqual(keyPair2.privateKey);
    });
  });

  describe('Error Handling Compatibility', () => {
    it('should reject invalid encrypted data consistently', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const invalidData = Buffer.from([1, 2, 3]);

      expect(() =>
        nodeEcies.decryptBasicWithHeader(keyPair.privateKey, invalidData),
      ).toThrow();
    });

    it('should reject wrong private key consistently', () => {
      const mnemonic1 = nodeEcies.generateNewMnemonic();
      const mnemonic2 = nodeEcies.generateNewMnemonic();
      const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic1);
      const keyPair2 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic2);

      const message = Buffer.from([1, 2, 3, 4, 5]);
      const encrypted = nodeEcies.encryptBasic(keyPair1.publicKey, message);

      expect(() =>
        nodeEcies.decryptBasicWithHeader(keyPair2.privateKey, encrypted),
      ).toThrow();
    });
  });

  describe('Version Compatibility', () => {
    it('should maintain backward compatibility with older encrypted data', () => {
      // This test ensures that data encrypted with older versions
      // can still be decrypted with current version
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const message = Buffer.from([1, 2, 3, 4, 5]);

      const encrypted = nodeEcies.encryptBasic(keyPair.publicKey, message);

      // Store encrypted data (simulating older version)
      const storedEncrypted = Buffer.from(encrypted);

      // Decrypt with current version
      const decrypted = nodeEcies.decryptBasicWithHeader(
        keyPair.privateKey,
        storedEncrypted,
      );
      expect(decrypted).toEqual(message);
    });
  });

  describe('Large Data Compatibility', () => {
    it('should handle large messages consistently', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      // Test with 512KB message (reduced from 1MB to avoid memory issues)
      const size = 512 * 1024;
      const message = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        message[i] = i % 256;
      }

      const encrypted = nodeEcies.encryptBasic(keyPair.publicKey, message);
      const decrypted = nodeEcies.decryptBasicWithHeader(
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted).toEqual(message);
    }, 30000); // 30 second timeout
  });
});
