/**
 * Ceremony Coordinator - Node.js Optimized
 *
 * Extends ecies-lib CeremonyCoordinator with Buffer conversions
 * for Uint8Array fields in Ceremony objects (nonce, result inputHash).
 *
 * @module voting/threshold
 */

import { CeremonyCoordinator as BaseCeremonyCoordinator } from '@digitaldefiance/ecies-lib';
import type { Ceremony, ThresholdKeyConfig } from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../../interfaces';

/**
 * Convert Uint8Array fields in a Ceremony to Buffer.
 */
function convertCeremonyToBuffer<TID extends PlatformID>(
  ceremony: Ceremony<TID>,
): Ceremony<TID> {
  const converted: Ceremony<TID> = {
    ...ceremony,
    nonce: Buffer.isBuffer(ceremony.nonce)
      ? ceremony.nonce
      : Buffer.from(ceremony.nonce),
  };

  // Convert inputHash in result's combinedProof if present
  if (converted.result) {
    const proof = converted.result.combinedProof;
    const inputHash = Buffer.isBuffer(proof.inputHash)
      ? proof.inputHash
      : Buffer.from(proof.inputHash);

    converted.result = {
      ...converted.result,
      combinedProof: {
        ...proof,
        inputHash,
      },
    };
  }

  return converted;
}

/**
 * Node.js CeremonyCoordinator that extends ecies-lib CeremonyCoordinator.
 *
 * Converts Uint8Array fields (nonce, inputHash) to Buffer in returned
 * Ceremony objects for consistency with the node-ecies-lib Buffer convention.
 */
export class CeremonyCoordinator<
  TID extends PlatformID = Buffer,
> extends BaseCeremonyCoordinator<TID> {
  constructor(
    publicKey: PublicKey,
    verificationKeys: readonly Uint8Array[],
    theta: bigint,
    config: ThresholdKeyConfig,
    ceremonyTimeoutMs = 0,
  ) {
    super(publicKey, verificationKeys, theta, config, ceremonyTimeoutMs);
  }

  startCeremony(
    pollId: TID,
    intervalNumber: number,
    encryptedTally: bigint[],
  ): Ceremony<TID> {
    const ceremony = super.startCeremony(
      pollId,
      intervalNumber,
      encryptedTally,
    );
    return convertCeremonyToBuffer(ceremony);
  }

  getCeremony(ceremonyId: string): Ceremony<TID> | undefined {
    const ceremony = super.getCeremony(ceremonyId);
    return ceremony ? convertCeremonyToBuffer(ceremony) : undefined;
  }

  getCeremoniesForPoll(pollId: TID): readonly Ceremony<TID>[] {
    return super
      .getCeremoniesForPoll(pollId)
      .map((c) => convertCeremonyToBuffer(c));
  }
}
