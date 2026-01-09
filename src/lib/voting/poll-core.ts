/**
 * Secure Voting Poll - Node.js Optimized
 * Extends ecies-lib Poll with Buffer support
 */
import {
  Poll as BasePoll,
  type IMember as BaseIMember,
} from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';

import { VotingMethod } from './enumerations';

/**
 * Node.js Poll that extends ecies-lib Poll
 * Specializes the generic TID parameter to Buffer for Node.js compatibility
 *
 * All core voting logic is inherited from ecies-lib Poll.
 * This class only provides type specialization for Buffer-based operations.
 */
export class Poll<TID extends PlatformID = Buffer> extends BasePoll<TID> {
  constructor(
    id: TID,
    choices: string[],
    method: VotingMethod,
    authority: IMember<TID>,
    votingPublicKey: PublicKey,
    maxWeight?: bigint,
    allowInsecure?: boolean,
  ) {
    // Cast authority to work around type incompatibility between
    // node-ecies-lib IMember (Buffer-based) and ecies-lib IMember (Uint8Array-based)
    super(
      id,
      choices,
      method,
      authority as unknown as BaseIMember<TID, Uint8Array>,
      votingPublicKey,
      maxWeight,
      allowInsecure,
    );
  }

  // All methods are inherited from BasePoll
  // The generic type parameter TID is specialized to Buffer by default
  // This ensures all Buffer-based interfaces work correctly
}
