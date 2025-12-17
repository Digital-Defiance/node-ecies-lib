import { randomBytes } from 'crypto';

import { Constants } from '../src/constants';
import { AESGCMService } from '../src/services/aes-gcm';

describe('AESGCMService', () => {
  let aesGcmService: AESGCMService;
  const testData = Buffer.from('Hello, World!');
  const key256 = randomBytes(32);

  beforeEach(() => {
    aesGcmService = new AESGCMService(Constants);
  });

  describe('encrypt', () => {
    it('should encrypt data without auth tag', () => {
      const result = aesGcmService.encrypt(testData, key256, false);

      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
      expect(Buffer.isBuffer(result.iv)).toBe(true);
      expect(result.iv.length).toBe(Constants.WRAPPED_KEY.IV_SIZE);
      expect(result.tag).toBeUndefined();
    });

    it('should encrypt data with auth tag', () => {
      const result = aesGcmService.encrypt(testData, key256, true);

      expect(Buffer.isBuffer(result.encrypted)).toBe(true);
      expect(Buffer.isBuffer(result.iv)).toBe(true);
      expect(Buffer.isBuffer(result.tag)).toBe(true);
      expect(result.tag!.length).toBe(16);
    });

    it('should generate different IVs', () => {
      const result1 = aesGcmService.encrypt(testData, key256, false);
      const result2 = aesGcmService.encrypt(testData, key256, false);

      expect(result1.iv).not.toEqual(result2.iv);
    });
  });

  describe('decrypt', () => {
    it('should decrypt data without auth tag', () => {
      const { encrypted, iv } = aesGcmService.encrypt(testData, key256, false);
      const decrypted = aesGcmService.decrypt(iv, encrypted, key256, false);

      expect(decrypted).toEqual(testData);
    });

    it('should decrypt data with auth tag', () => {
      const { encrypted, iv, tag } = aesGcmService.encrypt(
        testData,
        key256,
        true
      );
      const encryptedWithTag = aesGcmService.combineEncryptedDataAndTag(
        encrypted,
        tag!
      );
      const decrypted = aesGcmService.decrypt(
        iv,
        encryptedWithTag,
        key256,
        true
      );

      expect(decrypted).toEqual(testData);
    });

    it('should fail with wrong key', () => {
      const { encrypted, iv } = aesGcmService.encrypt(testData, key256, false);
      const wrongKey = randomBytes(32);

      expect(() =>
        aesGcmService.decrypt(iv, encrypted, wrongKey, false)
      ).toThrow();
    });
  });

  describe('utility methods', () => {
    it('should combine encrypted data and tag', () => {
      const encrypted = Buffer.from([1, 2, 3]);
      const tag = Buffer.from([4, 5, 6]);

      const combined = aesGcmService.combineEncryptedDataAndTag(encrypted, tag);

      expect(combined).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
    });

    it('should combine IV and encrypted data', () => {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const encryptedData = Buffer.from([1, 2, 3]);

      const combined = aesGcmService.combineIvAndEncryptedData(
        iv,
        encryptedData
      );

      expect(combined.subarray(0, iv.length)).toEqual(iv);
      expect(combined.subarray(iv.length)).toEqual(encryptedData);
    });

    it('should combine IV, tag and encrypted data', () => {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const encrypted = Buffer.from([1, 2, 3]);
      const tag = Buffer.from([4, 5, 6]);

      const combined = aesGcmService.combineIvTagAndEncryptedData(
        iv,
        encrypted,
        tag
      );

      expect(combined.subarray(0, iv.length)).toEqual(iv);
    });

    it('should split encrypted data', () => {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const encryptedWithTag = randomBytes(32);
      const combined = aesGcmService.combineIvAndEncryptedData(
        iv,
        encryptedWithTag
      );

      const { iv: splitIv, encryptedDataWithTag } =
        aesGcmService.splitEncryptedData(combined, false);

      expect(splitIv).toEqual(iv);
      expect(encryptedDataWithTag).toEqual(encryptedWithTag);
    });

    it('should throw on combined data too short', () => {
      const tooShort = Buffer.from([1, 2]);

      expect(() => aesGcmService.splitEncryptedData(tooShort, true)).toThrow();
    });
  });
});
