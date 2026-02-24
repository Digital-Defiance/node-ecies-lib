/**
 * Comprehensive tests for Node.js ID Providers: BufferIdProvider and GuidV4Provider.
 *
 * Validates:
 * 1. Generation, validation, serialization/deserialization round-trips
 * 2. Equality, cloning, native type conversion (toBytes/fromBytes)
 * 3. String conversion (idToString/idFromString)
 * 4. Edge cases and error handling
 * 5. Cross-provider isolation
 */

import {
  ObjectIdProvider,
  GuidV4Provider as EciesGuidV4Provider,
  UuidProvider,
  IdProviderErrorType,
  IdProviderError,
} from '@digitaldefiance/ecies-lib';
import { GuidV4Provider } from '../../../src/lib/id-providers/guidv4-provider';
import { BufferIdProvider } from '../../../src/lib/id-providers/buffer-provider';
import { GuidBuffer } from '../../../src/lib/guid';

describe('Node.js ID Providers', () => {
  // ─────────────────────────────────────────────────────────────
  // BufferIdProvider
  // ─────────────────────────────────────────────────────────────
  describe('BufferIdProvider', () => {
    let provider: BufferIdProvider;

    beforeEach(() => {
      provider = new BufferIdProvider(16, 'Test16');
    });

    describe('Construction', () => {
      it('should create provider with specified byte length', () => {
        expect(provider.byteLength).toBe(16);
        expect(provider.name).toBe('Test16');
      });

      it('should use default name "Buffer" when not provided', () => {
        const p = new BufferIdProvider(8);
        expect(p.name).toBe('Buffer');
      });

      it('should accept minimum byte length of 1', () => {
        const p = new BufferIdProvider(1);
        expect(p.byteLength).toBe(1);
      });

      it('should accept maximum byte length of 255', () => {
        const p = new BufferIdProvider(255);
        expect(p.byteLength).toBe(255);
      });

      it('should reject zero byte length', () => {
        expect(() => new BufferIdProvider(0)).toThrow();
      });

      it('should reject negative byte length', () => {
        expect(() => new BufferIdProvider(-1)).toThrow();
      });

      it('should reject byte length > 255', () => {
        expect(() => new BufferIdProvider(256)).toThrow();
      });

      it('should reject non-integer byte length', () => {
        expect(() => new BufferIdProvider(1.5)).toThrow();
        expect(() => new BufferIdProvider(10.1)).toThrow();
      });

      it('should throw IdProviderError with correct error type', () => {
        try {
          new BufferIdProvider(0);
          fail('Expected IdProviderError');
        } catch (e) {
          expect(e).toBeInstanceOf(IdProviderError);
        }
      });
    });

    describe('Generation', () => {
      it('should generate Buffers of correct length', () => {
        for (let i = 0; i < 100; i++) {
          const id = provider.generate();
          expect(Buffer.isBuffer(id)).toBe(true);
          expect(id.length).toBe(16);
        }
      });

      it('should generate unique IDs', () => {
        const ids = new Set<string>();
        const count = 1000;

        for (let i = 0; i < count; i++) {
          const id = provider.generate();
          ids.add(id.toString('hex'));
        }

        expect(ids.size).toBe(count);
      });

      it('should generate with various byte lengths', () => {
        for (const len of [1, 8, 12, 16, 20, 32, 64, 255]) {
          const p = new BufferIdProvider(len);
          const id = p.generate();
          expect(id.length).toBe(len);
          expect(Buffer.isBuffer(id)).toBe(true);
        }
      });
    });

    describe('Validation', () => {
      it('should validate correctly generated IDs', () => {
        for (let i = 0; i < 100; i++) {
          const id = provider.generate();
          expect(provider.validate(id)).toBe(true);
        }
      });

      it('should reject buffers of wrong length', () => {
        expect(provider.validate(Buffer.alloc(15))).toBe(false);
        expect(provider.validate(Buffer.alloc(17))).toBe(false);
        expect(provider.validate(Buffer.alloc(0))).toBe(false);
      });

      it('should accept all-zero buffers (no content validation)', () => {
        expect(provider.validate(Buffer.alloc(16))).toBe(true);
      });
    });

    describe('Serialization', () => {
      it('should serialize to hex string of correct length', () => {
        const id = provider.generate();
        const hex = provider.serialize(id);

        expect(hex.length).toBe(32); // 16 * 2
        expect(hex).toMatch(/^[0-9a-f]{32}$/);
      });

      it('should produce consistent serialization', () => {
        const id = provider.generate();
        expect(provider.serialize(id)).toBe(provider.serialize(id));
      });

      it('should preserve leading zeros', () => {
        const id = Buffer.alloc(16);
        id[0] = 0x00;
        id[1] = 0x01;
        const hex = provider.serialize(id);
        expect(hex.slice(0, 4)).toBe('0001');
      });

      it('should throw on wrong-length input', () => {
        expect(() => provider.serialize(Buffer.alloc(15))).toThrow();
        expect(() => provider.serialize(Buffer.alloc(17))).toThrow();
      });
    });

    describe('Deserialization', () => {
      it('should round-trip through serialization', () => {
        for (let i = 0; i < 100; i++) {
          const original = provider.generate();
          const hex = provider.serialize(original);
          const deserialized = provider.deserialize(hex);

          expect(provider.equals(original, deserialized)).toBe(true);
        }
      });

      it('should accept both uppercase and lowercase hex', () => {
        const id = provider.generate();
        const lower = provider.serialize(id);
        const upper = lower.toUpperCase();

        const fromLower = provider.deserialize(lower);
        const fromUpper = provider.deserialize(upper);
        expect(provider.equals(fromLower, fromUpper)).toBe(true);
      });

      it('should reject invalid hex strings', () => {
        expect(() => provider.deserialize('invalid')).toThrow();
        expect(() => provider.deserialize('zz'.repeat(16))).toThrow();
      });

      it('should reject wrong-length hex', () => {
        expect(() => provider.deserialize('aa'.repeat(15))).toThrow();
        expect(() => provider.deserialize('aa'.repeat(17))).toThrow();
      });

      it('should reject non-string input', () => {
        expect(() => provider.deserialize(123 as any)).toThrow();
        expect(() => provider.deserialize(null as any)).toThrow();
      });
    });

    describe('Equality', () => {
      it('should compare identical buffers as equal', () => {
        const id = provider.generate();
        const clone = Buffer.from(id);
        expect(provider.equals(id, clone)).toBe(true);
      });

      it('should compare different buffers as not equal', () => {
        const a = provider.generate();
        const b = provider.generate();
        expect(provider.equals(a, b)).toBe(false);
      });

      it('should be reflexive', () => {
        const id = provider.generate();
        expect(provider.equals(id, id)).toBe(true);
      });
    });

    describe('Cloning', () => {
      it('should create independent copies', () => {
        const original = provider.generate();
        const cloned = provider.clone(original);

        expect(provider.equals(original, cloned)).toBe(true);
        expect(original).not.toBe(cloned); // Different Buffer instances
      });

      it('should be mutation-safe', () => {
        const original = provider.generate();
        const cloned = provider.clone(original);

        cloned[0] = (cloned[0] + 1) % 256;
        expect(provider.equals(original, cloned)).toBe(false);
      });
    });

    describe('Native Type Conversion (toBytes/fromBytes)', () => {
      it('should round-trip through toBytes/fromBytes', () => {
        const id = provider.generate();
        const bytes = provider.toBytes(id);
        const restored = provider.fromBytes(bytes);

        expect(provider.equals(id, restored)).toBe(true);
      });

      it('should return Buffer instances', () => {
        const id = provider.generate();
        expect(Buffer.isBuffer(provider.toBytes(id))).toBe(true);
        expect(Buffer.isBuffer(provider.fromBytes(id))).toBe(true);
      });

      it('fromBytes/toBytes are pass-through for BufferIdProvider', () => {
        const id = provider.generate();
        expect(provider.toBytes(id)).toBe(id);
        expect(provider.fromBytes(id)).toBe(id);
      });
    });

    describe('String Conversion (idToString/idFromString)', () => {
      it('should round-trip through idToString/idFromString', () => {
        const id = provider.generate();
        const str = provider.idToString(id);
        const restored = provider.idFromString(str);

        expect(typeof str).toBe('string');
        expect(provider.equals(id, restored)).toBe(true);
      });

      it('idToString should produce hex string', () => {
        const id = provider.generate();
        const str = provider.idToString(id);
        expect(str).toMatch(/^[0-9a-f]+$/);
        expect(str.length).toBe(32);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // GuidV4Provider (Node.js)
  // ─────────────────────────────────────────────────────────────
  describe('GuidV4Provider (Node.js)', () => {
    let provider: GuidV4Provider;

    beforeEach(() => {
      provider = new GuidV4Provider();
    });

    describe('Construction', () => {
      it('should have correct byte length', () => {
        expect(provider.byteLength).toBe(16);
      });

      it('should have correct name', () => {
        expect(provider.name).toBe('GUIDv4');
      });
    });

    describe('Generation', () => {
      it('should generate valid v4 GUIDs', () => {
        for (let i = 0; i < 100; i++) {
          const id = provider.generate();
          expect(Buffer.isBuffer(id)).toBe(true);
          expect(id.length).toBe(16);
          expect(provider.validate(id)).toBe(true);
        }
      });

      it('should generate unique GUIDs', () => {
        const ids = new Set<string>();
        const count = 1000;

        for (let i = 0; i < count; i++) {
          const id = provider.generate();
          ids.add(provider.serialize(id));
        }

        expect(ids.size).toBe(count);
      });

      it('should set v4 version bits correctly', () => {
        const id = provider.generate();
        const versionNibble = (id[6] >> 4) & 0x0f;
        expect(versionNibble).toBe(4);
      });

      it('should set RFC 4122 variant bits correctly', () => {
        const id = provider.generate();
        const variantBits = (id[8] >> 6) & 0x03;
        expect(variantBits).toBe(2); // Binary 10
      });

      it('should have version 4 via getVersion()', () => {
        const id = provider.generate();
        expect(provider.getVersion(id)).toBe(4);
      });
    });

    describe('Validation', () => {
      it('should validate correctly generated GUIDs', () => {
        for (let i = 0; i < 100; i++) {
          const id = provider.generate();
          expect(provider.validate(id)).toBe(true);
        }
      });

      it('should reject wrong length', () => {
        expect(provider.validate(Buffer.alloc(15))).toBe(false);
        expect(provider.validate(Buffer.alloc(17))).toBe(false);
      });

      it('should reject non-v4 version', () => {
        const id = provider.generate();
        // Change version to v3
        id[6] = (id[6] & 0x0f) | 0x30;
        expect(provider.validate(id)).toBe(false);
      });

      it('should detect empty GUIDs', () => {
        const empty = Buffer.alloc(16);
        expect(provider.isEmpty(empty)).toBe(true);

        const nonEmpty = provider.generate();
        expect(provider.isEmpty(nonEmpty)).toBe(false);
      });
    });

    describe('Serialization', () => {
      it('should serialize to base64 string (24 chars)', () => {
        const id = provider.generate();
        const serialized = provider.serialize(id);

        expect(serialized.length).toBe(24);
        expect(serialized).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });

      it('should produce consistent serialization', () => {
        const id = provider.generate();
        expect(provider.serialize(id)).toBe(provider.serialize(id));
      });

      it('should throw on wrong-length input', () => {
        expect(() => provider.serialize(Buffer.alloc(15))).toThrow();
        expect(() => provider.serialize(Buffer.alloc(17))).toThrow();
      });
    });

    describe('Deserialization', () => {
      it('should round-trip through base64 serialization', () => {
        for (let i = 0; i < 100; i++) {
          const original = provider.generate();
          const base64 = provider.serialize(original);
          const deserialized = provider.deserialize(base64);

          const guid1 = provider.fromBytes(original);
          const guid2 = provider.fromBytes(deserialized);
          expect(provider.equals(guid1, guid2)).toBe(true);
        }
      });

      it('should accept full hex GUID with dashes (36 chars)', () => {
        const id = provider.generate();
        const guid = provider.fromBytes(id);
        const fullHex = guid.asFullHexGuid;

        const deserialized = provider.deserialize(fullHex);
        const guid2 = provider.fromBytes(deserialized);
        expect(provider.equals(guid, guid2)).toBe(true);
      });

      it('should accept short hex GUID without dashes (32 chars)', () => {
        const id = provider.generate();
        const guid = provider.fromBytes(id);
        const shortHex = guid.asShortHexGuid;

        const deserialized = provider.deserialize(shortHex);
        const guid2 = provider.fromBytes(deserialized);
        expect(provider.equals(guid, guid2)).toBe(true);
      });

      it('should reject non-string input', () => {
        expect(() => provider.deserialize(123 as any)).toThrow();
        expect(() => provider.deserialize(null as any)).toThrow();
      });

      it('should reject invalid strings', () => {
        expect(() => provider.deserialize('invalid')).toThrow();
        expect(() => provider.deserialize('')).toThrow();
      });
    });

    describe('Equality', () => {
      it('should compare identical GUIDs as equal', () => {
        const id = provider.generate();
        const guid1 = provider.fromBytes(id);
        const guid2 = provider.clone(guid1);
        expect(provider.equals(guid1, guid2)).toBe(true);
      });

      it('should compare different GUIDs as not equal', () => {
        const guid1 = provider.fromBytes(provider.generate());
        const guid2 = provider.fromBytes(provider.generate());
        expect(provider.equals(guid1, guid2)).toBe(false);
      });
    });

    describe('Cloning', () => {
      it('should create independent copies', () => {
        const original = provider.fromBytes(provider.generate());
        const cloned = provider.clone(original);

        expect(provider.equals(original, cloned)).toBe(true);
        expect(original).not.toBe(cloned);
      });
    });

    describe('Native Type Conversion (toBytes/fromBytes)', () => {
      it('should round-trip through toBytes/fromBytes', () => {
        const id = provider.generate();
        const guid = provider.fromBytes(id);
        const bytes = provider.toBytes(guid);
        const restored = provider.fromBytes(bytes);

        expect(bytes.length).toBe(16);
        expect(provider.equals(guid, restored)).toBe(true);
      });

      it('should produce GuidBuffer instances from fromBytes', () => {
        const bytes = provider.generate();
        const native = provider.fromBytes(bytes);

        expect(native.asFullHexGuid).toBeDefined();
        expect(typeof native.asFullHexGuid).toBe('string');
      });

      it('should return Buffer from toBytes', () => {
        const guid = provider.fromBytes(provider.generate());
        const bytes = provider.toBytes(guid);
        expect(Buffer.isBuffer(bytes)).toBe(true);
      });
    });

    describe('String Conversion (idToString/idFromString)', () => {
      it('should round-trip through idToString/idFromString', () => {
        const guid = provider.fromBytes(provider.generate());
        const str = provider.idToString(guid);
        const restored = provider.idFromString(str);

        expect(typeof str).toBe('string');
        expect(provider.equals(guid, restored)).toBe(true);
      });

      it('should produce full hex GUID string from idToString', () => {
        const guid = provider.fromBytes(provider.generate());
        const str = provider.idToString(guid);

        // Full hex GUID format: xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx
        expect(str).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      });

      it('idFromString should reject non-v4 GUIDs', () => {
        // A well-known v1 UUID
        expect(() =>
          provider.idFromString('6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
        ).toThrow();
      });
    });

    describe('Namespace GUIDs (v5)', () => {
      it('should create deterministic GUIDs from namespace + name', () => {
        const buf1 = provider.fromNamespace(
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          'hello',
        );
        const buf2 = provider.fromNamespace(
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          'hello',
        );

        expect(buf1.equals(buf2)).toBe(true);
      });

      it('should produce different GUIDs for different names', () => {
        const ns = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const buf1 = provider.fromNamespace(ns, 'hello');
        const buf2 = provider.fromNamespace(ns, 'world');

        expect(buf1.equals(buf2)).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Cross-Provider Compatibility
  // ─────────────────────────────────────────────────────────────
  describe('Cross-Provider Compatibility', () => {
    it('BufferIdProvider and GuidV4Provider have different native types', () => {
      const bufferProvider = new BufferIdProvider(16);
      const guidProvider = new GuidV4Provider();

      const bufferId = bufferProvider.generate();
      const guidId = guidProvider.generate();

      // BufferIdProvider native type is Buffer
      const bufferNative = bufferProvider.fromBytes(bufferId);
      expect(Buffer.isBuffer(bufferNative)).toBe(true);

      // GuidV4Provider native type is GuidBuffer (GuidV4Buffer)
      const guidNative = guidProvider.fromBytes(guidId);
      expect(guidNative.asFullHexGuid).toBeDefined();
    });

    it('should maintain distinct serialization formats', () => {
      const bufferProvider = new BufferIdProvider(16);
      const guidProvider = new GuidV4Provider();

      const bufferId = bufferProvider.generate();
      const guidId = guidProvider.generate();

      const bufferStr = bufferProvider.serialize(bufferId);
      const guidStr = guidProvider.serialize(guidId);

      // BufferIdProvider: 32 hex chars, GuidV4Provider: 24 base64 chars
      expect(bufferStr.length).toBe(32);
      expect(guidStr.length).toBe(24);
    });

    it('all Node.js providers should implement IIdProvider consistently', () => {
      const providers = [new BufferIdProvider(16), new GuidV4Provider()];

      for (const prov of providers) {
        expect(typeof prov.byteLength).toBe('number');
        expect(typeof prov.name).toBe('string');
        expect(typeof prov.generate).toBe('function');
        expect(typeof prov.validate).toBe('function');
        expect(typeof prov.serialize).toBe('function');
        expect(typeof prov.deserialize).toBe('function');
        expect(typeof prov.equals).toBe('function');
        expect(typeof prov.clone).toBe('function');
        expect(typeof prov.toBytes).toBe('function');
        expect(typeof prov.fromBytes).toBe('function');
        expect(typeof prov.idToString).toBe('function');
        expect(typeof prov.idFromString).toBe('function');
        expect(typeof prov.parseSafe).toBe('function');

        const bytes = prov.generate();
        expect(bytes.length).toBe(prov.byteLength);
        expect(prov.validate(bytes)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // BufferIdProvider with varying sizes
  // ─────────────────────────────────────────────────────────────
  describe('BufferIdProvider — size variations', () => {
    const sizes = [1, 4, 8, 12, 16, 20, 32, 64, 128, 255];

    for (const size of sizes) {
      it(`should work correctly with ${size}-byte IDs`, () => {
        const prov = new BufferIdProvider(size, `Size${size}`);

        // Generate & validate
        const id = prov.generate();
        expect(id.length).toBe(size);
        expect(prov.validate(id)).toBe(true);
        expect(prov.name).toBe(`Size${size}`);

        // Serialize & round-trip
        const hex = prov.serialize(id);
        expect(hex.length).toBe(size * 2);
        const deserialized = prov.deserialize(hex);
        expect(prov.equals(id, deserialized)).toBe(true);

        // Clone
        const cloned = prov.clone(id);
        expect(prov.equals(id, cloned)).toBe(true);
        expect(id).not.toBe(cloned);

        // toBytes/fromBytes
        const bytes = prov.toBytes(id);
        const restored = prov.fromBytes(bytes);
        expect(prov.equals(id, restored)).toBe(true);

        // idToString/idFromString
        const str = prov.idToString(id);
        const fromStr = prov.idFromString(str);
        expect(prov.equals(id, fromStr)).toBe(true);
      });
    }
  });
});
