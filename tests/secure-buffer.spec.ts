/* eslint-disable import/order */
import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
/* eslint-enable import/order */
import {
  SecureStorageError,
  SecureStorageErrorType,
} from '@digitaldefiance/ecies-lib';
import { SecureBuffer } from '../src/secure-buffer';

describe('SecureBuffer', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let testBuffer: Buffer;
  let testString: string;
  let secureBuffer: SecureBuffer;
  let secureBufferFromString: SecureBuffer;

  beforeAll(() => {
    // Create test data once for all tests (32 bytes is sufficient for testing)
    testBuffer = randomBytes(32);
    // Use Buffer for correct byte length for Unicode strings
    testString = 'Test String with Unicode 🚀 世界';
    secureBuffer = new SecureBuffer(testBuffer);
    secureBufferFromString = SecureBuffer.fromString(testString);
  });

  describe('initialization', () => {
    it('should handle empty and non-empty buffers', () => {
      // Empty buffer
      const emptyBuffer = new SecureBuffer();
      expect(emptyBuffer.originalLength).toBe(0);
      expect(emptyBuffer.value.length).toBe(0);

      // Non-empty buffer
      expect(secureBuffer.originalLength).toBe(testBuffer.length);
      expect(secureBuffer.value).toEqual(testBuffer);
    });

    it('should create SecureBuffer from string with correct encoding', () => {
      // Use Buffer to get correct byte length for Unicode strings
      const expectedLength = Buffer.from(testString, 'utf8').length;
      expect(secureBufferFromString.originalLength).toBe(expectedLength);
      expect(secureBufferFromString.valueAsString).toBe(testString);
    });

    it('should handle empty Buffer', () => {
      const emptySerializable = Buffer.alloc(0);
      const secureBuffer = new SecureBuffer(emptySerializable);
      expect(secureBuffer.originalLength).toBe(0);
      expect(secureBuffer.value.length).toBe(0);
    });

    it('should handle Buffer with Unicode content', () => {
      const unicodeString = '🚀 世界';
      const testBuffer = Buffer.from(unicodeString, 'utf8');
      const secureBuffer = new SecureBuffer(testBuffer);
      expect(secureBuffer.valueAsString).toEqual(unicodeString);
    });
  });

  describe('value access and encoding', () => {
    it('should provide correct values in different formats', () => {
      // Buffer format
      expect(secureBuffer.value).toEqual(testBuffer);

      // String formats
      expect(secureBufferFromString.valueAsString).toBe(testString);
      expect(secureBuffer.valueAsHexString).toBe(testBuffer.toString('hex'));
      expect(secureBuffer.valueAsBase64String).toBe(
        testBuffer.toString('base64'),
      );
    });

    it('should generate consistent checksums for Buffer', () => {
      const testBuffer = randomBytes(32);
      const secureBuffer1 = new SecureBuffer(testBuffer);
      const secureBuffer2 = new SecureBuffer(testBuffer);
      expect(secureBuffer1.checksum).toEqual(secureBuffer2.checksum);
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueLengthMismatch when deobfuscated length is incorrect', () => {
      const testBuffer = Buffer.from(faker.lorem.word(), 'utf8');
      const secureBuffer = new SecureBuffer(testBuffer);

      // Tamper with the length property
      Object.defineProperty(secureBuffer, '_length', {
        value: testBuffer.length + 1,
        writable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        void secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testBuffer = Buffer.from(faker.lorem.word(), 'utf8');
      const secureBuffer = new SecureBuffer(testBuffer);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalBuffer = Reflect.get(
        secureBuffer,
        '_obfuscatedValue',
      ) as Buffer;
      const corruptedBuffer = Buffer.from(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureBuffer, '_obfuscatedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        void secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });

    it('should handle error cases', () => {
      const testSerializable = randomBytes(32);
      const secureBuffer = new SecureBuffer(testSerializable);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalBuffer = Reflect.get(
        secureBuffer,
        '_obfuscatedValue',
      ) as Buffer;
      const corruptedBuffer = Buffer.from(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureBuffer, '_obfuscatedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        void secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });
  });
});
