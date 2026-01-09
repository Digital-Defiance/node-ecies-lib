/**
 * @fileoverview Tests for Node.js ECIES typed configuration system
 */

import type { ObjectId } from 'mongodb';
import {
  ObjectIdProvider,
  GuidV4Provider,
  UuidProvider,
  CustomIdProvider,
} from '@digitaldefiance/ecies-lib';
import {
  getEnhancedNodeIdProvider,
  getTypedNodeIdProvider,
  createNodeTypedConfiguration,
  createNodeObjectIdConfiguration,
  type IEnhancedNodeIdProvider,
  type ITypedNodeIdProvider,
  type INodeTypedConfiguration,
} from './typed-configuration';
import { registerNodeRuntimeConfiguration } from './constants';

describe('Node.js Typed Configuration System', () => {
  describe('getEnhancedNodeIdProvider', () => {
    it('should provide both original and typed methods for ObjectId', () => {
      // Configure with ObjectIdProvider
      registerNodeRuntimeConfiguration({
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
      registerNodeRuntimeConfiguration({
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
      registerNodeRuntimeConfiguration({
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
      registerNodeRuntimeConfiguration({
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
      registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const provider = getTypedNodeIdProvider<string>();

      const originalId = provider.generateTyped();
      const bytes = provider.toBytesTyped(originalId);
      const restoredId = provider.fromBytesTyped(bytes);

      expect(restoredId).toStrictEqual(originalId);

      // Test serialization round-trip
      const serialized = provider.serializeTyped(originalId);
      const deserializedId = provider.deserializeTyped(serialized);
      expect(deserializedId).toStrictEqual(originalId);
    });
  });

  describe('createNodeTypedConfiguration', () => {
    it('should create complete typed configuration', () => {
      const config = createNodeTypedConfiguration<ObjectId>();

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
      const config = createNodeTypedConfiguration<string>({
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
      registerNodeRuntimeConfiguration({
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
      const guidConfig = createNodeTypedConfiguration<string>({
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
      registerNodeRuntimeConfiguration({
        idProvider: customProvider,
      });

      const enhancedProvider = getEnhancedNodeIdProvider<Uint8Array>();
      const typedProvider = getTypedNodeIdProvider<Uint8Array>();
      const config = createNodeTypedConfiguration<Uint8Array>();

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
      registerNodeRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      let provider = getEnhancedNodeIdProvider<ObjectId>();
      expect(provider.byteLength).toBe(12);

      // Switch to GUID
      registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      provider = getEnhancedNodeIdProvider<string>();
      expect(provider.byteLength).toBe(16);
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
});
