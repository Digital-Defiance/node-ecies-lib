import {
  ComponentDefinition,
  ComponentRegistration,
  createCoreI18nEngine,
  PluginI18nEngine,
  LanguageCodes,
  CoreLanguageCode,
  RegistryConfig,
  EngineConfig,
} from '@digitaldefiance/i18n-lib';
import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';

import { NodeEciesStringKey, NodeEciesComponentId } from './node-keys';

// Import translations
import { englishTranslations } from './translations/en-US';

export { NodeEciesStringKey, NodeEciesComponentId };
import { britishEnglishTranslations } from './translations/en-GB';
import { frenchTranslations, germanTranslations, japaneseTranslations, mandarinTranslations, spanishTranslations, ukrainianTranslations } from './translations';

/**
 * Component definition for Node ECIES strings
 */
export function createNodeEciesComponentDefinition(): ComponentDefinition<NodeEciesStringKey> {
  const NodeEciesComponent: ComponentDefinition<NodeEciesStringKey> = {
    id: NodeEciesComponentId,
    name: 'Node ECIES Library Strings',
    stringKeys: Object.values(NodeEciesStringKey),
  };
  return NodeEciesComponent;
};

export function createNodeEciesComponentRegistration(): ComponentRegistration<NodeEciesStringKey, string> {
  const component = createNodeEciesComponentDefinition();
  
  return {
    component,
    strings: {
      [LanguageCodes.EN_US]: englishTranslations,
      [LanguageCodes.EN_GB]: britishEnglishTranslations,
      [LanguageCodes.FR]: frenchTranslations,
      [LanguageCodes.ES]: spanishTranslations,
      [LanguageCodes.DE]: germanTranslations,
      [LanguageCodes.ZH_CN]: mandarinTranslations,
      [LanguageCodes.JA]: japaneseTranslations,
      [LanguageCodes.UK]: ukrainianTranslations,
    },
  };
}

/**
 * Singleton instance of the ECIES I18n engine
 */
let eciesI18nEngineInstance: PluginI18nEngine<CoreLanguageCode> | null = null;

/**
 * Create or get the ECIES I18n engine with proper component registration
 * This replaces the legacy getEciesI18nEngine() function
 */
export function getEciesPluginI18nEngine(config?: Partial<RegistryConfig<string>>): PluginI18nEngine<CoreLanguageCode> {
  if (!eciesI18nEngineInstance) {
    // Create core engine with system strings
    eciesI18nEngineInstance = createCoreI18nEngine(
      NodeEciesComponentId,
      config,
    ) as PluginI18nEngine<CoreLanguageCode>;

    const result = eciesI18nEngineInstance.registerComponent(createNodeEciesComponentRegistration());
    if (!result.isValid) {
      console.warn(
        'Node ECIES component registration incomplete:',
        result.missingKeys,
      );
    }
  }

  return eciesI18nEngineInstance!;
}

/**
 * Reset the engine instance (useful for testing)
 */
export function resetEciesPluginI18nEngine(): void {
  eciesI18nEngineInstance = null;
}

/**
 * Get a translation from the Node ECIES component
 */
export function getNodeEciesTranslation(
  key: NodeEciesStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  // Import here to avoid circular dependency
  const { getNodeEciesI18nEngine } = require('../i18n/node-ecies-i18n-setup');
  const engine = getNodeEciesI18nEngine();
  return engine.translate(NodeEciesComponentId, key, variables, language);
}

/**
 * Get the ECIES PluginI18nEngine for use in node-ecies services
 * Uses the base ecies-lib's engine which has all EciesStringKey translations
 * Cast to any to handle cross-package type compatibility
 */
export function createEciesTranslationEngine(config?: EngineConfig): any {
  return getEciesI18nEngine(config);
}


