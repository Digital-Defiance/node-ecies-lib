/**
 * Interface definitions for encrypted-vote.
 */
import type { EncryptedVote as BaseEncryptedVote } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Encrypted vote data using Paillier homomorphic encryption.
 * Structure varies by voting method.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type EncryptedVote<TID extends PlatformID = Buffer> =
  BaseEncryptedVote<TID>;
