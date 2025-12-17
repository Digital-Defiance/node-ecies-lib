import { Constants } from '../src/constants';
import { AESGCMService } from '../src/services/aes-gcm';

describe('AES-GCM Security Validations', () => {
  let service: AESGCMService;

  beforeEach(() => {
    service = new AESGCMService(Constants);
  });

  describe('key length validation', () => {
    it('should accept 32-byte key (aes-256-gcm)', () => {
      const key = Buffer.alloc(32);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).not.toThrow();
    });

    it('should reject 16-byte key (wrong for aes-256-gcm)', () => {
      const key = Buffer.alloc(16);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).toThrow();
    });

    it('should reject 24-byte key (wrong for aes-256-gcm)', () => {
      const key = Buffer.alloc(24);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).toThrow();
    });

    it('should reject 15-byte key', () => {
      const key = Buffer.alloc(15);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).toThrow();
    });

    it('should reject 17-byte key', () => {
      const key = Buffer.alloc(17);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).toThrow();
    });

    it('should reject 33-byte key', () => {
      const key = Buffer.alloc(33);
      const data = Buffer.from('test');

      expect(() => service.encrypt(data, key)).toThrow();
    });
  });

  describe('IV length validation', () => {
    it('should reject 15-byte IV', () => {
      const key = Buffer.alloc(32);
      const invalidIv = Buffer.alloc(15);
      const data = Buffer.from('test');

      expect(() => service.decrypt(invalidIv, data, key)).toThrow();
    });

    it('should reject 17-byte IV', () => {
      const key = Buffer.alloc(32);
      const invalidIv = Buffer.alloc(17);
      const data = Buffer.from('test');

      expect(() => service.decrypt(invalidIv, data, key)).toThrow();
    });
  });

  describe('data validation', () => {
    it('should reject null data for encryption', () => {
      const key = Buffer.alloc(32);

      expect(() => service.encrypt(null as any, key)).toThrow();
    });

    it('should reject undefined data for encryption', () => {
      const key = Buffer.alloc(32);

      expect(() => service.encrypt(undefined as any, key)).toThrow();
    });

    it('should reject null data for decryption', () => {
      const key = Buffer.alloc(32);
      const iv = Buffer.alloc(16);

      expect(() => service.decrypt(iv, null as any, key)).toThrow();
    });

    it('should reject undefined data for decryption', () => {
      const key = Buffer.alloc(32);
      const iv = Buffer.alloc(16);

      expect(() => service.decrypt(iv, undefined as any, key)).toThrow();
    });

    it('should allow empty data (length 0)', () => {
      const key = Buffer.alloc(32);
      const emptyData = Buffer.alloc(0);

      expect(() => service.encrypt(emptyData, key)).not.toThrow();
    });
  });

  describe('size validation', () => {
    it('should reject data exceeding 2GB for encryption', () => {
      const key = Buffer.alloc(32);
      const largeData = Buffer.alloc(0x7fffffff + 1);

      expect(() => service.encrypt(largeData, key)).toThrow();
    });

    it('should reject data exceeding 2GB for decryption', () => {
      const key = Buffer.alloc(32);
      const iv = Buffer.alloc(16);
      const largeData = Buffer.alloc(0x7fffffff + 1);

      expect(() => service.decrypt(iv, largeData, key)).toThrow();
    });

    it('should accept data at 2GB limit', () => {
      const key = Buffer.alloc(32);
      const maxData = Buffer.alloc(0x7fffffff);

      // This will be slow, so we just check it doesn't throw on size validation
      // The actual encryption would timeout in tests
      expect(() => {
        try {
          service.encrypt(maxData, key);
        } catch (e: any) {
          // Allow actual encryption errors, just not size validation errors
          if (e.message && e.message.includes('exceeds maximum')) {
            throw e;
          }
        }
      }).not.toThrow();
    });
  });

  describe('integration with encryption/decryption', () => {
    it('should encrypt and decrypt with valid inputs', () => {
      const key = Buffer.alloc(32);
      const data = Buffer.from('Hello, World!');

      const { encrypted, iv } = service.encrypt(data, key);
      const decrypted = service.decrypt(iv, encrypted, key);

      expect(decrypted).toEqual(data);
    });

    it('should fail decryption with wrong key', () => {
      const key1 = Buffer.alloc(32, 1);
      const key2 = Buffer.alloc(32, 2);
      const data = Buffer.from('Hello, World!');

      const { encrypted, iv } = service.encrypt(data, key1);

      expect(() => service.decrypt(iv, encrypted, key2)).toThrow();
    });

    it('should fail decryption with corrupted data', () => {
      const key = Buffer.alloc(32);
      const data = Buffer.from('Hello, World!');

      const { encrypted, iv } = service.encrypt(data, key);
      encrypted[0] ^= 1; // Corrupt one byte

      expect(() => service.decrypt(iv, encrypted, key)).toThrow();
    });
  });
});
