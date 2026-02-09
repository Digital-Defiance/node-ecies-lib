/**
 * Threshold Poll Factory - Node.js Optimized
 *
 * Extends ecies-lib ThresholdPollFactory with Buffer as the default TID type.
 *
 * @module voting/threshold
 */

import { ThresholdPollFactory as BaseThresholdPollFactory } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Node.js ThresholdPollFactory that extends ecies-lib ThresholdPollFactory.
 * Specializes the generic TID parameter to Buffer by default.
 */
export class ThresholdPollFactory<
  TID extends PlatformID = Buffer,
> extends BaseThresholdPollFactory<TID> {
  // All methods inherited from BaseThresholdPollFactory
  // The generic type parameter TID is specialized to Buffer by default
}
