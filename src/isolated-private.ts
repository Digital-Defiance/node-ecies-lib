import { createHmac } from 'crypto';

import { IIsolatedPrivateKey } from '@digitaldefiance/ecies-lib';
import { PrivateKey, PublicKey } from 'paillier-bigint';

import { VotingErrorType } from './enumerations/voting-error-type';
import { VotingError } from './errors/voting';
import { VOTING } from './interfaces/voting-consts';
import { IsolatedPublicKey } from './isolated-public';

/**
 * IsolatedPrivateKey extends Paillier PrivateKey with instance isolation validation.
 *
 * This class ensures that:
 * - Decryption only works with ciphertexts encrypted by the matching IsolatedPublicKey instance
 * - Instance ID verification prevents cross-instance decryption attacks
 * - HMAC validation ensures ciphertext integrity
 *
 * The private key stores the original keyId and instanceId from construction time,
 * and validates them before any decryption operation.
 */
export class IsolatedPrivateKey
  extends PrivateKey
  implements IIsolatedPrivateKey<Buffer, 'sync'>
{
  /**
   * Original keyId from the IsolatedPublicKey at construction time
   */
  private readonly _originalKeyId: Buffer;

  /**
   * Original instanceId from the IsolatedPublicKey at construction time
   */
  private readonly _originalInstanceId: Buffer;

  /**
   * Reference to the original IsolatedPublicKey
   */
  private readonly _originalPublicKey: IsolatedPublicKey;

  constructor(lambda: bigint, mu: bigint, publicKey: IsolatedPublicKey) {
    if (!IsolatedPublicKey.isIsolatedPublicKey(publicKey)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyFormat);
    }

    // Create a base PublicKey instance for the parent constructor
    const basePublicKey = new PublicKey(publicKey.n, publicKey.g);
    super(lambda, mu, basePublicKey);

    // Store the isolated public key for our own use
    this._originalKeyId = publicKey.getKeyId();
    this._originalInstanceId = publicKey.getInstanceId();
    this._originalPublicKey = publicKey;
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

  /**
   * Compares two Buffers for equality
   */
  private bufferEquals(a: Buffer, b: Buffer): boolean {
    return Buffer.compare(a, b) === 0;
  }

  /**
   * Decrypts a tagged ciphertext after validating instance ID and HMAC
   */
  public decryptIsolated(taggedCiphertext: bigint): bigint {
    // First verify if we're using a recovered key by checking the public key instance
    if (!IsolatedPublicKey.isIsolatedPublicKey(this._originalPublicKey)) {
      throw new VotingError(VotingErrorType.InvalidPublicKeyFormat);
    }

    // Compare instance IDs before any ciphertext operations
    const currentInstanceId = this._originalPublicKey.getInstanceId();

    // This check must happen before any ciphertext operations
    if (!this.bufferEquals(currentInstanceId, this._originalInstanceId)) {
      throw new VotingError(VotingErrorType.InstanceIdMismatch);
    }

    // Now that we've verified the instance ID, we can proceed with ciphertext operations
    try {
      const hmacLength = 64;
      const ciphertextString = taggedCiphertext.toString(VOTING.KEY_RADIX);
      const receivedHmac = ciphertextString.slice(-hmacLength);
      const ciphertextHex = ciphertextString.slice(0, -hmacLength);
      const ciphertextBigInt = BigInt(`0x${ciphertextHex}`);

      // Create HMAC key from originalKeyId + originalInstanceId
      const hmacKeyMaterial = Buffer.concat([
        this._originalKeyId,
        this._originalInstanceId,
      ]);

      // Calculate expected HMAC
      const ciphertextBytes = Buffer.from(
        ciphertextBigInt.toString(VOTING.KEY_RADIX),
        'utf8',
      );
      const hmac = createHmac('sha256', hmacKeyMaterial);
      hmac.update(ciphertextBytes);
      const expectedHmac = this.bufferToHex(hmac.digest());

      // Verify HMAC
      if (receivedHmac !== expectedHmac) {
        throw new VotingError(VotingErrorType.InvalidCiphertextHmac);
      }

      // Finally decrypt the ciphertext using the parent class implementation
      return super.decrypt(ciphertextBigInt);
    } catch (error) {
      if (error instanceof VotingError) {
        throw error;
      }
      throw new VotingError(
        VotingErrorType.InvalidPrivateKeyBufferFailedToParse,
      );
    }
  }

  /**
   * Synchronous decrypt override (throws error - use decryptIsolated instead)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override decrypt(_taggedCiphertext: bigint): bigint {
    throw new VotingError(VotingErrorType.KeyPairValidationFailed);
  }

  /**
   * Gets a copy of the original keyId
   */
  public getOriginalKeyId(): Buffer {
    return Buffer.from(this._originalKeyId);
  }

  /**
   * Gets a copy of the original instanceId
   */
  public getOriginalInstanceId(): Buffer {
    return Buffer.from(this._originalInstanceId);
  }

  /**
   * Gets the original public key reference
   */
  public getOriginalPublicKey(): IsolatedPublicKey {
    return this._originalPublicKey;
  }
}
