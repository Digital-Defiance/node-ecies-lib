/**
 * @fileoverview Tests for Node.js ECIES typed configuration system
 */

import { ObjectId } from 'bson';
import {
  ObjectIdProvider,
  GuidV4Provider,
  UuidProvider,
  CustomIdProvider,
  GuidV4Uint8Array,
} from '@digitaldefiance/ecies-lib';
import {
  getEnhancedNodeIdProvider,
  getTypedNodeIdProvider,
  createNodeTypedConfiguration,
  createNodeObjectIdConfiguration,
  type IEnhancedNodeIdProvider,
  type ITypedNodeIdProvider,
  type INodeTypedConfiguration,
  ensureEnhancedNodeIdProvider,
} from './typed-configuration';
import { registerNodeRuntimeConfiguration } from './constants';
import { BufferIdProvider } from './lib';

describe('Node.js Typed Configuration System', () => {
  describe('getEnhancedNodeIdProvider', () => {
    it('should provide both original and typed methods for ObjectId', () => {
      // Configure with ObjectIdProvider
      registerNodeRuntimeConfiguration('objectid-config', {
        idProvider: new ObjectIdProvider(),
      });

      const provider = getEnhancedNodeIdProvider<ObjectId>();

      // Test original methods
      expect(provider.byteLength).toBe(12);
      expect(provider.name).toBe('ObjectID');

      const rawBytes = provider.generate();
      expect(rawBytes).toBeInstanceOf(Uint8Array);
      expect(rawBytes.length).toBe(12);

      const _unknownObj = provider.fromBytes(rawBytes); // Returns unknown

      // Test typed methods
      const typedId = provider.generateTyped();
      expect(typedId).toBeDefined();
      // Note: In Node.js environment, ObjectId might not be available, so we test the structure

      const typedFromBytes = provider.fromBytesTyped(rawBytes);
      expect(typedFromBytes).toBeDefined();

      // Test underlying provider access
      expect(provider.underlyingProvider).toBeDefined();
      expect(provider.underlyingProvider.byteLength).toBe(12);
    });

    it('should work with GuidV4Provider', () => {
      registerNodeRuntimeConfiguration('guid-config', {
        idProvider: new GuidV4Provider(),
      });

      const provider = getEnhancedNodeIdProvider<string>();

      expect(provider.byteLength).toBe(16);
      expect(provider.name).toBe('GUIDv4');

      const typedId = provider.generateTyped();
      expect(typedId).toBeDefined();
      // GuidV4Provider actually returns a GUID object, not a string
      expect(typeof typedId).toBe('object');

      const rawBytes = provider.generate();
      const typedFromBytes = provider.fromBytesTyped(rawBytes);
      expect(typedFromBytes).toBeDefined();
    });

    it('should work with UuidProvider', () => {
      registerNodeRuntimeConfiguration('uuid-config', {
        idProvider: new UuidProvider(),
      });

      const provider = getEnhancedNodeIdProvider<string>();

      expect(provider.byteLength).toBe(16);
      expect(provider.name).toBe('UUID');

      const typedId = provider.generateTyped();
      expect(typeof typedId).toBe('string');

      const rawBytes = provider.generate();
      const typedFromBytes = provider.fromBytesTyped(rawBytes);
      expect(typeof typedFromBytes).toBe('string');
    });
  });

  describe('getTypedNodeIdProvider', () => {
    it('should provide only typed methods', () => {
      registerNodeRuntimeConfiguration('objectid-config', {
        idProvider: new ObjectIdProvider(),
      });

      const provider = getTypedNodeIdProvider<ObjectId>();

      // Should have typed methods
      expect(typeof provider.generateTyped).toBe('function');
      expect(typeof provider.fromBytesTyped).toBe('function');
      expect(typeof provider.toBytesTyped).toBe('function');
      expect(typeof provider.serializeTyped).toBe('function');
      expect(typeof provider.deserializeTyped).toBe('function');

      // Should have properties
      expect(provider.byteLength).toBe(12);
      expect(provider.name).toBe('ObjectID');

      // Should NOT have original IIdProvider methods
      expect('generate' in provider).toBe(false);
      expect('fromBytes' in provider).toBe(false);
      expect('toBytes' in provider).toBe(false);
    });

    it('should handle round-trip operations', () => {
      registerNodeRuntimeConfiguration('guid-config', {
        idProvider: new GuidV4Provider(),
      });

      const provider = getTypedNodeIdProvider<string>();

      const originalId = provider.generateTyped();
      const bytes = provider.toBytesTyped(originalId);
      const restoredId = provider.fromBytesTyped(bytes);

      expect(restoredId).toBeDefined();

      // Test serialization round-trip
      const serialized = provider.serializeTyped(originalId);
      const deserializedId = provider.deserializeTyped(serialized);
      expect(deserializedId).toBeDefined();
    });
  });

  describe('createNodeTypedConfiguration', () => {
    it('should create complete typed configuration', () => {
      const config = createNodeTypedConfiguration<ObjectId>('objectid-config');

      expect(config.constants).toBeDefined();
      expect(config.enhancedIdProvider).toBeDefined();
      expect(config.typedIdProvider).toBeDefined();

      // Test convenience methods
      const id = config.generateId();
      expect(id).toBeDefined();

      const bytes = config.idToBytes(id);
      expect(bytes).toBeInstanceOf(Uint8Array);

      const restoredId = config.idFromBytes(bytes);
      expect(restoredId).toEqual(id);
    });

    it('should accept custom overrides', () => {
      const config = createNodeTypedConfiguration<string>('uuid-config', {
        idProvider: new UuidProvider(),
      });

      expect(config.constants.idProvider.name).toBe('UUID');
      expect(config.constants.idProvider.byteLength).toBe(16);

      const id = config.generateId();
      expect(typeof id).toBe('string');
    });
  });

  describe('createNodeObjectIdConfiguration', () => {
    it('should create ObjectId-specific configuration', () => {
      // Reset to ObjectId configuration first
      registerNodeRuntimeConfiguration('objectid-config', {
        idProvider: new ObjectIdProvider(),
      });

      const config = createNodeObjectIdConfiguration();

      expect(config.constants.idProvider.name).toBe('ObjectID');
      expect(config.constants.idProvider.byteLength).toBe(12);

      const objectId = config.generateId();
      expect(objectId).toBeDefined();

      const bytes = config.idToBytes(objectId);
      expect(bytes.length).toBe(12);

      const restored = config.idFromBytes(bytes);
      expect(restored).toEqual(objectId);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety across operations', () => {
      // This test verifies compile-time type safety
      const objectIdConfig = createNodeObjectIdConfiguration();
      const guidConfig = createNodeTypedConfiguration<string>('guid-config', {
        idProvider: new GuidV4Provider(),
      });

      // ObjectId operations
      const objectId = objectIdConfig.generateId(); // Should be ObjectId
      const objectIdBytes = objectIdConfig.idToBytes(objectId);
      const restoredObjectId = objectIdConfig.idFromBytes(objectIdBytes);

      // GUID operations
      const guidId = guidConfig.generateId(); // Should be GUID object
      const guidBytes = guidConfig.idToBytes(guidId);
      const restoredGuid = guidConfig.idFromBytes(guidBytes);

      // Verify types are maintained
      expect(typeof guidId).toBe('object'); // GuidV4Provider returns objects
      expect(typeof restoredGuid).toBe('object');
      expect(objectIdBytes).toBeInstanceOf(Uint8Array);
      expect(guidBytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('Integration with Node.js Runtime Configuration', () => {
    it('should use the current runtime configuration', () => {
      // Set up a specific configuration
      const customProvider = new CustomIdProvider(20, 'Custom20Byte');
      registerNodeRuntimeConfiguration('custom-config', {
        idProvider: customProvider,
      });

      const enhancedProvider = getEnhancedNodeIdProvider<Uint8Array>();
      const typedProvider = getTypedNodeIdProvider<Uint8Array>();
      const config = createNodeTypedConfiguration<Uint8Array>('custom-config');

      // All should use the same configured provider
      expect(enhancedProvider.byteLength).toBe(20);
      expect(typedProvider.byteLength).toBe(20);
      expect(config.constants.idProvider.byteLength).toBe(20);

      expect(enhancedProvider.name).toBe('Custom20Byte');
      expect(typedProvider.name).toBe('Custom20Byte');
      expect(config.constants.idProvider.name).toBe('Custom20Byte');
    });

    it('should reflect configuration changes', () => {
      // Start with ObjectId
      registerNodeRuntimeConfiguration('objectid-config', {
        idProvider: new ObjectIdProvider(),
      });

      const provider = getEnhancedNodeIdProvider<ObjectId>();
      expect(provider.byteLength).toBe(12);

      // Switch to GUID
      registerNodeRuntimeConfiguration('guid-config', {
        idProvider: new GuidV4Provider(),
      });

      const guidProvider = getEnhancedNodeIdProvider<GuidV4Uint8Array>();
      expect(guidProvider.byteLength).toBe(16);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid bytes gracefully', () => {
      const provider = getTypedNodeIdProvider<ObjectId>();

      // Test with invalid byte length
      const invalidBytes = new Uint8Array(5); // ObjectId needs 12 bytes

      expect(() => {
        provider.fromBytesTyped(invalidBytes);
      }).toThrow();
    });

    it('should handle invalid serialized data', () => {
      const provider = getTypedNodeIdProvider<string>();

      expect(() => {
        provider.deserializeTyped('invalid-serialized-data');
      }).toThrow();
    });
  });

  describe('ensureEnhancedIdProvider', () => {
    it('should return provider when name matches', () => {
      registerNodeRuntimeConfiguration('objectid-config', {
        idProvider: new ObjectIdProvider(),
      });

      const provider = ensureEnhancedNodeIdProvider<ObjectId>('ObjectID');

      expect(provider).toBeDefined();
      expect(provider.name).toBe('ObjectID');

      const id = provider.generateTyped();
      expect(id).toBeDefined();

      const id2 = provider.generateTyped();
      expect(id2).toBeDefined();
    });

    it('should throw error when name does not match', () => {
      registerNodeRuntimeConfiguration('guid-config', {
        idProvider: new GuidV4Provider(),
      });

      expect(() => {
        ensureEnhancedNodeIdProvider<ObjectId>('ObjectID');
      }).toThrow('Provider name mismatch. Expected ObjectID, got GUIDv4');
    });

    it('should work with custom configuration keys', () => {
      const testKey = 'test-guid-config';
      registerNodeRuntimeConfiguration(testKey, {
        idProvider: new GuidV4Provider(),
      });

      const provider = ensureEnhancedNodeIdProvider<GuidV4Uint8Array>('GUIDv4');
      expect(provider.name).toBe('GUIDv4');

      const id = provider.generateTyped();
      expect(typeof id.asFullHexGuid).toBe('string');
    });

    it('should throw error for mismatched name with custom key', () => {
      const testKey = 'test-uuid-config';
      registerNodeRuntimeConfiguration(testKey, {
        idProvider: new UuidProvider(),
      });

      expect(() => {
        ensureEnhancedNodeIdProvider<string>('ObjectID');
      }).toThrow('Provider name mismatch. Expected ObjectID, got UUID');
    });
  });

  describe('Enhanced Providers - All Types', () => {
    it('should work with ObjectIdProvider', () => {
      const key = 'test-objectid';
      registerNodeRuntimeConfiguration(key, {
        idProvider: new ObjectIdProvider(),
      });
      const provider = getEnhancedNodeIdProvider<ObjectId>();

      const id = provider.generateTyped();
      expect(id).toBeDefined();
      expect(provider.validateTyped(id)).toBe(true);

      const serialized = provider.serializeTyped(id);
      expect(serialized).toHaveLength(24);
      const deserialized = provider.deserializeTyped(serialized);
      expect(deserialized).toBeDefined();
    });

    it('should work with GuidV4Provider', () => {
      const key = 'test-guidv4';
      registerNodeRuntimeConfiguration(key, {
        idProvider: new GuidV4Provider(),
      });
      const provider = getEnhancedNodeIdProvider<GuidV4Uint8Array>();

      const id = provider.generateTyped();
      expect(typeof id.asFullHexGuid).toBe('string');
      expect(provider.validateTyped(id)).toBe(true);

      const serialized = provider.serializeTyped(id);
      expect(provider.deserializeTyped(serialized).equals(id)).toBe(true);
    });

    it('should work with UuidProvider', () => {
      const key = 'test-uuid';
      registerNodeRuntimeConfiguration(key, { idProvider: new UuidProvider() });
      const provider = getEnhancedNodeIdProvider<string>();

      const id = provider.generateTyped();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(provider.validateTyped(id)).toBe(true);

      const serialized = provider.serializeTyped(id);
      expect(provider.deserializeTyped(serialized)).toBe(id);
    });

    it('should work with BufferProvider', () => {
      registerNodeRuntimeConfiguration('buffer-config', {
        idProvider: new BufferIdProvider(16),
      });
      const provider = getEnhancedNodeIdProvider<Uint8Array>();

      const id = provider.generateTyped();
      expect(id).toBeInstanceOf(Buffer);
      expect(id.length).toBe(16);
      expect(provider.validateTyped(id)).toBe(true);

      const serialized = provider.serializeTyped(id);
      const deserialized = provider.deserializeTyped(serialized);
      expect(deserialized).toEqual(id);
    });
  });
});
