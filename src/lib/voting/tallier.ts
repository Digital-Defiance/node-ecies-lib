/**
 * Poll Tallier - Node.js optimized
 * Extends ecies-lib PollTallier with Buffer support
 */
import {
  PollTallier as BasePollTallier,
  type IMember as BaseIMember,
} from '@digitaldefiance/ecies-lib';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';

/**
 * Node.js PollTallier that extends ecies-lib PollTallier
 * Specializes the generic TID parameter to Buffer for Node.js compatibility
 *
 * All tallying logic is inherited from ecies-lib PollTallier.
 * This class only provides type specialization for Buffer-based operations.
 */
export class PollTallier<
  TID extends PlatformID = Buffer,
> extends BasePollTallier<TID> {
  constructor(
    authority: IMember<TID>,
    votingPrivateKey: PrivateKey,
    votingPublicKey: PublicKey,
  ) {
    // Cast authority to work around type incompatibility between
    // node-ecies-lib IMember (Buffer-based) and ecies-lib IMember (Uint8Array-based)
    super(
      authority as unknown as BaseIMember<TID, Uint8Array>,
      votingPrivateKey,
      votingPublicKey,
    );
  }

  // All methods are inherited from BasePollTallier
  // The generic type parameter TID is specialized to Buffer by default
  // This ensures all Buffer-based interfaces work correctly
}
