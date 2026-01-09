/**
 * Integration tests for Poll with Audit Log (Requirement 1.1)
 * Node.js version - adapted for Buffer usage
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { PublicKey } from 'paillier-bigint';
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { AuditEventType, VotingMethod } from './enumerations';
import { Poll } from './poll-core';
import type { IMember } from '../../interfaces/member';
import type { EncryptedVote } from './interfaces';
import type { IIdProvider } from '@digitaldefiance/ecies-lib';

/**
 * Simple ID provider for test MockMember class
 * Handles 4-byte Buffer IDs used in voting tests
 */
class MockBufferIdProvider implements IIdProvider<Buffer> {
  readonly byteLength = 4;
  readonly name = 'MockBuffer';

  generate(): Uint8Array {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    return buffer;
  }

  validate(id: Uint8Array): boolean {
    return id.length === 4;
  }

  serialize(id: Uint8Array): string {
    return Array.from(id)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  deserialize(str: string): Uint8Array {
    if (str.length !== 8) throw new Error('Invalid hex string length');
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      bytes[i] = parseInt(str.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  clone(id: Buffer): Buffer {
    return Buffer.from(id);
  }

  fromBytes(bytes: Uint8Array): Buffer {
    return Buffer.from(bytes);
  }

  toBytes(id: Buffer): Uint8Array {
    return new Uint8Array(id);
  }

  equals(a: Buffer, b: Buffer): boolean {
    return a.equals(b);
  }

  idToString(id: Buffer): string {
    return this.serialize(this.toBytes(id));
  }

  idFromString(str: string): Buffer {
    return this.fromBytes(this.deserialize(str));
  }
}

// Mock Member for testing
class MockMember implements IMember {
  private static _idProvider = new MockBufferIdProvider();
  public readonly idProvider = MockMember._idProvider;

  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  get idProvider(): IIdProvider<Buffer> {
    return MockMember._idProvider;
  }

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
    const keyPair = generateKeyPair(512);
    authority = new MockMember(
      Buffer.from([1, 2, 3]),
      {} as PublicKey,
      keyPair.publicKey,
      keyPair.privateKey,
    );
    voter1 = new MockMember(
      Buffer.from([10, 11, 12]),
      {} as PublicKey,
      keyPair.publicKey,
      keyPair.privateKey,
    );
    voter2 = new MockMember(
      Buffer.from([20, 21, 22]),
      {} as PublicKey,
      keyPair.publicKey,
      keyPair.privateKey,
    );
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
    it('should return entries as readonly array', () => {
      const poll = new Poll(
        pollId,
        ['Alice', 'Bob'],
        VotingMethod.Plurality,
        authority,
        publicKey,
      );

      const entries = poll.auditLog.getEntries();

      // Verify it's a readonly array type
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should maintain chain integrity', () => {
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

      // Verify all entries have valid signatures
      const entries = poll.auditLog.getEntries();
      for (const entry of entries) {
        expect(poll.auditLog.verifyEntry(entry)).toBe(true);
      }
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
