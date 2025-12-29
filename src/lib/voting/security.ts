/**
 * Voting Security Validator
 * Enforces cryptographic security requirements
 */
import { VotingMethod } from './types';

export enum SecurityLevel {
  FullyHomomorphic = 'fully-homomorphic',
  MultiRound = 'multi-round',
  Insecure = 'insecure',
}

export const VOTING_SECURITY: Record<VotingMethod, SecurityLevel> = {
  [VotingMethod.Plurality]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.Approval]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.Weighted]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.Borda]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.Score]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.YesNo]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.YesNoAbstain]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.Supermajority]: SecurityLevel.FullyHomomorphic,
  [VotingMethod.RankedChoice]: SecurityLevel.MultiRound,
  [VotingMethod.TwoRound]: SecurityLevel.MultiRound,
  [VotingMethod.STAR]: SecurityLevel.MultiRound,
  [VotingMethod.STV]: SecurityLevel.MultiRound,
  [VotingMethod.Quadratic]: SecurityLevel.Insecure,
  [VotingMethod.Consensus]: SecurityLevel.Insecure,
  [VotingMethod.ConsentBased]: SecurityLevel.Insecure,
};

export class VotingSecurityValidator {
  static isFullySecure(method: VotingMethod): boolean {
    return VOTING_SECURITY[method] === SecurityLevel.FullyHomomorphic;
  }

  static requiresMultipleRounds(method: VotingMethod): boolean {
    return VOTING_SECURITY[method] === SecurityLevel.MultiRound;
  }

  static getSecurityLevel(method: VotingMethod): SecurityLevel {
    return VOTING_SECURITY[method];
  }

  static validate(
    method: VotingMethod,
    options?: { requireFullySecure?: boolean; allowInsecure?: boolean },
  ): void {
    const level = VOTING_SECURITY[method];
    if (level === SecurityLevel.Insecure && !options?.allowInsecure) {
      throw new Error(
        `Voting method ${method} is not cryptographically secure with Paillier. Set allowInsecure: true to use anyway (NOT RECOMMENDED).`,
      );
    }
    if (
      options?.requireFullySecure &&
      level !== SecurityLevel.FullyHomomorphic
    ) {
      throw new Error(
        `Voting method ${method} requires intermediate decryption. Use a fully homomorphic method for maximum security.`,
      );
    }
  }
}
