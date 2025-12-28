import { createHmac, createHash, randomBytes } from 'crypto';

import { IIsolatedPublicKey } from '@digitaldefiance/ecies-lib';
import { PublicKey } from 'paillier-bigint';

import { VotingErrorType } from './enumerations/voting-error-type';
import { VotingError } from './errors/voting';
import { VOTING } from './interfaces/voting-consts';

/**
 * IsolatedPublicKey extends Paillier PublicKey with instance isolation capabilities.
 *
 * This class provides:
 * - keyId: A deterministic SHA-256 hash of the public key 'n' value for verification
 * - instanceId: A unique identifier per key instance to prevent cross-instance operations
 * - HMAC-tagged ciphertexts that bind encrypted values to a specific key instance
 *
 * Instance isolation ensures that ciphertexts encrypted with one instance cannot be
 * used with another instance, even if they share the same underlying key material.
 * This is critical for voting systems where ballot tampering must be prevented.
 */
export class IsolatedPublicKey
  extends PublicKey
  implements IIsolatedPublicKey<Buffer, 'sync'>
{
  /**
   * Type guard to check if a PublicKey is an IsolatedPublicKey
   */
  public static isIsolatedPublicKey(key: PublicKey): key is IsolatedPublicKey {
    return key instanceof IsolatedPublicKey;
  }

  /**
   * Deterministic identifier derived from the public key (SHA-256 of 'n')
   */
  public readonly keyId: Buffer;

  /**
   * Original instance ID generated at construction time
   */
  private readonly _originalInstanceId: Buffer;

  /**
   * Current instance ID (can be updated via updateInstanceId())
   */
  private _currentInstanceId: Buffer;

  /**
   * Unique salt used for instance ID generation
   */
  private readonly uniqueInstanceSalt: Buffer;

  /**
   * Updates the current instance ID to a new random value.
   * This invalidates all previously encrypted ciphertexts.
   */
  public updateInstanceId(): void {
    const randomSalt = randomBytes(32);
    this._currentInstanceId = this.generateInstanceId(
      this.keyId,
      this.n,
      randomSalt,
    );
  }

  /**
   * Generates a deterministic instance ID from keyId, n, and a unique salt
   */
  private generateInstanceId(
    keyId: Buffer,
    n: bigint,
    uniqueInstanceSalt: Buffer,
  ): Buffer {
    // Convert n to hex string with proper padding
    const nHex = n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    const nBytes = this.hexToBuffer(nHex);

    // Concatenate keyId + nBytes + salt
    const combined = Buffer.concat([keyId, nBytes, uniqueInstanceSalt]);

    // Return SHA-256 hash
    return this.sha256(combined);
  }

  /**
   * SHA-256 hash using Node.js crypto
   */
  private sha256(data: Buffer): Buffer {
    return createHash('sha256').update(data).digest();
  }

  /**
   * Converts hex string to Buffer
   */
  private hexToBuffer(hex: string): Buffer {
    if (hex.length % 2 !== 0) {
      hex = '0' + hex;
    }
    return Buffer.from(hex, 'hex');
  }

  /**
   * Converts Buffer to hex string
   */
  private bufferToHex(bytes: Buffer): string {
    return bytes.toString('hex');
  }

  constructor(n: bigint, g: bigint, keyId: Buffer) {
    super(n, g);
    this.keyId = keyId;

    // Generate unique salt for this instance
    const uniqueInstanceSalt = randomBytes(32);
    this.uniqueInstanceSalt = uniqueInstanceSalt;

    // Generate instance IDs (this is problematic with sync constructor)
    // We'll need to handle this differently
    this._originalInstanceId = Buffer.alloc(32); // Placeholder
    this._currentInstanceId = Buffer.alloc(32); // Placeholder

    // TODO: This needs to be refactored to use async factory method
  }

  /**
   * Static factory method to create IsolatedPublicKey synchronously
   */
  public static create(n: bigint, g: bigint, keyId: Buffer): IsolatedPublicKey {
    const key = new IsolatedPublicKey(n, g, keyId);

    // Generate unique salt
    const uniqueInstanceSalt = randomBytes(32);

    // Generate instance ID synchronously
    const nHex = n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    const nBytes = key.hexToBuffer(nHex);
    const combined = Buffer.concat([keyId, nBytes, uniqueInstanceSalt]);

    const instanceId = key.sha256(combined);

    // Use Object.defineProperty to set readonly fields
    Object.defineProperty(key, 'uniqueInstanceSalt', {
      value: uniqueInstanceSalt,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    Object.defineProperty(key, '_originalInstanceId', {
      value: instanceId,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    Object.defineProperty(key, '_currentInstanceId', {
      value: Buffer.from(instanceId),
      writable: true,
      enumerable: false,
      configurable: false,
    });

    return key;
  }

  /**
   * Static factory method to create IsolatedPublicKey from deserialized data
   * Used when reconstructing a key from a buffer with a stored instanceId
   */
  public static fromBuffer(
    n: bigint,
    g: bigint,
    keyId: Buffer,
    instanceId: Buffer,
  ): IsolatedPublicKey {
    const key = new IsolatedPublicKey(n, g, keyId);

    // For deserialized keys, we don't have the original salt
    // Set uniqueInstanceSalt to empty buffer
    const uniqueInstanceSalt = Buffer.alloc(0);

    // Use Object.defineProperty to set readonly fields
    Object.defineProperty(key, 'uniqueInstanceSalt', {
      value: uniqueInstanceSalt,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    Object.defineProperty(key, '_originalInstanceId', {
      value: instanceId,
      writable: false,
      enumerable: false,
      configurable: false,
    });
    Object.defineProperty(key, '_currentInstanceId', {
      value: Buffer.from(instanceId),
      writable: true,
      enumerable: false,
      configurable: false,
    });

    return key;
  }

  /**
   * Returns a copy of the keyId
   */
  public getKeyId(): Buffer {
    return Buffer.from(this.keyId);
  }

  /**
   * Returns a copy of the current instance ID
   */
  public getInstanceId(): Buffer {
    return Buffer.from(this._currentInstanceId);
  }

  /**
   * Tags a ciphertext with an HMAC using keyId + instanceId
   * Returns a new bigint with the HMAC appended
   */
  private tagCiphertext(ciphertext: bigint): bigint {
    // Create HMAC key from keyId + instanceId
    const hmacKeyMaterial = Buffer.concat([
      this.keyId,
      this._currentInstanceId,
    ]);

    // Create HMAC
    const ciphertextHex = ciphertext.toString(VOTING.KEY_RADIX);
    const ciphertextBytes = Buffer.from(ciphertextHex, 'utf8');
    const hmac = createHmac('sha256', hmacKeyMaterial);
    hmac.update(ciphertextBytes);
    const signature = hmac.digest();
    const signatureHex = this.bufferToHex(signature);

    // Pad ciphertext and append HMAC
    const hmacLength = 64; // 256 bits = 64 hex chars
    const paddedCiphertext = ciphertextHex.padStart(hmacLength * 2, '0');
    const taggedCiphertextString = paddedCiphertext + signatureHex;

    return BigInt(`0x${taggedCiphertextString}`);
  }

  /**
   * Extracts and validates the instance ID from a tagged ciphertext
   * Returns the instance ID if valid, or zero-filled buffer if invalid
   */
  public extractInstanceId(ciphertext: bigint): Buffer {
    try {
      const hmacLength = 64;
      const ciphertextString = ciphertext.toString(16);
      const receivedHmac = ciphertextString.slice(-hmacLength);
      const calculatedCiphertext = BigInt(
        `0x${ciphertextString.slice(0, -hmacLength)}`,
      );

      // Create HMAC key from keyId + current instanceId
      const hmacKeyMaterial = Buffer.concat([
        this.keyId,
        this._currentInstanceId,
      ]);

      // Calculate expected HMAC
      const ciphertextHex = calculatedCiphertext.toString(VOTING.KEY_RADIX);
      const ciphertextBytes = Buffer.from(ciphertextHex, 'utf8');
      const hmac = createHmac('sha256', hmacKeyMaterial);
      hmac.update(ciphertextBytes);
      const expectedHmac = this.bufferToHex(hmac.digest());

      // If HMAC matches, return current instance ID
      return receivedHmac === expectedHmac
        ? Buffer.from(this._currentInstanceId)
        : Buffer.alloc(1, 0);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // If any error occurs, return invalid instance ID
      return Buffer.alloc(1, 0);
    }
  }

  /**
   * Encrypts a message and tags it with instance HMAC
   */
  public encryptIsolated(m: bigint): bigint {
    this.verifyKeyId();
    const ciphertext = super.encrypt(m);
    return this.tagCiphertext(ciphertext);
  }

  /**
   * Synchronous encrypt override (throws error - use encryptIsolated instead)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override encrypt(_m: bigint): bigint {
    throw new VotingError(VotingErrorType.KeyPairValidationFailed);
  }

  /**
   * Multiplies a ciphertext by a constant, preserving instance HMAC
   */
  public multiplyIsolated(ciphertext: bigint, constant: bigint): bigint {
    this.verifyKeyId();
    const instanceId = this.extractInstanceId(ciphertext);

    // Check if instance IDs match
    if (!this.bufferEquals(instanceId, this._currentInstanceId)) {
      throw new VotingError(VotingErrorType.InstanceIdMismatch);
    }

    const hmacLength = 64;
    const ciphertextString = ciphertext.toString(VOTING.KEY_RADIX);
    const actualCiphertext = BigInt(
      `0x${ciphertextString.slice(0, -hmacLength)}`,
    );

    const product = super.multiply(actualCiphertext, constant);
    return this.tagCiphertext(product);
  }

  /**
   * Synchronous multiply override (throws error - use multiplyIsolated instead)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override multiply(_ciphertext: bigint, _constant: bigint): bigint {
    throw new VotingError(VotingErrorType.KeyPairValidationFailed);
  }

  /**
   * Adds two ciphertexts, preserving instance HMAC
   */
  public additionIsolated(a: bigint, b: bigint): bigint {
    this.verifyKeyId();
    const aInstanceID = this.extractInstanceId(a);
    const bInstanceID = this.extractInstanceId(b);

    if (
      !this.bufferEquals(aInstanceID, this._currentInstanceId) ||
      !this.bufferEquals(bInstanceID, this._currentInstanceId)
    ) {
      throw new VotingError(VotingErrorType.InstanceIdMismatch);
    }

    const hmacLength = 64;
    const aCiphertextString = a.toString(VOTING.KEY_RADIX);
    const bCiphertextString = b.toString(VOTING.KEY_RADIX);

    const aCiphertext = BigInt(`0x${aCiphertextString.slice(0, -hmacLength)}`);
    const bCiphertext = BigInt(`0x${bCiphertextString.slice(0, -hmacLength)}`);

    const sum = super.addition(aCiphertext, bCiphertext);
    return this.tagCiphertext(sum);
  }

  /**
   * Synchronous addition override (throws error - use additionIsolated instead)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override addition(_a: bigint, _b: bigint): bigint {
    throw new VotingError(VotingErrorType.KeyPairValidationFailed);
  }

  /**
   * Verifies that the keyId matches the SHA-256 hash of the public key 'n'
   */
  public verifyKeyId(): void {
    const nHex = this.n
      .toString(VOTING.KEY_RADIX)
      .padStart(VOTING.PUB_KEY_OFFSET, '0');
    // Encode the hex string as UTF-8 bytes (not parse as hex digits)
    const nBytes = Buffer.from(nHex, 'utf8');
    const computedKeyId = this.sha256(nBytes);

    if (!this.bufferEquals(this.keyId, computedKeyId)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyIdMismatch);
    }
  }

  /**
   * Compares two Buffers for equality
   */
  private bufferEquals(a: Buffer, b: Buffer): boolean {
    return Buffer.compare(a, b) === 0;
  }
}
