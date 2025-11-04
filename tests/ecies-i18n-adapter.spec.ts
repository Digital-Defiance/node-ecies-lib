import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EciesStringKey, EciesComponentId } from '@digitaldefiance/ecies-lib';
import {
  getEciesPluginI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../src/i18n/ecies-i18n-factory';
import { getNodeEciesI18nEngine } from '../src/i18n/node-ecies-i18n-setup';
import { withConsoleMocks } from './support/console';

describe('Node ECIES i18n Integration', () => {
  beforeEach(() => {
    // Initialize node-ecies engine with component registration
    getNodeEciesI18nEngine();
  });
  describe('Plugin i18n engine', () => {
    it('should have translate function', () => {
      const engine = getNodeEciesI18nEngine();
      expect(engine).toBeDefined();
      expect(typeof engine.translate).toBe('function');
    });

    it('should translate node-ecies keys', () => {
      const engine = getNodeEciesI18nEngine();
      const result = engine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_LengthError_LengthIsInvalidType
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should support variable substitution', () => {
      const engine = getNodeEciesI18nEngine();
      const result = engine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_LengthError_LengthIsInvalidType,
        { length: '100' },
        LanguageCodes.EN_US
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should support multiple languages', () => {
      const engine = getNodeEciesI18nEngine();
      const enResult = engine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_Member_MissingMemberName,
        undefined,
        LanguageCodes.EN_US
      );
      const frResult = engine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_Member_MissingMemberName,
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
        const engine = getNodeEciesI18nEngine();
        const result = engine.translate(NodeEciesComponentId, key, undefined, LanguageCodes.EN_US);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toContain('[node-ecies.');
      });

      it(`should translate ${key} in French`, () => {
        const engine = getNodeEciesI18nEngine();
        const result = engine.translate(NodeEciesComponentId, key, undefined, LanguageCodes.FR);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
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
        const engine = getNodeEciesI18nEngine();
        const result = engine.translate(
          NodeEciesComponentId,
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
      const engine = getNodeEciesI18nEngine();
      const result = engine.translate(
        NodeEciesComponentId,
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
      const engine1 = getNodeEciesI18nEngine();
      const engine2 = getNodeEciesI18nEngine();
      expect(engine1).toBe(engine2);
    });
  });
});
