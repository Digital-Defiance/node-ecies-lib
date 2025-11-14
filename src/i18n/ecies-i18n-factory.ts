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
  Error_InvalidPublicKey = 'error_invalidPublicKey',
  Error_InvalidPublicKeyFormat = 'error_invalidPublicKeyFormat',
  Error_MessageLengthExceedsMaximumAllowedSize = 'error_messageLengthExceedsMaximumAllowedSize',
  Error_InvalidEncryptionTypeOrNumberOfRecipients = 'error_invalidEncryptionTypeOrNumberOfRecipients',
  Error_EncryptedDataLengthMismatch = 'error_encryptedDataLengthMismatch',
  Error_EphemeralPublicKeyLengthMismatch = 'error_ephemeralPublicKeyLengthMismatch',
  Error_EncryptedDataIsEmpty = 'error_encryptedDataIsEmpty',
  Error_CombinedDataTooShort = 'error_combinedDataTooShort',
  Error_BufferIsTooShort = 'error_bufferIsTooShort',
  Error_BufferIsTooShortToReadFullLengthValue = 'error_bufferIsTooShortToReadFullLengthValue',
  Error_LengthExceedsMaximumSafeInteger = 'error_lengthExceedsMaximumSafeInteger',
  Error_BufferIsTooShortForDeclaredDataLength = 'error_bufferIsTooShortForDeclaredDataLength',
  Error_InvalidChecksumConstants = 'error_invalidChecksumConstants',

  // AES-GCM security errors
  Error_InvalidAESKeyLength = 'error_invalidAESKeyLength',
  Error_CannotEncryptEmptyData = 'error_cannotEncryptEmptyData',
  Error_CannotDecryptEmptyData = 'error_cannotDecryptEmptyData',
  Error_InvalidIVLength = 'error_invalidIVLength',
  Error_MessageTooLarge = 'error_messageTooLarge',
  Error_EncryptedSizeExceedsExpected = 'error_encryptedSizeExceedsExpected',

  // PBKDF2 errors
  Error_Pbkdf2_InvalidSaltLength = 'error_pbkdf2_invalid_salt_length',
  Error_Pbkdf2_InvalidHashLength = 'error_pbkdf2_invalid_hash_length',

  // Builder errors
  Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic = 'error_builder_ecies_service_must_be_set_before_generating_mnemonic',
  Error_Builder_ECIESServiceIsRequired = 'error_builder_ecies_service_is_required',
  Error_Builder_TypeNameAndEmailAreRequired = 'error_builder_type_name_and_email_are_required',

  // Streaming errors
  Error_Stream_InvalidPublicKeyLength = 'error_stream_invalid_public_key_length',
  Error_Stream_EncryptionCancelled = 'error_stream_encryption_cancelled',
  Error_Stream_BufferOverflow = 'error_stream_buffer_overflow',
  Error_Stream_AtLeastOneRecipientRequired = 'error_stream_at_least_one_recipient_required',
  Error_Stream_MaxRecipientsExceeded = 'error_stream_max_recipients_exceeded',
  Error_Stream_InvalidRecipientPublicKeyLength = 'error_stream_invalid_recipient_public_key_length',
  Error_Stream_InvalidRecipientIdLength = 'error_stream_invalid_recipient_id_length',
  Error_Stream_InvalidPrivateKeyLength = 'error_stream_invalid_private_key_length',
  Error_Stream_DecryptionCancelled = 'error_stream_decryption_cancelled',
  Error_Stream_ChunkSequenceError = 'error_stream_chunk_sequence_error',
}
export const NodeEciesComponentId = 'node-ecies';

// Import translations after enum is defined
import { englishTranslations } from './translations/en-US';
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

export { NodeEciesStringKey };
