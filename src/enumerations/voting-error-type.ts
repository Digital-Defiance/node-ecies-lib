/**
 * Error types for voting operations.
 * These error codes are used throughout the voting system for consistent error handling.
 */
export enum VotingErrorType {
  // Key derivation errors
  PrivateKeyMustBeBuffer = 'PrivateKeyMustBeBuffer',
  PublicKeyMustBeBuffer = 'PublicKeyMustBeBuffer',
  InvalidPublicKeyFormat = 'InvalidPublicKeyFormat',
  InvalidEcdhKeyPair = 'InvalidEcdhKeyPair',
  FailedToDeriveVotingKeys = 'FailedToDeriveVotingKeys',

  // Prime generation errors
  FailedToGeneratePrime = 'FailedToGeneratePrime',
  IdenticalPrimes = 'IdenticalPrimes',

  // Key pair validation errors
  KeyPairValidationFailed = 'KeyPairValidationFailed',
  KeyPairTooSmall = 'KeyPairTooSmall',
  ModularInverseDoesNotExist = 'ModularInverseDoesNotExist',

  // Isolated key errors
  InvalidKeyPairPublicKeyNotIsolated = 'InvalidKeyPairPublicKeyNotIsolated',
  InvalidKeyPairPrivateKeyNotIsolated = 'InvalidKeyPairPrivateKeyNotIsolated',
  InvalidPublicKeyNotIsolated = 'InvalidPublicKeyNotIsolated',

  // Serialization errors - Public Key
  InvalidPublicKeyBufferTooShort = 'InvalidPublicKeyBufferTooShort',
  InvalidPublicKeyBufferWrongMagic = 'InvalidPublicKeyBufferWrongMagic',
  UnsupportedPublicKeyVersion = 'UnsupportedPublicKeyVersion',
  InvalidPublicKeyBufferIncompleteN = 'InvalidPublicKeyBufferIncompleteN',
  InvalidPublicKeyBufferFailedToParseN = 'InvalidPublicKeyBufferFailedToParseN',
  InvalidPublicKeyIdMismatch = 'InvalidPublicKeyIdMismatch',

  // Serialization errors - Private Key
  InvalidPrivateKeyBufferTooShort = 'InvalidPrivateKeyBufferTooShort',
  InvalidPrivateKeyBufferWrongMagic = 'InvalidPrivateKeyBufferWrongMagic',
  UnsupportedPrivateKeyVersion = 'UnsupportedPrivateKeyVersion',
  InvalidPrivateKeyBufferIncompleteLambda = 'InvalidPrivateKeyBufferIncompleteLambda',
  InvalidPrivateKeyBufferIncompleteMuLength = 'InvalidPrivateKeyBufferIncompleteMuLength',
  InvalidPrivateKeyBufferIncompleteMu = 'InvalidPrivateKeyBufferIncompleteMu',
  InvalidPrivateKeyBufferFailedToParse = 'InvalidPrivateKeyBufferFailedToParse',
  InvalidPrivateKeyBufferFailedToCreate = 'InvalidPrivateKeyBufferFailedToCreate',

  // Instance isolation errors
  InstanceIdMismatch = 'InstanceIdMismatch',
  InvalidCiphertextHmac = 'InvalidCiphertextHmac',
  CiphertextNotFromThisInstance = 'CiphertextNotFromThisInstance',
}
