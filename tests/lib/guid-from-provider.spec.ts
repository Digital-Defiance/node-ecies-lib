import {
  CustomIdProvider,
  GuidError,
  GuidErrorType,
  ObjectIdProvider,
  Uint8ArrayIdProvider,
  UuidProvider,
  GuidV4Provider as GuidV4Uint8ArrayProvider,
} from '@digitaldefiance/ecies-lib';
import { GuidBuffer } from '../../src/lib/guid';
import {
  fromProviderId,
  fromProviderIdBytes,
} from '../../src/lib/guid-provider-utils';
import { GuidV4Provider } from '../../src/lib/id-providers/guidv4-provider';
import { BufferIdProvider } from '../../src/lib/id-providers/buffer-provider';

describe('GuidBuffer.fromProviderId / fromProviderIdBytes', () => {
  describe('GuidV4Provider (node-ecies, 16-byte, direct reinterpretation)', () => {
    const provider = new GuidV4Provider();

    it('should convert a generated GuidV4 id to a GuidBuffer', () => {
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);
      const guid = fromProviderId(nativeId, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
    });

    it('should produce a valid UUID from GuidV4 bytes', () => {
      const rawBytes = provider.generate();
      const guid = fromProviderIdBytes(Buffer.from(rawBytes), provider);

      expect(guid.isValidV4()).toBe(true);
    });

    it('should be deterministic (same input → same output)', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid1 = fromProviderIdBytes(rawBytes, provider);
      const guid2 = fromProviderIdBytes(rawBytes, provider);

      expect(guid1.asFullHexGuid).toBe(guid2.asFullHexGuid);
    });

    it('should preserve the original bytes for 16-byte providers', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid.asRawBuffer.toString('hex')).toBe(rawBytes.toString('hex'));
    });
  });

  describe('GuidV4Uint8ArrayProvider (ecies-lib, 16-byte, direct reinterpretation)', () => {
    const provider = new GuidV4Uint8ArrayProvider();

    it('should convert a GuidV4Uint8Array id to a GuidBuffer', () => {
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);
      const guid = fromProviderId(nativeId, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
    });

    it('should preserve bytes for the Uint8Array-based GuidV4 provider', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid.asRawBuffer.toString('hex')).toBe(rawBytes.toString('hex'));
    });
  });

  describe('UuidProvider (16-byte, direct reinterpretation)', () => {
    const provider = new UuidProvider();

    it('should convert a UUID string id to a GuidBuffer via fromProviderId', () => {
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);
      const guid = fromProviderId(nativeId, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
    });

    it('should preserve the original bytes for UUID provider', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid.asRawBuffer.toString('hex')).toBe(rawBytes.toString('hex'));
    });
  });

  describe('ObjectIdProvider (12-byte, v5 derivation)', () => {
    const provider = new ObjectIdProvider();

    it('should convert an ObjectId to a GuidBuffer via fromProviderId', () => {
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);
      const guid = fromProviderId(nativeId, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
    });

    it('should produce a valid v5 UUID from ObjectId bytes', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid.isValidV5()).toBe(true);
    });

    it('should be deterministic (same ObjectId → same GUID)', () => {
      const rawBytes = Buffer.from(provider.generate());
      const guid1 = fromProviderIdBytes(rawBytes, provider);
      const guid2 = fromProviderIdBytes(rawBytes, provider);

      expect(guid1.asFullHexGuid).toBe(guid2.asFullHexGuid);
    });

    it('should produce different GUIDs for different ObjectIds', () => {
      const bytes1 = Buffer.from(provider.generate());
      const bytes2 = Buffer.from(provider.generate());
      const guid1 = fromProviderIdBytes(bytes1, provider);
      const guid2 = fromProviderIdBytes(bytes2, provider);

      expect(guid1.asFullHexGuid).not.toBe(guid2.asFullHexGuid);
    });
  });

  describe('CustomIdProvider (variable-byte, v5 derivation)', () => {
    it('should convert a 20-byte custom id to a GuidBuffer', () => {
      const provider = new CustomIdProvider(20, 'SHA1Hash');
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
      expect(guid.isValidV5()).toBe(true);
    });

    it('should be deterministic for custom ids', () => {
      const provider = new CustomIdProvider(8, 'Short');
      const rawBytes = Buffer.from(provider.generate());
      const guid1 = fromProviderIdBytes(rawBytes, provider);
      const guid2 = fromProviderIdBytes(rawBytes, provider);

      expect(guid1.asFullHexGuid).toBe(guid2.asFullHexGuid);
    });
  });

  describe('Uint8ArrayIdProvider (variable-byte, v5 derivation)', () => {
    it('should convert a 24-byte Uint8Array id to a GuidBuffer', () => {
      const provider = new Uint8ArrayIdProvider(24, 'Test24');
      const rawBytes = Buffer.from(provider.generate());
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
      expect(guid.isValidV5()).toBe(true);
    });
  });

  describe('BufferIdProvider (node-specific, variable-byte, v5 derivation)', () => {
    it('should convert a 20-byte Buffer id to a GuidBuffer', () => {
      const provider = new BufferIdProvider(20, 'NodeBuffer');
      const rawBytes = provider.generate();
      const guid = fromProviderIdBytes(rawBytes, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.length).toBe(16);
      expect(guid.isValidV5()).toBe(true);
    });

    it('should work with fromProviderId using native Buffer type', () => {
      const provider = new BufferIdProvider(32, 'SHA256');
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);
      const guid = fromProviderId(nativeId, provider);

      expect(guid).toBeInstanceOf(GuidBuffer);
      expect(guid.isValidV5()).toBe(true);
    });

    it('should be deterministic for Buffer ids', () => {
      const provider = new BufferIdProvider(10, 'Test10');
      const rawBytes = provider.generate();
      const guid1 = fromProviderIdBytes(rawBytes, provider);
      const guid2 = fromProviderIdBytes(rawBytes, provider);

      expect(guid1.asFullHexGuid).toBe(guid2.asFullHexGuid);
    });

    it('should produce different GUIDs than CustomIdProvider with same data', () => {
      const bufferProvider = new BufferIdProvider(12, 'Test12');
      const customProvider = new CustomIdProvider(12, 'Test12');
      const rawBytes = bufferProvider.generate();

      const guidFromBuffer = fromProviderIdBytes(rawBytes, bufferProvider);
      const guidFromCustom = fromProviderIdBytes(
        Buffer.from(rawBytes),
        customProvider,
      );

      // Different provider types use different namespaces
      expect(guidFromBuffer.asFullHexGuid).not.toBe(
        guidFromCustom.asFullHexGuid,
      );
    });
  });

  describe('Error handling', () => {
    it('should throw GuidError when byte length does not match provider', () => {
      const provider = new ObjectIdProvider(); // expects 12 bytes
      const wrongBytes = Buffer.alloc(16); // 16 bytes

      expect(() => fromProviderIdBytes(wrongBytes, provider)).toThrow(
        GuidError,
      );
    });

    it('should throw GuidError with correct type for length mismatch', () => {
      const provider = new CustomIdProvider(20, 'Test');
      const wrongBytes = Buffer.alloc(10);

      try {
        fromProviderIdBytes(wrongBytes, provider);
        fail('Expected GuidError to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GuidError);
        expect((e as GuidError).type).toBe(GuidErrorType.InvalidGuid);
      }
    });
  });

  describe('Cross-provider isolation', () => {
    it('should produce unique GUIDs per provider type for the same raw bytes', () => {
      const objectIdProvider = new ObjectIdProvider();
      const customProvider = new CustomIdProvider(12, 'Custom12');
      const uint8Provider = new Uint8ArrayIdProvider(12, 'Uint8_12');
      const bufferProvider = new BufferIdProvider(12, 'Buffer12');

      const rawBytes = Buffer.from(objectIdProvider.generate());

      const guidFromObjectId = fromProviderIdBytes(rawBytes, objectIdProvider);
      const guidFromCustom = fromProviderIdBytes(rawBytes, customProvider);
      const guidFromUint8 = fromProviderIdBytes(rawBytes, uint8Provider);
      const guidFromBuffer = fromProviderIdBytes(rawBytes, bufferProvider);

      const guids = new Set([
        guidFromObjectId.asFullHexGuid,
        guidFromCustom.asFullHexGuid,
        guidFromUint8.asFullHexGuid,
        guidFromBuffer.asFullHexGuid,
      ]);
      expect(guids.size).toBe(4);
    });
  });

  describe('Round-trip consistency', () => {
    it('fromProviderId and fromProviderIdBytes should produce the same result for GuidV4', () => {
      const provider = new GuidV4Provider();
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);

      const guidFromNative = fromProviderId(nativeId, provider);
      const guidFromBytes = fromProviderIdBytes(
        Buffer.from(rawBytes),
        provider,
      );

      expect(guidFromNative.asFullHexGuid).toBe(guidFromBytes.asFullHexGuid);
    });

    it('fromProviderId and fromProviderIdBytes should produce the same result for ObjectId', () => {
      const provider = new ObjectIdProvider();
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);

      const guidFromNative = fromProviderId(nativeId, provider);
      const guidFromBytes = fromProviderIdBytes(
        Buffer.from(rawBytes),
        provider,
      );

      expect(guidFromNative.asFullHexGuid).toBe(guidFromBytes.asFullHexGuid);
    });

    it('fromProviderId and fromProviderIdBytes should produce the same result for BufferIdProvider', () => {
      const provider = new BufferIdProvider(16, 'Test16');
      const rawBytes = provider.generate();
      const nativeId = provider.fromBytes(rawBytes);

      const guidFromNative = fromProviderId(nativeId, provider);
      const guidFromBytes = fromProviderIdBytes(rawBytes, provider);

      expect(guidFromNative.asFullHexGuid).toBe(guidFromBytes.asFullHexGuid);
    });
  });
});
