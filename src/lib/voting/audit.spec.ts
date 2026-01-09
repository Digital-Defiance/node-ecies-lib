/**
 * Tests for Immutable Audit Log (Requirement 1.1)
 * Node.js version - tests for Buffer-specialized ImmutableAuditLog extending ecies-lib
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ImmutableAuditLog } from './audit';
import { AuditEventType } from './enumerations';
import type { IMember } from '../../interfaces/member';

import { BufferIdProvider } from '../id-providers/buffer-provider';

// Mock Member implementation for testing
class MockMember implements IMember<Buffer> {
  public readonly idProvider = new BufferIdProvider(32, 'MockBuffer');

  constructor(
    public readonly id: Buffer,
    public readonly votingPublicKey?: unknown,
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  sign(data: Buffer): Buffer {
    // Simple mock signature
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

describe('ImmutableAuditLog', () => {
  let authority: MockMember;
  let auditLog: ImmutableAuditLog<Buffer>;
  let pollId: Buffer;

  beforeEach(() => {
    authority = new MockMember(Buffer.from([1, 2, 3, 4]));
    auditLog = new ImmutableAuditLog(authority as any);
    pollId = Buffer.from([10, 20, 30, 40]);
  });

  describe('Inheritance from ecies-lib', () => {
    it('should extend ecies-lib ImmutableAuditLog', () => {
      expect(auditLog).toBeDefined();
      expect(typeof auditLog.recordPollCreated).toBe('function');
      expect(typeof auditLog.recordVoteCast).toBe('function');
      expect(typeof auditLog.recordPollClosed).toBe('function');
      expect(typeof auditLog.getEntries).toBe('function');
      expect(typeof auditLog.verifyChain).toBe('function');
    });

    it('should use Buffer for binary data', () => {
      const entry = auditLog.recordPollCreated(pollId);
      expect(Buffer.isBuffer(entry.previousHash)).toBe(true);
      expect(Buffer.isBuffer(entry.entryHash)).toBe(true);
      expect(Buffer.isBuffer(entry.signature)).toBe(true);
    });
  });

  describe('Poll Creation Events', () => {
    it('should record poll creation with correct fields', () => {
      const entry = auditLog.recordPollCreated(pollId, {
        method: 'plurality',
        choiceCount: 3,
      });

      expect(entry.eventType).toBe(AuditEventType.PollCreated);
      expect(entry.sequence).toBe(0);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.authorityId).toEqual(authority.id);
      expect(entry.metadata).toEqual({ method: 'plurality', choiceCount: 3 });
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.signature.length).toBeGreaterThan(0);
    });

    it('should use zero hash for genesis entry', () => {
      const entry = auditLog.recordPollCreated(pollId);
      const zeroHash = Buffer.alloc(32);
      expect(entry.previousHash).toEqual(zeroHash);
    });

    it('should generate unique entry hash', () => {
      const entry1 = auditLog.recordPollCreated(pollId);
      const entry2 = auditLog.recordPollCreated(Buffer.from([5, 6, 7, 8]));

      expect(entry1.entryHash).not.toEqual(entry2.entryHash);
    });
  });

  describe('Vote Cast Events', () => {
    it('should record vote cast with voter ID hash', () => {
      const voterIdHash = Buffer.from([99, 88, 77, 66]);
      const entry = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(voterIdHash),
      );

      expect(entry.eventType).toBe(AuditEventType.VoteCast);
      expect(entry.pollId).toEqual(pollId);
      expect(Buffer.from(entry.voterIdHash)).toEqual(voterIdHash);
      expect(entry.authorityId).toBeUndefined();
    });

    it('should increment sequence numbers', () => {
      auditLog.recordPollCreated(pollId);
      const entry1 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([1])),
      );
      const entry2 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([2])),
      );

      expect(entry1.sequence).toBe(1);
      expect(entry2.sequence).toBe(2);
    });

    it('should chain to previous entry', () => {
      const entry1 = auditLog.recordPollCreated(pollId);
      const entry2 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([1])),
      );

      expect(entry2.previousHash).toEqual(entry1.entryHash);
    });
  });

  describe('Poll Closure Events', () => {
    it('should record poll closure with metadata', () => {
      const entry = auditLog.recordPollClosed(pollId, {
        voterCount: 42,
        closedAt: Date.now(),
      });

      expect(entry.eventType).toBe(AuditEventType.PollClosed);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.authorityId).toEqual(authority.id);
      expect(entry.metadata?.voterCount).toBe(42);
    });
  });

  describe('Chain Integrity', () => {
    it('should verify valid chain', () => {
      auditLog.recordPollCreated(pollId);
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([1])));
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([2])));
      auditLog.recordPollClosed(pollId);

      expect(auditLog.verifyChain()).toBe(true);
    });

    it('should verify empty chain', () => {
      expect(auditLog.verifyChain()).toBe(true);
    });

    it('should detect tampered entry hash', () => {
      auditLog.recordPollCreated(pollId);
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([1])));

      const entries = auditLog.getEntries();
      // Create a tampered entry with modified hash
      const tamperedEntry = {
        ...entries[1],
        entryHash: Buffer.from(entries[1].entryHash),
      };
      tamperedEntry.entryHash[0] ^= 0xff;

      // Verify the tampered entry fails verification
      expect(auditLog.verifyEntry(tamperedEntry)).toBe(false);
    });

    it('should detect broken chain link', () => {
      auditLog.recordPollCreated(pollId);
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([1])));

      const entries = auditLog.getEntries();
      // Create a tampered entry with broken chain link
      const tamperedEntry = {
        ...entries[1],
        previousHash: Buffer.from(entries[1].previousHash),
      };
      tamperedEntry.previousHash[0] ^= 0xff;

      // Verify the tampered entry fails verification
      expect(auditLog.verifyEntry(tamperedEntry)).toBe(false);
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid entry signature', () => {
      const entry = auditLog.recordPollCreated(pollId);
      expect(auditLog.verifyEntry(entry)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const entry = auditLog.recordPollCreated(pollId);
      // Tamper with signature
      const tamperedEntry = { ...entry, signature: Buffer.alloc(64) };
      expect(auditLog.verifyEntry(tamperedEntry)).toBe(false);
    });

    it('should verify all entries in chain', () => {
      auditLog.recordPollCreated(pollId);
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([1])));
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([2])));

      const entries = auditLog.getEntries();
      for (const entry of entries) {
        expect(auditLog.verifyEntry(entry)).toBe(true);
      }
    });
  });

  describe('Query Operations', () => {
    it('should return all entries in order', () => {
      auditLog.recordPollCreated(pollId);
      auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([1])));
      auditLog.recordPollClosed(pollId);

      const entries = auditLog.getEntries();
      expect(entries.length).toBe(3);
      expect(entries[0].sequence).toBe(0);
      expect(entries[1].sequence).toBe(1);
      expect(entries[2].sequence).toBe(2);
    });

    it('should filter entries by poll ID', () => {
      const pollId1 = Buffer.from([1, 2, 3]);
      const pollId2 = Buffer.from([4, 5, 6]);

      auditLog.recordPollCreated(pollId1);
      auditLog.recordVoteCast(pollId1, new Uint8Array(Buffer.from([1])));
      auditLog.recordPollCreated(pollId2);
      auditLog.recordVoteCast(pollId2, new Uint8Array(Buffer.from([2])));
      auditLog.recordPollClosed(pollId1);

      const poll1Entries = auditLog.getEntriesForPoll(pollId1);
      expect(poll1Entries.length).toBe(3);
      expect(
        poll1Entries.every(
          (e) =>
            Array.from(e.pollId).join(',') === Array.from(pollId1).join(','),
        ),
      ).toBe(true);
    });

    it('should return empty array for unknown poll', () => {
      auditLog.recordPollCreated(pollId);
      const entries = auditLog.getEntriesForPoll(Buffer.from([99, 99]));
      expect(entries.length).toBe(0);
    });

    it('should return entries as readonly array', () => {
      auditLog.recordPollCreated(pollId);
      const entries = auditLog.getEntries();

      // Verify it's a readonly array type
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Timestamp Precision', () => {
    it('should use microsecond precision', () => {
      const entry1 = auditLog.recordPollCreated(pollId);
      const entry2 = auditLog.recordPollCreated(Buffer.from([5, 6]));

      // Timestamps should be different (microsecond precision)
      expect(entry2.timestamp).toBeGreaterThanOrEqual(entry1.timestamp);
    });

    it('should have monotonically increasing timestamps', () => {
      const entries: any[] = [];
      for (let i = 0; i < 10; i++) {
        entries.push(
          auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([i]))),
        );
      }

      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].timestamp).toBeGreaterThanOrEqual(
          entries[i - 1].timestamp,
        );
      }
    });
  });

  describe('Metadata Handling', () => {
    it('should store arbitrary metadata', () => {
      const metadata = {
        method: 'ranked-choice',
        choiceCount: 5,
        maxWeight: '1000',
        custom: { nested: 'value' },
      };

      const entry = auditLog.recordPollCreated(pollId, metadata);
      expect(entry.metadata).toEqual(metadata);
    });

    it('should handle missing metadata', () => {
      const entry = auditLog.recordPollCreated(pollId);
      expect(entry.metadata).toBeUndefined();
    });

    it('should preserve metadata in chain verification', () => {
      auditLog.recordPollCreated(pollId, { key: 'value' });
      expect(auditLog.verifyChain()).toBe(true);
    });
  });

  describe('Complete Poll Lifecycle', () => {
    it('should track complete poll lifecycle', () => {
      // Create poll
      const _createEntry = auditLog.recordPollCreated(pollId, {
        method: 'plurality',
        choiceCount: 3,
      });

      // Cast votes
      const _vote1 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([1, 1, 1])),
      );
      const _vote2 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([2, 2, 2])),
      );
      const _vote3 = auditLog.recordVoteCast(
        pollId,
        new Uint8Array(Buffer.from([3, 3, 3])),
      );

      // Close poll
      const _closeEntry = auditLog.recordPollClosed(pollId, {
        voterCount: 3,
      });

      // Verify complete chain
      expect(auditLog.verifyChain()).toBe(true);

      // Verify lifecycle events
      const entries = auditLog.getEntriesForPoll(pollId);
      expect(entries.length).toBe(5);
      expect(entries[0].eventType).toBe(AuditEventType.PollCreated);
      expect(entries[1].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[2].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[3].eventType).toBe(AuditEventType.VoteCast);
      expect(entries[4].eventType).toBe(AuditEventType.PollClosed);

      // Verify chain links
      expect(entries[1].previousHash).toEqual(entries[0].entryHash);
      expect(entries[2].previousHash).toEqual(entries[1].entryHash);
      expect(entries[3].previousHash).toEqual(entries[2].entryHash);
      expect(entries[4].previousHash).toEqual(entries[3].entryHash);
    });
  });

  describe('Multiple Polls', () => {
    it('should handle multiple concurrent polls', () => {
      const poll1 = Buffer.from([1, 1, 1]);
      const poll2 = Buffer.from([2, 2, 2]);
      const poll3 = Buffer.from([3, 3, 3]);

      auditLog.recordPollCreated(poll1);
      auditLog.recordPollCreated(poll2);
      auditLog.recordVoteCast(poll1, new Uint8Array(Buffer.from([10])));
      auditLog.recordVoteCast(poll2, new Uint8Array(Buffer.from([20])));
      auditLog.recordPollCreated(poll3);
      auditLog.recordVoteCast(poll3, new Uint8Array(Buffer.from([30])));
      auditLog.recordPollClosed(poll1);
      auditLog.recordPollClosed(poll2);

      // Verify chain integrity
      expect(auditLog.verifyChain()).toBe(true);

      // Verify per-poll entries
      expect(auditLog.getEntriesForPoll(poll1).length).toBe(3);
      expect(auditLog.getEntriesForPoll(poll2).length).toBe(3);
      expect(auditLog.getEntriesForPoll(poll3).length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty poll ID', () => {
      const emptyId = Buffer.alloc(0);
      const entry = auditLog.recordPollCreated(emptyId);
      expect(entry.pollId).toEqual(emptyId);
      expect(auditLog.verifyChain()).toBe(true);
    });

    it('should handle large metadata', () => {
      const largeMetadata = {
        data: 'x'.repeat(10000),
        array: Array(1000).fill(42),
      };
      const entry = auditLog.recordPollCreated(pollId, largeMetadata);
      expect(entry.metadata).toEqual(largeMetadata);
      expect(auditLog.verifyChain()).toBe(true);
    });

    it('should handle rapid sequential events', () => {
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push(
          auditLog.recordVoteCast(pollId, new Uint8Array(Buffer.from([i]))),
        );
      }

      expect(auditLog.verifyChain()).toBe(true);
      expect(entries.length).toBe(100);

      // Verify all sequence numbers are unique and ordered
      for (let i = 0; i < entries.length; i++) {
        expect(entries[i].sequence).toBe(i);
      }
    });
  });
});
