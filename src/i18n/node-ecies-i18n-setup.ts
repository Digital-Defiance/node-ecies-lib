import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { ComponentConfig, I18nEngine, LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NodeEciesComponentId } from './ecies-i18n-factory';
import { NodeEciesStringKey } from './ecies-i18n-factory';

let _nodeEciesI18nEngine: I18nEngine | null = null;
let _componentRegistered = false;

export function getNodeEciesI18nEngine(): I18nEngine {
  // Get base ecies engine (uses 'default' key)
  const baseEngine = getEciesI18nEngine();
  
  // Register node-ecies component if not already registered
  if (!_componentRegistered) {
    try {
      baseEngine.register(createNodeEciesComponentConfig());
      _componentRegistered = true;
    } catch (error) {
      // Component already registered, that's fine
      if (error instanceof Error && !error.message.includes('already registered')) {
        throw error;
      }
      _componentRegistered = true;
    }
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
    aliases: [ 'node-ecies', 'NodeEciesStringKey' ],
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
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  };

  // For now, use English for all languages - translations can be added later
  return {
    [LanguageCodes.EN_US]: englishTranslations,
    [LanguageCodes.EN_GB]: englishTranslations,
    [LanguageCodes.FR]: englishTranslations,
    [LanguageCodes.ES]: englishTranslations,
    [LanguageCodes.DE]: englishTranslations,
    [LanguageCodes.ZH_CN]: englishTranslations,
    [LanguageCodes.JA]: englishTranslations,
    [LanguageCodes.UK]: englishTranslations,
  };
}
