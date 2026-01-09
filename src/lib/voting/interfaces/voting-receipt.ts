import type { VoteReceipt as BaseVoteReceipt } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Cryptographically signed receipt proving a vote was cast.
 * Can be used to verify participation without revealing vote content.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type VoteReceipt<TID extends PlatformID = Buffer> = BaseVoteReceipt<TID>;
