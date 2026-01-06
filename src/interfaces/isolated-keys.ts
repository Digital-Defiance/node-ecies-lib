/**
 * Shared interfaces for IsolatedPublicKey and IsolatedPrivateKey (Node.js Buffer version)
 * These interfaces define the common API for Node.js implementations using Buffer.
 */

import type { PrivateKey, PublicKey } from 'paillier-bigint';

/**
 * Common interface for IsolatedPublicKey implementations (Node.js Buffer version)
 */
export interface IIsolatedPublicKey extends PublicKey {
  /**
   * Deterministic identifier derived from the public key (SHA-256 of 'n')
   */
  readonly keyId: Buffer;

  /**
   * Returns a copy of the keyId
   */
  getKeyId(): Buffer;

  /**
   * Returns a copy of the current instance ID
   */
  getInstanceId(): Buffer;

  /**
   * Updates the current instance ID to a new random value
   * This invalidates all previously encrypted ciphertexts
   */
  updateInstanceId(): void;

  /**
   * Verifies that the keyId matches the SHA-256 hash of the public key 'n'
   */
  verifyKeyId(): void;

  /**
   * Encrypts a message and tags it with instance HMAC
   */
  encryptIsolated(m: bigint): bigint;

  /**
   * Multiplies a ciphertext by a constant, preserving instance HMAC
   */
  multiplyIsolated(ciphertext: bigint, constant: bigint): bigint;

  /**
   * Adds two ciphertexts, preserving instance HMAC
   */
  additionIsolated(a: bigint, b: bigint): bigint;

  /**
   * Extracts and validates the instance ID from a tagged ciphertext
   * Returns the instance ID if valid, or zero-filled array if invalid
   */
  extractInstanceId(ciphertext: bigint): Buffer;
}

/**
 * Common interface for IsolatedPrivateKey implementations (Node.js Buffer version)
 */
export interface IIsolatedPrivateKey extends PrivateKey {
  /**
   * Decrypts a tagged ciphertext after validating instance ID and HMAC
   */
  decryptIsolated(taggedCiphertext: bigint): bigint;

  /**
   * Gets a copy of the original keyId
   */
  getOriginalKeyId(): Buffer;

  /**
   * Gets a copy of the original instanceId
   */
  getOriginalInstanceId(): Buffer;

  /**
   * Gets the original public key reference
   */
  getOriginalPublicKey(): IIsolatedPublicKey;
}
