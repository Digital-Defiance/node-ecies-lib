/**
 * Comprehensive parseSafe tests for Node.js ID Providers.
 *
 * Tests validate that parseSafe:
 * 1. Never throws — always returns undefined on failure.
 * 2. Is lenient with whitespace, capitalization, and common prefixes.
 * 3. Returns a valid native type on success.
 * 4. Rejects clearly invalid / garbage input.
 */

import { GuidV4Provider } from '../../../src/lib/id-providers/guidv4-provider';
import { BufferIdProvider } from '../../../src/lib/id-providers/buffer-provider';
import { GuidBuffer } from '../../../src/lib/guid';
import * as uuid from 'uuid';

// ──── Helpers ────────────────────────────────────────────────
function generateV4FullHex(): string {
  return uuid.v4();
}

function generateV4ShortHex(): string {
  return uuid.v4().replace(/-/g, '');
}

function generateV4Base64(): string {
  const guid = GuidBuffer.v4();
  return guid.asBase64Guid;
}

function generateRandomHex(byteLen: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < byteLen; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ╔════════════════════════════════════════════════════════════╗
// ║  parseSafe Tests                                          ║
// ╚════════════════════════════════════════════════════════════╝
describe('Node.js parseSafe Tests', () => {
  // ─────────────────────────────────────────────────────────
  // BufferIdProvider.parseSafe
  // ─────────────────────────────────────────────────────────
  describe('BufferIdProvider.parseSafe', () => {
    let provider16: BufferIdProvider;
    let provider32: BufferIdProvider;

    beforeEach(() => {
      provider16 = new BufferIdProvider(16, 'Test16');
      provider32 = new BufferIdProvider(32, 'Test32');
    });

    describe('Valid inputs', () => {
      it('should parse a valid lowercase hex string', () => {
        const hex = generateRandomHex(16);
        const result = provider16.parseSafe(hex);
        expect(result).toBeDefined();
        expect(result!.length).toBe(16);
      });

      it('should parse a valid uppercase hex string', () => {
        const hex = generateRandomHex(16).toUpperCase();
        const result = provider16.parseSafe(hex);
        expect(result).toBeDefined();
        expect(result!.length).toBe(16);
      });

      it('should parse mixed-case hex', () => {
        const hex = generateRandomHex(16);
        const mixed = hex
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
          .join('');
        const result = provider16.parseSafe(mixed);
        expect(result).toBeDefined();
      });

      it('should parse round-tripped serialized IDs', () => {
        for (let i = 0; i < 50; i++) {
          const id = provider16.generate();
          const hex = provider16.serialize(id);
          const result = provider16.parseSafe(hex);
          expect(result).toBeDefined();
          expect(provider16.equals(id, result!)).toBe(true);
        }
      });

      it('should parse 32-byte hex for 32-byte provider', () => {
        const hex = generateRandomHex(32);
        const result = provider32.parseSafe(hex);
        expect(result).toBeDefined();
        expect(result!.length).toBe(32);
      });

      it('should handle all-zeros hex', () => {
        const hex = '00'.repeat(16);
        const result = provider16.parseSafe(hex);
        expect(result).toBeDefined();
        expect(result!.every((b) => b === 0)).toBe(true);
      });

      it('should handle all-FF hex', () => {
        const hex = 'ff'.repeat(16);
        const result = provider16.parseSafe(hex);
        expect(result).toBeDefined();
        expect(result!.every((b) => b === 0xff)).toBe(true);
      });
    });

    describe('Whitespace leniency', () => {
      it('should handle leading whitespace', () => {
        const hex = generateRandomHex(16);
        expect(provider16.parseSafe('  ' + hex)).toBeDefined();
      });

      it('should handle trailing whitespace', () => {
        const hex = generateRandomHex(16);
        expect(provider16.parseSafe(hex + '  ')).toBeDefined();
      });

      it('should handle surrounding whitespace', () => {
        const hex = generateRandomHex(16);
        expect(provider16.parseSafe('  ' + hex + '  ')).toBeDefined();
      });

      it('should handle tabs and newlines', () => {
        const hex = generateRandomHex(16);
        expect(provider16.parseSafe('\t' + hex + '\n')).toBeDefined();
        expect(provider16.parseSafe('\r\n' + hex + '\r\n')).toBeDefined();
      });
    });

    describe('0x prefix leniency', () => {
      it('should strip lowercase 0x prefix', () => {
        const hex = generateRandomHex(16);
        const result = provider16.parseSafe('0x' + hex);
        expect(result).toBeDefined();

        const direct = provider16.parseSafe(hex);
        expect(provider16.equals(result!, direct!)).toBe(true);
      });

      it('should strip uppercase 0X prefix', () => {
        const hex = generateRandomHex(16);
        const result = provider16.parseSafe('0X' + hex);
        expect(result).toBeDefined();

        const direct = provider16.parseSafe(hex);
        expect(provider16.equals(result!, direct!)).toBe(true);
      });

      it('should handle 0x with whitespace', () => {
        const hex = generateRandomHex(16);
        const result = provider16.parseSafe('  0x' + hex + '  ');
        expect(result).toBeDefined();

        const direct = provider16.parseSafe(hex);
        expect(provider16.equals(result!, direct!)).toBe(true);
      });
    });

    describe('Invalid inputs — should return undefined, never throw', () => {
      const invalidInputs: [string, unknown][] = [
        ['empty string', ''],
        ['single character', 'a'],
        ['wrong length hex (too short)', 'aabb'],
        ['wrong length hex (too long)', 'aa'.repeat(17)],
        ['non-hex characters', 'zz'.repeat(16)],
        ['GUID with dashes', '01234567-89ab-cdef-0123-456789abcdef'],
        ['whitespace only', '   '],
        ['special characters', '!@#$%^&*()'],
        ['base64 string', Buffer.alloc(16).toString('base64')],
        ['numeric string', '12345678901234567890123456789012345'],
        ['null coerced', null as any],
        ['undefined coerced', undefined as any],
        ['number coerced', 42 as any],
        ['object coerced', {} as any],
        ['boolean coerced', true as any],
        ['array coerced', [] as any],
        ['NaN coerced', NaN as any],
        ['Infinity coerced', Infinity as any],
      ];

      for (const [label, input] of invalidInputs) {
        it(`should return undefined for ${label}`, () => {
          let result: Buffer | undefined;
          expect(() => {
            result = provider16.parseSafe(input as string);
          }).not.toThrow();
          expect(result).toBeUndefined();
        });
      }
    });

    describe('Edge cases', () => {
      it('should not treat embedded "0x" as hex prefix', () => {
        // "0x" only stripped from the start
        const hex = generateRandomHex(16);
        const withMid0x = hex.slice(0, 4) + '0x' + hex.slice(6);
        // This may or may not parse depending on length after processing,
        // but it MUST NOT throw
        expect(() => provider16.parseSafe(withMid0x)).not.toThrow();
      });

      it('should correctly parse a 1-byte provider', () => {
        const p = new BufferIdProvider(1);
        expect(p.parseSafe('ff')).toBeDefined();
        expect(p.parseSafe('FF')).toBeDefined();
        expect(p.parseSafe('0xff')).toBeDefined();
        expect(p.parseSafe(' 00 ')).toBeDefined();
      });

      it('should correctly parse a 255-byte provider', () => {
        const p = new BufferIdProvider(255);
        const hex = generateRandomHex(255);
        expect(p.parseSafe(hex)).toBeDefined();
        expect(p.parseSafe('0x' + hex)).toBeDefined();
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // GuidV4Provider.parseSafe
  // ─────────────────────────────────────────────────────────
  describe('GuidV4Provider.parseSafe', () => {
    let provider: GuidV4Provider;

    beforeEach(() => {
      provider = new GuidV4Provider();
    });

    describe('Valid inputs — full hex GUID (36 chars)', () => {
      it('should parse a standard v4 UUID string', () => {
        const uuidStr = generateV4FullHex();
        const result = provider.parseSafe(uuidStr);
        expect(result).toBeDefined();
        expect(result!.length).toBe(16);
      });

      it('should parse uppercase UUID string', () => {
        const uuidStr = generateV4FullHex().toUpperCase();
        const result = provider.parseSafe(uuidStr);
        expect(result).toBeDefined();
      });

      it('should parse mixed-case UUID string', () => {
        const uuidStr = generateV4FullHex();
        const mixed = uuidStr
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
          .join('');
        const result = provider.parseSafe(mixed);
        expect(result).toBeDefined();
      });

      it('should parse many generated v4 GUIDs', () => {
        for (let i = 0; i < 100; i++) {
          const uuidStr = generateV4FullHex();
          const result = provider.parseSafe(uuidStr);
          expect(result).toBeDefined();
        }
      });
    });

    describe('Valid inputs — short hex GUID (32 chars)', () => {
      it('should parse a 32-char no-dash hex string', () => {
        const short = generateV4ShortHex();
        const result = provider.parseSafe(short);
        expect(result).toBeDefined();
        expect(result!.length).toBe(16);
      });

      it('should parse uppercase short hex', () => {
        const short = generateV4ShortHex().toUpperCase();
        const result = provider.parseSafe(short);
        expect(result).toBeDefined();
      });
    });

    describe('Valid inputs — base64 GUID (24 chars)', () => {
      it('should parse a base64-encoded GUID', () => {
        const b64 = generateV4Base64();
        const result = provider.parseSafe(b64);
        expect(result).toBeDefined();
        expect(result!.length).toBe(16);
      });

      it('should round-trip through serialize/parseSafe', () => {
        for (let i = 0; i < 50; i++) {
          const id = provider.generate();
          const guid = provider.fromBytes(id);
          const serialized = provider.serialize(guid);
          const result = provider.parseSafe(serialized);
          expect(result).toBeDefined();
        }
      });
    });

    describe('Valid inputs — round-trip consistency', () => {
      it('full hex → parseSafe → bytes match', () => {
        const guid = GuidBuffer.v4();
        const fullHex = guid.asFullHexGuid;
        const result = provider.parseSafe(fullHex);
        expect(result).toBeDefined();
        expect(Buffer.from(result!).equals(guid.asRawBuffer)).toBe(true);
      });

      it('short hex → parseSafe → bytes match', () => {
        const guid = GuidBuffer.v4();
        const shortHex = guid.asShortHexGuid;
        const result = provider.parseSafe(shortHex);
        expect(result).toBeDefined();
        expect(Buffer.from(result!).equals(guid.asRawBuffer)).toBe(true);
      });

      it('base64 → parseSafe → bytes match', () => {
        const guid = GuidBuffer.v4();
        const base64 = guid.asBase64Guid;
        const result = provider.parseSafe(base64);
        expect(result).toBeDefined();
        expect(Buffer.from(result!).equals(guid.asRawBuffer)).toBe(true);
      });
    });

    describe('Whitespace leniency', () => {
      it('should handle leading whitespace', () => {
        const uuidStr = generateV4FullHex();
        expect(provider.parseSafe('  ' + uuidStr)).toBeDefined();
      });

      it('should handle trailing whitespace', () => {
        const uuidStr = generateV4FullHex();
        expect(provider.parseSafe(uuidStr + '  ')).toBeDefined();
      });

      it('should handle surrounding whitespace', () => {
        const uuidStr = generateV4FullHex();
        expect(provider.parseSafe('  ' + uuidStr + '  ')).toBeDefined();
      });

      it('should handle tabs and newlines', () => {
        const uuidStr = generateV4FullHex();
        expect(provider.parseSafe('\t' + uuidStr + '\n')).toBeDefined();
      });

      it('should handle leading whitespace on base64', () => {
        const b64 = generateV4Base64();
        expect(provider.parseSafe('  ' + b64 + '  ')).toBeDefined();
      });

      it('should handle leading whitespace on short hex', () => {
        const short = generateV4ShortHex();
        expect(provider.parseSafe('  ' + short + '  ')).toBeDefined();
      });
    });

    describe('Non-v4 UUIDs', () => {
      it('should still successfully parse non-v4 UUIDs (parseSafe does not filter version)', () => {
        // parseSafe delegates directly to GuidBuffer.parse, which does not
        // enforce v4. It returns a GuidV4Buffer by cast, but still parses.
        // This is by design — parseSafe should be lenient.
        const v1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const result = provider.parseSafe(v1);
        // GuidBuffer.parse should succeed on any valid UUID
        expect(result).toBeDefined();
      });

      it('should parse the nil UUID', () => {
        const nil = '00000000-0000-0000-0000-000000000000';
        const result = provider.parseSafe(nil);
        expect(result).toBeDefined();
      });

      it('should parse the max UUID', () => {
        const max = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
        const result = provider.parseSafe(max);
        expect(result).toBeDefined();
      });
    });

    describe('Invalid inputs — should return undefined, never throw', () => {
      const invalidInputs: [string, unknown][] = [
        ['empty string', ''],
        ['single character', 'a'],
        ['random short string', 'hello-world'],
        ['too many dashes', '01234567-89ab-cdef-0123-456789ab-cdef'],
        ['missing section', '01234567-89ab-cdef-0123'],
        ['whitespace only', '   '],
        ['special characters', '!@#$%^&*()'],
        ['numeric string', '12345678901234567890'],
        ['37-char string', 'a'.repeat(37)],
        ['null coerced', null as any],
        ['undefined coerced', undefined as any],
        ['number coerced', 42 as any],
        ['object coerced', {} as any],
        ['boolean coerced', true as any],
        ['array coerced', [] as any],
        ['NaN coerced', NaN as any],
        ['hex with 0x prefix (not a GUID format)', '0x' + 'a'.repeat(32)],
      ];

      for (const [label, input] of invalidInputs) {
        it(`should return undefined for ${label}`, () => {
          let result: unknown;
          expect(() => {
            result = provider.parseSafe(input as string);
          }).not.toThrow();
          expect(result).toBeUndefined();
        });
      }
    });

    describe('Edge cases', () => {
      it('should not parse plain hex without proper GUID length', () => {
        // 20 hex chars (not 32 or 36)
        const result = provider.parseSafe('aabb'.repeat(5));
        expect(result).toBeUndefined();
      });

      it('should parse all three formats for the same GUID', () => {
        const guid = GuidBuffer.v4();
        const full = guid.asFullHexGuid;
        const short = guid.asShortHexGuid;
        const base64 = guid.asBase64Guid;

        const r1 = provider.parseSafe(full);
        const r2 = provider.parseSafe(short);
        const r3 = provider.parseSafe(base64);

        expect(r1).toBeDefined();
        expect(r2).toBeDefined();
        expect(r3).toBeDefined();

        // All should produce the same raw bytes
        expect(Buffer.from(r1!).equals(Buffer.from(r2!))).toBe(true);
        expect(Buffer.from(r2!).equals(Buffer.from(r3!))).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // Cross-provider parseSafe contract
  // ─────────────────────────────────────────────────────────
  describe('Cross-Provider parseSafe Contract', () => {
    const providers = [
      { name: 'BufferIdProvider(16)', instance: new BufferIdProvider(16) },
      { name: 'GuidV4Provider', instance: new GuidV4Provider() },
    ];

    describe('Never throws on any input', () => {
      const fuzzInputs: unknown[] = [
        '',
        ' ',
        '\t',
        '\n',
        '\r\n',
        'null',
        'undefined',
        'NaN',
        'Infinity',
        null,
        undefined,
        NaN,
        Infinity,
        -Infinity,
        0,
        1,
        -1,
        42,
        3.14,
        true,
        false,
        {},
        [],
        [1, 2, 3],
        Symbol.for('test'),
        () => {},
        new Date(),
        /regex/,
        Buffer.alloc(0),
        Buffer.alloc(100),
        '0x',
        '0X',
        '0x0',
        'deadbeef',
        String.fromCharCode(0),
        '\u0000'.repeat(100),
        'a'.repeat(1000),
        '🎉🎊🎈',
        '<script>alert(1)</script>',
        'SELECT * FROM users',
        '../../../etc/passwd',
      ];

      for (const prov of providers) {
        for (const input of fuzzInputs) {
          const label =
            typeof input === 'symbol'
              ? input.toString()
              : typeof input === 'function'
                ? 'function'
                : (JSON.stringify(input) ?? String(input));

          it(`${prov.name}.parseSafe(${label}) should not throw`, () => {
            expect(() => {
              (prov.instance as any).parseSafe(input);
            }).not.toThrow();
          });
        }
      }
    });

    describe('parseSafe is more lenient than deserialize', () => {
      it('BufferIdProvider: parseSafe accepts 0x prefix, deserialize does not', () => {
        const prov = new BufferIdProvider(16);
        const hex = generateRandomHex(16);

        // deserialize rejects 0x prefix
        expect(() => prov.deserialize('0x' + hex)).toThrow();

        // parseSafe accepts it
        expect(prov.parseSafe('0x' + hex)).toBeDefined();
      });

      it('BufferIdProvider: parseSafe accepts whitespace, deserialize does not', () => {
        const prov = new BufferIdProvider(16);
        const hex = generateRandomHex(16);

        expect(() => prov.deserialize('  ' + hex + '  ')).toThrow();
        expect(prov.parseSafe('  ' + hex + '  ')).toBeDefined();
      });

      it('GuidV4Provider: parseSafe accepts whitespace, deserialize does not', () => {
        const prov = new GuidV4Provider();
        const uuidStr = generateV4FullHex();

        expect(() => prov.deserialize('  ' + uuidStr + '  ')).toThrow();
        expect(prov.parseSafe('  ' + uuidStr + '  ')).toBeDefined();
      });
    });

    describe('Consistent generate → serialize → parseSafe round-trip', () => {
      it('BufferIdProvider should round-trip 100 IDs', () => {
        const prov = new BufferIdProvider(16);
        for (let i = 0; i < 100; i++) {
          const id = prov.generate();
          const s = prov.serialize(id);
          const parsed = prov.parseSafe(s);
          expect(parsed).toBeDefined();
          expect(prov.equals(id, parsed!)).toBe(true);
        }
      });

      it('GuidV4Provider should round-trip 100 IDs', () => {
        const prov = new GuidV4Provider();
        for (let i = 0; i < 100; i++) {
          const id = prov.generate();
          const guid = prov.fromBytes(id);
          const s = prov.serialize(guid);
          const parsed = prov.parseSafe(s);
          expect(parsed).toBeDefined();
        }
      });
    });

    describe('parseSafe returns undefined for cross-provider values', () => {
      it('BufferIdProvider(20) should reject 16-byte hex', () => {
        const p20 = new BufferIdProvider(20);
        const hex16 = generateRandomHex(16);
        expect(p20.parseSafe(hex16)).toBeUndefined();
      });

      it('BufferIdProvider(16) should reject 20-byte hex', () => {
        const p16 = new BufferIdProvider(16);
        const hex20 = generateRandomHex(20);
        expect(p16.parseSafe(hex20)).toBeUndefined();
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // Stress / Fuzz
  // ─────────────────────────────────────────────────────────
  describe('Stress / Fuzz', () => {
    it('BufferIdProvider.parseSafe should handle 1000 random strings without throwing', () => {
      const prov = new BufferIdProvider(16);

      for (let i = 0; i < 1000; i++) {
        const len = Math.floor(Math.random() * 100);
        const chars = Array.from({ length: len }, () =>
          String.fromCharCode(Math.floor(Math.random() * 128)),
        ).join('');

        expect(() => prov.parseSafe(chars)).not.toThrow();
      }
    });

    it('GuidV4Provider.parseSafe should handle 1000 random strings without throwing', () => {
      const prov = new GuidV4Provider();

      for (let i = 0; i < 1000; i++) {
        const len = Math.floor(Math.random() * 100);
        const chars = Array.from({ length: len }, () =>
          String.fromCharCode(Math.floor(Math.random() * 128)),
        ).join('');

        expect(() => prov.parseSafe(chars)).not.toThrow();
      }
    });
  });
});
