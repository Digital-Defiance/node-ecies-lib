/**
 * Integration tests for recipient ID consistency across all constants.
 *
 * These tests verify that the 12 vs 32-byte discrepancy bug cannot recur
 * by ensuring all size-related constants stay synchronized with the ID provider.
 */

import {
  GuidV4Provider,
  ObjectIdProvider,
  UuidProvider,
} from '@digitaldefiance/ecies-lib';

import {
  Constants,
  registerNodeRuntimeConfiguration,
} from '../../src/constants';
import { InvariantValidator } from '../../src/lib/invariant-validator';

describe('Recipient ID Consistency Integration Tests', () => {
  describe('Critical: All constants must align with ID provider', () => {
    it('should enforce ECIES.MULTIPLE.RECIPIENT_ID_SIZE matches idProvider.byteLength', () => {
      const config = Constants;

      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(
        config.idProvider.byteLength
      );
      expect(config.MEMBER_ID_LENGTH).toBe(config.idProvider.byteLength);
      expect(config.ENCRYPTION.RECIPIENT_ID_SIZE).toBe(
        config.idProvider.byteLength
      );
      expect(config.idProvider.byteLength).toBe(12); // Default is ObjectID
    });

    it('should validate default Constants pass invariant checks', () => {
      expect(() => {
        InvariantValidator.validateAll(Constants);
      }).not.toThrow();
    });

    it('should auto-sync MEMBER_ID_LENGTH when ID provider changes to GUID (16 bytes)', () => {
      const config = registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);
      expect(config.idProvider.byteLength).toBe(16);
      // Note: ENCRYPTION is not part of runtime config, it's module-level
      // Runtime configs should use config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE
    });

    it('should auto-sync MEMBER_ID_LENGTH when ID provider changes to UUID (16 bytes)', () => {
      const config = registerNodeRuntimeConfiguration({
        idProvider: new UuidProvider(),
      });

      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);
      expect(config.idProvider.byteLength).toBe(16);
      // Note: ENCRYPTION is not part of runtime config
    });

    it('should validate configuration after ID provider change', () => {
      const config = registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      expect(() => {
        InvariantValidator.validateAll(config);
      }).not.toThrow();
    });
  });

  describe('Regression: Prevent 12 vs 32 byte discrepancy', () => {
    it('should fail if ENCRYPTION.RECIPIENT_ID_SIZE does not match idProvider', () => {
      // This simulates the original bug where constants were out of sync
      const config = Constants;

      // Manually create a bad configuration (simulating the bug)
      const badConfig = {
        ...config,
        ENCRYPTION: {
          ...config.ENCRYPTION,
          RECIPIENT_ID_SIZE: 32, // Wrong! Should be 12 for default ObjectIdProvider
        },
      };

      expect(() => {
        InvariantValidator.validateAll(badConfig);
      }).toThrow(/ENCRYPTION\.RECIPIENT_ID_SIZE/);
    });

    it('should fail if ECIES.MULTIPLE.RECIPIENT_ID_SIZE does not match idProvider', () => {
      const config = Constants;

      // Manually create a bad configuration
      const badConfig = {
        ...config,
        ECIES: {
          ...config.ECIES,
          MULTIPLE: {
            ...config.ECIES.MULTIPLE,
            RECIPIENT_ID_SIZE: 32, // Wrong! Should be 12 for default ObjectIdProvider
          },
        },
      };

      expect(() => {
        InvariantValidator.validateAll(badConfig);
      }).toThrow(/ECIES\.MULTIPLE\.RECIPIENT_ID_SIZE/);
    });

    it('should fail if MEMBER_ID_LENGTH does not match idProvider', () => {
      const config = Constants;

      // Manually create a bad configuration
      const badConfig = {
        ...config,
        MEMBER_ID_LENGTH: 32, // Wrong! Should be 12 for default ObjectIdProvider
      };

      expect(() => {
        InvariantValidator.validateAll(badConfig);
      }).toThrow(/MEMBER_ID_LENGTH/);
    });

    it('should catch all three mismatches in one validation', () => {
      const config = Constants;

      // Manually create a configuration where all three are wrong
      const badConfig = {
        ...config,
        MEMBER_ID_LENGTH: 32,
        ENCRYPTION: {
          ...config.ENCRYPTION,
          RECIPIENT_ID_SIZE: 32,
        },
        ECIES: {
          ...config.ECIES,
          MULTIPLE: {
            ...config.ECIES.MULTIPLE,
            RECIPIENT_ID_SIZE: 32,
          },
        },
      };

      expect(() => {
        InvariantValidator.validateAll(badConfig);
      }).toThrow(/NodeRecipientIdConsistency.*failed/);
    });
  });

  describe('ID Provider Switching', () => {
    it('should support switching from ObjectID to GUID and back', () => {
      // Start with GUID
      let config = registerNodeRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      expect(config.idProvider.byteLength).toBe(16);
      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);

      // Switch back to ObjectID
      config = registerNodeRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      expect(config.idProvider.byteLength).toBe(12);
      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(12);
    });

    it('should maintain consistency when switching between all provider types', () => {
      const providers = [
        new ObjectIdProvider(), // 12 bytes
        new GuidV4Provider(), // 16 bytes
        new UuidProvider(), // 16 bytes
      ];

      for (const provider of providers) {
        const config = registerNodeRuntimeConfiguration({
          idProvider: provider,
        });

        expect(config.MEMBER_ID_LENGTH).toBe(provider.byteLength);
        expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(
          provider.byteLength
        );
        // Note: ENCRYPTION is not part of runtime config

        // Validate invariants
        expect(() => {
          InvariantValidator.validateAll(config);
        }).not.toThrow();
      }
    });
  });

  describe('Custom Invariants', () => {
    afterEach(() => {
      InvariantValidator.clearCustomInvariants();
    });

    it('should allow registering custom invariants', () => {
      const customInvariant = {
        name: 'TestInvariant',
        description: 'Test custom invariant',
        check: () => true,
        errorMessage: () => 'Test error',
      };

      expect(() => {
        InvariantValidator.registerInvariant(customInvariant);
      }).not.toThrow();
    });

    it('should validate custom invariants along with default ones', () => {
      let customCheckCalled = false;
      const customInvariant = {
        name: 'TestInvariant',
        description: 'Test custom invariant',
        check: () => {
          customCheckCalled = true;
          return true;
        },
        errorMessage: () => 'Test error',
      };

      InvariantValidator.registerInvariant(customInvariant);
      InvariantValidator.validateAll(Constants);

      expect(customCheckCalled).toBe(true);
    });

    it('should fail validation if custom invariant fails', () => {
      const failingInvariant = {
        name: 'FailingInvariant',
        description: 'Always fails',
        check: () => false,
        errorMessage: () => 'Custom failure',
      };

      InvariantValidator.registerInvariant(failingInvariant);

      expect(() => {
        InvariantValidator.validateAll(Constants);
      }).toThrow(/Custom failure/);
    });
  });
});
