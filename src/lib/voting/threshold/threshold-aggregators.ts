/**
 * Threshold Hierarchical Aggregators - Node.js Optimized
 *
 * Extends ecies-lib threshold aggregators with Buffer as the default
 * TID type for Node.js compatibility.
 *
 * @module voting/threshold
 */

import {
  ThresholdPrecinctAggregator as BaseThresholdPrecinctAggregator,
  ThresholdCountyAggregator as BaseThresholdCountyAggregator,
  ThresholdStateAggregator as BaseThresholdStateAggregator,
  ThresholdNationalAggregator as BaseThresholdNationalAggregator,
} from '@digitaldefiance/ecies-lib';
import type {
  ThresholdKeyConfig,
  IPublicTallyFeed,
} from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../../interfaces';
import type {
  JurisdictionConfig,
  IVoteLogger,
  ICheckpointManager,
} from '../interfaces';
import { Poll } from '../poll-core';

/**
 * Node.js Threshold Precinct Aggregator
 * Extends ecies-lib ThresholdPrecinctAggregator with Buffer default
 */
export class ThresholdPrecinctAggregator<
  TID extends PlatformID = Buffer,
> extends BaseThresholdPrecinctAggregator<TID> {
  constructor(
    poll: Poll<TID>,
    config: JurisdictionConfig<TID>,
    publicKey: PublicKey,
    thresholdConfig: ThresholdKeyConfig,
    tallyFeed?: IPublicTallyFeed<TID>,
    logger?: IVoteLogger<TID>,
    checkpointMgr?: ICheckpointManager<TID>,
  ) {
    super(
      poll,
      config,
      publicKey,
      thresholdConfig,
      tallyFeed,
      logger,
      checkpointMgr,
    );
  }
}

/**
 * Node.js Threshold County Aggregator
 * Extends ecies-lib ThresholdCountyAggregator with Buffer default
 */
export class ThresholdCountyAggregator<
  TID extends PlatformID = Buffer,
> extends BaseThresholdCountyAggregator<TID> {
  constructor(
    config: JurisdictionConfig<TID>,
    publicKey: PublicKey,
    thresholdConfig: ThresholdKeyConfig,
    choices: readonly string[],
    pollId: TID,
    tallyFeed?: IPublicTallyFeed<TID>,
  ) {
    super(config, publicKey, thresholdConfig, choices, pollId, tallyFeed);
  }
}

/**
 * Node.js Threshold State Aggregator
 * Extends ecies-lib ThresholdStateAggregator with Buffer default
 */
export class ThresholdStateAggregator<
  TID extends PlatformID = Buffer,
> extends BaseThresholdStateAggregator<TID> {
  constructor(
    config: JurisdictionConfig<TID>,
    publicKey: PublicKey,
    thresholdConfig: ThresholdKeyConfig,
    choices: readonly string[],
    pollId: TID,
    tallyFeed?: IPublicTallyFeed<TID>,
  ) {
    super(config, publicKey, thresholdConfig, choices, pollId, tallyFeed);
  }
}

/**
 * Node.js Threshold National Aggregator
 * Extends ecies-lib ThresholdNationalAggregator with Buffer default
 */
export class ThresholdNationalAggregator<
  TID extends PlatformID = Buffer,
> extends BaseThresholdNationalAggregator<TID> {
  constructor(
    config: JurisdictionConfig<TID>,
    publicKey: PublicKey,
    thresholdConfig: ThresholdKeyConfig,
    choices: readonly string[],
    pollId: TID,
    tallyFeed?: IPublicTallyFeed<TID>,
  ) {
    super(config, publicKey, thresholdConfig, choices, pollId, tallyFeed);
  }
}
