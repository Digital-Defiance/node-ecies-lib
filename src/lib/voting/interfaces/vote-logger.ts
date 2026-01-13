/**
 * Interface definitions for vote-logger.
 */
import type { IVoteLogger as BaseIVoteLogger } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Vote logger interface for persistent vote storage.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type IVoteLogger<TID extends PlatformID = Buffer> = BaseIVoteLogger<TID>;
