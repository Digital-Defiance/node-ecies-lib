/**
 * Constants for voting operations using Paillier homomorphic encryption.
 * These values are critical for cryptographic operations and should be consistent
 * across all implementations (ecies-lib, node-ecies-lib, BrightChain).
 *
 * This file is separated from voting.service.ts to avoid circular dependencies
 * with isolated-public.ts and isolated-private.ts.
 */
export interface IVotingConsts {
  /**
   * Info string used in HKDF for prime generation.
   * This provides domain separation in the key derivation process.
   */
  readonly PRIME_GEN_INFO: 'PaillierPrimeGen';

  /**
   * Number of iterations for Miller-Rabin primality test.
   * With 256 rounds, probability of false positive is < 2^-512.
   */
  readonly PRIME_TEST_ITERATIONS: 256;

  /**
   * Bit length for Paillier key pair generation.
   * 3072 bits provides ~128-bit security level (NIST recommended).
   */
  readonly KEYPAIR_BIT_LENGTH: 3072;

  /**
   * Offset of the public key in the key pair buffer.
   * Used for buffer serialization calculations.
   */
  readonly PUB_KEY_OFFSET: 768;

  /**
   * HKDF output length in bytes.
   * SHA-512 produces 64 bytes.
   */
  readonly HKDF_LENGTH: 64;

  /**
   * HMAC algorithm for HKDF key derivation.
   */
  readonly HMAC_ALGORITHM: 'sha512';

  /**
   * Hash algorithm for key ID generation and HMAC tagging.
   */
  readonly HASH_ALGORITHM: 'sha256';

  /**
   * Radix for bit string representation (binary).
   */
  readonly BITS_RADIX: 2;

  /**
   * Radix for key serialization (hexadecimal).
   */
  readonly KEY_RADIX: 16;

  /**
   * Format for key serialization.
   */
  readonly KEY_FORMAT: 'hex';

  /**
   * Format for digest output.
   */
  readonly DIGEST_FORMAT: 'hex';

  /**
   * Version number for key serialization format.
   */
  readonly KEY_VERSION: 1;

  /**
   * Magic bytes for identifying BrightChain voting keys.
   */
  readonly KEY_MAGIC: 'BCVK';

  /**
   * Maximum attempts to generate a valid prime in DRBG.
   */
  readonly DRBG_PRIME_ATTEMPTS: 20000;

  /**
   * Length of key ID in bytes (SHA-256 output).
   */
  readonly KEY_ID_LENGTH: 32;

  /**
   * Length of instance ID in bytes (SHA-256 output).
   */
  readonly INSTANCE_ID_LENGTH: 32;
}

/**
 * Constants for voting operations using Paillier homomorphic encryption.
 * These values are critical for cryptographic operations and MUST match
 * across all implementations (ecies-lib, node-ecies-lib, BrightChain).
 */
export const VOTING: IVotingConsts = Object.freeze({
  PRIME_GEN_INFO: 'PaillierPrimeGen' as const,
  PRIME_TEST_ITERATIONS: 256 as const,
  KEYPAIR_BIT_LENGTH: 3072 as const,
  PUB_KEY_OFFSET: 768 as const,
  HKDF_LENGTH: 64 as const,
  HMAC_ALGORITHM: 'sha512' as const,
  HASH_ALGORITHM: 'sha256' as const,
  BITS_RADIX: 2 as const,
  KEY_RADIX: 16 as const,
  KEY_FORMAT: 'hex' as const,
  DIGEST_FORMAT: 'hex' as const,
  KEY_VERSION: 1 as const,
  KEY_MAGIC: 'BCVK' as const,
  DRBG_PRIME_ATTEMPTS: 20000 as const,
  KEY_ID_LENGTH: 32 as const,
  INSTANCE_ID_LENGTH: 32 as const,
});
