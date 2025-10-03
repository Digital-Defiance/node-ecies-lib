import { randomBytes } from 'crypto';
import { AESGCMService } from './aes-gcm';

describe('AES-GCM E2E Integration Tests', () => {
  describe('Real-world encryption scenarios', () => {
    it('should encrypt and decrypt user credentials', () => {
      const userCredentials = JSON.stringify({
        username: 'testuser@example.com',
        password: 'SecurePassword123!',
        timestamp: Date.now()
      });
      const data = Buffer.from(userCredentials);
      const key = randomBytes(32);

      const { encrypted, iv, tag } = AESGCMService.encrypt(data, key, true);
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encrypted, tag!);
      const decrypted = AESGCMService.decrypt(iv, encryptedWithTag, key, true);
      const decryptedCredentials = decrypted.toString();

      expect(JSON.parse(decryptedCredentials)).toEqual(JSON.parse(userCredentials));
    });

    it('should handle file-like data encryption', () => {
      const fileContent = 'This is a test file content with some sensitive information.\n'.repeat(100);
      const data = Buffer.from(fileContent);
      const key = randomBytes(32);

      const { encrypted, iv, tag } = AESGCMService.encrypt(data, key, true);
      const combined = AESGCMService.combineIvTagAndEncryptedData(iv, encrypted, tag!);
      
      const { iv: extractedIv, encryptedDataWithTag } = 
        AESGCMService.splitEncryptedData(combined, true);
      
      const decrypted = AESGCMService.decrypt(extractedIv, encryptedDataWithTag, key, true);
      const decryptedContent = decrypted.toString();

      expect(decryptedContent).toBe(fileContent);
    });

    it('should work with binary data', () => {
      const binaryData = Buffer.alloc(1000);
      for (let i = 0; i < binaryData.length; i++) {
        binaryData[i] = i % 256;
      }
      
      const key = randomBytes(32);

      const { encrypted, iv, tag } = AESGCMService.encrypt(binaryData, key, true);
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encrypted, tag!);
      const decrypted = AESGCMService.decrypt(iv, encryptedWithTag, key, true);

      expect(decrypted).toEqual(binaryData);
    });
  });

  describe('Multi-user encryption scenarios', () => {
    it('should handle multiple users with different keys', () => {
      const message = 'Shared secret message';
      const data = Buffer.from(message);
      
      const user1Key = randomBytes(32);
      const user2Key = randomBytes(32);
      const user3Key = randomBytes(32);

      const user1Encrypted = AESGCMService.encrypt(data, user1Key, true);
      const user2Encrypted = AESGCMService.encrypt(data, user2Key, true);
      const user3Encrypted = AESGCMService.encrypt(data, user3Key, true);

      const user1EncryptedWithTag = AESGCMService.combineEncryptedDataAndTag(user1Encrypted.encrypted, user1Encrypted.tag!);
      const user2EncryptedWithTag = AESGCMService.combineEncryptedDataAndTag(user2Encrypted.encrypted, user2Encrypted.tag!);
      const user3EncryptedWithTag = AESGCMService.combineEncryptedDataAndTag(user3Encrypted.encrypted, user3Encrypted.tag!);

      const user1Decrypted = AESGCMService.decrypt(user1Encrypted.iv, user1EncryptedWithTag, user1Key, true);
      const user2Decrypted = AESGCMService.decrypt(user2Encrypted.iv, user2EncryptedWithTag, user2Key, true);
      const user3Decrypted = AESGCMService.decrypt(user3Encrypted.iv, user3EncryptedWithTag, user3Key, true);

      expect(user1Decrypted.toString()).toBe(message);
      expect(user2Decrypted.toString()).toBe(message);
      expect(user3Decrypted.toString()).toBe(message);

      expect(() => AESGCMService.decrypt(user1Encrypted.iv, user1EncryptedWithTag, user2Key, true)).toThrow();
    });
  });

  describe('Performance and stress tests', () => {
    it('should handle large data efficiently', () => {
      const largeData = randomBytes(64 * 1024);
      const key = randomBytes(32);

      const startTime = performance.now();
      const { encrypted, iv, tag } = AESGCMService.encrypt(largeData, key, true);
      const encryptTime = performance.now() - startTime;

      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encrypted, tag!);
      const decryptStartTime = performance.now();
      const decrypted = AESGCMService.decrypt(iv, encryptedWithTag, key, true);
      const decryptTime = performance.now() - decryptStartTime;

      expect(decrypted).toEqual(largeData);
      expect(encryptTime).toBeLessThan(1000);
      expect(decryptTime).toBeLessThan(1000);
    });
  });

  describe('Data integrity and security tests', () => {
    it('should detect tampering with encrypted data', () => {
      const sensitiveData = 'Top secret information';
      const data = Buffer.from(sensitiveData);
      const key = randomBytes(32);

      const { encrypted, iv, tag } = AESGCMService.encrypt(data, key, true);
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encrypted, tag!);
      
      const tamperedEncrypted = Buffer.from(encryptedWithTag);
      tamperedEncrypted[0] ^= 1;

      expect(() => AESGCMService.decrypt(iv, tamperedEncrypted, key, true)).toThrow();
    });

    it('should ensure IV uniqueness across multiple encryptions', () => {
      const data = Buffer.from('Test data');
      const key = randomBytes(32);
      const ivs = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const { iv } = AESGCMService.encrypt(data, key, false);
        const ivString = iv.toString('hex');
        
        expect(ivs.has(ivString)).toBe(false);
        ivs.add(ivString);
      }

      expect(ivs.size).toBe(100);
    });
  });
});