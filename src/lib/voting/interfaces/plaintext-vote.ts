import type { PlaintextVote as BasePlaintextVote } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Plaintext vote data for insecure voting methods.
 * WARNING: Only use for Quadratic, Consensus, or ConsentBased methods.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type PlaintextVote<TID extends PlatformID = Buffer> =
  BasePlaintextVote<TID>;
