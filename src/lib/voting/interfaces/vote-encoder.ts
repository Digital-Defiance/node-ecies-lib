import type { IVoteEncoder as BaseIVoteEncoder } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Vote encoder interface for encrypting votes.
 * Converts vote choices into encrypted Paillier ciphertexts.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type IVoteEncoder<TID extends PlatformID = Buffer> =
  BaseIVoteEncoder<TID>;
