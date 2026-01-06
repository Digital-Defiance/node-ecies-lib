/**
 * Poll Factory - Node.js optimized
 */
import { randomBytes } from 'crypto';

import type { IMember } from '../../interfaces/member';
import type { PlatformID } from '../../interfaces';

import { Poll } from './poll-core';
import { VotingMethod } from './types';

export class PollFactory {
  static create<TID extends PlatformID = Buffer>(
    choices: string[],
    method: VotingMethod,
    authority: IMember<TID>,
    options?: { maxWeight?: bigint },
  ): Poll<TID> {
    if (!authority.votingPublicKey)
      throw new Error('Authority must have voting public key');
    const id = randomBytes(16) as TID;
    return new Poll<TID>(
      id,
      choices,
      method,
      authority,
      authority.votingPublicKey,
      options?.maxWeight,
    );
  }

  static createPlurality<TID extends PlatformID = Buffer>(choices: string[], authority: IMember<TID>): Poll<TID> {
    return this.create(choices, VotingMethod.Plurality, authority);
  }

  static createApproval<TID extends PlatformID = Buffer>(choices: string[], authority: IMember<TID>): Poll<TID> {
    return this.create(choices, VotingMethod.Approval, authority);
  }

  static createWeighted<TID extends PlatformID = Buffer>(
    choices: string[],
    authority: IMember<TID>,
    maxWeight: bigint,
  ): Poll<TID> {
    return this.create(choices, VotingMethod.Weighted, authority, {
      maxWeight,
    });
  }

  static createBorda<TID extends PlatformID = Buffer>(choices: string[], authority: IMember<TID>): Poll<TID> {
    return this.create(choices, VotingMethod.Borda, authority);
  }

  static createRankedChoice<TID extends PlatformID = Buffer>(choices: string[], authority: IMember<TID>): Poll<TID> {
    return this.create(choices, VotingMethod.RankedChoice, authority);
  }
}
