/**
 * Integration test for error handling across initialization phases.
 *
 * This test verifies that errors can be created and accessed during
 * various initialization phases without causing circular dependencies.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import {
  EmailString,
  MemberErrorType,
  MemberType,
} from '@digitaldefiance/ecies-lib';

import { getNodeRuntimeConfiguration } from '../../src/constants';
import { getLazyNodeEciesTranslation } from '../../src/i18n/ecies-i18n-factory';
import { getNodeEciesI18nEngine } from '../../src/i18n/node-ecies-i18n-setup';
import {
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../../src/i18n/node-keys';
import { Member, NodeMemberError } from '../../src/member';
import { ECIESService } from '../../src/services/ecies/service';

describe('Error Handling Integration Tests', () => {
  let eciesService: ECIESService;

  beforeEach(() => {
    const config = getNodeRuntimeConfiguration().ECIES;
    eciesService = new ECIESService({
      curveName: config.CURVE_NAME,
      primaryKeyDerivationPath: config.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: config.MNEMONIC_STRENGTH,
      symmetricAlgorithm: config.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: config.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: config.SYMMETRIC.MODE,
    });
  });

  describe('Error creation during initialization', () => {
    it('should create errors before i18n is fully initialized', () => {
      // Reset modules to simulate early initialization
      jest.resetModules();

      // Import error class before i18n
      const { NodeMemberError: ErrorClass } = require('../../src/member');
      const {
        MemberErrorType: ErrorTypes,
      } = require('@digitaldefiance/ecies-lib');

      // Should be able to create error
      expect(() => {
        const error = new ErrorClass(ErrorTypes.MissingMemberName);
        expect(error).toBeDefined();
      }).not.toThrow();
    });

    it('should create errors after enumerations are loaded', () => {
      jest.resetModules();

      // Load enumerations first
      const enums = require('../../src/i18n/node-keys');
      expect(enums.NodeEciesStringKey).toBeDefined();

      // Then create error
      const { NodeMemberError: ErrorClass } = require('../../src/member');
      const { MemberErrorType } = require('@digitaldefiance/ecies-lib');
      const {
        getLazyNodeEciesTranslation,
      } = require('../../src/i18n/ecies-i18n-factory');
      const { NodeEciesComponentId } = require('../../src/i18n/node-keys');
      const error = new ErrorClass(
        getLazyNodeEciesTranslation(
          enums.NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(error).toBeDefined();
      expect(error.type).toBe(MemberErrorType.MissingMemberName);
    });

    it('should create errors after translations are loaded', () => {
      jest.resetModules();

      // Load translations
      const translations = require('../../src/i18n/translations/en-US');
      expect(translations.englishTranslations).toBeDefined();

      // Then create error
      const { NodeMemberError: ErrorClass } = require('../../src/member');
      const { MemberErrorType } = require('@digitaldefiance/ecies-lib');
      const error = new ErrorClass(MemberErrorType.MissingMemberName);

      expect(error).toBeDefined();
    });

    it('should create errors after full module initialization', () => {
      jest.resetModules();

      // Load full module
      const index = require('../../src/index');

      // Create error
      const error = new index.NodeMemberError(
        MemberErrorType.MissingMemberName,
      );

      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
      expect(typeof error.message).toBe('string');
    });
  });

  describe('Error message accessibility', () => {
    it('should access error message without circular dependency', () => {
      const {
        getLazyNodeEciesTranslation,
      } = require('../../src/i18n/ecies-i18n-factory');
      const { NodeEciesStringKey } = require('../../src/i18n/node-keys');
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(() => {
        const message = error.message;
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should access error name without circular dependency', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(error.name).toBe('NodeMemberError');
    });

    it('should access error type without circular dependency', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(error.type).toBe(MemberErrorType.MissingMemberName);
    });

    it('should access error stack without circular dependency', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });

  describe('Error messages with i18n', () => {
    it('should provide translated error messages after full initialization', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
      const message = error.message;

      // Message should be translated
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);

      // Should not be just the error type enum value
      expect(message).not.toBe(MemberErrorType.MissingMemberName.toString());
    });

    it('should match i18n engine translation', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
      const engine = getNodeEciesI18nEngine();

      const directTranslation = engine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_Member_MissingMemberName,
      );

      // Error message should match direct translation
      expect(error.message).toBe(directTranslation);
    });

    it('should provide different messages for different error types', () => {
      const error1 = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
      const error2 = new NodeMemberError(
        getLazyNodeEciesTranslation(NodeEciesStringKey.Error_Member_NoWallet),
        MemberErrorType.NoWallet,
      );

      expect(error1.message).not.toBe(error2.message);
    });

    it('should handle common error types without circular dependencies', () => {
      const errorTypes = [
        MemberErrorType.MissingMemberName,
        MemberErrorType.NoWallet,
        MemberErrorType.MissingPrivateKey,
        MemberErrorType.InvalidMemberNameWhitespace,
      ];

      errorTypes.forEach((errorType) => {
        expect(() => {
          const error = new NodeMemberError(errorType);
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });
  });

  describe('Error creation in various contexts', () => {
    it('should create errors in member validation', () => {
      expect(() => {
        Member.newMember(
          eciesService,
          MemberType.User,
          '', // Empty name should trigger error
          new EmailString('test@example.com'),
        );
      }).toThrow(NodeMemberError);
    });

    it('should create errors in member operations', () => {
      const member = Member.newMember(
        eciesService,
        MemberType.User,
        'Test Member',
        new EmailString('test@example.com'),
      );

      // Unload wallet
      member.member.unloadWalletAndPrivateKey();

      // Try to sign without private key
      expect(() => {
        member.member.sign(Buffer.from('test'));
      }).toThrow(NodeMemberError);
    });

    it('should preserve error type through throw/catch', () => {
      try {
        throw new NodeMemberError(
          getLazyNodeEciesTranslation(
            NodeEciesStringKey.Error_Member_MissingMemberName,
          ),
          MemberErrorType.MissingMemberName,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(NodeMemberError);
        expect((error as NodeMemberError).type).toBe(
          MemberErrorType.MissingMemberName,
        );
      }
    });
  });

  describe('Error handling without circular dependencies', () => {
    it('should not cause circular dependency when error imports i18n', () => {
      jest.resetModules();

      expect(() => {
        // Import error (which imports i18n-setup)
        const { NodeMemberError: ErrorClass } = require('../../src/member');

        // Import enumerations (which should not import errors)
        const enums = require('../../src/i18n/node-keys');

        // Create error
        const { MemberErrorType } = require('@digitaldefiance/ecies-lib');
        const error = new ErrorClass(MemberErrorType.MissingMemberName);
        expect(error.message).toBeDefined();
      }).not.toThrow();
    });

    it('should not cause circular dependency when accessing error message', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      // Accessing message should not cause circular dependency
      expect(() => {
        const msg1 = error.message;
        const msg2 = error.message;
        expect(msg1).toBe(msg2);
      }).not.toThrow();
    });

    it('should handle error serialization without circular dependencies', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      expect(() => {
        const serialized = JSON.stringify({
          name: error.name,
          message: error.message,
          type: error.type,
        });
        expect(serialized).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Lazy i18n initialization in errors', () => {
    it('should defer translation lookup until message access', () => {
      // Create error
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      // At this point, translation may not have been looked up yet
      // But accessing message should work
      const message = error.message;
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should cache translated message after first access', () => {
      const error = new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );

      const message1 = error.message;
      const message2 = error.message;

      // Should return same message
      expect(message1).toBe(message2);
    });

    it('should work with multiple error instances', () => {
      const errors = [
        new NodeMemberError(
          getLazyNodeEciesTranslation(
            NodeEciesStringKey.Error_Member_MissingMemberName,
          ),
          MemberErrorType.MissingMemberName,
        ),
        new NodeMemberError(
          getLazyNodeEciesTranslation(
            NodeEciesStringKey.Error_Member_MissingMemberName,
          ),
          MemberErrorType.NoWallet,
        ),
        new NodeMemberError(
          getLazyNodeEciesTranslation(
            NodeEciesStringKey.Error_Member_MissingMemberName,
          ),
          MemberErrorType.MissingPrivateKey,
        ),
      ];

      errors.forEach((error) => {
        expect(error.message).toBeDefined();
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      });
    });
  });
});
