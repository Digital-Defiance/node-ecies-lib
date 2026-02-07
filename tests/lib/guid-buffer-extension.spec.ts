/**
 * Tests for GuidBuffer extension of Buffer
 * Ensures proper inheritance, Buffer handling, and version attachment
 */
import { GuidUint8Array } from '@digitaldefiance/ecies-lib';
import { GuidBuffer } from '../../src/lib/guid';

describe('GuidBuffer Extension Tests', () => {
  describe('Inheritance', () => {
    it('should extend Buffer directly', () => {
      const guid = GuidBuffer.v4();
      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid).toBeInstanceOf(Buffer);
      expect(guid).toBeInstanceOf(Uint8Array);
      expect(Buffer.isBuffer(guid)).toBe(true);
    });

    it('should be compatible with Uint8Array type', () => {
      const guid: Uint8Array = GuidBuffer.v4();
      expect(guid).toBeDefined();
    });

    it('should produce same bytes as GuidUint8Array for same input', () => {
      const hexGuid = '550e8400-e29b-41d4-a716-446655440000';
      const guidBuffer = new GuidBuffer(hexGuid);
      const guidUint8Array = new GuidUint8Array(hexGuid);

      expect(Array.from(guidBuffer)).toEqual(Array.from(guidUint8Array));
    });
  });

  describe('Buffer Conversion', () => {
    it('should convert Uint8Array to Buffer in constructor', () => {
      const v4 = GuidUint8Array.v4();
      const uint8 = v4.asPlatformBuffer;
      const guid = new GuidBuffer(uint8);
      expect(Buffer.isBuffer(guid)).toBe(true);
      expect(Buffer.isBuffer(guid.asRawBuffer)).toBe(true);
    });

    it('should keep Buffer as Buffer in constructor', () => {
      const v4 = GuidUint8Array.v4();
      const buffer = Buffer.from(v4.asPlatformBuffer);
      const guid = new GuidBuffer(buffer);
      expect(Buffer.isBuffer(guid)).toBe(true);
      expect(Buffer.isBuffer(guid.asRawBuffer)).toBe(true);
    });
  });

  describe('Version Attachment', () => {
    it('should attach version to v1 GUID', () => {
      const guid = GuidBuffer.v1();
      expect(guid.__version).toBe(1);
      expect(guid.getVersion()).toBe(1);
    });

    it('should attach version to v3 GUID', () => {
      const guid = GuidBuffer.v3('test', GuidBuffer.Namespaces.DNS);
      expect(guid.__version).toBe(3);
      expect(guid.getVersion()).toBe(3);
    });

    it('should attach version to v4 GUID', () => {
      const guid = GuidBuffer.v4();
      expect(guid.__version).toBe(4);
      expect(guid.getVersion()).toBe(4);
    });

    it('should attach version to v5 GUID', () => {
      const guid = GuidBuffer.v5('test', GuidBuffer.Namespaces.DNS);
      expect(guid.__version).toBe(5);
      expect(guid.getVersion()).toBe(5);
    });

    it('should attach version to v6 GUID', () => {
      const guid = GuidBuffer.v6();
      expect(guid.__version).toBe(6);
      expect(guid.getVersion()).toBe(6);
    });

    it('should attach version to v7 GUID', () => {
      const guid = GuidBuffer.v7();
      expect(guid.__version).toBe(7);
      expect(guid.getVersion()).toBe(7);
    });

    it('should attach version via parse', () => {
      const v4 = GuidBuffer.v4();
      const parsed = GuidBuffer.parse(v4.asFullHexGuid);
      expect(parsed.__version).toBe(4);
    });

    it('should attach version via tryParse', () => {
      const v4 = GuidBuffer.v4();
      const parsed = GuidBuffer.tryParse(v4.asFullHexGuid);
      expect(parsed?.__version).toBe(4);
    });

    it('should attach version via factory methods', () => {
      const v4 = GuidBuffer.v4();

      const fromFullHex = GuidBuffer.fromFullHex(v4.asFullHexGuid);
      expect(fromFullHex.__version).toBe(4);

      const fromShortHex = GuidBuffer.fromShortHex(v4.asShortHexGuid);
      expect(fromShortHex.__version).toBe(4);

      const fromBase64 = GuidBuffer.fromBase64(v4.asBase64Guid);
      expect(fromBase64.__version).toBe(4);

      const fromBigInt = GuidBuffer.fromBigInt(v4.asBigIntGuid);
      expect(fromBigInt.__version).toBe(4);

      const fromPlatformBuffer = GuidBuffer.fromPlatformBuffer(
        v4.asRawGuidPlatformBuffer,
      );
      expect(fromPlatformBuffer.__version).toBe(4);
    });

    it('should attach version via clone', () => {
      const v4 = GuidBuffer.v4();
      const cloned = v4.clone();
      expect(cloned.__version).toBe(4);
    });
  });

  describe('Buffer-Specific Methods', () => {
    it('should return plain Buffer from asRawBuffer', () => {
      const guid = GuidBuffer.v4();
      const buffer = guid.asRawBuffer;
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(16);
      // asRawBuffer should return a copy, not the same instance
      expect(buffer).not.toBe(guid);
    });

    it('should return Uint8Array from asUint8Array', () => {
      const guid = GuidBuffer.v4();
      const uint8 = guid.asUint8Array;
      expect(uint8).toBeInstanceOf(Uint8Array);
      expect(Buffer.isBuffer(uint8)).toBe(false);
      expect(uint8.length).toBe(16);
    });

    it('should return Buffer from asPlatformBuffer', () => {
      const guid = GuidBuffer.v4();
      const platform = guid.asPlatformBuffer;
      expect(Buffer.isBuffer(platform)).toBe(true);
    });

    it('fromBuffer should create GuidBuffer', () => {
      const v4 = GuidBuffer.v4();
      const buffer = Buffer.from(v4.asRawGuidPlatformBuffer);
      const guid = GuidBuffer.fromBuffer(buffer);
      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.__version).toBeDefined();
    });

    it('fromUint8Array should create GuidBuffer', () => {
      const v4 = GuidBuffer.v4();
      const uint8 = new Uint8Array(v4.asRawGuidPlatformBuffer);
      const guid = GuidBuffer.fromUint8Array(uint8);
      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.__version).toBeDefined();
    });
  });

  describe('Static Method Overrides', () => {
    it('generate should return GuidBuffer', () => {
      const guid = GuidBuffer.generate();
      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.__version).toBe(4);
    });

    it('new should return GuidBuffer', () => {
      const guid = GuidBuffer.new();
      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.__version).toBe(4);
    });

    it('all version methods should return GuidBuffer', () => {
      expect(GuidBuffer.v1()).toBeInstanceOf(GuidBuffer);
      expect(GuidBuffer.v3('test', GuidBuffer.Namespaces.DNS)).toBeInstanceOf(
        GuidBuffer,
      );
      expect(GuidBuffer.v4()).toBeInstanceOf(GuidBuffer);
      expect(GuidBuffer.v5('test', GuidBuffer.Namespaces.DNS)).toBeInstanceOf(
        GuidBuffer,
      );
      expect(GuidBuffer.v6()).toBeInstanceOf(GuidBuffer);
      expect(GuidBuffer.v7()).toBeInstanceOf(GuidBuffer);
    });
  });

  describe('Type Compatibility', () => {
    it('should work with PlatformID type', () => {
      const guid = GuidBuffer.v4();
      const buffer: Buffer = guid.asRawBuffer;
      expect(buffer).toBeDefined();
    });

    it('should maintain compatibility with base class methods', () => {
      const guid = GuidBuffer.v4();

      expect(guid.asFullHexGuid).toBeDefined();
      expect(guid.asShortHexGuid).toBeDefined();
      expect(guid.asBase64Guid).toBeDefined();
      expect(guid.asBigIntGuid).toBeDefined();
      expect(guid.toString()).toBeDefined();
      expect(guid.toJson()).toBeDefined();
      expect(guid.serialize()).toBeDefined();
      expect(guid.hashCode()).toBeDefined();
      expect(guid.isEmpty()).toBeDefined();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should create same GUID from Uint8Array and Buffer', () => {
      const v4 = GuidBuffer.v4();
      const uint8 = new Uint8Array(v4.asRawGuidPlatformBuffer);
      const buffer = Buffer.from(v4.asRawGuidPlatformBuffer);

      const guidFromUint8 = new GuidBuffer(uint8);
      const guidFromBuffer = new GuidBuffer(buffer);

      expect(guidFromUint8.equals(guidFromBuffer)).toBe(true);
    });

    it('should convert between Buffer and Uint8Array', () => {
      const guid = GuidBuffer.v4();
      const buffer = guid.asRawBuffer;
      const uint8 = guid.asUint8Array;

      expect(Buffer.compare(buffer, Buffer.from(uint8))).toBe(0);
    });
  });

  describe('Backward Compatibility Aliases', () => {
    it('should have isRawGuidBuffer alias', () => {
      const buffer = Buffer.alloc(16);
      expect(GuidBuffer.isRawGuidBuffer(buffer)).toBe(true);
    });

    it('should have toRawGuidBuffer alias', () => {
      const guid = GuidBuffer.v4();
      const buffer = GuidBuffer.toRawGuidBuffer(guid.asFullHexGuid);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });
});
