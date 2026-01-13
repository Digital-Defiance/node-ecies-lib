/**
 * Interface definitions for poll.
 */
import type { IPoll as BaseIPoll } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Poll interface for vote aggregation and management.
 * Holds encrypted votes and issues receipts, but cannot decrypt votes.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type IPoll<TID extends PlatformID = Buffer> = BaseIPoll<TID>;
