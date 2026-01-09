/**
 * Comprehensive Voting System Tests
 * Government-grade testing for all voting methods
 * Node.js version - adapted for Buffer usage
 */
import { generateRandomKeysSync } from 'paillier-bigint';
import { VoteEncoder } from './encoder';
import { PollFactory } from './factory';
import { Poll as _Poll } from './poll-core';
import { PollTallier } from './tallier';
import type { IMember } from '../../interfaces/member';
import {
  VotingMethod,
  VotingSecurityValidator,
  SecurityLevel as _SecurityLevel,
} from './index';

import { BufferIdProvider } from '../id-providers/buffer-provider';

// Mock Member for testing
class MockMember implements IMember {
  public readonly idProvider = new BufferIdProvider(32, 'MockBuffer');

  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  sign(_data: Buffer): Buffer {
    return Buffer.alloc(64); // Mock signature
  }

  verify(_signature: Buffer, _data: Buffer): boolean {
    return true; // Mock verification
  }
}

function createMockMember(id: number, keyPair?: any): MockMember {
  const keys = keyPair || generateRandomKeysSync(512);
  const idBytes = Buffer.alloc(4);
  idBytes[0] = (id >> 24) & 0xff;
  idBytes[1] = (id >> 16) & 0xff;
  idBytes[2] = (id >> 8) & 0xff;
  idBytes[3] = id & 0xff;
  return new MockMember(
    idBytes,
    Buffer.from([id & 0xff]),
    keys.publicKey,
    keys.privateKey,
  );
}

describe('Voting System - Comprehensive Tests', () => {
  let authority: MockMember;
  let voters: MockMember[];
  let encoder: VoteEncoder;
  let tallier: PollTallier;
  let sharedKeyPair: any;

  beforeAll(() => {
    // Generate keys ONCE - major performance improvement
    sharedKeyPair = generateRandomKeysSync(512); // Use 512-bit for faster tests
    authority = createMockMember(0, sharedKeyPair);
    voters = Array.from({ length: 10 }, (_, i) =>
      createMockMember(i + 1, sharedKeyPair),
    );
    encoder = new VoteEncoder(authority.votingPublicKey);
    tallier = new PollTallier(
      authority,
      authority.votingPrivateKey,
      authority.votingPublicKey,
    );
  });

  describe('Security Validation', () => {
    test('should identify fully secure methods', () => {
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.Plurality),
      ).toBe(true);
      expect(VotingSecurityValidator.isFullySecure(VotingMethod.Approval)).toBe(
        true,
      );
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.RankedChoice),
      ).toBe(false);
    });

    test('should identify multi-round methods', () => {
      expect(
        VotingSecurityValidator.requiresMultipleRounds(
          VotingMethod.RankedChoice,
        ),
      ).toBe(true);
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.Plurality),
      ).toBe(false);
    });

    test('should reject insecure methods by default', () => {
      expect(() => {
        VotingSecurityValidator.validate(VotingMethod.Quadratic);
      }).toThrow();
    });

    test('should allow insecure methods with flag', () => {
      expect(() => {
        VotingSecurityValidator.validate(VotingMethod.Quadratic, {
          allowInsecure: true,
        });
      }).not.toThrow();
    });
  });

  describe('Plurality Voting', () => {
    test('should elect candidate with most votes', () => {
      const poll = PollFactory.createPlurality(
        ['Alice', 'Bob', 'Charlie'],
        authority,
      );

      // Alice: 5, Bob: 3, Charlie: 2
      for (let i = 0; i < 5; i++) {
        poll.vote(voters[i], encoder.encodePlurality(0, 3));
      }
      for (let i = 5; i < 8; i++) {
        poll.vote(voters[i], encoder.encodePlurality(1, 3));
      }
      for (let i = 8; i < 10; i++) {
        poll.vote(voters[i], encoder.encodePlurality(2, 3));
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBe(0);
      expect(results.tallies[0]).toBe(5n);
      expect(results.tallies[1]).toBe(3n);
      expect(results.tallies[2]).toBe(2n);
    });

    test('should handle ties', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      poll.vote(voters[0], encoder.encodePlurality(0, 2));
      poll.vote(voters[1], encoder.encodePlurality(1, 2));

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBeUndefined();
      expect(results.winners).toHaveLength(2);
      expect(results.winners).toContain(0);
      expect(results.winners).toContain(1);
    });

    test('should prevent double voting', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      poll.vote(voters[0], encoder.encodePlurality(0, 2));

      expect(() => {
        poll.vote(voters[0], encoder.encodePlurality(1, 2));
      }).toThrow('Already voted');
    });

    test('should prevent voting after close', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      poll.close();

      expect(() => {
        poll.vote(voters[0], encoder.encodePlurality(0, 2));
      }).toThrow('Poll is closed');
    });
  });

  describe('Approval Voting', () => {
    test('should allow multiple approvals', () => {
      const poll = PollFactory.createApproval(
        ['Red', 'Green', 'Blue'],
        authority,
      );

      poll.vote(voters[0], encoder.encodeApproval([0, 2], 3)); // Red, Blue
      poll.vote(voters[1], encoder.encodeApproval([1, 2], 3)); // Green, Blue
      poll.vote(voters[2], encoder.encodeApproval([2], 3)); // Blue

      poll.close();
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(1n); // Red
      expect(results.tallies[1]).toBe(1n); // Green
      expect(results.tallies[2]).toBe(3n); // Blue
      expect(results.winner).toBe(2);
    });
  });

  describe('Weighted Voting', () => {
    test('should respect vote weights', () => {
      const poll = PollFactory.createWeighted(
        ['Proposal A', 'Proposal B'],
        authority,
        1000n,
      );

      poll.vote(voters[0], encoder.encodeWeighted(0, 500n, 2)); // Whale
      poll.vote(voters[1], encoder.encodeWeighted(1, 200n, 2)); // Dolphin
      poll.vote(voters[2], encoder.encodeWeighted(1, 100n, 2)); // Shrimp

      poll.close();
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(500n);
      expect(results.tallies[1]).toBe(300n);
      expect(results.winner).toBe(0);
    });

    test('should reject weight exceeding maximum', () => {
      const poll = PollFactory.createWeighted(['A', 'B'], authority, 100n);

      expect(() => {
        poll.vote(voters[0], encoder.encodeWeighted(0, 101n, 2));
      }).toThrow('Weight exceeds maximum');
    });
  });

  describe('Borda Count', () => {
    test('should award points by ranking', () => {
      const poll = PollFactory.createBorda(['A', 'B', 'C'], authority);

      // Voter 1: A > B > C (A=3, B=2, C=1)
      poll.vote(voters[0], encoder.encodeBorda([0, 1, 2], 3));
      // Voter 2: B > A > C (B=3, A=2, C=1)
      poll.vote(voters[1], encoder.encodeBorda([1, 0, 2], 3));
      // Voter 3: A > C > B (A=3, C=2, B=1)
      poll.vote(voters[2], encoder.encodeBorda([0, 2, 1], 3));

      poll.close();
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(8n); // A: 3+2+3
      expect(results.tallies[1]).toBe(6n); // B: 2+3+1
      expect(results.tallies[2]).toBe(4n); // C: 1+1+2
      expect(results.winner).toBe(0);
    });
  });

  describe('Ranked Choice Voting (IRV)', () => {
    test('should eliminate candidates until majority', () => {
      const poll = PollFactory.createRankedChoice(
        ['A', 'B', 'C', 'D'],
        authority,
      );

      // 4 voters: A > B > C
      for (let i = 0; i < 4; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([0, 1, 2], 4));
      }
      // 3 voters: B > A > C
      for (let i = 4; i < 7; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([1, 0, 2], 4));
      }
      // 2 voters: C > D > A
      for (let i = 7; i < 9; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([2, 3, 0], 4));
      }
      // 1 voter: D > C > B
      poll.vote(voters[9], encoder.encodeRankedChoice([3, 2, 1], 4));

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBeDefined();
      expect(results.rounds).toBeDefined();
      expect(results.rounds!.length).toBeGreaterThan(1);
      expect(results.eliminated).toBeDefined();
    });

    test('should handle immediate majority', () => {
      const poll = PollFactory.createRankedChoice(['A', 'B'], authority);

      // 6 voters for A, 4 for B
      for (let i = 0; i < 6; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([0], 2));
      }
      for (let i = 6; i < 10; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([1], 2));
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBe(0);
      expect(results.rounds).toHaveLength(1);
    });

    test('should handle first-round majority with 4 candidates (showcase scenario)', () => {
      const poll = PollFactory.createRankedChoice(
        ['Progressive', 'Conservative', 'Libertarian', 'Green'],
        authority,
      );

      // 5 voters choose Progressive first (majority of 7)
      for (let i = 0; i < 5; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([0, 1, 2, 3], 4));
      }
      // 2 voters choose Conservative first
      for (let i = 5; i < 7; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([1, 0, 2, 3], 4));
      }

      poll.close();
      const results = tallier.tally(poll);

      // Progressive should win in round 1 with 5 votes (>50% of 7)
      expect(results.winner).toBe(0);
      expect(results.rounds).toBeDefined();
      expect(results.rounds).toHaveLength(1);
      expect(results.rounds![0].round).toBe(1);
      expect(results.rounds![0].tallies[0]).toBe(5n); // Progressive
      expect(results.rounds![0].tallies[1]).toBe(2n); // Conservative
      expect(results.rounds![0].tallies[2]).toBe(0n); // Libertarian
      expect(results.rounds![0].tallies[3]).toBe(0n); // Green
      expect(results.rounds![0].winner).toBe(0);
      expect(results.rounds![0].eliminated).toBeUndefined();
    });
  });

  describe('Two-Round Voting', () => {
    test('should identify top 2 for runoff', () => {
      const poll = PollFactory.create(
        ['A', 'B', 'C'],
        VotingMethod.TwoRound,
        authority,
      );

      // A: 4, B: 3, C: 3
      for (let i = 0; i < 4; i++) {
        poll.vote(voters[i], encoder.encodePlurality(0, 3));
      }
      for (let i = 4; i < 7; i++) {
        poll.vote(voters[i], encoder.encodePlurality(1, 3));
      }
      for (let i = 7; i < 10; i++) {
        poll.vote(voters[i], encoder.encodePlurality(2, 3));
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.rounds).toHaveLength(2);
      expect(results.winner).toBeDefined();
    });
  });

  describe('STAR Voting', () => {
    test('should use scores then runoff', () => {
      const poll = PollFactory.create(
        ['A', 'B', 'C'],
        VotingMethod.STAR,
        authority,
      );

      // Score voting followed by automatic runoff
      for (let i = 0; i < 10; i++) {
        const scores = [5n, 3n, 1n]; // A=5, B=3, C=1
        const encrypted = scores.map((s) =>
          authority.votingPublicKey.encrypt(s),
        );
        poll.vote(voters[i], { encrypted });
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.rounds).toHaveLength(2);
      expect(results.winner).toBeDefined();
    });
  });

  describe('STV (Proportional)', () => {
    test('should elect multiple winners', () => {
      const poll = PollFactory.create(
        ['A', 'B', 'C', 'D'],
        VotingMethod.STV,
        authority,
      );

      for (let i = 0; i < 10; i++) {
        poll.vote(
          voters[i],
          encoder.encodeRankedChoice([i % 4, (i + 1) % 4], 4),
        );
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winners).toBeDefined();
      expect(results.winners!.length).toBeGreaterThan(1);
    });
  });

  describe('Receipt Verification', () => {
    test('should generate valid receipts', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      const receipt = poll.vote(voters[0], encoder.encodePlurality(0, 2));

      expect(receipt).toBeDefined();
      expect(receipt.voterId).toEqual(voters[0].id);
      expect(receipt.pollId).toEqual(poll.id);
      expect(receipt.signature).toBeDefined();
    });

    test('should verify valid receipts', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      const receipt = poll.vote(voters[0], encoder.encodePlurality(0, 2));
      const isValid = poll.verifyReceipt(voters[0], receipt);

      expect(isValid).toBe(true);
    });

    test('should reject receipts from non-voters', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      const receipt = poll.vote(voters[0], encoder.encodePlurality(0, 2));
      const isValid = poll.verifyReceipt(voters[1], receipt);

      expect(isValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle single voter', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      poll.vote(voters[0], encoder.encodePlurality(0, 2));
      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBe(0);
      expect(results.voterCount).toBe(1);
    });

    test('should handle all voters choosing same option', () => {
      const poll = PollFactory.createPlurality(['A', 'B', 'C'], authority);

      for (let i = 0; i < 10; i++) {
        poll.vote(voters[i], encoder.encodePlurality(1, 3));
      }

      poll.close();
      const results = tallier.tally(poll);

      expect(results.winner).toBe(1);
      expect(results.tallies[1]).toBe(10n);
      expect(results.tallies[0]).toBe(0n);
      expect(results.tallies[2]).toBe(0n);
    });

    test('should handle minimum choices (2)', () => {
      const poll = PollFactory.createPlurality(['Yes', 'No'], authority);

      poll.vote(voters[0], encoder.encodePlurality(0, 2));
      poll.close();
      const results = tallier.tally(poll);

      expect(results.choices).toHaveLength(2);
    });

    test('should reject poll with < 2 choices', () => {
      expect(() => {
        PollFactory.createPlurality(['Only One'], authority);
      }).toThrow('at least 2 choices');
    });
  });

  describe('Cryptographic Properties', () => {
    test('votes should remain encrypted until tally', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      poll.vote(voters[0], encoder.encodePlurality(0, 2));

      const encryptedVotes = poll.getEncryptedVotes();
      expect(encryptedVotes.size).toBe(1);

      // Encrypted votes should be bigints (ciphertext)
      const vote = Array.from(encryptedVotes.values())[0];
      expect(typeof vote[0]).toBe('bigint');
    });

    test('should produce different ciphertexts for same vote', () => {
      const _poll1 = PollFactory.createPlurality(['A', 'B'], authority);
      const _poll2 = PollFactory.createPlurality(['A', 'B'], authority);

      const vote1 = encoder.encodePlurality(0, 2);
      const vote2 = encoder.encodePlurality(0, 2);

      // Same plaintext, different ciphertext (probabilistic encryption)
      expect(vote1.encrypted[0]).not.toBe(vote2.encrypted[0]);
    });
  });
});
