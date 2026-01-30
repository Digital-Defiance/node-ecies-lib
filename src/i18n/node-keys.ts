import {
  createI18nStringKeys,
  BrandedStringKeyValue,
} from '@digitaldefiance/i18n-lib';

export const NodeEciesComponentId = 'node-ecies' as const;

/**
 * Branded enum for node-ecies string keys.
 * Use this for type-safe i18n operations with runtime identification.
 */
export const NodeEciesStringKey = createI18nStringKeys(NodeEciesComponentId, {
  Error_LengthError_LengthIsInvalidType: 'error_length_error_length_is_invalid_type',

  // Member errors
  Error_Member_MissingMemberName: 'error_member_missing_member_name',
  Error_Member_InvalidMemberNameWhitespace: 'error_member_invalid_member_name_whitespace',
  Error_Member_NoWallet: 'error_member_no_wallet',
  Error_Member_WalletAlreadyLoaded: 'error_member_wallet_already_loaded',
  Error_Member_InvalidMnemonic: 'error_member_invalid_mnemonic',
  Error_Member_MissingPrivateKey: 'error_member_missing_private_key',
  Error_Member_MissingEncryptionData: 'error_member_missing_encryption_data',
  Error_Member_EncryptionDataTooLarge: 'error_member_encryption_data_too_large',
  Error_Member_MissingEmail: 'error_member_missing_email',
  Error_Member_InvalidEmailWhitespace: 'error_member_invalid_email_whitespace',
  Error_InvalidPublicKey: 'error_invalidPublicKey',
  Error_InvalidPublicKeyFormat: 'error_invalidPublicKeyFormat',
  Error_MessageLengthExceedsMaximumAllowedSize: 'error_messageLengthExceedsMaximumAllowedSize',
  Error_InvalidEncryptionTypeOrNumberOfRecipients: 'error_invalidEncryptionTypeOrNumberOfRecipients',
  Error_EncryptedDataLengthMismatch: 'error_encryptedDataLengthMismatch',
  Error_EphemeralPublicKeyLengthMismatch: 'error_ephemeralPublicKeyLengthMismatch',
  Error_EncryptedDataIsEmpty: 'error_encryptedDataIsEmpty',
  Error_CombinedDataTooShort: 'error_combinedDataTooShort',
  Error_BufferIsTooShort: 'error_bufferIsTooShort',
  Error_BufferIsTooShortToReadFullLengthValue: 'error_bufferIsTooShortToReadFullLengthValue',
  Error_LengthExceedsMaximumSafeInteger: 'error_lengthExceedsMaximumSafeInteger',
  Error_BufferIsTooShortForDeclaredDataLength: 'error_bufferIsTooShortForDeclaredDataLength',
  Error_InvalidChecksumConstants: 'error_invalidChecksumConstants',

  // AES-GCM security errors
  Error_InvalidAESKeyLength: 'error_invalidAESKeyLength',
  Error_CannotEncryptEmptyData: 'error_cannotEncryptEmptyData',
  Error_CannotDecryptEmptyData: 'error_cannotDecryptEmptyData',
  Error_InvalidIVLength: 'error_invalidIVLength',
  Error_MessageTooLarge: 'error_messageTooLarge',
  Error_EncryptedSizeExceedsExpected: 'error_encryptedSizeExceedsExpected',

  // PBKDF2 errors
  Error_Pbkdf2_InvalidSaltLength: 'error_pbkdf2_invalid_salt_length',
  Error_Pbkdf2_InvalidHashLength: 'error_pbkdf2_invalid_hash_length',

  // Builder errors
  Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic: 'error_builder_ecies_service_must_be_set_before_generating_mnemonic',
  Error_Builder_ECIESServiceIsRequired: 'error_builder_ecies_service_is_required',
  Error_Builder_TypeNameAndEmailAreRequired: 'error_builder_type_name_and_email_are_required',

  // Streaming errors
  Error_Stream_InvalidPublicKeyLength: 'error_stream_invalid_public_key_length',
  Error_Stream_EncryptionCancelled: 'error_stream_encryption_cancelled',
  Error_Stream_BufferOverflow: 'error_stream_buffer_overflow',
  Error_Stream_AtLeastOneRecipientRequired: 'error_stream_at_least_one_recipient_required',
  Error_Stream_MaxRecipientsExceeded: 'error_stream_max_recipients_exceeded',
  Error_Stream_InvalidRecipientPublicKeyLength: 'error_stream_invalid_recipient_public_key_length',
  Error_Stream_InvalidRecipientIdLength: 'error_stream_invalid_recipient_id_length',
  Error_Stream_InvalidPrivateKeyLength: 'error_stream_invalid_private_key_length',
  Error_Stream_DecryptionCancelled: 'error_stream_decryption_cancelled',
  Error_Stream_ChunkSequenceError: 'error_stream_chunk_sequence_error',

  // Invariant errors
  Error_Invariant_ConfigurationValidationFailedTemplate: 'error_invariant_configuration_validation_failed_template',
  Error_Invariant_NodeRecipientIdConsistency_FailedTemplate: 'error_invariant_node_recipient_id_consistency_failed_template',
  Error_Invariant_MemberIdLengthMismatchTemplate: 'error_invariant_member_id_length_mismatch_template',
  Error_Invariant_EciesMultipleRecipientIdSizeMismatchTemplate: 'error_invariant_ecies_multiple_recipient_id_size_mismatch_template',
  Error_Invariant_EncryptionRecipientIdSizeMismatchTemplate: 'error_invariant_encryption_recipient_id_size_mismatch_template',
} as const);

/**
 * Type for individual NodeEciesStringKey values (string literal union).
 * Use this when typing variables or function parameters that accept a string key value.
 */
export type NodeEciesStringKeyValue = BrandedStringKeyValue<
  typeof NodeEciesStringKey
>;
