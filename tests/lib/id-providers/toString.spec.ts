/**
 * Tests for the toString(id, format) method on Node.js ID providers.
 *
 * Each provider must support three formats:
 *   - 'hex': lowercase hex string of the raw bytes
 *   - 'base64': standard base64 encoding of the raw bytes
 *   - 'int': big-endian unsigned integer string of the raw bytes
 *
 * We verify:
 *   1. Output format correctness (regex, length)
 *   2. Determinism (same id → same output)
 *   3. Cross-format consistency (all formats decode to the same bytes)
 *   4. Invalid format throws
 */

import { GuidV4Provider } from '../../../src/lib/id-providers/guidv4-provider';
import { BufferIdProvider } from '../../../src/lib/id-providers/buffer-provider';

// Helper: decode hex string to byte values
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

// Helper: decode base64 to byte values
function base64ToBytes(b64: string): number[] {
  const buf = Buffer.from(b64, 'base64');
  return Array.from(buf);
}

// Helper: convert big-endian integer string back to byte array of given length
function intToBytes(intStr: string, byteLength: number): number[] {
  let n = BigInt(intStr);
  const bytes: number[] = new Array(byteLength).fill(0);
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes[i] = Number(n & BigInt(0xff));
    n >>= BigInt(8);
  }
  return bytes;
}

describe('Node.js IIdProvider.toString(id, format)', () => {
  describe('BufferIdProvider', () => {
    const provider = new BufferIdProvider(16, 'Test16');

    it('hex: should return 32-char lowercase hex string for 16-byte provider', () => {
      const id = provider.generate();
      const hex = provider.toString(id, 'hex');
      expect(hex).toMatch(/^[0-9a-f]{32}$/);
      expect(hex.length).toBe(32);
    });

    it('base64: should return valid base64 of 16 bytes', () => {
      const id = provider.generate();
      const b64 = provider.toString(id, 'base64');
      // 16 bytes → 24 base64 chars (with padding)
      expect(b64.length).toBe(24);
      expect(Buffer.from(b64, 'base64').length).toBe(16);
    });

    it('int: should return a decimal integer string', () => {
      const id = provider.generate();
      const intStr = provider.toString(id, 'int');
      expect(intStr).toMatch(/^\d+$/);
      // 16 bytes max = 2^128 - 1 ≈ 3.4e38, so at most 39 digits
      expect(intStr.length).toBeLessThanOrEqual(39);
    });

    it('all formats should decode to the same bytes', () => {
      const id = provider.generate();
      const hex = provider.toString(id, 'hex');
      const b64 = provider.toString(id, 'base64');
      const intStr = provider.toString(id, 'int');

      const fromHex = hexToBytes(hex);
      const fromB64 = base64ToBytes(b64);
      const fromInt = intToBytes(intStr, 16);

      expect(fromHex).toEqual(fromB64);
      expect(fromHex).toEqual(fromInt);
    });

    it('should be deterministic', () => {
      const id = provider.generate();
      expect(provider.toString(id, 'hex')).toBe(provider.toString(id, 'hex'));
      expect(provider.toString(id, 'base64')).toBe(
        provider.toString(id, 'base64'),
      );
      expect(provider.toString(id, 'int')).toBe(provider.toString(id, 'int'));
    });

    it('hex should match idToString output', () => {
      const id = provider.generate();
      expect(provider.toString(id, 'hex')).toBe(provider.idToString(id));
    });

    it('should throw on invalid format', () => {
      const id = provider.generate();
      expect(() => provider.toString(id, 'binary' as any)).toThrow();
    });

    it('should work with different byte lengths', () => {
      for (const len of [1, 4, 8, 12, 20, 32, 64]) {
        const p = new BufferIdProvider(len);
        const id = p.generate();

        const hex = p.toString(id, 'hex');
        expect(hex.length).toBe(len * 2);

        const b64 = p.toString(id, 'base64');
        expect(Buffer.from(b64, 'base64').length).toBe(len);

        const intStr = p.toString(id, 'int');
        expect(intStr).toMatch(/^\d+$/);

        // Cross-format consistency
        const fromHex = hexToBytes(hex);
        const fromB64 = base64ToBytes(b64);
        const fromInt = intToBytes(intStr, len);
        expect(fromHex).toEqual(fromB64);
        expect(fromHex).toEqual(fromInt);
      }
    });
  });

  describe('GuidV4Provider', () => {
    const provider = new GuidV4Provider();

    it('hex: should return 32-char lowercase hex string', () => {
      const id = provider.fromBytes(provider.generate());
      const hex = provider.toString(id, 'hex');
      expect(hex).toMatch(/^[0-9a-f]{32}$/);
      expect(hex.length).toBe(32);
    });

    it('base64: should return valid base64 of 16 bytes', () => {
      const id = provider.fromBytes(provider.generate());
      const b64 = provider.toString(id, 'base64');
      // 16 bytes → 24 base64 chars (with padding)
      expect(b64.length).toBe(24);
      expect(Buffer.from(b64, 'base64').length).toBe(16);
    });

    it('int: should return a decimal integer string', () => {
      const id = provider.fromBytes(provider.generate());
      const intStr = provider.toString(id, 'int');
      expect(intStr).toMatch(/^\d+$/);
      // 16 bytes max = 2^128 - 1 ≈ 3.4e38, so at most 39 digits
      expect(intStr.length).toBeLessThanOrEqual(39);
    });

    it('all formats should decode to the same bytes', () => {
      const id = provider.fromBytes(provider.generate());
      const hex = provider.toString(id, 'hex');
      const b64 = provider.toString(id, 'base64');
      const intStr = provider.toString(id, 'int');

      const fromHex = hexToBytes(hex);
      const fromB64 = base64ToBytes(b64);
      const fromInt = intToBytes(intStr, 16);

      expect(fromHex).toEqual(fromB64);
      expect(fromHex).toEqual(fromInt);
    });

    it('should be deterministic', () => {
      const id = provider.fromBytes(provider.generate());
      expect(provider.toString(id, 'hex')).toBe(provider.toString(id, 'hex'));
      expect(provider.toString(id, 'base64')).toBe(
        provider.toString(id, 'base64'),
      );
      expect(provider.toString(id, 'int')).toBe(provider.toString(id, 'int'));
    });

    it('hex output should match idToString short hex', () => {
      const id = provider.fromBytes(provider.generate());
      const hex = provider.toString(id, 'hex');
      // idToString returns full hex with dashes; hex format is short (no dashes)
      const fullHex = provider.idToString(id);
      expect(hex).toBe(fullHex.replace(/-/g, ''));
    });

    it('should throw on invalid format', () => {
      const id = provider.fromBytes(provider.generate());
      expect(() => provider.toString(id, 'octal' as any)).toThrow();
    });
  });

  describe('Known-value tests', () => {
    it('BufferIdProvider: all-zeros should produce "0" for int format', () => {
      const provider = new BufferIdProvider(4);
      const zeros = Buffer.alloc(4);
      expect(provider.toString(zeros, 'int')).toBe('0');
      expect(provider.toString(zeros, 'hex')).toBe('00000000');
    });

    it('BufferIdProvider: known bytes should produce expected hex', () => {
      const provider = new BufferIdProvider(4);
      const id = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      expect(provider.toString(id, 'hex')).toBe('deadbeef');
      expect(provider.toString(id, 'int')).toBe('3735928559'); // 0xDEADBEEF
    });

    it('BufferIdProvider: known bytes should produce expected base64', () => {
      const provider = new BufferIdProvider(4);
      const id = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
      expect(provider.toString(id, 'base64')).toBe('3q2+7w==');
    });

    it('GuidV4Provider: hex format should equal short hex guid', () => {
      const provider = new GuidV4Provider();
      const id = provider.fromBytes(provider.generate());
      const hex = provider.toString(id, 'hex');
      expect(hex).toBe(id.asShortHexGuid);
    });

    it('GuidV4Provider: base64 format should equal asBase64Guid', () => {
      const provider = new GuidV4Provider();
      const id = provider.fromBytes(provider.generate());
      const b64 = provider.toString(id, 'base64');
      expect(b64).toBe(id.asBase64Guid);
    });
  });

  describe('Cross-provider format consistency', () => {
    it('BufferIdProvider and GuidV4Provider should produce same hex for same raw bytes', () => {
      const guidProvider = new GuidV4Provider();
      const bufferProvider = new BufferIdProvider(16);

      // Generate a valid v4 GUID and get its raw bytes
      const rawBytes = guidProvider.generate();
      const guidId = guidProvider.fromBytes(rawBytes);

      const guidHex = guidProvider.toString(guidId, 'hex');
      const bufferHex = bufferProvider.toString(rawBytes, 'hex');

      expect(guidHex).toBe(bufferHex);
    });

    it('all providers should have toString as a function', () => {
      const providers = [new BufferIdProvider(16), new GuidV4Provider()];

      for (const prov of providers) {
        expect(typeof prov.toString).toBe('function');
      }
    });
  });
});
