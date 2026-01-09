import type { IVoteLoggerExtended as BaseIVoteLoggerExtended } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Extended vote logger interface - implemented in node-ecies-lib.
 * Provides additional functionality for vote logging.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type IVoteLoggerExtended<TID extends PlatformID = Buffer> =
  BaseIVoteLoggerExtended<TID>;
