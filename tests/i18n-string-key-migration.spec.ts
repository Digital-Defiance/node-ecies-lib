/**
 * Integration tests for Node ECIES i18n string key migration
 *
 * These tests verify that the Node ECIES library's i18n-setup correctly uses
 * the new string key enum registration and translation methods.
 *
 * **Validates: Requirements 9.2, 9.3**
 * - 9.2: IF wrapper translation functions exist, THEN they SHALL be updated to use `translateStringKey`
 * - 9.3: THE existing API signatures SHALL remain backward compatible
 */

import { I18nEngine, LanguageCodes } from '@digitaldefiance/i18n-lib';
import { resetEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import {
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../src/i18n/node-keys';
import {
  getNodeEciesI18nEngine,
  getNodeEciesTranslation,
  resetNodeEciesI18nEngine,
} from '../src/i18n/node-ecies-i18n-setup';

describe('Node ECIES i18n String Key Migration', () => {
  beforeEach(() => {
    // Reset engine state before each test
    I18nEngine.resetAll();
    resetEciesI18nEngine();
    resetNodeEciesI18nEngine();
  });

  afterEach(() => {
    // Clean up after each test
    I18nEngine.resetAll();
    resetEciesI18nEngine();
    resetNodeEciesI18nEngine();
  });

  describe('String Key Enum Registration', () => {
    it('should register NodeEciesStringKey enum during engine initialization', () => {
      const engine = getNodeEciesI18nEngine();

      // Verify the enum is registered
      expect(engine.hasStringKeyEnum(NodeEciesStringKey)).toBe(true);
    });

    it('should extract correct component ID from NodeEciesStringKey', () => {
      const engine = getNodeEciesI18nEngine();

      // Get all registered string key enums
      const registeredEnums = engine.getStringKeyEnums();

      // Find the Node ECIES enum entry
      const nodeEciesEntry = registeredEnums.find(
        (entry) => entry.enumObj === NodeEciesStringKey,
      );

      expect(nodeEciesEntry).toBeDefined();
      expect(nodeEciesEntry?.componentId).toBe(NodeEciesComponentId);
    });

    it('should allow idempotent registration of NodeEciesStringKey', () => {
      const engine = getNodeEciesI18nEngine();

      // Register again - should not throw
      expect(() =>
        engine.registerStringKeyEnum(NodeEciesStringKey),
      ).not.toThrow();

      // Should still have exactly one entry for Node ECIES
      const registeredEnums = engine.getStringKeyEnums();
      const nodeEciesEntries = registeredEnums.filter(
        (entry) => entry.componentId === NodeEciesComponentId,
      );

      expect(nodeEciesEntries.length).toBe(1);
    });
  });

  describe('getNodeEciesTranslation - Requirement 9.2', () => {
    it('should translate string keys correctly using translateStringKey', () => {
      // Initialize engine
      getNodeEciesI18nEngine();

      // Test translation of a known key
      const translation = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Member_NoWallet,
      );

      expect(translation).toBeDefined();
      expect(translation).toBe('No wallet available');
    });

    it('should translate string keys with variables', () => {
      getNodeEciesI18nEngine();

      const translation = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Invariant_MemberIdLengthMismatchTemplate,
        { actual: '32', expected: '64' },
      );

      expect(translation).toContain('32');
      expect(translation).toContain('64');
      expect(translation).not.toContain('{actual}');
      expect(translation).not.toContain('{expected}');
    });

    it('should translate string keys with explicit language parameter', () => {
      getNodeEciesI18nEngine();

      // Test Spanish translation
      const spanishTranslation = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Member_NoWallet,
        undefined,
        LanguageCodes.ES,
      );

      expect(spanishTranslation).toBe('No hay billetera disponible');

      // Test French translation
      const frenchTranslation = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Member_NoWallet,
        undefined,
        LanguageCodes.FR,
      );

      expect(frenchTranslation).toBeDefined();
      expect(frenchTranslation.length).toBeGreaterThan(0);
    });

    it('should produce same result as direct engine.translate call', () => {
      const engine = getNodeEciesI18nEngine();
      const stringKey = NodeEciesStringKey.Error_InvalidPublicKey;

      // Using the wrapper function
      const wrapperResult = getNodeEciesTranslation(stringKey);

      // Using direct translate call
      const directResult = engine.translate(
        NodeEciesComponentId,
        stringKey,
        undefined,
        LanguageCodes.EN_US,
      );

      expect(wrapperResult).toBe(directResult);
    });
  });

  describe('Backward Compatibility - Requirement 9.3', () => {
    it('should maintain getNodeEciesTranslation signature: (stringKey)', () => {
      getNodeEciesI18nEngine();

      // Single argument call should work
      const result = getNodeEciesTranslation(
        NodeEciesStringKey.Error_InvalidIVLength,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should maintain getNodeEciesTranslation signature: (stringKey, variables)', () => {
      getNodeEciesI18nEngine();

      // Two argument call should work
      const result = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Invariant_ConfigurationValidationFailedTemplate,
        { failures: 'test failure' },
      );

      expect(result).toBeDefined();
      expect(result).toContain('test failure');
    });

    it('should maintain getNodeEciesTranslation signature: (stringKey, variables, language)', () => {
      getNodeEciesI18nEngine();

      // Three argument call should work
      const result = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Member_NoWallet,
        undefined,
        LanguageCodes.ES,
      );

      expect(result).toBeDefined();
      expect(result).toBe('No hay billetera disponible');
    });

    it('should accept numeric variables in the function', () => {
      getNodeEciesI18nEngine();

      // Test with numeric variables (common use case)
      const result = getNodeEciesTranslation(
        NodeEciesStringKey.Error_Invariant_MemberIdLengthMismatchTemplate,
        { actual: 32, expected: 64 },
      );

      expect(result).toContain('32');
      expect(result).toContain('64');
    });
  });

  describe('Translation Consistency', () => {
    it('should translate all Node ECIES string keys without errors', () => {
      getNodeEciesI18nEngine();

      const stringKeys = Object.values(NodeEciesStringKey);

      stringKeys.forEach((key) => {
        expect(() => {
          const translation = getNodeEciesTranslation(key);
          expect(translation).toBeDefined();
          expect(translation.length).toBeGreaterThan(0);
        }).not.toThrow();
      });
    });

    it('should translate consistently across multiple calls', () => {
      getNodeEciesI18nEngine();

      const key = NodeEciesStringKey.Error_Member_NoWallet;

      const result1 = getNodeEciesTranslation(key);
      const result2 = getNodeEciesTranslation(key);

      expect(result1).toBe(result2);
    });
  });

  describe('Multi-Language Support', () => {
    const supportedLanguages = [
      LanguageCodes.EN_US,
      LanguageCodes.EN_GB,
      LanguageCodes.FR,
      LanguageCodes.ES,
      LanguageCodes.DE,
      LanguageCodes.ZH_CN,
      LanguageCodes.JA,
      LanguageCodes.UK,
    ];

    it('should translate using getNodeEciesTranslation in all supported languages', () => {
      getNodeEciesI18nEngine();

      supportedLanguages.forEach((lang) => {
        const translation = getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_NoWallet,
          undefined,
          lang,
        );

        expect(translation).toBeDefined();
        expect(translation.length).toBeGreaterThan(0);
        // Should not return the raw key
        expect(translation).not.toBe('Error_Member_NoWallet');
      });
    });
  });
});
