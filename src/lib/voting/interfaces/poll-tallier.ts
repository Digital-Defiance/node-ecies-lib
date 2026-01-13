/**
 * Interface definitions for poll-tallier.
 */
import type { IPollTallier as BaseIPollTallier } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Poll tallier interface for decrypting and tallying votes.
 * Holds private key and can decrypt results after poll closes.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type IPollTallier<TID extends PlatformID = Buffer> =
  BaseIPollTallier<TID>;
