/**
 * Integration test for full module loading.
 *
 * This test verifies that the main index.ts can be imported without
 * circular dependency errors and that all exports are properly defined.
 *
 * Requirements: 1.1, 1.2, 1.3
 */

describe('Module Load Integration Tests', () => {
  describe('Full module import', () => {
    it('should import main index.ts without runtime errors', () => {
      expect(() => {
        require('../../src/index');
      }).not.toThrow();
    });

    it('should have all core exports defined', () => {
      const index = require('../../src/index');

      // V2 Architecture exports
      expect(index.CryptoContainer).toBeDefined();
      expect(index.InvariantValidator).toBeDefined();
      expect(index.ECIESBuilder).toBeDefined();
      expect(index.MemberBuilder).toBeDefined();

      // Constants
      expect(index.Constants).toBeDefined();
      expect(index.getNodeRuntimeConfiguration).toBeDefined();

      // Services
      expect(index.AESGCMService).toBeDefined();
      expect(index.Pbkdf2Service).toBeDefined();
      expect(index.ECIESService).toBeDefined();

      // Member
      expect(index.Member).toBeDefined();
      expect(index.NodeMemberError).toBeDefined();
    });

    it('should have enumeration values properly initialized', () => {
      const index = require('../../src/index');

      // Verify NodeEciesStringKey enum has values
      expect(Object.keys(index.NodeEciesStringKey).length).toBeGreaterThan(0);

      // Verify specific enum values are defined
      expect(
        index.NodeEciesStringKey.Error_Member_MissingMemberName,
      ).toBeDefined();
      expect(index.NodeEciesStringKey.Error_Member_MissingMemberName).not.toBe(
        undefined,
      );

      // Verify Pbkdf2ProfileEnum enum has values
      expect(Object.keys(index.Pbkdf2ProfileEnum).length).toBeGreaterThan(0);
    });

    it('should allow creating instances with proper parameters', () => {
      const index = require('../../src/index');
      const { EmailString, MemberType } = require('@digitaldefiance/ecies-lib');
      const { ECIESService } = require('../../src/services/ecies/service');

      // Should be able to create a Member with required parameters
      expect(() => {
        const config = index.getNodeRuntimeConfiguration().ECIES;
        const eciesService = new ECIESService({
          curveName: config.CURVE_NAME,
          primaryKeyDerivationPath: config.PRIMARY_KEY_DERIVATION_PATH,
          mnemonicStrength: config.MNEMONIC_STRENGTH,
          symmetricAlgorithm: config.SYMMETRIC_ALGORITHM_CONFIGURATION,
          symmetricKeyBits: config.SYMMETRIC.KEY_BITS,
          symmetricKeyMode: config.SYMMETRIC.MODE,
        });

        index.Member.newMember(
          eciesService,
          MemberType.User,
          'Test Member',
          new EmailString('test@example.com'),
        );
      }).not.toThrow();

      // Should be able to access Constants
      expect(() => {
        const constants = index.Constants;
        expect(constants.ECIES).toBeDefined();
      }).not.toThrow();
    });

    it('should have i18n engine initialized', () => {
      const index = require('../../src/index');

      expect(index.getNodeEciesI18nEngine).toBeDefined();
      expect(typeof index.getNodeEciesI18nEngine).toBe('function');

      // Should be able to get the i18n engine
      expect(() => {
        const engine = index.getNodeEciesI18nEngine();
        expect(engine).toBeDefined();
      }).not.toThrow();
    });

    it('should have all translation keys available', () => {
      const index = require('../../src/index');
      const engine = index.getNodeEciesI18nEngine();

      // Should be able to translate a key
      const translation = engine.translate(
        index.NodeEciesComponentId,
        index.NodeEciesStringKey.Error_Member_MissingMemberName,
      );

      expect(typeof translation).toBe('string');
      expect(translation.length).toBeGreaterThan(0);
    });
  });

  describe('Module initialization order', () => {
    it('should initialize enumerations before translations', () => {
      // Clear module cache to test fresh import
      jest.resetModules();

      // Import enumerations first
      const enums = require('../../src/i18n/node-keys');
      expect(enums.NodeEciesStringKey).toBeDefined();
      expect(Object.keys(enums.NodeEciesStringKey).length).toBeGreaterThan(0);

      // Then import translations
      const translations = require('../../src/i18n/translations/en-US');
      expect(translations.englishTranslations).toBeDefined();
      expect(
        Object.keys(translations.englishTranslations).length,
      ).toBeGreaterThan(0);
    });

    it('should initialize translations before i18n setup', () => {
      jest.resetModules();

      // Import translations first
      const translations = require('../../src/i18n/translations/en-US');
      expect(translations.englishTranslations).toBeDefined();

      // Then import i18n setup
      const i18n = require('../../src/i18n/node-ecies-i18n-setup');
      expect(i18n.getNodeEciesI18nEngine).toBeDefined();
    });

    it('should initialize i18n before using member', () => {
      jest.resetModules();

      // Import i18n setup first
      const i18n = require('../../src/i18n/node-ecies-i18n-setup');
      expect(i18n.getNodeEciesI18nEngine).toBeDefined();

      // Then import member
      const member = require('../../src/member');
      expect(member.Member).toBeDefined();
    });

    it('should initialize before constants', () => {
      jest.resetModules();

      // Import i18n first
      const i18n = require('../../src/i18n');
      expect(i18n.getNodeEciesI18nEngine).toBeDefined();

      // Then import constants
      const constants = require('../../src/constants');
      expect(constants.Constants).toBeDefined();
    });
  });

  describe('No circular dependency errors', () => {
    it('should not have undefined enum values during module load', () => {
      jest.resetModules();

      // Import the full module
      const index = require('../../src/index');

      // Check that NodeEciesStringKey values are not undefined
      const stringKeyValues = Object.values(index.NodeEciesStringKey);
      const undefinedValues = stringKeyValues.filter((v) => v === undefined);

      expect(undefinedValues).toHaveLength(0);
    });

    it('should not throw errors when accessing enum values in translations', () => {
      jest.resetModules();

      expect(() => {
        const translations = require('../../src/i18n/translations/en-US');
        const enums = require('../../src/i18n/node-keys');

        // Verify translations object is defined and has keys
        expect(translations.englishTranslations).toBeDefined();
        expect(
          Object.keys(translations.englishTranslations).length,
        ).toBeGreaterThan(0);

        // Verify enum is defined
        expect(enums.NodeEciesStringKey).toBeDefined();
        expect(Object.keys(enums.NodeEciesStringKey).length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should allow creating member instances during module initialization', () => {
      jest.resetModules();

      expect(() => {
        const { Member } = require('../../src/member');
        const {
          EmailString,
          MemberType,
        } = require('@digitaldefiance/ecies-lib');
        const { getNodeRuntimeConfiguration } = require('../../src/constants');
        const { ECIESService } = require('../../src/services/ecies/service');

        const config = getNodeRuntimeConfiguration().ECIES;
        const eciesService = new ECIESService({
          curveName: config.CURVE_NAME,
          primaryKeyDerivationPath: config.PRIMARY_KEY_DERIVATION_PATH,
          mnemonicStrength: config.MNEMONIC_STRENGTH,
          symmetricAlgorithm: config.SYMMETRIC_ALGORITHM_CONFIGURATION,
          symmetricKeyBits: config.SYMMETRIC.KEY_BITS,
          symmetricKeyMode: config.SYMMETRIC.MODE,
        });

        // Should be able to create a member
        const member = Member.newMember(
          eciesService,
          MemberType.User,
          'Test Member',
          new EmailString('test@example.com'),
        );
        expect(member).toBeDefined();
        expect(member.member.name).toBe('Test Member');
      }).not.toThrow();
    });
  });
});
