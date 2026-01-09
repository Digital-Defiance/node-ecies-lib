import type { BulletinBoard as BaseBulletinBoard } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Bulletin board interface for public vote publication.
 * Provides transparent, verifiable record of all votes and tallies.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type BulletinBoard<TID extends PlatformID = Buffer> =
  BaseBulletinBoard<TID>;
