/**
 * Threshold Poll - Node.js Optimized
 *
 * Extends ecies-lib ThresholdPoll with Buffer as the default TID type.
 *
 * @module voting/threshold
 */

import { ThresholdPoll as BaseThresholdPoll } from '@digitaldefiance/ecies-lib';
import type {
  IMember as BaseIMember,
  ThresholdPollConfig,
} from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../../interfaces';
import type { IMember } from '../../../interfaces/member';
import type { VotingMethod } from '../enumerations';

/**
 * Node.js ThresholdPoll that extends ecies-lib ThresholdPoll.
 * Specializes the generic TID parameter to Buffer by default.
 */
export class ThresholdPoll<
  TID extends PlatformID = Buffer,
> extends BaseThresholdPoll<TID> {
  constructor(
    id: TID,
    choices: string[],
    method: VotingMethod,
    authority: IMember<TID>,
    publicKey: PublicKey,
    config: ThresholdPollConfig<TID>,
  ) {
    super(
      id,
      choices,
      method,
      authority as BaseIMember<TID>,
      publicKey,
      config,
    );
  }
}
