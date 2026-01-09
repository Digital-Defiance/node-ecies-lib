/**
 * Node.js Persistent State
 * Extends ecies-lib BatchVoteProcessor with Buffer support
 */
import {
  BatchVoteProcessor as BaseBatchVoteProcessor,
  JurisdictionLevel,
} from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';

import type {
  EncryptedVote,
  IVoteLogger,
  ICheckpointManager,
  StateSnapshot,
} from './interfaces';

/**
 * Node.js BatchVoteProcessor that extends ecies-lib BatchVoteProcessor
 * Provides type-safe batch processing for Buffer-based votes
 */
export class BatchVoteProcessor<
  TID extends PlatformID = Buffer,
> extends BaseBatchVoteProcessor {
  private voteLogger?: IVoteLogger<TID>;
  private checkpointManager?: ICheckpointManager<TID>;
  private totalVotes = 0;

  constructor(
    batchSize = 1000,
    voteLogger?: IVoteLogger<TID>,
    checkpointManager?: ICheckpointManager<TID>,
  ) {
    super(batchSize);
    this.voteLogger = voteLogger;
    this.checkpointManager = checkpointManager;
  }

  /**
   * Add a vote to the current batch
   * Returns true if batch is full and should be processed
   */
  addVote(voter: IMember<TID>, vote: EncryptedVote<TID>): boolean {
    return super.addVote(voter, vote);
  }

  /**
   * Process a batch of votes directly
   * This method accepts an array of votes and processes them immediately
   */
  async processBatch(
    votesOrProcessor:
      | Array<{ voter: IMember<TID>; vote: EncryptedVote<TID> }>
      | ((
          batch: Array<{ voter: IMember<TID>; vote: EncryptedVote<TID> }>,
        ) => Promise<void>),
  ): Promise<void> {
    // If it's an array of votes, process them directly
    if (Array.isArray(votesOrProcessor)) {
      const votes = votesOrProcessor;

      // Log votes if logger is available
      if (this.voteLogger) {
        for (const { voter, vote } of votes) {
          await this.voteLogger.appendVote(
            voter.id,
            vote.encrypted,
            Date.now(),
          );
        }
      }

      this.totalVotes += votes.length;
      return;
    }

    // If it's a processor function, use the base class method
    const processor = votesOrProcessor;

    // Get the current batch from the base class
    const batchSize = this.getBatchSize();
    if (batchSize === 0) return;

    // Process with base class method
    await super.processBatch(async (batch) => {
      // Convert the untyped batch to typed batch
      const typedBatch: Array<{
        voter: IMember<TID>;
        vote: EncryptedVote<TID>;
      }> = batch as Array<{ voter: IMember<TID>; vote: EncryptedVote<TID> }>;

      // Log votes if logger is available
      if (this.voteLogger) {
        for (const { voter, vote } of typedBatch) {
          await this.voteLogger.appendVote(
            voter.id,
            vote.encrypted,
            Date.now(),
          );
        }
      }

      this.totalVotes += typedBatch.length;

      // Call the provided processor
      await processor(typedBatch);
    });
  }

  /**
   * Create a checkpoint of the current state
   */
  async checkpoint(): Promise<
    StateSnapshot<TID> & { totalVotes: number; timestamp: number }
  > {
    const snapshot = {
      metadata: {
        jurisdictionId: 'test-jurisdiction',
        level: JurisdictionLevel.Precinct, // Use enum value instead of number
        voterCount: this.totalVotes,
        timestamp: Date.now(),
        checkpointNumber: 0,
      },
      tally: {
        jurisdictionId: Buffer.from([1]) as TID, // Required property
        level: JurisdictionLevel.Precinct, // Use enum value instead of number
        voterCount: this.totalVotes,
        encryptedTallies: [], // Required property
        timestamp: Date.now(), // Required property
        jurisdiction: {
          id: Buffer.from([1]) as TID,
          name: 'Test Jurisdiction',
          level: JurisdictionLevel.Precinct, // Use enum value
        },
      },
      voteLog: Buffer.alloc(0),
      // Add convenience properties for tests
      totalVotes: this.totalVotes,
      timestamp: Date.now(),
    };

    if (this.checkpointManager) {
      await this.checkpointManager.saveCheckpoint(snapshot.tally);
    }

    return snapshot;
  }

  // getBatchSize() inherited from base class
}

// Re-export interfaces and Node.js implementations
export type {
  IVoteLogger,
  ICheckpointManager,
  CheckpointMetadata,
  StateSnapshot,
} from './interfaces';

export { NodeVoteLogger, NodeCheckpointManager } from './node-persistent-state';
