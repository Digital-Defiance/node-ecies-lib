/**
 * Node.js ECIES i18n setup and configuration.
 *
 * This is the single source of truth for i18n in node-ecies-lib.
 * Uses I18nBuilder pattern for proper engine initialization and registers:
 * - Core component (for error messages)
 * - ECIES component (imported from ecies-lib - translations defined there)
 * - Node ECIES component (translations defined here)
 *
 * All components support translateStringKey for direct branded enum translation.
 */
import {
  createEciesComponentConfig,
  EciesComponentId,
  EciesStringKey,
} from '@digitaldefiance/ecies-lib';
import {
  ComponentConfig,
  createCoreComponentRegistration,
  getCoreLanguageDefinitions,
  I18nBuilder,
  I18nEngine,
  LanguageCodes,
  type BrandedMasterStringsCollection,
  type CoreLanguageCode,
} from '@digitaldefiance/i18n-lib';

import { NodeEciesComponentId, NodeEciesStringKey } from './node-keys';
import type { NodeEciesStringKeyValue } from './node-keys';
import {
  britishEnglishTranslations,
  englishTranslations,
  frenchTranslations,
  germanTranslations,
  japaneseTranslations,
  mandarinTranslations,
  spanishTranslations,
  ukrainianTranslations,
} from './translations';

export { NodeEciesComponentId, EciesComponentId };

/**
 * Master strings collection for the Node ECIES component.
 * These are the translations specific to node-ecies-lib.
 * ECIES translations come from ecies-lib via createEciesComponentConfig().
 */
export const NodeEciesComponentStrings: BrandedMasterStringsCollection<
  typeof NodeEciesStringKey,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: englishTranslations,
  [LanguageCodes.EN_GB]: britishEnglishTranslations,
  [LanguageCodes.FR]: frenchTranslations,
  [LanguageCodes.ES]: spanishTranslations,
  [LanguageCodes.DE]: germanTranslations,
  [LanguageCodes.ZH_CN]: mandarinTranslations,
  [LanguageCodes.JA]: japaneseTranslations,
  [LanguageCodes.UK]: ukrainianTranslations,
};

/**
 * Create Node ECIES component configuration
 */
export function createNodeEciesComponentConfig(): ComponentConfig {
  return {
    id: NodeEciesComponentId,
    strings: NodeEciesComponentStrings,
    aliases: ['NodeEciesStringKey'],
  };
}

let _nodeEciesI18nEngine: I18nEngine | null = null;
let _componentRegistered = false;

/**
 * Register the engine with all required components using I18nBuilder
 */
function registerEngine(): I18nEngine {
  const newEngine = I18nBuilder.create()
    .withLanguages(getCoreLanguageDefinitions())
    .withDefaultLanguage(LanguageCodes.EN_US)
    .withInstanceKey('default')
    .build();

  // Register Core i18n component (required for error messages)
  const coreReg = createCoreComponentRegistration();
  newEngine.register({
    id: coreReg.component.id,
    strings: coreReg.strings as Record<string, Record<string, string>>,
  });

  // Register ECIES component from ecies-lib (translations are defined there)
  const eciesConfig = createEciesComponentConfig();
  newEngine.register({
    ...eciesConfig,
    aliases: ['EciesStringKey'],
  });

  // Register Node ECIES component (translations defined in this lib)
  newEngine.register(createNodeEciesComponentConfig());

  // Register branded string key enums for translateStringKey support
  // Done after build to avoid issues with jest.resetModules() in tests
  try {
    if (!newEngine.hasStringKeyEnum(EciesStringKey)) {
      newEngine.registerStringKeyEnum(EciesStringKey);
    }
  } catch {
    // Silently ignore if enum registration fails (e.g., in test environments)
  }
  try {
    if (!newEngine.hasStringKeyEnum(NodeEciesStringKey)) {
      newEngine.registerStringKeyEnum(NodeEciesStringKey);
    }
  } catch {
    // Silently ignore if enum registration fails (e.g., in test environments)
  }

  return newEngine;
}

/**
 * Get or create the Node ECIES i18n engine.
 *
 * This engine has Core, ECIES, and NodeECIES components registered,
 * allowing translateStringKey to work with both EciesStringKey and NodeEciesStringKey.
 */
export function getNodeEciesI18nEngine(): I18nEngine {
  if (I18nEngine.hasInstance('default')) {
    _nodeEciesI18nEngine = I18nEngine.getInstance('default');

    // Ensure our components are registered on existing instance
    if (!_componentRegistered) {
      // Register ECIES component if not present (translations from ecies-lib)
      const eciesConfig = createEciesComponentConfig();
      _nodeEciesI18nEngine.registerIfNotExists({
        ...eciesConfig,
        aliases: ['EciesStringKey'],
      });

      // Register Node ECIES component if not present
      _nodeEciesI18nEngine.registerIfNotExists(
        createNodeEciesComponentConfig(),
      );

      // Register branded string key enums for translateStringKey support
      if (!_nodeEciesI18nEngine.hasStringKeyEnum(EciesStringKey)) {
        _nodeEciesI18nEngine.registerStringKeyEnum(EciesStringKey);
      }
      if (!_nodeEciesI18nEngine.hasStringKeyEnum(NodeEciesStringKey)) {
        _nodeEciesI18nEngine.registerStringKeyEnum(NodeEciesStringKey);
      }

      _componentRegistered = true;
    }
  } else {
    _nodeEciesI18nEngine = registerEngine();
    _componentRegistered = true;
  }

  return _nodeEciesI18nEngine;
}

/**
 * Reset the engine instance (useful for testing)
 */
export function resetNodeEciesI18nEngine(): void {
  _nodeEciesI18nEngine = null;
  _componentRegistered = false;
}

/**
 * Helper to translate Node ECIES strings.
 * Uses translateStringKey for automatic component ID resolution from the branded enum.
 */
export function getNodeEciesTranslation(
  stringKey: NodeEciesStringKeyValue,
  variables?: Record<string, string | number>,
  language?: string,
): string {
  return getNodeEciesI18nEngine().translateStringKey(
    stringKey,
    variables,
    language,
  );
}

/**
 * Safe translation helper that returns a placeholder on failure.
 */
export function safeGetNodeEciesTranslation(
  stringKey: NodeEciesStringKeyValue,
  variables?: Record<string, string | number>,
  language?: string,
): string {
  return getNodeEciesI18nEngine().safeTranslateStringKey(
    stringKey,
    variables,
    language,
  );
}
