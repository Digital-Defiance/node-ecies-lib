/**
 * Integration tests for Poll with Audit Log (Requirement 1.1)
 * Node.js version - adapted for Buffer usage
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { PublicKey } from 'paillier-bigint';
import { AuditEventType } from './audit';
import { Poll } from './poll-core';
import { VotingMethod } from './types';
import type { IMember, EncryptedVote } from './types';

// Mock Member for testing
class MockMember implements IMember {
  constructor(
    public readonly id: Buffer,
    public readonly votingPublicKey?: PublicKey,
  ) {}

  sign(data: Buffer): Buffer {
    const sig = Buffer.alloc(64);
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      sig[i] = data[i] ^ 0xaa;
    }
    return sig;
  }

  verify(signature: Buffer, data: Buffer): boolean {
    const expected = this.sign(data);
    if (signature.length !== expected.length) return false;
    for (let i = 0; i < signature.length; i++) {
      if (signature[i] !== expected[i]) return false;
    }
    return true;
  }
}

describe('Poll with Audit Log Integration', () => {
  let authority: MockMember;
  let voter1: MockMember;
  let voter2: MockMember;
  let pollId: Buffer;
  let publicKey: PublicKey;

  beforeEach(() => {
    authority = new MockMember(Buffer.from([1, 2, 3]), {} as PublicKey);
    voter1 = new MockMember(Buffer.from([10, 11, 12]));
    voter2 = new MockMember(Buffer.from([20, 21, 22]));
    pollId = Buffer.from([100, 101, 102]);
    publicKey = { n: 123n, g: 456n } as PublicKey;
  });

  describe('Poll Creation Audit', () => {
    it('should record poll creation in audit log', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob', 'Charlie'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].eventType).toBe(AuditEventType.PollCreated);
      expect(entries[0].pollId).toEqual(pollId);
      expect(entries[0].authorityId).toEqual(authority.id);
    });

    it('should include poll metadata in creation event', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Weighted,
        authority,
        publicKey,
        1000n,
      );

      const entries = poll.auditLog.getEntries();
      expect(entries[0].metadata?.method).toBe(VotingMethod.Weighted);
      expect(entries[0].metadata?.choiceCount).toBe(2);
      expect(entries[0].metadata?.maxWeight).toBe('1000');
    });
  });

  describe('Vote Casting Audit', () => {
    it('should record each vote in audit log', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote1: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };
      const vote2: EncryptedVote = {
        choiceIndex: 1,
        encrypted: [789n, 101n],
      };

      poll.vote(voter1, vote1);
      poll.vote(voter2, vote2);

      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(3); // 1 creation + 2 votes
      expect(entries[1].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[2].eventType).toBe(AuditEventType.VoteCast);
    });

    it('should hash voter IDs in audit log', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);

      const entries = poll.auditLog.getEntries();
      const voteEntry = entries[1];

      // Voter ID should be hashed, not stored in plaintext
      expect(voteEntry.voterIdHash).toBeDefined();
      expect(voteEntry.voterIdHash).not.toEqual(voter1.id);
    });

    it('should maintain audit chain integrity after votes', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);
      poll.vote(voter2, vote);

      expect(poll.auditLog.verifyChain()).toBe(true);
    });
  });

  describe('Poll Closure Audit', () => {
    it('should record poll closure in audit log', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);
      poll.close();

      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(3); // creation + vote + closure
      expect(entries[2].eventType).toBe(AuditEventType.PollClosed);
      expect(entries[2].authorityId).toEqual(authority.id);
    });

    it('should include voter count in closure metadata', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);
      poll.vote(voter2, vote);
      poll.close();

      const entries = poll.auditLog.getEntries();
      const closeEntry = entries[entries.length - 1];
      expect(closeEntry.metadata?.voterCount).toBe(2);
    });
  });

  describe('Complete Lifecycle Audit', () => {
    it('should maintain complete audit trail from creation to closure', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob', 'Charlie'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n, 789n],
      };

      // Cast multiple votes
      poll.vote(voter1, vote);
      poll.vote(voter2, vote);

      // Close poll
      poll.close();

      // Verify complete audit trail
      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(4);

      // Verify event sequence
      expect(entries[0].eventType).toBe(AuditEventType.PollCreated);
      expect(entries[1].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[2].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[3].eventType).toBe(AuditEventType.PollClosed);

      // Verify sequence numbers
      expect(entries[0].sequence).toBe(0);
      expect(entries[1].sequence).toBe(1);
      expect(entries[2].sequence).toBe(2);
      expect(entries[3].sequence).toBe(3);

      // Verify chain integrity
      expect(poll.auditLog.verifyChain()).toBe(true);

      // Verify all signatures
      for (const entry of entries) {
        expect(poll.auditLog.verifyEntry(entry)).toBe(true);
      }
    });

    it('should filter audit entries by poll ID', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);
      poll.close();

      const pollEntries = poll.auditLog.getEntriesForPoll(pollId);
      expect(pollEntries.length).toBe(3);

      // All entries should be for this poll
      for (const entry of pollEntries) {
        expect(entry.pollId).toEqual(pollId);
      }
    });
  });

  describe('Audit Immutability', () => {
    it('should prevent modification of audit entries', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const entries = poll.auditLog.getEntries();

      // Attempt to modify should not affect original
      expect(() => {
        (entries as any).push({});
      }).toThrow();
    });

    it('should detect tampering with audit chain', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);

      // Verify chain is valid
      expect(poll.auditLog.verifyChain()).toBe(true);

      // Tamper with an entry
      const entries = poll.auditLog.getEntries();
      (entries[1] as any).entryHash[0] ^= 0xff;

      // Chain should now be invalid
      expect(poll.auditLog.verifyChain()).toBe(false);
    });
  });

  describe('Multiple Voting Methods', () => {
    it('should audit approval voting', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob', 'Charlie'],
        VotingMethod.Approval,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choices: [0, 2],
        encrypted: [123n, 0n, 456n],
      };

      poll.vote(voter1, vote);

      const entries = poll.auditLog.getEntries();
      expect(entries[0].metadata?.method).toBe(VotingMethod.Approval);
      expect(poll.auditLog.verifyChain()).toBe(true);
    });

    it('should audit weighted voting', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Weighted,
        authority,
        publicKey,
        1000n,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        weight: 500n,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);

      const entries = poll.auditLog.getEntries();
      expect(entries[0].metadata?.method).toBe(VotingMethod.Weighted);
      expect(entries[0].metadata?.maxWeight).toBe('1000');
      expect(poll.auditLog.verifyChain()).toBe(true);
    });

    it('should audit ranked choice voting', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob', 'Charlie'],
        VotingMethod.RankedChoice,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        rankings: [1, 0, 2],
        encrypted: [123n, 456n, 789n],
      };

      poll.vote(voter1, vote);

      const entries = poll.auditLog.getEntries();
      expect(entries[0].metadata?.method).toBe(VotingMethod.RankedChoice);
      expect(poll.auditLog.verifyChain()).toBe(true);
    });
  });

  describe('Error Conditions', () => {
    it('should not create audit entry for rejected vote', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      poll.vote(voter1, vote);

      // Attempt duplicate vote
      expect(() => poll.vote(voter1, vote)).toThrow('Already voted');

      // Should only have 2 entries (creation + 1 vote)
      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(2);
    });

    it('should not create audit entry for vote on closed poll', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      poll.close();

      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [123n, 456n],
      };

      // Attempt vote on closed poll
      expect(() => poll.vote(voter1, vote)).toThrow('Poll is closed');

      // Should only have 2 entries (creation + closure)
      const entries = poll.auditLog.getEntries();
      expect(entries.length).toBe(2);
    });
  });
});
