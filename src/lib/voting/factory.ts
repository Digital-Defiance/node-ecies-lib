/**
 * Poll Factory - Node.js optimized
 * Extends ecies-lib PollFactory to return node-ecies-lib Poll instances
 */
import { randomBytes } from 'crypto';

import {
  PollFactory as BasePollFactory,
  Member,
} from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';
import type { SignatureBuffer } from '../../types';

import { VotingMethod } from './enumerations';
import { Poll } from './poll-core';

/**
 * Node.js PollFactory that extends ecies-lib PollFactory
 * Overrides factory methods to return node-ecies-lib Poll instances
 * which use Buffer instead of Uint8Array
 */
export class PollFactory extends BasePollFactory {
  /**
   * Create a new poll with specified method
   * Overrides base implementation to return node-ecies-lib Poll
   */
  static override create<TID extends PlatformID = Buffer>(
    choices: string[],
    method: VotingMethod,
    authority: Member<TID>,
    options?: { maxWeight?: bigint },
  ): Poll<TID> {
    if (!authority.votingPublicKey)
      throw new Error('Authority must have voting public key');

    // Use Node.js crypto for ID generation
    const id = randomBytes(16) as TID;

    // Return node-ecies-lib Poll instance
    return new Poll<TID>(
      id,
      choices,
      method,
      authority as unknown as IMember<TID, SignatureBuffer>, // Type assertion needed for compatibility between Member and IMember
      authority.votingPublicKey,
      options?.maxWeight,
    );
  }

  /**
   * Create a plurality poll (simple majority)
   * Returns node-ecies-lib Poll instance
   */
  static override createPlurality<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: Member<TID>,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.Plurality, authority);
  }

  /**
   * Create an approval voting poll
   * Returns node-ecies-lib Poll instance
   */
  static override createApproval<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: Member<TID>,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.Approval, authority);
  }

  /**
   * Create a weighted voting poll
   * Returns node-ecies-lib Poll instance
   */
  static override createWeighted<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: Member<TID>,
    maxWeight: bigint,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.Weighted, authority, {
      maxWeight,
    });
  }

  /**
   * Create a Borda count poll
   * Returns node-ecies-lib Poll instance
   */
  static override createBorda<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: Member<TID>,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.Borda, authority);
  }

  /**
   * Create a ranked choice (IRV) poll
   * Returns node-ecies-lib Poll instance
   */
  static override createRankedChoice<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: Member<TID>,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.RankedChoice, authority);
  }
}
