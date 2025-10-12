import {
  ComponentDefinition,
  ComponentRegistration,
  CoreLanguage,
  createCoreI18nEngine,
  PluginI18nEngine,
} from '@digitaldefiance/i18n-lib';

/**
 * ECIES-specific string keys for the node ECIES library
 */
enum NodeEciesStringKey {
  Error_LengthError_LengthIsInvalidType = 'error_length_error_length_is_invalid_type',
  // Add more as needed
}

/**
 * Component definition for Node ECIES strings
 */
const NodeEciesComponent: ComponentDefinition<NodeEciesStringKey> = {
  id: 'node-ecies',
  name: 'Node ECIES Library Strings',
  stringKeys: Object.values(NodeEciesStringKey),
};

/**
 * Node ECIES string translations
 */
const nodeEciesStrings = {
  [CoreLanguage.EnglishUS]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Length encoding type is invalid',
  },
  [CoreLanguage.EnglishUK]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Length encoding type is invalid',
  },
  [CoreLanguage.French]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      "Le type d'encodage de longueur est invalide",
  },
  [CoreLanguage.Spanish]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'El tipo de codificación de longitud es inválido',
  },
  [CoreLanguage.German]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Längencodierungstyp ist ungültig',
  },
  [CoreLanguage.MandarinChinese]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '长度编码类型无效',
  },
  [CoreLanguage.Japanese]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '長さエンコーディングタイプが無効です',
  },
  [CoreLanguage.Ukrainian]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Тип кодування довжини недійсний',
  },
};

/**
 * Singleton instance of the ECIES I18n engine
 */
let eciesI18nEngineInstance: PluginI18nEngine<CoreLanguage> | null = null;

/**
 * Create or get the ECIES I18n engine with proper component registration
 * This replaces the legacy getEciesI18nEngine() function
 */
export function getEciesPluginI18nEngine(): PluginI18nEngine<CoreLanguage> {
  if (!eciesI18nEngineInstance) {
    // Create core engine with system strings
    eciesI18nEngineInstance = createCoreI18nEngine('node-ecies');

    // Register the Node ECIES component
    const registration: ComponentRegistration<
      NodeEciesStringKey,
      CoreLanguage
    > = {
      component: NodeEciesComponent,
      strings: nodeEciesStrings,
    };

    const result = eciesI18nEngineInstance.registerComponent(registration);
    if (!result.isValid) {
      console.warn(
        'Node ECIES component registration incomplete:',
        result.missingKeys,
      );
    }
  }

  return eciesI18nEngineInstance;
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
  language?: CoreLanguage,
): string {
  const engine = getEciesPluginI18nEngine();
  return engine.translate('node-ecies', key, variables, language);
}

export { NodeEciesStringKey };
