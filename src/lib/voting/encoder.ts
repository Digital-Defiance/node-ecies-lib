/**
 * Vote Encoder - Encrypts votes using Paillier homomorphic encryption
 * Node.js optimized - extends ecies-lib VoteEncoder with Buffer support
 */
import { VoteEncoder as BaseVoteEncoder } from '@digitaldefiance/ecies-lib';
import type { PublicKey } from 'paillier-bigint';

/**
 * Node.js VoteEncoder that extends ecies-lib VoteEncoder
 * Specializes the generic TID parameter to Buffer for Node.js compatibility
 */
export class VoteEncoder extends BaseVoteEncoder<Buffer> {
  constructor(votingPublicKey: PublicKey) {
    super(votingPublicKey);
  }

  // All methods are inherited from BaseVoteEncoder
  // The generic type parameter TID is specialized to Buffer
  // This ensures all return types use Buffer instead of Uint8Array
}
