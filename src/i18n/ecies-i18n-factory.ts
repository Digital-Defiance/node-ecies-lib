/**
 * I18n factory for Node.js ECIES library.
 *
 * This file provides backward-compatible exports and convenience functions.
 * The main i18n setup is in node-ecies-i18n-setup.ts.
 */
import { EciesStringKey } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode, I18nEngine } from '@digitaldefiance/i18n-lib';

import {
  getNodeEciesI18nEngine,
  resetNodeEciesI18nEngine,
} from './node-ecies-i18n-setup';
import { NodeEciesStringKey, NodeEciesStringKeyValue } from './node-keys';

// Only export items not already exported from node-ecies-i18n-setup
export { NodeEciesStringKey, EciesStringKey };
export type { NodeEciesStringKeyValue };

/**
 * Get the Node ECIES I18n engine with all components registered.
 * This engine supports both EciesStringKey and NodeEciesStringKey
 * for translateStringKey calls.
 *
 * @deprecated Use getNodeEciesI18nEngine() from node-ecies-i18n-setup instead
 */
export function getEciesPluginI18nEngine(): I18nEngine {
  return getNodeEciesI18nEngine();
}

/**
 * Reset the engine instance (useful for testing)
 *
 * @deprecated Use resetNodeEciesI18nEngine() from node-ecies-i18n-setup instead
 */
export function resetEciesPluginI18nEngine(): void {
  resetNodeEciesI18nEngine();
}

/**
 * Get a translation using translateStringKey.
 * Supports both NodeEciesStringKey and EciesStringKey values.
 * Falls back to component-based translation if string key enum is not registered.
 */
export function getLazyNodeEciesTranslation(
  key: NodeEciesStringKeyValue,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  const engine = getNodeEciesI18nEngine();

  // Try translateStringKey first, fall back to component-based translation
  try {
    return engine.translateStringKey(key, variables, language);
  } catch {
    // Fall back to direct component translation
    // The key format is 'componentId:stringKey', extract the string key part
    const keyStr = String(key);
    const colonIndex = keyStr.indexOf(':');
    const stringKey = colonIndex >= 0 ? keyStr.slice(colonIndex + 1) : keyStr;

    // Try NodeEcies component first, then Ecies component
    try {
      return engine.translate('node-ecies', stringKey, variables, language);
    } catch {
      return engine.translate('ecies', stringKey, variables, language);
    }
  }
}

/**
 * Get the I18nEngine for use in node-ecies services.
 *
 * @deprecated Use getNodeEciesI18nEngine() from node-ecies-i18n-setup instead
 */
export function createEciesTranslationEngine(): I18nEngine {
  return getNodeEciesI18nEngine();
}
