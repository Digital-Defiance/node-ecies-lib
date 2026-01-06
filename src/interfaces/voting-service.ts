/**
 * Common interface for VotingService across ecies-lib and node-ecies-lib (Node.js Buffer version)
 *
 * This interface defines the shared contract that both browser (Web Crypto)
 * and Node.js (crypto module) implementations must adhere to, ensuring
 * consistent behavior and cross-platform compatibility.
 */

import type { KeyPair, PrivateKey, PublicKey } from 'paillier-bigint';

import type { IsolatedPrivateKey } from '../isolated-private';
import type { IsolatedPublicKey } from '../isolated-public';

/**
 * Common interface for VotingService implementations (Node.js Buffer version)
 */
export interface IVotingService {
  /**
   * Serialize a base Paillier public key with magic/version/keyId
   * Format: [magic:4][version:1][keyId:32][n_length:4][n:variable]
   *
   * @param publicKey - Paillier public key to serialize
   * @returns Buffer
   */
  votingPublicKeyToBuffer(publicKey: PublicKey): Buffer | Promise<Buffer>;

  /**
   * Deserialize a base Paillier public key from buffer
   * Format: [magic:4][version:1][keyId:32][n_length:4][n:variable]
   *
   * @param buffer - Serialized public key
   * @returns Deserialized Paillier public key
   */
  bufferToVotingPublicKey(buffer: Buffer): Promise<PublicKey>;

  /**
   * Serialize a base Paillier private key with magic/version
   * Format: [magic:4][version:1][lambda_length:4][lambda:variable][mu_length:4][mu:variable]
   *
   * @param privateKey - Paillier private key to serialize
   * @returns Buffer
   */
  votingPrivateKeyToBuffer(privateKey: PrivateKey): Buffer;

  /**
   * Deserialize a base Paillier private key from buffer
   * Format: [magic:4][version:1][lambda_length:4][lambda:variable][mu_length:4][mu:variable]
   *
   * @param buffer - Serialized private key
   * @param publicKey - Corresponding public key
   * @returns Deserialized Paillier private key
   */
  bufferToVotingPrivateKey(
    buffer: Buffer,
    publicKey: PublicKey,
  ): Promise<PrivateKey>;

  /**
   * Serialize an IsolatedPublicKey with magic/version/keyId/instanceId
   * Format: [magic:4][version:1][keyId:32][instanceId:32][n_length:4][n:variable]
   *
   * @param publicKey - Isolated public key to serialize
   * @returns Buffer
   */
  isolatedPublicKeyToBuffer(publicKey: IsolatedPublicKey): Buffer;

  /**
   * Deserialize an IsolatedPublicKey from buffer
   * Format: [magic:4][version:1][keyId:32][instanceId:32][n_length:4][n:variable]
   *
   * @param buffer - Serialized isolated public key
   * @returns Deserialized IsolatedPublicKey
   */
  bufferToIsolatedPublicKey(buffer: Buffer): Promise<IsolatedPublicKey>;

  /**
   * Serialize an IsolatedPrivateKey
   * Uses same format as base private key
   *
   * @param privateKey - Isolated private key to serialize
   * @returns Buffer
   */
  isolatedPrivateKeyToBuffer(privateKey: IsolatedPrivateKey): Buffer;

  /**
   * Deserialize an IsolatedPrivateKey from buffer
   *
   * @param buffer - Serialized isolated private key
   * @param publicKey - Corresponding IsolatedPublicKey
   * @returns Deserialized IsolatedPrivateKey
   */
  bufferToIsolatedPrivateKey(
    buffer: Buffer,
    publicKey: IsolatedPublicKey,
  ): Promise<IsolatedPrivateKey>;

  /**
   * Derive Paillier voting keys from ECDH key pair
   *
   * SECURITY: This is the proper way to generate voting keys - they must be
   * derived from ECDH keys to bind them to user identity.
   *
   * @param ecdhPrivateKey - ECDH private key
   * @param ecdhPublicKey - ECDH public key
   * @param options - Optional derivation parameters
   * @returns Paillier key pair
   */
  deriveVotingKeysFromECDH(
    ecdhPrivateKey: Buffer,
    ecdhPublicKey: Buffer,
    options?: Record<string, unknown>,
  ): Promise<KeyPair>;

  /**
   * Generate deterministic Paillier key pair from seed
   *
   * WARNING: For testing only! Production voting keys MUST be derived from
   * ECDH keys using deriveVotingKeysFromECDH().
   *
   * @param seed - Random seed for deterministic generation
   * @param bitLength - Key bit length (default: 3072)
   * @param iterations - Prime test iterations (default: 256)
   * @returns Paillier key pair
   */
  generateDeterministicKeyPair(
    seed: Buffer,
    bitLength?: number,
    iterations?: number,
  ): Promise<KeyPair>;
}

/**
 * Extended interface for IsolatedPublicKey with async methods (Node.js Buffer version)
 * These are the actual methods used by the voting service implementations
 */
export interface IIsolatedPublicKeyAsync {
  readonly keyId: Buffer;
  getKeyId(): Buffer;
  getInstanceId(): Buffer;
  updateInstanceId(): Promise<void>;
  verifyKeyIdAsync(): Promise<void>;
  encryptAsync(m: bigint): Promise<bigint>;
  multiplyAsync(ciphertext: bigint, constant: bigint): Promise<bigint>;
  additionAsync(a: bigint, b: bigint): Promise<bigint>;
  extractInstanceId(ciphertext: bigint): Promise<Buffer>;
}

/**
 * Extended interface for IsolatedPrivateKey with async methods (Node.js Buffer version)
 * These are the actual methods used by the voting service implementations
 */
export interface IIsolatedPrivateKeyAsync {
  decryptAsync(taggedCiphertext: bigint): Promise<bigint>;
  getOriginalKeyId(): Buffer;
  getOriginalInstanceId(): Buffer;
  getOriginalPublicKey(): IIsolatedPublicKeyAsync;
}
