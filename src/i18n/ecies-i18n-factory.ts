import {
  ComponentDefinition,
  ComponentRegistration,
  createCoreI18nEngine,
  PluginI18nEngine,
  LanguageCodes,
  TranslationEngine,
} from '@digitaldefiance/i18n-lib';
import { EciesStringKey, getCompatibleEciesEngine } from '@digitaldefiance/ecies-lib';

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
  [LanguageCodes.EN_US]: {
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

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [LanguageCodes.EN_GB]: {
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
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Received null or undefined public key',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Invalid public key format or length',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'Message length exceeds maximum allowed size',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Invalid encryption type or number of recipients',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Encrypted data length mismatch',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'Ephemeral public key has incorrect length after normalization',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Combined data is too short to contain required components',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Encrypted data is empty',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'Buffer is too short to read length type.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'Buffer is too short to read the full length value.',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'Length exceeds maximum safe integer value',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'Buffer is too short for declared data length',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Invalid checksum constants',

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Invalid salt length',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Invalid hash length',
  },
  [LanguageCodes.FR]: {
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
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Clé publique reçue nulle ou indéfinie',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Format ou longueur de clé publique invalide',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'La longueur du message dépasse la taille maximale autorisée',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Type de chiffrement ou nombre de destinataires invalide',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'La longueur de la clé publique éphémère est incorrecte après normalisation',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Mismatch de longueur des données chiffrées',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Les données combinées sont trop courtes pour contenir les composants requis',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'Le tampon est trop court pour lire le type de longueur.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'Le tampon est trop court pour lire la valeur de longueur complète.',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Les données chiffrées sont vides',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'La longueur dépasse la valeur entière sécurisée maximale.',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'Le tampon est trop court pour la longueur de données déclarée.',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Constantes de somme de contrôle invalides.',

    // PBKDF2 errors
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]:
      'Longueur de sel invalide',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]:
      'Longueur de hachage invalide',
  },
  [LanguageCodes.ES]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'El tipo de codificación de longitud es inválido',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Se requiere el nombre del miembro',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'El nombre del miembro no puede tener espacios al principio o al final',
    [NodeEciesStringKey.Error_Member_NoWallet]: 'No hay billetera disponible',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'La billetera ya está cargada',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      'Frase mnemotécnica inválida',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'Falta la clave privada',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      'Faltan los datos de cifrado',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      'Los datos de cifrado son demasiado grandes',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Se requiere la dirección de correo electrónico',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'La dirección de correo electrónico no puede tener espacios al principio o al final',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Longitud de sal inválida',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Longitud de hash inválida',
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Se recibió clave pública nula o indefinida',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Formato o longitud de clave pública inválido',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'La longitud del mensaje supera la tamaño máximo permitido',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Tipo de cifrado o número de destinatarios inválido',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'La longitud de la clave pública efímera es incorrecta después de la normalización',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Desajuste de longitud de datos cifrados',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Los datos combinados son demasiado cortos para contener los componentes requeridos',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'El búfer es demasiado corto para leer el tipo de longitud.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'El búfer es demasiado corto para leer la longitud completa.',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Los datos cifrados están vacíos',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'La longitud excede el valor máximo seguro para enteros.',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'El búfer es demasiado corto para la longitud de datos declarada.',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Constantes de suma de comprobación no válidas.',
  },
  [LanguageCodes.DE]: {
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
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'E-Mail-Adresse ist erforderlich',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'E-Mail-Adresse darf keine führenden oder nachfolgenden Leerzeichen haben',
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Null oder undefinierter öffentlicher Schlüssel empfangen',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Ungültiges Format oder Länge des öffentlichen Schlüssels',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'Die Nachricht überschreitet die maximal erlaubte Länge',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Ungültiger Verschlüsselungstyp oder Anzahl der Empfänger',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Desajuste de longitud de datos cifrados',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'Ephemerer öffentlicher Schlüssel hat nach der Normalisierung eine falsche Länge',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Verschlüsselte Daten sind leer',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Die kombinierten Daten sind zu kurz, um die erforderlichen Komponenten zu enthalten',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'Der Puffer ist zu kurz, um den Längentyp zu lesen.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'Der Puffer ist zu kurz, um die vollständige Längenangabe zu lesen.',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'Die Länge überschreitet den maximalen sicheren Ganzzahlwert.',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'Der Puffer ist zu kurz für die deklarierte Datenlänge.',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Ungültige Prüfziffernkonstanten',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Ungültige Salt-Länge',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Ungültige Hash-Länge',
  },
  [LanguageCodes.ZH_CN]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '长度编码类型无效',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      '需要成员名称',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      '成员名称不能有前导或尾随空格',
    [NodeEciesStringKey.Error_Member_NoWallet]: '没有可用的钱包',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      '钱包已加载',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      '无效的助记词',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      '缺少私钥',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      '缺少加密数据',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      '加密数据过大',
    [NodeEciesStringKey.Error_Member_MissingEmail]: '需要电子邮件地址',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      '电子邮件地址不能有前导或尾随空格',
    [NodeEciesStringKey.Error_InvalidPublicKey]: '收到空或未定义的公钥',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: '无效的公钥格式或长度',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: '消息长度超过最大允许长度',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: '无效的加密类型或接收者数量',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: '加密数据长度不匹配',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: '临时公钥在规范化后长度不正确',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: '加密数据为空',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: '组合数据太短，无法包含所需组件',
    [NodeEciesStringKey.Error_BufferIsTooShort]: '缓冲区太短，无法读取长度类型。',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: '缓冲区太短，无法读取完整的长度值。',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: '长度超过最大安全整数值。',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: '缓冲区太短，无法读取声明的数据长度。',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: '无效的校验和常量',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: '无效的盐长度',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: '无效的哈希长度',
  },
  [LanguageCodes.JA]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      '長さエンコーディングタイプが無効です',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'メンバー名は必須です',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'メンバー名は前後に空白を含めることはできません',
    [NodeEciesStringKey.Error_Member_NoWallet]: '利用可能なウォレットがありません',
    [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
      'ウォレットはすでに読み込まれています',
    [NodeEciesStringKey.Error_Member_InvalidMnemonic]:
      '無効な助記詞フレーズ',
    [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
      'プライベートキーが見つかりません',
    [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
      '暗号化データが見つかりません',
    [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
      '暗号化データが大きすぎます',
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'メールアドレスは必須です',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'メールアドレスは前後に空白を含めることはできません',
    [NodeEciesStringKey.Error_InvalidPublicKey]: '受信した公開鍵はnullまたは未定義です',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: '無効な公開鍵の形式または長さ',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'メッセージの長さが最大許可サイズを超えています',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: '無効な暗号化タイプまたは受信者の数',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: '暗号化データの長さが一致しません',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: '正規化後のエフェメラル公開鍵の長さが正しくありません',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: '組み合わせデータが短すぎて、必要なコンポーネントを含めることができません',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: '暗号化データが空です',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'バッファが短すぎて長さタイプを読み取れません。',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'バッファが短すぎて完全な長さの値を読み取れません。',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: '長さが最大安全整数値を超えています。',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'バッファが短すぎて宣言されたデータ長を読み取れません。',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: '無効なチェックサム定数',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: '無効なソルト長',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: '無効なハッシュ長',
  },
  [LanguageCodes.UK]: {
    [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
      'Тип кодування довжини недійсний',
    [NodeEciesStringKey.Error_Member_MissingMemberName]:
      'Обов\'язкове поле: ім\'я учасника',
    [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
      'Ім\'я учасника не може містити провідні або кінцеві пробіли',
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
    [NodeEciesStringKey.Error_Member_MissingEmail]: 'Обов\'язкове поле: адреса електронної пошти',
    [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
      'Адреса електронної пошти не може містити провідні або кінцеві пробіли',
    [NodeEciesStringKey.Error_InvalidPublicKey]: 'Отримано нульовий або невизначений публічний ключ',
    [NodeEciesStringKey.Error_InvalidPublicKeyFormat]: 'Неправильний формат або довжина публічного ключа',
    [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]: 'Довжина повідомлення перевищує максимально допустимий розмір',
    [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]: 'Неправильний тип шифрування або кількість отримувачів',
    [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]: 'Довжина зашифрованих даних не збігається',
    [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]: 'Тимчасовий публічний ключ має неправильну довжину після нормалізації',
    [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: 'Зашифровані дані порожні',
    [NodeEciesStringKey.Error_CombinedDataTooShort]: 'Об\'єднані дані занадто короткі, щоб містити необхідні компоненти',
    [NodeEciesStringKey.Error_BufferIsTooShort]: 'Буфер занадто короткий, щоб прочитати тип довжини.',
    [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]: 'Буфер занадто короткий, щоб прочитати повну довжину значення.',
    [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]: 'Довжина перевищує максимальне безпечне ціле значення.',
    [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]: 'Буфер занадто короткий для заявленої довжини даних.',
    [NodeEciesStringKey.Error_InvalidChecksumConstants]: 'Неправильні константи контрольної суми',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: 'Недійсна довжина солі',
    [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: 'Недійсна довжина хешу',
  },
};

/**
 * Singleton instance of the ECIES I18n engine
 */
let eciesI18nEngineInstance: PluginI18nEngine<string> | null = null;

/**
 * Create or get the ECIES I18n engine with proper component registration
 * This replaces the legacy getEciesI18nEngine() function
 */
export function getEciesPluginI18nEngine(): PluginI18nEngine<string> {
  if (!eciesI18nEngineInstance) {
    // Create core engine with system strings
    eciesI18nEngineInstance = createCoreI18nEngine('node-ecies');

    // Register the Node ECIES component
    const registration: ComponentRegistration<
      NodeEciesStringKey,
      string
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
  language?: string,
): string {
  const engine = getEciesPluginI18nEngine();
  return engine.translate('node-ecies', key, variables, language);
}

/**
 * Create a TranslationEngine adapter for ECIES errors
 * Uses the base ecies-lib's compatible engine which has all EciesStringKey translations
 */
export function createEciesTranslationEngine(): TranslationEngine<EciesStringKey> {
  return getCompatibleEciesEngine() as TranslationEngine<EciesStringKey>;
}

export { NodeEciesStringKey };
