/**
 * Node.js ECIES i18n setup and configuration.
 *
 * This is the single source of truth for i18n in node-ecies-lib.
 * Uses createI18nSetup factory for proper engine initialization and registers:
 * - Core component (automatic via factory)
 * - ECIES component (imported from ecies-lib via createEciesComponentPackage)
 * - Node ECIES component (translations defined here)
 *
 * All components support translateStringKey for direct branded enum translation.
 */
import {
  createEciesComponentPackage,
  EciesComponentId,
} from '@digitaldefiance/ecies-lib';
import {
  ComponentConfig,
  createI18nSetup,
  I18nEngine,
  LanguageCodes,
  type BrandedMasterStringsCollection,
  type CoreLanguageCode,
  type I18nComponentPackage,
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
 * ECIES translations come from ecies-lib via createEciesComponentPackage().
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

/**
 * Creates an I18nComponentPackage bundling the Node ECIES ComponentConfig
 * with its branded string key enum. Use this with createI18nSetup's
 * libraryComponents array.
 */
export function createNodeEciesComponentPackage(): I18nComponentPackage {
  return {
    config: createNodeEciesComponentConfig(),
    stringKeyEnum: NodeEciesStringKey,
  };
}

let _nodeEciesI18nEngine: I18nEngine | null = null;

/**
 * Get or create the Node ECIES i18n engine.
 *
 * This engine has Core, ECIES, and NodeECIES components registered,
 * allowing translateStringKey to work with both EciesStringKey and NodeEciesStringKey.
 */
export function getNodeEciesI18nEngine(): I18nEngine {
  if (_nodeEciesI18nEngine && I18nEngine.hasInstance('default')) {
    return _nodeEciesI18nEngine;
  }

  const result = createI18nSetup({
    componentId: NodeEciesComponentId,
    stringKeyEnum: NodeEciesStringKey,
    strings: NodeEciesComponentStrings,
    aliases: ['NodeEciesStringKey'],
    libraryComponents: [createEciesComponentPackage()],
  });

  _nodeEciesI18nEngine = result.engine as I18nEngine;
  return _nodeEciesI18nEngine;
}

/**
 * Reset the engine instance (useful for testing)
 */
export function resetNodeEciesI18nEngine(): void {
  _nodeEciesI18nEngine = null;
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
