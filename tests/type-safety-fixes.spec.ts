/**
 * Unit tests for type safety fixes in node-ecies-lib
 * Tests ID type guards, conversions, and cipher type handling
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { AuthenticatedCipher } from '../src/interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../src/interfaces/authenticated-decipher';
import {
  convertId,
  isBuffer,
  isUint8Array,
  toBuffer,
  toUint8Array,
} from '../src/types/id-guards';

describe('Type Safety Fixes', () => {
  describe('ID Type Guards', () => {
    it('should correctly identify Buffer instances', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      expect(isBuffer(buffer)).toBe(true);
      expect(isBuffer(null)).toBe(false);
      expect(isBuffer(undefined)).toBe(false);
      expect(isBuffer({})).toBe(false);
      expect(isBuffer('string')).toBe(false);
    });

    it('should correctly identify Uint8Array instances', () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4]);
      const buffer = Buffer.from([1, 2, 3, 4]);

      expect(isUint8Array(uint8Array)).toBe(true);
      expect(isUint8Array(buffer)).toBe(true); // Buffer extends Uint8Array
      expect(isUint8Array(null)).toBe(false);
      expect(isUint8Array(undefined)).toBe(false);
      expect(isUint8Array({})).toBe(false);
      expect(isUint8Array('string')).toBe(false);
    });

    it('should distinguish between Buffer and pure Uint8Array', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      const uint8Array = new Uint8Array([1, 2, 3, 4]);

      expect(isBuffer(buffer)).toBe(true);
      expect(isBuffer(uint8Array)).toBe(false);
      expect(isUint8Array(buffer)).toBe(true);
      expect(isUint8Array(uint8Array)).toBe(true);
    });
  });

  describe('ID Type Conversions', () => {
    const testData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const testBuffer = Buffer.from(testData);
    const testHex = 'deadbeef';

    it('should convert Buffer to Uint8Array correctly', () => {
      const result = toUint8Array(testBuffer);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual(Array.from(testData));
    });

    it('should convert Uint8Array to Buffer correctly', () => {
      const result = toBuffer(testData);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.equals(testBuffer)).toBe(true);
    });

    it('should convert hex string to Buffer correctly', () => {
      const result = toBuffer(testHex);
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('hex')).toBe(testHex);
    });

    it('should convert hex string to Uint8Array correctly', () => {
      const result = toUint8Array(testHex);
      expect(result).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(result).toString('hex')).toBe(testHex);
    });

    it('should handle empty values correctly', () => {
      const emptyBuffer = Buffer.alloc(0);
      const emptyUint8Array = new Uint8Array(0);

      expect(toBuffer(emptyUint8Array).length).toBe(0);
      expect(toUint8Array(emptyBuffer).length).toBe(0);
      expect(convertId(emptyBuffer, 'string')).toBe('');
    });

    it('should throw error for unsupported types', () => {
      expect(() =>
        toBuffer(123 as unknown as string | Uint8Array | Buffer),
      ).toThrow();
      expect(() =>
        toBuffer({} as unknown as string | Uint8Array | Buffer),
      ).toThrow();
      expect(() =>
        toUint8Array(123 as unknown as string | Uint8Array | Buffer),
      ).toThrow();
      expect(() =>
        toUint8Array({} as unknown as string | Uint8Array | Buffer),
      ).toThrow();
    });
  });

  describe('Generic ID Converter', () => {
    const testBuffer = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    const testUint8Array = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const testHex = 'deadbeef';

    it('should convert to Buffer', () => {
      const fromBuffer = convertId(testBuffer, 'Buffer');
      const fromUint8Array = convertId(testUint8Array, 'Buffer');
      const fromString = convertId(testHex, 'Buffer');

      expect(Buffer.isBuffer(fromBuffer)).toBe(true);
      expect(Buffer.isBuffer(fromUint8Array)).toBe(true);
      expect(Buffer.isBuffer(fromString)).toBe(true);
      expect(fromBuffer.equals(testBuffer)).toBe(true);
      expect(fromUint8Array.equals(testBuffer)).toBe(true);
      expect(fromString.equals(testBuffer)).toBe(true);
    });

    it('should convert to Uint8Array', () => {
      const fromBuffer = convertId(testBuffer, 'Uint8Array');
      const fromUint8Array = convertId(testUint8Array, 'Uint8Array');
      const fromString = convertId(testHex, 'Uint8Array');

      expect(fromBuffer).toBeInstanceOf(Uint8Array);
      expect(fromUint8Array).toBeInstanceOf(Uint8Array);
      expect(fromString).toBeInstanceOf(Uint8Array);
    });

    it('should convert to string', () => {
      const fromBuffer = convertId(testBuffer, 'string');
      const fromUint8Array = convertId(testUint8Array, 'string');
      const fromString = convertId(testHex, 'string');

      expect(typeof fromBuffer).toBe('string');
      expect(typeof fromUint8Array).toBe('string');
      expect(typeof fromString).toBe('string');
      expect(fromBuffer).toBe(testHex);
      expect(fromUint8Array).toBe(testHex);
      expect(fromString).toBe(testHex);
    });

    it('should throw error for invalid target type', () => {
      expect(() =>
        convertId(
          testBuffer,
          'invalid' as unknown as 'string' | 'buffer' | 'uint8array',
        ),
      ).toThrow();
    });
  });

  describe('Cipher Type Handling', () => {
    it('should correctly type authenticated cipher', () => {
      const key = randomBytes(32);
      const iv = randomBytes(16);
      const cipher = createCipheriv(
        'aes-256-gcm',
        key,
        iv,
      ) as AuthenticatedCipher;

      expect(cipher).toBeDefined();
      expect(typeof cipher.update).toBe('function');
      expect(typeof cipher.final).toBe('function');
      expect(typeof cipher.getAuthTag).toBe('function');
      expect(typeof cipher.setAAD).toBe('function');
    });

    it('should correctly type authenticated decipher', () => {
      const key = randomBytes(32);
      const iv = randomBytes(16);
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        iv,
      ) as AuthenticatedDecipher;

      expect(decipher).toBeDefined();
      expect(typeof decipher.update).toBe('function');
      expect(typeof decipher.final).toBe('function');
      expect(typeof decipher.setAuthTag).toBe('function');
      expect(typeof decipher.setAAD).toBe('function');
    });

    it('should handle cipher operations with proper types', () => {
      const key = randomBytes(32);
      const iv = randomBytes(16);
      const plaintext = Buffer.from('test data');

      const cipher = createCipheriv(
        'aes-256-gcm',
        key,
        iv,
      ) as AuthenticatedCipher;
      const encrypted = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        iv,
      ) as AuthenticatedDecipher;
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      expect(decrypted.equals(plaintext)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle ID conversions in realistic scenarios', () => {
      // Simulate receiving an ID as Uint8Array from external source
      const externalId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      // Convert to Buffer for internal use
      const internalId = toBuffer(externalId);
      expect(Buffer.isBuffer(internalId)).toBe(true);

      // Convert to hex string for storage/transmission
      const hexId = convertId(internalId, 'string');
      expect(typeof hexId).toBe('string');

      // Convert back from hex string
      const restoredId = toBuffer(hexId);
      expect(restoredId.equals(internalId)).toBe(true);
    });

    it('should maintain data integrity through multiple conversions', () => {
      const original = Buffer.from([
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
      ]);

      // Buffer -> Uint8Array -> Buffer
      const step1 = toUint8Array(original);
      const step2 = toBuffer(step1);
      expect(step2.equals(original)).toBe(true);

      // Buffer -> string -> Uint8Array -> Buffer
      const step3 = convertId(original, 'string');
      const step4 = toUint8Array(step3);
      const step5 = toBuffer(step4);
      expect(step5.equals(original)).toBe(true);
    });
  });
});
