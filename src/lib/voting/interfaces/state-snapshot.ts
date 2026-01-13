/**
 * Interface definitions for state-snapshot.
 */
import type { PlatformID } from '../../../interfaces';

import type { AggregatedTally } from './aggregated-tally';
import type { CheckpointMetadata } from './checkpoint-metadata';

/**
 * State snapshot for persistent vote storage.
 * Contains checkpoint metadata, aggregated tally, and vote log.
 *
 * Node.js specialization with Buffer for voteLog instead of Uint8Array.
 */
export interface StateSnapshot<TID extends PlatformID = Buffer> {
  metadata: CheckpointMetadata;
  tally: AggregatedTally<TID>;
  voteLog: Buffer; // Override to use Buffer instead of Uint8Array
}
