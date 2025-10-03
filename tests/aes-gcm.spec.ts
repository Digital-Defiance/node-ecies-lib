import { randomBytes } from 'crypto';
import { Constants } from '../src/constants';
import { AESGCMService } from '../src/services/aes-gcm';

describe('AESGCMService', () => {
  const testData = Buffer.from('Hello, World!');
  const key256 = randomBytes(32);

  describe('encrypt', () => {
    it('should encrypt data without auth tag', () => {
      const result = AESGCMService.encrypt(testData, key256, false);
      
      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
      expect(Buffer.isBuffer(result.iv)).toBe(true);
      expect(result.iv.length).toBe(Constants.WRAPPED_KEY.IV_SIZE);
      expect(result.tag).toBeUndefined();
    });

    it('should encrypt data with auth tag', () => {
      const result = AESGCMService.encrypt(testData, key256, true);
      
      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
      expect(Buffer.isBuffer(result.iv)).toBe(true);
      expect(Buffer.isBuffer(result.tag)).toBe(true);
      expect(result.tag!.length).toBe(16);
    });

    it('should generate different IVs', () => {
      const result1 = AESGCMService.encrypt(testData, key256, false);
      const result2 = AESGCMService.encrypt(testData, key256, false);
      
      expect(result1.iv).not.toEqual(result2.iv);
    });
  });

  describe('decrypt', () => {
    it('should decrypt data without auth tag', () => {
      const { encrypted, iv } = AESGCMService.encrypt(testData, key256, false);
      const decrypted = AESGCMService.decrypt(iv, encrypted, key256, false);
      
      expect(decrypted).toEqual(testData);
    });

    it('should decrypt data with auth tag', () => {
      const { encrypted, iv, tag } = AESGCMService.encrypt(testData, key256, true);
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(encrypted, tag!);
      const decrypted = AESGCMService.decrypt(iv, encryptedWithTag, key256, true);
      
      expect(decrypted).toEqual(testData);
    });

    it('should fail with wrong key', () => {
      const { encrypted, iv } = AESGCMService.encrypt(testData, key256, false);
      const wrongKey = randomBytes(32);
      
      expect(() => AESGCMService.decrypt(iv, encrypted, wrongKey, false)).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should combine encrypted data and tag', () => {
      const encrypted = Buffer.from([1, 2, 3]);
      const tag = Buffer.from([4, 5, 6]);
      
      const combined = AESGCMService.combineEncryptedDataAndTag(encrypted, tag);
      
      expect(combined).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
    });

    it('should split encrypted data', () => {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const encryptedWithTag = randomBytes(32);
      const combined = AESGCMService.combineIvAndEncryptedData(iv, encryptedWithTag);
      
      const { iv: splitIv, encryptedDataWithTag } = AESGCMService.splitEncryptedData(combined, false);
      
      expect(splitIv).toEqual(iv);
      expect(encryptedDataWithTag).toEqual(encryptedWithTag);
    });
  });
});