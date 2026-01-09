/**
 * Node.js Hierarchical Vote Aggregator
 * Extends ecies-lib aggregators with Buffer support
 */
import {
  PrecinctAggregator as BasePrecinctAggregator,
  CountyAggregator as BaseCountyAggregator,
  StateAggregator as BaseStateAggregator,
  NationalAggregator as BaseNationalAggregator,
} from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../interfaces';

import type {
  JurisdictionConfig,
  IVoteLogger,
  ICheckpointManager,
} from './interfaces';
import { Poll } from './poll-core';

/**
 * Node.js Precinct-level aggregator
 * Extends ecies-lib PrecinctAggregator with Buffer support
 * Handles ~900 votes in memory with optional persistence
 */
export class PrecinctAggregator<
  TID extends PlatformID = Buffer,
> extends BasePrecinctAggregator<TID> {
  constructor(
    poll: Poll<TID>,
    config: JurisdictionConfig<TID>,
    logger?: IVoteLogger<TID>,
    checkpointMgr?: ICheckpointManager<TID>,
  ) {
    super(poll, config, logger, checkpointMgr);
  }

  // All methods inherited from BasePrecinctAggregator
  // The generic type parameter TID is specialized to Buffer by default
}

/**
 * Node.js County-level aggregator
 * Extends ecies-lib CountyAggregator with Buffer support
 * Combines precinct tallies
 */
export class CountyAggregator<
  TID extends PlatformID = Buffer,
> extends BaseCountyAggregator<TID> {
  constructor(config: JurisdictionConfig<TID>, votingPublicKey: PublicKey) {
    super(config, votingPublicKey);
  }

  // All methods inherited from BaseCountyAggregator
  // The generic type parameter TID is specialized to Buffer by default
}

/**
 * Node.js State-level aggregator
 * Extends ecies-lib StateAggregator with Buffer support
 * Combines county tallies
 */
export class StateAggregator<
  TID extends PlatformID = Buffer,
> extends BaseStateAggregator<TID> {
  constructor(config: JurisdictionConfig<TID>, votingPublicKey: PublicKey) {
    super(config, votingPublicKey);
  }

  // All methods inherited from BaseStateAggregator
  // The generic type parameter TID is specialized to Buffer by default
}

/**
 * Node.js National-level aggregator
 * Extends ecies-lib NationalAggregator with Buffer support
 * Combines state tallies and decrypts final result
 */
export class NationalAggregator<
  TID extends PlatformID = Buffer,
> extends BaseNationalAggregator<TID> {
  constructor(config: JurisdictionConfig<TID>, votingPublicKey: PublicKey) {
    super(config, votingPublicKey);
  }

  // All methods inherited from BaseNationalAggregator
  // The generic type parameter TID is specialized to Buffer by default
}

// Re-export types and enums for convenience
export { JurisdictionLevel } from './enumerations';
export type { JurisdictionConfig, AggregatedTally } from './interfaces';
