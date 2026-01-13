/**
 * Interface definitions for tally-proof.
 */
import type { TallyProof as BaseTallyProof } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Tally proof for cryptographically verifiable results.
 * Contains final tallies with proof of correct decryption.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type TallyProof<TID extends PlatformID = Buffer> = BaseTallyProof<TID>;
