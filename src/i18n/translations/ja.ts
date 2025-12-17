import { NodeEciesStringKey } from '../node-keys';

export const japaneseTranslations: Record<NodeEciesStringKey, string> = {
  [NodeEciesStringKey.Error_LengthError_LengthIsInvalidType]:
    '長さエンコーディングタイプが無効です',
  [NodeEciesStringKey.Error_Member_MissingMemberName]: 'メンバー名は必須です',
  [NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace]:
    'メンバー名は前後に空白を含めることはできません',
  [NodeEciesStringKey.Error_Member_NoWallet]:
    '利用可能なウォレットがありません',
  [NodeEciesStringKey.Error_Member_WalletAlreadyLoaded]:
    'ウォレットはすでに読み込まれています',
  [NodeEciesStringKey.Error_Member_InvalidMnemonic]: '無効な助記詞フレーズ',
  [NodeEciesStringKey.Error_Member_MissingPrivateKey]:
    'プライベートキーが見つかりません',
  [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
    '暗号化データが見つかりません',
  [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
    '暗号化データが大きすぎます',
  [NodeEciesStringKey.Error_Member_MissingEmail]: 'メールアドレスは必須です',
  [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
    'メールアドレスは前後に空白を含めることはできません',
  [NodeEciesStringKey.Error_InvalidPublicKey]:
    '受信した公開鍵はnullまたは未定義です',
  [NodeEciesStringKey.Error_InvalidPublicKeyFormat]:
    '無効な公開鍵の形式または長さ',
  [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]:
    'メッセージの長さが最大許可サイズを超えています',
  [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]:
    '無効な暗号化タイプまたは受信者の数',
  [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]:
    '暗号化データの長さが一致しません',
  [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]:
    '正規化後のエフェメラル公開鍵の長さが正しくありません',
  [NodeEciesStringKey.Error_EncryptedDataIsEmpty]: '暗号化データが空です',
  [NodeEciesStringKey.Error_CombinedDataTooShort]:
    '組み合わせデータが短すぎて、必要なコンポーネントを含めることができません',
  [NodeEciesStringKey.Error_BufferIsTooShort]:
    'バッファが短すぎて長さタイプを読み取れません',
  [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]:
    'バッファが短すぎて完全な長さの値を読み取れません',
  [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]:
    '長さが最大安全整数値を超えています',
  [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]:
    'バッファが短すぎて宣言されたデータ長を読み取れません',
  [NodeEciesStringKey.Error_InvalidChecksumConstants]: '無効なチェックサム定数',
  [NodeEciesStringKey.Error_InvalidAESKeyLength]:
    'AES鍵は16、24、または32バイトである必要があります',
  [NodeEciesStringKey.Error_CannotEncryptEmptyData]:
    'nullまたは未定義のデータを暗号化できません',
  [NodeEciesStringKey.Error_CannotDecryptEmptyData]:
    'nullまたは未定義のデータを復号化できません',
  [NodeEciesStringKey.Error_InvalidIVLength]:
    'IVは16バイトである必要があります',
  [NodeEciesStringKey.Error_MessageTooLarge]:
    'メッセージが最大サイズ2GBを超えています',
  [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]:
    '暗号化データサイズが予想される最大値を超えています',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]: '無効なソルト長',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]: '無効なハッシュ長',
  [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]:
    'ニーモニックを生成する前にECIESServiceを設定する必要があります',
  [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]:
    'ECIESServiceが必要です',
  [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]:
    'タイプ、名前、メールが必要です',
  [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]:
    '無効な公開鍵：33（圧縮）または65（非圧縮）バイトである必要があります',
  [NodeEciesStringKey.Error_Stream_EncryptionCancelled]:
    '暗号化がキャンセルされました',
  [NodeEciesStringKey.Error_Stream_BufferOverflow]:
    'バッファオーバーフロー：ソースチャンクが最大サイズを超えています',
  [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]:
    '少なくとも1人の受信者が必要です',
  [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]:
    '最大65535人の受信者がサポートされています',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]:
    '無効な受信者公開鍵：33（圧縮）または65（非圧縮）バイトである必要があります',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]:
    '無効な受信者ID：32バイトである必要があります',
  [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]:
    '無効な秘密鍵：32バイトである必要があります',
  [NodeEciesStringKey.Error_Stream_DecryptionCancelled]:
    '復号化がキャンセルされました',
  [NodeEciesStringKey.Error_Stream_ChunkSequenceError]:
    'チャンクシーケンスエラー',
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
