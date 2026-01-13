/**
 * Ukrainian (uk) translation strings for Node.js ECIES library.
 * Contains all localized error messages and user-facing text in Ukrainian.
 */
import { NodeEciesStringKey } from '../node-keys';

export const ukrainianTranslations: Record<NodeEciesStringKey, string> = {
  [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
    'Тип кодування довжини недійсний',
  [NodeEciesStringKey.Error_Member_MissingMemberName]:
    "Обов'язкове поле: ім'я учасника",
  [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
    "Ім'я учасника не може містити провідні або кінцеві пробіли",
  [NodeEciesStringKey.Error_Member_NoWallet]: 'Немає доступного гаманця',
  [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
    'Гаманець вже завантажено',
  [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
    'Неправильна мнемонічна фраза',
  [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
    'Відсутній приватний ключ',
  [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
    'Відсутні дані шифрування',
  [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
    'Дані шифрування занадто великі',
  [NodeEciesStringKey.Error_Member_MissingEmail]:
    "Обов'язкове поле: адреса електронної пошти",
  [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
    'Адреса електронної пошти не може містити провідні або кінцеві пробіли',
  [NodeEciesStringKey.Error_InvalidPublicKey]:
    'Отримано нульовий або невизначений публічний ключ',
  [NodeEciesStringKey.Error_InvalidPublicKeyFormat]:
    'Неправильний формат або довжина публічного ключа',
  [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]:
    'Довжина повідомлення перевищує максимально допустимий розмір',
  [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]:
    'Неправильний тип шифрування або кількість отримувачів',
  [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]:
    'Довжина зашифрованих даних не збігається',
  [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]:
    'Тимчасовий публічний ключ має неправильну довжину після нормалізації',
  [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Зашифровані дані порожні',
  [NodeEciesStringKey.Error_CombinedDataTooShort]:
    "Об'єднані дані занадто короткі, щоб містити необхідні компоненти",
  [NodeEciesStringKey.Error_BufferIsTooShort]:
    'Буфер занадто короткий, щоб прочитати тип довжини',
  [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]:
    'Буфер занадто короткий, щоб прочитати повну довжину значення',
  [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]:
    'Довжина перевищує максимальне безпечне ціле значення',
  [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]:
    'Буфер занадто короткий для заявленої довжини даних',
  [NodeEciesStringKey.Error_InvalidChecksumConstants]:
    'Неправильні константи контрольної суми',
  [NodeEciesStringKey.Error_InvalidAESKeyLength]:
    'Ключ AES повинен бути 16, 24 або 32 байти',
  [NodeEciesStringKey.Error_CannotEncryptEmptyData]:
    'Неможливо зашифрувати null або невизначені дані',
  [NodeEciesStringKey.Error_CannotDecryptEmptyData]:
    'Неможливо розшифрувати null або невизначені дані',
  [NodeEciesStringKey.Error_InvalidIVLength]: 'IV повинен бути 16 байтів',
  [NodeEciesStringKey.Error_MessageTooLarge]:
    'Повідомлення перевищує максимальний розмір 2ГБ',
  [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]:
    'Розмір зашифрованих даних перевищує очікуваний максимум',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Недійсна довжина солі',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Недійсна довжина хешу',
  [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]:
    'ECIESService повинен бути встановлений перед генерацією мнемоніки',
  [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]:
    "ECIESService є обов'язковим",
  [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]:
    "Тип, ім'я та електронна пошта є обов'язковими",
  [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]:
    'Недійсний публічний ключ: повинен бути 33 (стиснутий) або 65 (нестиснутий) байтів',
  [NodeEciesStringKey.Error_Stream_EncryptionCancelled]: 'Шифрування скасовано',
  [NodeEciesStringKey.Error_Stream_BufferOverflow]:
    'Переповнення буфера: блок джерела перевищує максимальний розмір',
  [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]:
    'Потрібен щонайменше один отримувач',
  [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]:
    'Підтримується максимум 65535 отримувачів',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]:
    'Недійсний публічний ключ отримувача: повинен бути 33 (стиснутий) або 65 (нестиснутий) байтів',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]:
    'Недійсний ID отримувача: повинен бути 32 байти',
  [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]:
    'Недійсний приватний ключ: повинен бути 32 байти',
  [NodeEciesStringKey.Error_Stream_DecryptionCancelled]:
    'Розшифрування скасовано',
  [NodeEciesStringKey.Error_Stream_ChunkSequenceError]:
    'Помилка послідовності фрагментів',
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
