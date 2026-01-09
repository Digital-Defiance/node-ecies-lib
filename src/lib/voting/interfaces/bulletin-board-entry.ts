import type { BulletinBoardEntry as BaseBulletinBoardEntry } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Bulletin board entry for published votes.
 * Contains encrypted vote with cryptographic proof and Merkle tree integration.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type BulletinBoardEntry<TID extends PlatformID = Buffer> =
  BaseBulletinBoardEntry<TID>;
