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

  // Member errors
  Error_Member_MissingMemberName = 'error_member_missing_member_name',
  Error_Member_InvalidMemberNameWhitespace = 'error_member_invalid_member_name_whitespace',
  Error_Member_NoWallet = 'error_member_no_wallet',
  Error_Member_WalletAlreadyLoaded = 'error_member_wallet_already_loaded',
  Error_Member_InvalidMnemonic = 'error_member_invalid_mnemonic',
  Error_Member_MissingPrivateKey = 'error_member_missing_private_key',
  Error_Member_MissingEncryptionData = 'error_member_missing_encryption_data',
  Error_Member_EncryptionDataTooLarge = 'error_member_encryption_data_too_large',
  Error_Member_MissingEmail = 'error_member_missing_email',
  Error_Member_InvalidEmailWhitespace = 'error_member_invalid_email_whitespace',

  // PBKDF2 errors
  Error_Pbkdf2_InvalidSaltLength = 'error_pbkdf2_invalid_salt_length',
  Error_Pbkdf2_InvalidHashLength = 'error_pbkdf2_invalid_hash_length',
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

    // Member errors
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.EnglishUK]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Length encoding type is invalid',

    // Member errors
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.French]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      "Le type d'encodage de longueur est invalide",

    // Member errors (French translations)
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Le nom du membre est requis',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      "Le nom du membre ne peut pas avoir d'espaces au début ou à la fin",
    [NodeEciesStringKey.Error_Member_NoWallet]: 'Aucun portefeuille disponible',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Le portefeuille est déjà chargé',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Phrase mnémotechnique invalide',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]: 'Clé privée manquante',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Données de chiffrement manquantes',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Données de chiffrement trop volumineuses',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Adresse e-mail requise',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      "L'adresse e-mail ne peut pas avoir d'espaces au début ou à la fin",

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]:
      'Longueur de sel invalide',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]:
      'Longueur de hachage invalide',
  },
  [CoreLanguage.Spanish]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'El tipo de codificación de longitud es inválido',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.German]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Längencodierungstyp ist ungültig',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.MandarinChinese]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '长度编码类型无效',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.Japanese]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '長さエンコーディングタイプが無効です',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [CoreLanguage.Ukrainian]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Тип кодування довжини недійсний',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
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
