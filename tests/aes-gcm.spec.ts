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
        true,
      );
      const encryptedWithTag = aesGcmService.combineEncryptedDataAndTag(
        encrypted,
        tag!,
      );
      const decrypted = aesGcmService.decrypt(
        iv,
        encryptedWithTag,
        key256,
        true,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should fail with wrong key', () => {
      const { encrypted, iv } = aesGcmService.encrypt(testData, key256, false);
      const wrongKey = randomBytes(32);

      expect(() =>
        aesGcmService.decrypt(iv, encrypted, wrongKey, false),
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
        encryptedData,
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
        tag,
      );

      expect(combined.subarray(0, iv.length)).toEqual(iv);
    });

    it('should split encrypted data', () => {
      const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
      const encryptedWithTag = randomBytes(32);
      const combined = aesGcmService.combineIvAndEncryptedData(
        iv,
        encryptedWithTag,
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

  describe('encryptJson and decryptJson', () => {
    it('should encrypt and decrypt simple object', () => {
      const data = { name: 'Alice', age: 30 };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt complex nested object', () => {
      const data = {
        user: { name: 'Bob', email: 'bob@example.com' },
        settings: { theme: 'dark', notifications: true },
        items: [1, 2, 3, 4, 5],
      };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt array', () => {
      const data = [1, 2, 3, 'test', { key: 'value' }];
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt string', () => {
      const data = 'Hello, World!';
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<string>(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt number', () => {
      const data = 42;
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<number>(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt boolean', () => {
      const data = true;
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<boolean>(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt null', () => {
      const data = null;
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<null>(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt empty object', () => {
      const data = {};
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should fail to decrypt with wrong key', () => {
      const data = { secret: 'data' };
      const key = randomBytes(32);
      const wrongKey = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);

      expect(() => aesGcmService.decryptJson(encrypted, wrongKey)).toThrow();
    });

    it('should fail to decrypt corrupted data', () => {
      const data = { test: 'value' };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const corrupted = Buffer.from(encrypted);
      corrupted[corrupted.length - 1] ^= 1;

      expect(() => aesGcmService.decryptJson(corrupted, key)).toThrow();
    });

    it('should produce different ciphertext for same data', () => {
      const data = { test: 'value' };
      const key = randomBytes(32);

      const encrypted1 = aesGcmService.encryptJson(data, key);
      const encrypted2 = aesGcmService.encryptJson(data, key);

      expect(encrypted1).not.toEqual(encrypted2);
    });

    it('should handle large JSON objects', () => {
      const data = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should handle special characters in strings', () => {
      const data = {
        text: 'Hello 世界 🌍 \n\t\r',
        emoji: '😀😃😄😁',
        unicode: '\u0048\u0065\u006C\u006C\u006F',
      };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<typeof data>(encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should fail with invalid JSON during decryption', () => {
      const key = randomBytes(32);
      const invalidData = Buffer.from('not valid json {', 'utf8');

      const { iv, encrypted, tag } = aesGcmService.encrypt(
        invalidData,
        key,
        true,
      );
      const combined = aesGcmService.combineIvTagAndEncryptedData(
        iv,
        encrypted,
        tag!,
      );

      expect(() => aesGcmService.decryptJson(combined, key)).toThrow();
    });

    it('should maintain type safety with TypeScript generics', () => {
      interface User {
        id: number;
        name: string;
        active: boolean;
      }

      const data: User = { id: 1, name: 'Alice', active: true };
      const key = randomBytes(32);

      const encrypted = aesGcmService.encryptJson(data, key);
      const decrypted = aesGcmService.decryptJson<User>(encrypted, key);

      expect(decrypted.id).toBe(1);
      expect(decrypted.name).toBe('Alice');
      expect(decrypted.active).toBe(true);
    });
  });
});
