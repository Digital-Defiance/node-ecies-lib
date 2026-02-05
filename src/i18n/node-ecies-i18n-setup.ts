/**
 * Node.js ECIES i18n setup and configuration.
 * Manages i18n engine initialization, component registration, and translation string loading
 * for Node.js-specific ECIES library strings across 8 supported languages.
 */
import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import {
  ComponentConfig,
  EngineConfig,
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

// Note: _nodeEciesI18nEngine is used for internal state management
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _nodeEciesI18nEngine: I18nEngine | null = null;
let _componentRegistered = false;

export function getNodeEciesI18nEngine(config?: EngineConfig): I18nEngine {
  // Get base ecies engine (uses 'default' key)
  const baseEngine = getEciesI18nEngine(config);

  // Register node-ecies component if not already registered
  if (!_componentRegistered) {
    baseEngine.registerIfNotExists(createNodeEciesComponentConfig());
    _componentRegistered = true;
  }

  _nodeEciesI18nEngine = baseEngine;
  return baseEngine;
}

export function resetNodeEciesI18nEngine(): void {
  _nodeEciesI18nEngine = null;
  _componentRegistered = false;
}

export function createNodeEciesComponentConfig(): ComponentConfig {
  return {
    id: NodeEciesComponentId,
    strings: NodeEciesComponentStrings,
    aliases: ['NodeEciesStringKey'],
  };
}

/**
 * Master strings collection for the Node ECIES component.
 * Uses BrandedMasterStringsCollection for type-safe branded enum support.
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
 * Helper to translate Node ECIES strings
 */
export function getNodeEciesTranslation(
  stringKey: NodeEciesStringKeyValue,
  variables?: Record<string, string | number>,
  language?: string,
): string {
  return getNodeEciesI18nEngine().translate(
    NodeEciesComponentId,
    stringKey,
    variables,
    language,
  );
}
