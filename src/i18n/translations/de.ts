import { NodeEciesStringKey } from '../node-keys';

export const germanTranslations: Record<NodeEciesStringKey, string> = {
  [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
    'Längencodierungstyp ist ungültig',
  [NodeEciesStringKey.Error_Member_MissingMemberName]:
    'Mitgliedsname ist erforderlich',
  [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
    'Mitgliedsname darf keine führenden oder nachfolgenden Leerzeichen haben',
  [NodeEciesStringKey.Error_Member_NoWallet]: 'Keine Wallet verfügbar',
  [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
    'Wallet ist bereits geladen',
  [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
    'Ungültige mnemonische Phrase',
  [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
    'Privater Schlüssel fehlt',
  [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
    'Verschlüsselungsdaten fehlen',
  [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
    'Verschlüsselungsdaten sind zu groß',
  [NodeEciesStringKey.Error_Member_MissingEmail]:
    'E-Mail-Adresse ist erforderlich',
  [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
    'E-Mail-Adresse darf keine führenden oder nachfolgenden Leerzeichen haben',
  [NodeEciesStringKey.Error_InvalidPublicKey]:
    'Null oder undefinierter öffentlicher Schlüssel empfangen',
  [NodeEciesStringKey.Error_InvalidPublicKeyFormat]:
    'Ungültiges Format oder Länge des öffentlichen Schlüssels',
  [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]:
    'Die Nachricht überschreitet die maximal erlaubte Länge',
  [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]:
    'Ungültiger Verschlüsselungstyp oder Anzahl der Empfänger',
  [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]:
    'Verschlüsselte Datenlänge stimmt nicht überein',
  [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]:
    'Ephemerer öffentlicher Schlüssel hat nach der Normalisierung eine falsche Länge',
  [NodeEciesStringKey.Error_EncryptedDataIsEmpty]:
    'Verschlüsselte Daten sind leer',
  [NodeEciesStringKey.Error_CombinedDataTooShort]:
    'Die kombinierten Daten sind zu kurz, um die erforderlichen Komponenten zu enthalten',
  [NodeEciesStringKey.Error_BufferIsTooShort]:
    'Der Puffer ist zu kurz, um den Längentyp zu lesen',
  [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]:
    'Der Puffer ist zu kurz, um die vollständige Längenangabe zu lesen',
  [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]:
    'Die Länge überschreitet den maximalen sicheren Ganzzahlwert',
  [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]:
    'Der Puffer ist zu kurz für die deklarierte Datenlänge',
  [NodeEciesStringKey.Error_InvalidChecksumConstants]:
    'Ungültige Prüfziffernkonstanten',
  [NodeEciesStringKey.Error_InvalidAESKeyLength]:
    'AES-Schlüssel muss 16, 24 oder 32 Bytes sein',
  [NodeEciesStringKey.Error_CannotEncryptEmptyData]:
    'Null- oder undefinierte Daten können nicht verschlüsselt werden',
  [NodeEciesStringKey.Error_CannotDecryptEmptyData]:
    'Null- oder undefinierte Daten können nicht entschlüsselt werden',
  [NodeEciesStringKey.Error_InvalidIVLength]: 'IV muss 16 Bytes sein',
  [NodeEciesStringKey.Error_MessageTooLarge]:
    'Nachricht überschreitet maximale Größe von 2GB',
  [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]:
    'Verschlüsselte Datengröße überschreitet erwartetes Maximum',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Ungültige Salt-Länge',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Ungültige Hash-Länge',
  [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]:
    'ECIESService muss vor der Generierung eines Mnemonics festgelegt werden',
  [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]:
    'ECIESService ist erforderlich',
  [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]:
    'Typ, Name und E-Mail sind erforderlich',
  [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]:
    'Ungültiger öffentlicher Schlüssel: muss 33 (komprimiert) oder 65 (unkomprimiert) Bytes sein',
  [NodeEciesStringKey.Error_Stream_EncryptionCancelled]:
    'Verschlüsselung abgebrochen',
  [NodeEciesStringKey.Error_Stream_BufferOverflow]:
    'Pufferüberlauf: Quellblock überschreitet maximale Größe',
  [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]:
    'Mindestens ein Empfänger erforderlich',
  [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]:
    'Maximal 65535 Empfänger unterstützt',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]:
    'Ungültiger öffentlicher Empfängerschlüssel: muss 33 (komprimiert) oder 65 (unkomprimiert) Bytes sein',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]:
    'Ungültige Empfänger-ID: muss 32 Bytes sein',
  [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]:
    'Ungültiger privater Schlüssel: muss 32 Bytes sein',
  [NodeEciesStringKey.Error_Stream_DecryptionCancelled]:
    'Entschlüsselung abgebrochen',
  [NodeEciesStringKey.Error_Stream_ChunkSequenceError]: 'Blocksequenzfehler',
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
