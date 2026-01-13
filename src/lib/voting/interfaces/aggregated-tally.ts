/**
 * Interface definitions for aggregated-tally.
 */
import type { AggregatedTally as BaseAggregatedTally } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Aggregated tally for hierarchical vote aggregation.
 * Represents encrypted vote totals at a specific jurisdictional level.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type AggregatedTally<TID extends PlatformID = Buffer> =
  BaseAggregatedTally<TID>;
