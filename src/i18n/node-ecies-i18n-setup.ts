import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { ComponentConfig, EngineConfig, I18nEngine, LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NodeEciesComponentId, NodeEciesStringKey } from './node-keys';
import {
  englishTranslations,
  britishEnglishTranslations,
  frenchTranslations,
  spanishTranslations,
  germanTranslations,
  mandarinTranslations,
  japaneseTranslations,
  ukrainianTranslations,
} from './translations';

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
    strings: createNodeEciesStrings(),
    aliases: [ 'NodeEciesStringKey' ],
  };
}

function createNodeEciesStrings(): Record<string, Record<string, string>> {
  return {
    [LanguageCodes.EN_US]: englishTranslations,
    [LanguageCodes.EN_GB]: britishEnglishTranslations,
    [LanguageCodes.FR]: frenchTranslations,
    [LanguageCodes.ES]: spanishTranslations,
    [LanguageCodes.DE]: germanTranslations,
    [LanguageCodes.ZH_CN]: mandarinTranslations,
    [LanguageCodes.JA]: japaneseTranslations,
    [LanguageCodes.UK]: ukrainianTranslations,
  };
}
