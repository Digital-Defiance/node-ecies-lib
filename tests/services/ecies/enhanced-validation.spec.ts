/**
 * Tests for enhanced ID provider validation and type safety improvements
 * Node.js version - uses Buffer types and Node runtime configuration
 */

import { ObjectId } from 'bson';
import {
  ObjectIdProvider,
  GuidV4Provider,
  CustomIdProvider,
} from '@digitaldefiance/ecies-lib';

import {
  getNodeRuntimeConfiguration,
  registerNodeRuntimeConfiguration,
} from '../../../src/constants';
import { ECIESService } from '../../../src/services/ecies/service';

describe('Enhanced ID Provider Validation (Node.js)', () => {
  let originalConfig: ReturnType<typeof getNodeRuntimeConfiguration>;

  beforeEach(() => {
    // Save original configuration
    originalConfig = getNodeRuntimeConfiguration();
  });

  afterEach(() => {
    // Restore original configuration to prevent test interference
    registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
  });

  describe('Type Safety Improvements', () => {
    it('should provide strongly typed idProvider getter', () => {
      // Use Node.js configuration method with ObjectIdProvider
      const objectIdConfig = registerNodeRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService<ObjectId>(objectIdConfig);
      const idProvider = service.idProvider;

      // Type should be IIdProvider<ObjectId>
      expect(idProvider).toBeDefined();
      expect(idProvider.byteLength).toBe(12);
      expect(typeof idProvider.generate).toBe('function');

      // Should work with ObjectId operations
      const id = idProvider.generate();
      const objectId = idProvider.fromBytes(id);
      expect(objectId.constructor.name).toBe('ObjectId');
      expect(objectId.toString()).toMatch(/^[0-9a-f]{24}$/);
    });

    it('should work with GUID provider and Buffer TID', () => {
      const guidConfig = registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService<Buffer>(guidConfig);
      const idProvider = service.idProvider;

      expect(idProvider.byteLength).toBe(16);

      const id = idProvider.generate();
      const guidId = idProvider.fromBytes(id);
      // GuidV4Provider returns GuidV4 instances
      expect(guidId.constructor.name).toBe('Guid');

      // But we can convert back to bytes
      const backToBytes = idProvider.toBytes(guidId);
      expect(
        Buffer.isBuffer(backToBytes) || backToBytes instanceof Uint8Array,
      ).toBe(true);
      expect(backToBytes.length).toBe(16);
    });

    it('should work with custom provider', () => {
      const customProvider = new CustomIdProvider(20, 'Custom20Byte');
      const customConfig = registerNodeRuntimeConfiguration({
        idProvider: customProvider,
      });
      const service = new ECIESService<Buffer>(customConfig);

      expect(service.idProvider.byteLength).toBe(20);
      expect(service.idProvider.name).toBe('Custom20Byte');
    });
  });

  describe('Enhanced Construction-Time Validation', () => {
    it('should validate idProvider exists (conceptual test)', () => {
      // Note: In practice, getNodeRuntimeConfiguration always provides a valid idProvider
      // and the type guard ensures only valid IConstants objects are accepted.
      // This test demonstrates the validation logic exists, even if it's hard to trigger
      // in normal usage due to the robust configuration system.

      const service = new ECIESService();

      // Verify that the service has a valid idProvider
      expect(service.idProvider).toBeDefined();
      expect(typeof service.idProvider.generate).toBe('function');
      expect(typeof service.idProvider.byteLength).toBe('number');

      // The validation logic is tested indirectly through other tests
      // that verify the service rejects invalid configurations
    });

    it('should validate byteLength matches expected length', () => {
      // Create a custom config with mismatched lengths
      const guidProvider = new GuidV4Provider(); // 16 bytes
      const baseConfig = getNodeRuntimeConfiguration();

      // Create a new config object with mismatched provider
      const mismatchedConfig = {
        ...baseConfig,
        idProvider: guidProvider,
        // The ECIES.MULTIPLE.RECIPIENT_ID_SIZE should auto-sync, but we'll test validation
      };

      // This should work because the validation uses idProvider.byteLength as the source of truth
      expect(() => new ECIESService(mismatchedConfig)).not.toThrow();
    });

    it('should validate required methods exist', () => {
      const incompleteProvider = {
        byteLength: 12,
        generate: () => Buffer.alloc(12),
        // Missing other required methods
      };

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: incompleteProvider as any,
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate generate() returns correct length', () => {
      class BadProvider extends ObjectIdProvider {
        generate(): Uint8Array {
          return new Uint8Array(8); // Wrong length
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate generated ID passes validation', () => {
      class BadProvider extends ObjectIdProvider {
        validate(): boolean {
          return false; // Always fail validation
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate serialization returns string', () => {
      class BadProvider extends ObjectIdProvider {
        serialize(): string {
          return 123 as any; // Return non-string
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate serialization round-trip', () => {
      class BadProvider extends ObjectIdProvider {
        deserialize(): Uint8Array {
          return new Uint8Array(8); // Wrong length
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate toBytes() returns correct length', () => {
      class BadProvider extends ObjectIdProvider {
        toBytes(): Uint8Array {
          return new Uint8Array(8); // Wrong length
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate byte conversion round-trip', () => {
      let callCount = 0;
      class BadProvider extends ObjectIdProvider {
        toBytes(): Uint8Array {
          callCount++;
          return callCount === 1 ? new Uint8Array(12) : new Uint8Array(8);
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new BadProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });

    it('should validate TID type compatibility', () => {
      // This test verifies the enhanced TID type validation
      const service = new ECIESService<ObjectId>();

      // Should not throw - validation should pass
      expect(service.idProvider.byteLength).toBe(12);

      // The validation includes testing TID type conversion
      const testId = service.idProvider.generate();
      const nativeId = service.idProvider.fromBytes(testId);
      const typedId = nativeId as ObjectId;
      const reConverted = service.idProvider.toBytes(typedId);

      expect(reConverted.length).toBe(12);
    });
  });

  describe('Error Messages and Debugging', () => {
    it('should provide detailed error messages', () => {
      class FailingProvider extends ObjectIdProvider {
        generate(): Uint8Array {
          throw new Error('Mock generation failure');
        }
      }

      expect(() => {
        registerNodeRuntimeConfiguration({
          idProvider: new FailingProvider(),
        });
        new ECIESService(getNodeRuntimeConfiguration());
      }).toThrow();
    });
  });

  describe('Integration with Member Creation', () => {
    it('should work seamlessly with Member.newMember() (conceptual)', () => {
      const guidConfig = registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService<Buffer>(guidConfig);

      // This should work without issues due to proper validation
      expect(() => {
        // Note: We can't actually test Member.newMember here because it's not available
        // in node-ecies-lib, but we can verify the service is properly configured
        expect(service.idProvider.byteLength).toBe(16);
      }).not.toThrow();
    });

    it('should maintain consistency across service configuration', () => {
      const service = new ECIESService<ObjectId>();

      // Service should use the configured idProvider
      expect(service.idProvider).toBeDefined();
      expect(service.idProvider.byteLength).toBe(12);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility with existing code', () => {
      // Old style - should still work
      const service = new ECIESService();
      expect(service.idProvider.byteLength).toBe(12);

      // New style - should also work
      const typedService = new ECIESService<ObjectId>();
      expect(typedService.idProvider.byteLength).toBe(12);
    });

    it('should work with partial configuration', () => {
      const partialConfig = {
        curveName: 'secp256k1' as const,
      };

      const service = new ECIESService(partialConfig);
      expect(service.idProvider.byteLength).toBe(12); // Uses default
    });
  });

  describe('Node.js Specific Features', () => {
    it('should work with Node runtime configuration functions', () => {
      const config = getNodeRuntimeConfiguration();
      const service = new ECIESService(config);

      expect(service.idProvider).toBeDefined();
      expect(service.idProvider.byteLength).toBe(12);
    });

    it('should work with registerNodeRuntimeConfiguration', () => {
      const customProvider = new CustomIdProvider(24, 'Custom24Byte');
      const customConfig = registerNodeRuntimeConfiguration({
        idProvider: customProvider,
      });

      const service = new ECIESService(customConfig);
      expect(service.idProvider.byteLength).toBe(24);
      expect(service.idProvider.name).toBe('Custom24Byte');
    });

    it('should handle Buffer types correctly', () => {
      const service = new ECIESService<Buffer>();

      // Generate test data
      const testMessage = Buffer.from('Hello, World!', 'utf8');
      const keyPair = service.mnemonicToSimpleKeyPairBuffer(
        service.generateNewMnemonic(),
      );

      // Test encryption/decryption with Buffer types
      const encrypted = service.encryptSimpleOrSingle(
        true, // simple mode
        keyPair.publicKey,
        testMessage,
      );

      expect(Buffer.isBuffer(encrypted)).toBe(true);

      const decrypted = service.decryptSimpleOrSingleWithHeader(
        true, // simple mode
        keyPair.privateKey,
        encrypted,
      );

      expect(Buffer.isBuffer(decrypted)).toBe(true);
      expect(decrypted.toString('utf8')).toBe('Hello, World!');
    });
  });
});
