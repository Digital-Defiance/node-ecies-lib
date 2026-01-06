/**
 * Voting system types - Node.js optimized
 * Uses Buffer instead of Uint8Array for better Node.js performance
 */

import type { PlatformID } from '../../interfaces';

export type { IMember } from '../../interfaces/member';

export enum VotingMethod {
  // Fully homomorphic (single-round, privacy-preserving)
  Plurality = 'plurality',
  Approval = 'approval',
  Weighted = 'weighted',
  Borda = 'borda',
  Score = 'score',
  YesNo = 'yes-no',
  YesNoAbstain = 'yes-no-abstain',
  Supermajority = 'supermajority',
  // Multi-round (requires decryption between rounds)
  RankedChoice = 'ranked-choice',
  TwoRound = 'two-round',
  STAR = 'star',
  STV = 'stv',
  // Insecure (requires non-additive operations)
  Quadratic = 'quadratic',
  Consensus = 'consensus',
  ConsentBased = 'consent-based',
}

export interface VoteReceipt<TID extends PlatformID = Buffer> {
  voterId: TID;
  pollId: TID;
  timestamp: number;
  signature: Buffer;
  nonce: Buffer;
}

export interface PollResults {
  method: VotingMethod;
  choices: string[];
  winner?: number;
  winners?: number[];
  eliminated?: number[];
  rounds?: RoundResult[];
  tallies: bigint[];
  voterCount: number;
}

export interface RoundResult {
  round: number;
  tallies: bigint[];
  eliminated?: number;
  winner?: number;
}

export interface EncryptedVote<TID extends PlatformID = Buffer> {
  choiceIndex?: number;
  choices?: number[];
  rankings?: number[];
  weight?: bigint;
  score?: number;
  encrypted: bigint[];
  plaintext?: PlaintextVote<TID>;
}

export interface PlaintextVote<TID extends PlatformID = Buffer> {
  voterId: TID;
  choiceIndex?: number;
  choices?: number[];
  weight?: bigint;
  objection?: string;
}

export interface SupermajorityConfig {
  numerator: number;
  denominator: number;
}
