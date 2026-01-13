/**
 * I18n factory for Node.js ECIES library.
 * Provides component registration, translation engine creation, and helper functions
 * for internationalized error messages and user-facing strings in Node.js environment.
 */
import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import {
  ComponentDefinition,
  ComponentRegistration,
  CoreLanguageCode,
  createCoreI18nEngine,
  EngineConfig,
  I18nEngine,
  LanguageCodes,
  PluginI18nEngine,
  RegistryConfig,
} from '@digitaldefiance/i18n-lib';

import { NodeEciesComponentId, NodeEciesStringKey } from './node-keys';
import {
  frenchTranslations,
  germanTranslations,
  japaneseTranslations,
  mandarinTranslations,
  spanishTranslations,
  ukrainianTranslations,
} from './translations';
import { britishEnglishTranslations } from './translations/en-GB';
import { englishTranslations } from './translations/en-US';

export { NodeEciesComponentId, NodeEciesStringKey };

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
}

export function createNodeEciesComponentRegistration(): ComponentRegistration<
  NodeEciesStringKey,
  string
> {
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
export function getEciesPluginI18nEngine(
  config?: Partial<RegistryConfig<string>>,
): PluginI18nEngine<CoreLanguageCode> {
  if (!eciesI18nEngineInstance) {
    // Create core engine with system strings
    eciesI18nEngineInstance = createCoreI18nEngine(
      NodeEciesComponentId,
      config,
    ) as PluginI18nEngine<CoreLanguageCode>;

    const result = eciesI18nEngineInstance.registerComponent(
      createNodeEciesComponentRegistration(),
    );
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const { getNodeEciesI18nEngine } = require('../i18n/node-ecies-i18n-setup');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const engine = getNodeEciesI18nEngine() as I18nEngine;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return engine.translate(NodeEciesComponentId, key, variables, language);
}

/**
 * Get the ECIES PluginI18nEngine for use in node-ecies services
 * Uses the base ecies-lib's engine which has all EciesStringKey translations
 * Cast to unknown to handle cross-package type compatibility
 */
export function createEciesTranslationEngine(
  config?: EngineConfig,
): I18nEngine {
  return getEciesI18nEngine(config) as I18nEngine;
}
