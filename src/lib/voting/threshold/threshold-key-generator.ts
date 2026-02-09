/**
 * Threshold Key Generator - Node.js Optimized
 *
 * Extends ecies-lib ThresholdKeyGenerator with Buffer support for
 * key shares and verification keys.
 *
 * @module voting/threshold
 */

import { ThresholdKeyGenerator as BaseThresholdKeyGenerator } from '@digitaldefiance/ecies-lib';
import type {
  ThresholdKeyConfig,
  ThresholdKeyPair,
  KeyShare,
} from '@digitaldefiance/ecies-lib';

/**
 * Buffer-based key share with verification key as Buffer.
 */
export interface BufferKeyShare extends Omit<KeyShare, 'verificationKey'> {
  readonly verificationKey: Buffer;
}

/**
 * Buffer-based threshold key pair with Buffer verification keys and key shares.
 */
export interface BufferThresholdKeyPair extends Omit<
  ThresholdKeyPair,
  'verificationKeys' | 'keyShares'
> {
  readonly verificationKeys: readonly Buffer[];
  readonly keyShares: readonly BufferKeyShare[];
}

/**
 * Convert a Uint8Array-based KeyShare to a Buffer-based BufferKeyShare.
 */
function convertKeyShareToBuffer(share: KeyShare): BufferKeyShare {
  return {
    index: share.index,
    share: share.share,
    verificationKey: Buffer.from(share.verificationKey),
  };
}

/**
 * Convert a Uint8Array-based ThresholdKeyPair to a Buffer-based BufferThresholdKeyPair.
 */
function convertKeyPairToBuffer(
  keyPair: ThresholdKeyPair,
): BufferThresholdKeyPair {
  return {
    publicKey: keyPair.publicKey,
    verificationKeys: keyPair.verificationKeys.map((vk) => Buffer.from(vk)),
    keyShares: keyPair.keyShares.map(convertKeyShareToBuffer),
    config: keyPair.config,
    theta: keyPair.theta,
  };
}

/**
 * Node.js ThresholdKeyGenerator that extends ecies-lib ThresholdKeyGenerator.
 *
 * Overrides `generate()` to return Buffer-based key shares and verification keys
 * instead of Uint8Array-based ones.
 *
 * @example
 * ```typescript
 * const generator = new ThresholdKeyGenerator();
 * const keyPair = await generator.generate({ totalShares: 5, threshold: 3 });
 *
 * // keyPair.keyShares[0].verificationKey is a Buffer
 * // keyPair.verificationKeys[0] is a Buffer
 * ```
 */
export class ThresholdKeyGenerator extends BaseThresholdKeyGenerator {
  /**
   * Generate a threshold key pair with Buffer-based outputs.
   */
  async generate(config: ThresholdKeyConfig): Promise<BufferThresholdKeyPair> {
    const baseKeyPair = await super.generate(config);
    return convertKeyPairToBuffer(baseKeyPair);
  }
}
