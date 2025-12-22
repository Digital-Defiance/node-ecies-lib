/**
 * Property-based tests for ID type guards and converters
 * Feature: type-safety-audit, Property: ID conversion preserves value
 * Validates: Requirements 1.1
 */

import fc from 'fast-check';

import {
  convertId,
  isBuffer,
  isUint8Array,
  toBuffer,
  toUint8Array,
} from '../src/types/id-guards';

describe('ID Type Guards and Converters - Property-Based Tests', () => {
  describe('Property: ID conversion preserves value', () => {
    it('should preserve value when converting Buffer to Uint8Array and back', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (arr) => {
          const buffer = Buffer.from(arr);
          const uint8Array = toUint8Array(buffer);
          const backToBuffer = toBuffer(uint8Array);

          return buffer.equals(backToBuffer);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve value when converting Uint8Array to Buffer and back', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (arr) => {
          const uint8Array = new Uint8Array(arr);
          const buffer = toBuffer(uint8Array);
          const backToUint8Array = toUint8Array(buffer);

          return Buffer.from(uint8Array).equals(Buffer.from(backToUint8Array));
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve value when converting hex string to Buffer and back', () => {
      const testCases = ['deadbeef', 'abcd1234', '00ff00ff', 'a1b2c3d4e5f6'];
      testCases.forEach((hexStr) => {
        const buffer = toBuffer(hexStr);
        const backToHex = convertId(buffer, 'string');
        expect(hexStr.toLowerCase()).toBe(backToHex.toLowerCase());
      });
    });

    it('should preserve value when converting hex string to Uint8Array and back', () => {
      const testCases = ['deadbeef', 'abcd1234', '00ff00ff', 'a1b2c3d4e5f6'];
      testCases.forEach((hexStr) => {
        const uint8Array = toUint8Array(hexStr);
        const backToHex = convertId(uint8Array, 'string');
        expect(hexStr.toLowerCase()).toBe(backToHex.toLowerCase());
      });
    });

    it('should correctly identify Buffer instances', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (arr) => {
          const buffer = Buffer.from(arr);
          // Buffer extends Uint8Array in Node.js, so both will be true
          return isBuffer(buffer) === true && isUint8Array(buffer) === true;
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly identify pure Uint8Array instances', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (arr) => {
          const uint8Array = new Uint8Array(arr);
          // Pure Uint8Array should pass isUint8Array but not isBuffer
          return (
            isUint8Array(uint8Array) === true && isBuffer(uint8Array) === false
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve byte values through all conversion paths', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 1, maxLength: 32 }), (arr) => {
          const original = Buffer.from(arr);

          // Test all conversion paths
          const viaUint8Array = toBuffer(toUint8Array(original));
          const viaString = toBuffer(convertId(original, 'string'));
          const viaConvertId = convertId(
            convertId(original, 'Uint8Array'),
            'Buffer',
          ) as Buffer;

          return (
            original.equals(viaUint8Array) &&
            original.equals(viaString) &&
            original.equals(viaConvertId)
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should handle empty buffers correctly', () => {
      const emptyBuffer = Buffer.alloc(0);
      const emptyUint8Array = new Uint8Array(0);

      expect(toBuffer(emptyUint8Array).length).toBe(0);
      expect(toUint8Array(emptyBuffer).length).toBe(0);
      expect(convertId(emptyBuffer, 'string')).toBe('');
    });

    it('should handle maximum size IDs correctly', () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 32, maxLength: 32 }), (arr) => {
          const buffer = Buffer.from(arr);
          const uint8Array = toUint8Array(buffer);

          return (
            uint8Array.length === 32 && buffer.equals(toBuffer(uint8Array))
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Type Guard Edge Cases', () => {
    it('should return false for non-Buffer/Uint8Array values', () => {
      expect(isBuffer(null)).toBe(false);
      expect(isBuffer(undefined)).toBe(false);
      expect(isBuffer({})).toBe(false);
      expect(isBuffer([])).toBe(false);
      expect(isBuffer('string')).toBe(false);
      expect(isBuffer(123)).toBe(false);

      expect(isUint8Array(null)).toBe(false);
      expect(isUint8Array(undefined)).toBe(false);
      expect(isUint8Array({})).toBe(false);
      expect(isUint8Array([])).toBe(false);
      expect(isUint8Array('string')).toBe(false);
      expect(isUint8Array(123)).toBe(false);
    });
  });

  describe('Conversion Error Handling', () => {
    it('should throw error for unsupported types', () => {
      expect(() => toBuffer(123 as any)).toThrow();
      expect(() => toBuffer({} as any)).toThrow();
      expect(() => toUint8Array(123 as any)).toThrow();
      expect(() => toUint8Array({} as any)).toThrow();
    });

    it('should throw error for invalid conversion target', () => {
      const buffer = Buffer.from([1, 2, 3]);
      expect(() => convertId(buffer, 'invalid' as any)).toThrow();
    });
  });
});
