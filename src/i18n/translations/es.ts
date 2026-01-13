/**
 * Spanish (es) translation strings for Node.js ECIES library.
 * Contains all localized error messages and user-facing text in Spanish.
 */
import { NodeEciesStringKey } from '../node-keys';

export const spanishTranslations: Record<NodeEciesStringKey, string> = {
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
  [NodeEciesStringKey.Error_Member_MissingPrivateKey]: 'Falta la clave privada',
  [NodeEciesStringKey.Error_Member_MissingEncryptionData]:
    'Faltan los datos de cifrado',
  [NodeEciesStringKey.Error_Member_EncryptionDataTooLarge]:
    'Los datos de cifrado son demasiado grandes',
  [NodeEciesStringKey.Error_Member_MissingEmail]:
    'Se requiere la dirección de correo electrónico',
  [NodeEciesStringKey.Error_Member_InvalidEmailWhitespace]:
    'La dirección de correo electrónico no puede tener espacios al principio o al final',
  [NodeEciesStringKey.Error_InvalidPublicKey]:
    'Se recibió clave pública nula o indefinida',
  [NodeEciesStringKey.Error_InvalidPublicKeyFormat]:
    'Formato o longitud de clave pública inválido',
  [NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize]:
    'La longitud del mensaje supera el tamaño máximo permitido',
  [NodeEciesStringKey.Error_InvalidEncryptionTypeOrNumberOfRecipients]:
    'Tipo de cifrado o número de destinatarios inválido',
  [NodeEciesStringKey.Error_EncryptedDataLengthMismatch]:
    'Desajuste de longitud de datos cifrados',
  [NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch]:
    'La clave pública efímera tiene una longitud incorrecta después de la normalización',
  [NodeEciesStringKey.Error_EncryptedDataIsEmpty]:
    'Los datos cifrados están vacíos',
  [NodeEciesStringKey.Error_CombinedDataTooShort]:
    'Los datos combinados son demasiado cortos para contener los componentes requeridos',
  [NodeEciesStringKey.Error_BufferIsTooShort]:
    'El búfer es demasiado corto para leer el tipo de longitud',
  [NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue]:
    'El búfer es demasiado corto para leer la longitud completa',
  [NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger]:
    'La longitud excede el valor máximo seguro para enteros',
  [NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength]:
    'El búfer es demasiado corto para la longitud de datos declarada',
  [NodeEciesStringKey.Error_InvalidChecksumConstants]:
    'Constantes de suma de comprobación no válidas',
  [NodeEciesStringKey.Error_InvalidAESKeyLength]:
    'La clave AES debe ser de 16, 24 o 32 bytes',
  [NodeEciesStringKey.Error_CannotEncryptEmptyData]:
    'No se pueden cifrar datos nulos o indefinidos',
  [NodeEciesStringKey.Error_CannotDecryptEmptyData]:
    'No se pueden descifrar datos nulos o indefinidos',
  [NodeEciesStringKey.Error_InvalidIVLength]: 'El IV debe ser de 16 bytes',
  [NodeEciesStringKey.Error_MessageTooLarge]:
    'El mensaje excede el tamaño máximo de 2GB',
  [NodeEciesStringKey.Error_EncryptedSizeExceedsExpected]:
    'El tamaño de los datos cifrados excede el máximo esperado',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength]:
    'Longitud de sal inválida',
  [NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength]:
    'Longitud de hash inválida',
  [NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic]:
    'ECIESService debe configurarse antes de generar un mnemónico',
  [NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired]:
    'ECIESService es requerido',
  [NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired]:
    'El tipo, nombre y correo electrónico son requeridos',
  [NodeEciesStringKey.Error_Stream_InvalidPublicKeyLength]:
    'Clave pública inválida: debe ser de 33 (comprimida) o 65 (sin comprimir) bytes',
  [NodeEciesStringKey.Error_Stream_EncryptionCancelled]: 'Cifrado cancelado',
  [NodeEciesStringKey.Error_Stream_BufferOverflow]:
    'Desbordamiento de búfer: el fragmento de origen excede el tamaño máximo',
  [NodeEciesStringKey.Error_Stream_AtLeastOneRecipientRequired]:
    'Se requiere al menos un destinatario',
  [NodeEciesStringKey.Error_Stream_MaxRecipientsExceeded]:
    'Máximo de 65535 destinatarios admitidos',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientPublicKeyLength]:
    'Clave pública del destinatario inválida: debe ser de 33 (comprimida) o 65 (sin comprimir) bytes',
  [NodeEciesStringKey.Error_Stream_InvalidRecipientIdLength]:
    'ID de destinatario inválido: debe ser de 32 bytes',
  [NodeEciesStringKey.Error_Stream_InvalidPrivateKeyLength]:
    'Clave privada inválida: debe ser de 32 bytes',
  [NodeEciesStringKey.Error_Stream_DecryptionCancelled]: 'Descifrado cancelado',
  [NodeEciesStringKey.Error_Stream_ChunkSequenceError]:
    'Error de secuencia de fragmentos',
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
