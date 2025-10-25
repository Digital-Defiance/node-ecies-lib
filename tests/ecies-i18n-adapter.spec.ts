import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EciesStringKey } from '@digitaldefiance/ecies-lib';
import {
  createEciesTranslationEngine,
  getEciesPluginI18nEngine,
  NodeEciesStringKey,
} from '../src/i18n/ecies-i18n-factory';
import { withConsoleMocks } from './support/console';

describe('ECIES Translation Adapter', () => {
  describe('createEciesTranslationEngine', () => {
    it('should create a translation engine with correct interface', () => {
      const engine = createEciesTranslationEngine();
      
      expect(engine).toBeDefined();
      expect(typeof engine.translate).toBe('function');
      expect(typeof engine.safeTranslate).toBe('function');
    });

    it('should translate EciesStringKey values', () => {
      const engine = createEciesTranslationEngine();
      
      // Test a key that exists in NodeEciesStringKey
      const result = engine.translate(
        EciesStringKey.Error_LengthError_LengthIsInvalidType as any
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle missing translations gracefully', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const engine = createEciesTranslationEngine();
        
        // Test a key that doesn't exist
        const nonExistentKey = 'NonExistent_Key_12345' as EciesStringKey;
        const result = engine.safeTranslate(nonExistentKey);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    it('should support variable substitution', () => {
      const engine = createEciesTranslationEngine();
      
      // Use a key that might have variables
      const result = engine.translate(
        EciesStringKey.Error_LengthError_LengthIsInvalidType as any,
        { length: '100', expected: '50' }
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should support language parameter', () => {
      const engine = createEciesTranslationEngine();
      
      const enResult = engine.translate(
        EciesStringKey.Error_LengthError_LengthIsInvalidType as any,
        undefined,
        LanguageCodes.EN_US
      );
      
      const frResult = engine.translate(
        EciesStringKey.Error_LengthError_LengthIsInvalidType as any,
        undefined,
        LanguageCodes.FR
      );
      
      expect(enResult).toBeDefined();
      expect(frResult).toBeDefined();
      expect(typeof enResult).toBe('string');
      expect(typeof frResult).toBe('string');
    });
  });

  describe('NodeEciesStringKey translations', () => {
    const testKeys = [
      NodeEciesStringKey.Error_LengthError_LengthIsInvalidType,
      NodeEciesStringKey.Error_Member_MissingMemberName,
      NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace,
      NodeEciesStringKey.Error_Member_NoWallet,
      NodeEciesStringKey.Error_Member_WalletAlreadyLoaded,
      NodeEciesStringKey.Error_Member_InvalidMnemonic,
      NodeEciesStringKey.Error_Member_MissingPrivateKey,
      NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength,
      NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength,
    ];

    testKeys.forEach((key) => {
      it(`should translate ${key} in English`, () => {
        const pluginEngine = getEciesPluginI18nEngine();
        const result = pluginEngine.translate('node-ecies', key, undefined, LanguageCodes.EN_US);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toContain('[node-ecies.');
      });

      it(`should translate ${key} in French`, () => {
        const pluginEngine = getEciesPluginI18nEngine();
        const result = pluginEngine.translate('node-ecies', key, undefined, LanguageCodes.FR);
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Adapter compatibility with ECIESError', () => {
    it('should work as TranslationEngine for error classes', () => {
      const engine = createEciesTranslationEngine();
      
      // Simulate what ECIESError does
      const errorKey = EciesStringKey.Error_LengthError_LengthIsInvalidType as any;
      const translation = engine.translate(errorKey);
      
      expect(translation).toBeDefined();
      expect(typeof translation).toBe('string');
    });

    it('should handle safeTranslate without throwing', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const engine = createEciesTranslationEngine();
        
        expect(() => {
          const result = engine.safeTranslate('invalid_key' as any);
          expect(result).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Language support', () => {
    const supportedLanguages = [
      LanguageCodes.EN_US,
      LanguageCodes.EN_GB,
      LanguageCodes.FR,
      LanguageCodes.ES,
      LanguageCodes.ZH_CN,
      LanguageCodes.UK,
      LanguageCodes.DE,
      LanguageCodes.JA,
    ];

    supportedLanguages.forEach((lang) => {
      it(`should provide translations for ${lang}`, () => {
        const pluginEngine = getEciesPluginI18nEngine();
        const result = pluginEngine.translate(
          'node-ecies',
          NodeEciesStringKey.Error_Member_MissingMemberName,
          undefined,
          lang
        );
        
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Variable substitution', () => {
    it('should substitute variables in translations', () => {
      const pluginEngine = getEciesPluginI18nEngine();
      
      // Test with a template string if available
      const result = pluginEngine.translate(
        'node-ecies',
        NodeEciesStringKey.Error_LengthError_LengthIsInvalidType,
        { length: '100' },
        LanguageCodes.EN_US
      );
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Singleton behavior', () => {
    it('should return the same engine instance', () => {
      const engine1 = getEciesPluginI18nEngine();
      const engine2 = getEciesPluginI18nEngine();
      
      expect(engine1).toBe(engine2);
    });

    it('should maintain consistent translations', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const engine1 = createEciesTranslationEngine();
        const engine2 = createEciesTranslationEngine();
        
        const key = EciesStringKey.Error_Member_MissingMemberName as any;
        const result1 = engine1.translate(key);
        const result2 = engine2.translate(key);
        
        expect(result1).toBe(result2);
      });
    });
  });
});
