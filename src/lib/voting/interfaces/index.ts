/**
 * Voting system interfaces for node-ecies-lib
 *
 * Buffer-adapted interfaces from ecies-lib for Node.js environment.
 * All interfaces use PlatformID which includes Buffer support.
 */

// Core voting interfaces
export type { EncryptedVote } from './encrypted-vote';
export type { PlaintextVote } from './plaintext-vote';
export type { PollResults } from './poll-results';
export type { VoteReceipt } from './voting-receipt';
export type { RoundResult } from './round-result';

// Audit and logging interfaces
export type { AuditEntry } from './audit-entry';
export type { AuditLog } from './audit-log';
export type { EventLogEntry } from './event-log-entry';
export type { EventLogger } from './event-logger';

// Poll configuration interfaces
export type { PollConfiguration } from './poll-configuration';
export type { IPoll } from './poll';
export type { IPollTallier } from './poll-tallier';
export type { SupermajorityConfig } from './supermajority-config';

// Aggregation and state interfaces
export type { AggregatedTally } from './aggregated-tally';
export type { JurisdictionConfig } from './jurisdiction-config';
export type { StateSnapshot } from './state-snapshot';
export type { CheckpointMetadata } from './checkpoint-metadata';

// Checkpoint and vote logger interfaces
export type { ICheckpointManager } from './checkpoint-manager';
export type { ICheckpointManagerExtended } from './checkpoint-manager-extended';
export type { IVoteLogger } from './vote-logger';
export type { IVoteLoggerExtended } from './vote-logger-extended';

// Bulletin board interfaces
export type { BulletinBoard } from './bulletin-board';
export type { BulletinBoardEntry } from './bulletin-board-entry';
export type { TallyProof } from './tally-proof';

// Encoder and validator interfaces
export type { IVoteEncoder } from './vote-encoder';
export type { IVotingSecurityValidator } from './voting-security-validator';

// Constants and options
export type { IVotingConsts } from './voting-consts';
export type { IVotingKeyDerivationOptions } from './voting-key-derivation-options';

// Results interfaces
export type { VotingPollResults } from './voting-poll-results';

// Service interfaces
export type { IECIESServiceWithVoting } from './ecies-service-with-voting';
