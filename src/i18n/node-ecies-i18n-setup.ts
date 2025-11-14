import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { ComponentConfig, EngineConfig, I18nEngine, LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NodeEciesComponentId } from './ecies-i18n-factory';
import { NodeEciesStringKey } from './ecies-i18n-factory';
import {
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
  return _nodeEciesI18nEngine;
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
  const englishTranslations: Record<NodeEciesStringKey, string> = {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]: 'Length encoding type is invalid',
    [NodeEciesStringKey.Error_Member_MissingMemberName]: 'Member name is required',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]: 'Member name cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No wallet available',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]: 'Wallet is already loaded',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]: 'Invalid mnemonic phrase',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]: 'Private key is missing',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]: 'Encryption data is missing',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]: 'Encryption data is too large',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]: 'Email address cannot have leading or trailing whitespace',
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Received null or undefined public key',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Invalid public key format or length',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'Message length exceeds maximum allowed size',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Invalid encryption type or number of recipients',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Encrypted data length mismatch',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'Ephemeral public key has incorrect length after normalization',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Encrypted data is empty',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Combined data is too short to contain required components',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'Buffer is too short to read length type.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'Buffer is too short to read the full length value.',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'Length exceeds maximum safe integer value',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'Buffer is too short for declared data length',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Invalid checksum constants',
    [NodeEciesStringKey.Error_InvalidAESKeyLength]: 'AES key must be 16, 24, or 32 bytes',
    [NodeEciesStringKey.Error_CannotEncryptEmptyData]: 'Cannot encrypt null or undefined data',
    [NodeEciesStringKey.Error_CannotDecryptEmptyData]: 'Cannot decrypt null or undefined data',
    [NodeEciesStringKey.Error_InvalidIVLength]: 'IV must be 16 bytes',
    [NodeEciesStringKey.Error_MessageTooLarge]: 'Message exceeds maximum size of 2GB',
    [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]: 'Encrypted data size exceeds expected maximum',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
    [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]: 'ECIESService must be set before generating mnemonic',
    [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]: 'ECIESService is required',
    [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]: 'Type, name, and email are required',
    [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]: 'Invalid public key: must be 33 (compressed) or 65 (uncompressed) bytes',
    [NodeEciesStringKey.Error_Stream_EncryptionCancelled]: 'Encryption cancelled',
    [NodeEciesStringKey.Error_Stream_BufferOverflow]: 'Buffer overflow: source chunk exceeds maximum size',
    [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]: 'At least one recipient required',
    [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]: 'Maximum 65535 recipients supported',
    [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]: 'Invalid recipient public key: must be 33 (compressed) or 65 (uncompressed) bytes',
    [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]: 'Invalid recipient ID: must be 32 bytes',
    [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]: 'Invalid private key: must be 32 bytes',
    [NodeEciesStringKey.Error_Stream_DecryptionCancelled]: 'Decryption cancelled',
    [NodeEciesStringKey.Error_Stream_ChunkSequenceError]: 'Chunk sequence error',
  };

  return {
    [LanguageCodes.EN_US]: englishTranslations,
    [LanguageCodes.EN_GB]: englishTranslations,
    [LanguageCodes.FR]: frenchTranslations,
    [LanguageCodes.ES]: spanishTranslations,
    [LanguageCodes.DE]: germanTranslations,
    [LanguageCodes.ZH_CN]: mandarinTranslations,
    [LanguageCodes.JA]: japaneseTranslations,
    [LanguageCodes.UK]: ukrainianTranslations,
  };
}
