/**
 * Poll Factory - Node.js optimized
 */
import { randomBytes } from 'crypto';

import type { IMember } from '../../interfaces/member';

import { Poll } from './poll-core';
import { VotingMethod } from './types';

export class PollFactory {
  static create(
    choices: string[],
    method: VotingMethod,
    authority: IMember,
    options?: { maxWeight?: bigint },
  ): Poll {
    if (!authority.votingPublicKey)
      throw new Error('Authority must have voting public key');
    const id = randomBytes(16);
    return new Poll(
      id,
      choices,
      method,
      authority,
      authority.votingPublicKey,
      options?.maxWeight,
    );
  }

  static createPlurality(choices: string[], authority: IMember): Poll {
    return this.create(choices, VotingMethod.Plurality, authority);
  }

  static createApproval(choices: string[], authority: IMember): Poll {
    return this.create(choices, VotingMethod.Approval, authority);
  }

  static createWeighted(
    choices: string[],
    authority: IMember,
    maxWeight: bigint,
  ): Poll {
    return this.create(choices, VotingMethod.Weighted, authority, {
      maxWeight,
    });
  }

  static createBorda(choices: string[], authority: IMember): Poll {
    return this.create(choices, VotingMethod.Borda, authority);
  }

  static createRankedChoice(choices: string[], authority: IMember): Poll {
    return this.create(choices, VotingMethod.RankedChoice, authority);
  }
}
