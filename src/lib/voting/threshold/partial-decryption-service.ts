/**
 * Partial Decryption Service - Node.js Optimized
 *
 * Extends ecies-lib PartialDecryptionService with Buffer support
 * for serialization/deserialization.
 *
 * @module voting/threshold
 */

import { PartialDecryptionService as BasePartialDecryptionService } from '@digitaldefiance/ecies-lib';
import type { PartialDecryption } from '@digitaldefiance/ecies-lib';

/**
 * Buffer-based partial decryption with ceremonyNonce as Buffer.
 */
export interface BufferPartialDecryption extends Omit<
  PartialDecryption,
  'ceremonyNonce'
> {
  readonly ceremonyNonce: Buffer;
}

/**
 * Convert a Uint8Array-based PartialDecryption to a Buffer-based one.
 */
function convertPartialToBuffer(
  partial: PartialDecryption,
): BufferPartialDecryption {
  return {
    guardianIndex: partial.guardianIndex,
    values: partial.values,
    proof: partial.proof,
    ceremonyNonce: Buffer.from(partial.ceremonyNonce),
    timestamp: partial.timestamp,
  };
}

/**
 * Node.js PartialDecryptionService that extends ecies-lib PartialDecryptionService.
 *
 * Overrides serialization methods to use Buffer instead of Uint8Array,
 * and converts partial decryption outputs to use Buffer for ceremonyNonce.
 *
 * @example
 * ```typescript
 * const service = new PartialDecryptionService(publicKey);
 * const partial = service.computePartial([ciphertext], keyShare, nonce);
 * // partial.ceremonyNonce is a Buffer
 *
 * const serialized = service.serialize(partial); // returns Buffer
 * const deserialized = service.deserialize(serialized); // ceremonyNonce is Buffer
 * ```
 */
export class PartialDecryptionService extends BasePartialDecryptionService {
  /**
   * Compute partial decryption with Buffer-based output.
   */
  computePartial(
    encryptedTally: bigint[],
    keyShare: {
      readonly index: number;
      readonly share: bigint;
      readonly verificationKey: Uint8Array;
    },
    ceremonyNonce: Uint8Array,
  ): BufferPartialDecryption {
    const basePartial = super.computePartial(
      encryptedTally,
      keyShare,
      ceremonyNonce,
    );
    return convertPartialToBuffer(basePartial);
  }

  /**
   * Serialize partial decryption to Buffer.
   */
  serialize(partial: PartialDecryption): Buffer {
    const baseResult = super.serialize(partial);
    return Buffer.from(baseResult);
  }

  /**
   * Deserialize Buffer to Buffer-based partial decryption.
   */
  deserialize(data: Uint8Array): BufferPartialDecryption {
    const baseResult = super.deserialize(data);
    return convertPartialToBuffer(baseResult);
  }
}
