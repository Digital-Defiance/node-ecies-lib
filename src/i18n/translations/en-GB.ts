import { NodeEciesStringKey } from '../node-keys';

export const britishEnglishTranslations: Record<NodeEciesStringKey, string> = {
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
  [NodeEciesStringKey.Error_Member_InvalidMnemonic]: 'Invalid mnemonic phrase',
  [NodeEciesStringKey.Error_Member_MissingPrivateKey]: 'Private key is missing',
  [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
    'Encryption data is missing',
  [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
    'Encryption data is too large',
  [NodeEciesStringKey.Error_Member_MissingEmail]: 'Email address is required',
  [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
    'Email address cannot have leading or trailing whitespace',
  [NodeEciesStringKey.Error_InvalidPublicKey]:
    'Received null or undefined public key',
  [NodeEciesStringKey.Error_InvalidPublicKeyFormat]:
    'Invalid public key format or length',
  [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]:
    'Message length exceeds maximum allowed size',
  [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]:
    'Invalid encryption type or number of recipients',
  [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]:
    'Encrypted data length mismatch',
  [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]:
    'Ephemeral public key has incorrect length after normalization',
  [NodeEciesStringKey.Error_CombinedDataTooShort]:
    'Combined data is too short to contain required components',
  [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Encrypted data is empty',
  [NodeEciesStringKey.Error_BufferIsTooShort]:
    'Buffer is too short to read length type.',
  [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]:
    'Buffer is too short to read the full length value.',
  [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]:
    'Length exceeds maximum safe integer value',
  [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]:
    'Buffer is too short for declared data length',
  [NodeEciesStringKey.Error_InvalidChecksumConstants]:
    'Constantes de somme de contrôle invalides.',

  // AES-GCM security errors
  [NodeEciesStringKey.Error_InvalidAESKeyLength]:
    'La clé AES doit faire 16, 24 ou 32 octets',
  [NodeEciesStringKey.Error_CannotEncryptEmptyData]:
    'Impossible de chiffrer des données nulles ou indéfinies',
  [NodeEciesStringKey.Error_CannotDecryptEmptyData]:
    'Impossible de déchiffrer des données nulles ou indéfinies',
  [NodeEciesStringKey.Error_InvalidIVLength]:
    "Le vecteur d'initialisation doit faire 16 octets",
  [NodeEciesStringKey.Error_MessageTooLarge]:
    'Le message dépasse la taille maximale de 2 Go',
  [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]:
    'La taille des données chiffrées dépasse le maximum attendu',

  // PBKDF2 errors
  [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',

  // Builder errors
  [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]:
    'ECIESService must be set before generating mnemonic',
  [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]:
    'ECIESService is required',
  [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]:
    'Type, name, and email are required',
  [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]:
    'Invalid public key: must be 33 (compressed) or 65 (uncompressed) bytes',
  [NodeEciesStringKey.Error_Stream_EncryptionCancelled]: 'Encryption cancelled',
  [NodeEciesStringKey.Error_Stream_BufferOverflow]:
    'Buffer overflow: source chunk exceeds maximum size',
  [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]:
    'At least one recipient required',
  [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]:
    'Maximum 65535 recipients supported',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]:
    'Invalid recipient public key: must be 33 (compressed) or 65 (uncompressed) bytes',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]:
    'Invalid recipient ID: must be 32 bytes',
  [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]:
    'Invalid private key: must be 32 bytes',
  [NodeEciesStringKey.Error_Stream_DecryptionCancelled]: 'Decryption cancelled',
  [NodeEciesStringKey.Error_Stream_ChunkSequenceError]: 'Chunk sequence error',
  [NodeEciesStringKey.Error_Invariant_ConfigurationValidationFailedTemplate]:
    'Node.js configuration validation failed:\n{failures}',
  [NodeEciesStringKey.Error_Invariant_NodeRecipientIdConsistency_FailedTemplate]:
    "Invariant 'NodeRecipientIdConsistency' failed:\n  {issues}",
  [NodeEciesStringKey.Error_Invariant_MemberIdLengthMismatchTemplate]:
    'MEMBER_ID_LENGTH ({actual}) !== idProvider.byteLength ({expected})',
  [NodeEciesStringKey.Error_Invariant_EciesMultipleRecipientIdSizeMismatchTemplate]:
    'ECIES.MULTIPLE.RECIPIENT_ID_SIZE ({actual}) !== idProvider.byteLength ({expected})',
  [NodeEciesStringKey.Error_Invariant_EncryptionRecipientIdSizeMismatchTemplate]:
    'ENCRYPTION.RECIPIENT_ID_SIZE ({actual}) !== idProvider.byteLength ({expected})',
};
