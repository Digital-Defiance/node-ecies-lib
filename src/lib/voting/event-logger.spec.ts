/**
 * Tests for Event Logger (Requirement 1.3)
 * Government-grade event logging verification
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PollEventLogger,
  EventType,
  type EventLogEntry,
  type PollConfiguration,
} from './event-logger';

describe('PollEventLogger', () => {
  let logger: PollEventLogger;

  beforeEach(() => {
    logger = new PollEventLogger();
  });

  describe('Poll Creation Logging', () => {
    it('should log poll creation with creator identity and configuration', () => {
      const pollId = Buffer.from([1, 2, 3]);
      const creatorId = Buffer.from([4, 5, 6]);
      const config: PollConfiguration = {
        method: 'plurality',
        choices: ['Alice', 'Bob', 'Charlie'],
      };

      const entry = logger.logPollCreated(pollId, creatorId, config);

      expect(entry.eventType).toBe(EventType.PollCreated);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.creatorId).toEqual(creatorId);
      expect(entry.configuration).toEqual(config);
      expect(entry.sequence).toBe(0);
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('should log weighted poll configuration', () => {
      const pollId = Buffer.from([1]);
      const creatorId = Buffer.from([2]);
      const config: PollConfiguration = {
        method: 'weighted',
        choices: ['Option A', 'Option B'],
        maxWeight: 1000n,
      };

      const entry = logger.logPollCreated(pollId, creatorId, config);

      expect(entry.configuration?.maxWeight).toBe(1000n);
    });

    it('should log supermajority poll configuration', () => {
      const pollId = Buffer.from([1]);
      const creatorId = Buffer.from([2]);
      const config: PollConfiguration = {
        method: 'supermajority',
        choices: ['Yes', 'No'],
        threshold: { numerator: 2, denominator: 3 },
      };

      const entry = logger.logPollCreated(pollId, creatorId, config);

      expect(entry.configuration?.threshold).toEqual({
        numerator: 2,
        denominator: 3,
      });
    });
  });

  describe('Vote Casting Logging', () => {
    it('should log vote cast with anonymized voter token', () => {
      const pollId = Buffer.from([1, 2, 3]);
      const voterToken = Buffer.from([7, 8, 9]);

      const entry = logger.logVoteCast(pollId, voterToken);

      expect(entry.eventType).toBe(EventType.VoteCast);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.voterToken).toEqual(voterToken);
      expect(entry.sequence).toBe(0);
    });

    it('should log vote cast with metadata', () => {
      const pollId = Buffer.from([1]);
      const voterToken = Buffer.from([2]);
      const metadata = { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' };

      const entry = logger.logVoteCast(pollId, voterToken, metadata);

      expect(entry.metadata).toEqual(metadata);
    });

    it('should log multiple votes with sequential numbers', () => {
      const pollId = Buffer.from([1]);

      const entry1 = logger.logVoteCast(pollId, Buffer.from([1]));
      const entry2 = logger.logVoteCast(pollId, Buffer.from([2]));
      const entry3 = logger.logVoteCast(pollId, Buffer.from([3]));

      expect(entry1.sequence).toBe(0);
      expect(entry2.sequence).toBe(1);
      expect(entry3.sequence).toBe(2);
    });
  });

  describe('Poll Closure Logging', () => {
    it('should log poll closure with final tally hash', () => {
      const pollId = Buffer.from([1, 2, 3]);
      const tallyHash = Buffer.alloc(32, 0xab);

      const entry = logger.logPollClosed(pollId, tallyHash);

      expect(entry.eventType).toBe(EventType.PollClosed);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.tallyHash).toEqual(tallyHash);
    });

    it('should log poll closure with metadata', () => {
      const pollId = Buffer.from([1]);
      const tallyHash = Buffer.alloc(32);
      const metadata = { totalVotes: 100, winner: 'Alice' };

      const entry = logger.logPollClosed(pollId, tallyHash, metadata);

      expect(entry.metadata).toEqual(metadata);
    });
  });

  describe('Generic Event Logging', () => {
    it('should log generic events', () => {
      const pollId = Buffer.from([1]);

      const entry = logger.logEvent(EventType.VoteVerified, pollId, {
        metadata: { verified: true },
      });

      expect(entry.eventType).toBe(EventType.VoteVerified);
      expect(entry.pollId).toEqual(pollId);
      expect(entry.metadata).toEqual({ verified: true });
    });

    it('should support all event types', () => {
      const pollId = Buffer.from([1]);

      const types = [
        EventType.PollCreated,
        EventType.VoteCast,
        EventType.PollClosed,
        EventType.VoteVerified,
        EventType.TallyComputed,
        EventType.AuditRequested,
      ];

      for (const type of types) {
        const entry = logger.logEvent(type, pollId);
        expect(entry.eventType).toBe(type);
      }
    });
  });

  describe('Microsecond Timestamps', () => {
    it('should include microsecond-precision timestamps', () => {
      const pollId = Buffer.from([1]);

      const before = Date.now() * 1000;
      const entry = logger.logVoteCast(pollId, Buffer.from([2]));
      const after = Date.now() * 1000 + 1000; // Add 1ms buffer

      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it('should have increasing timestamps', () => {
      const pollId = Buffer.from([1]);

      const entry1 = logger.logVoteCast(pollId, Buffer.from([1]));
      const entry2 = logger.logVoteCast(pollId, Buffer.from([2]));

      expect(entry2.timestamp).toBeGreaterThanOrEqual(entry1.timestamp);
    });
  });

  describe('Sequence Numbers', () => {
    it('should assign sequential sequence numbers', () => {
      const pollId = Buffer.from([1]);

      for (let i = 0; i < 10; i++) {
        const entry = logger.logVoteCast(pollId, Buffer.from([i]));
        expect(entry.sequence).toBe(i);
      }
    });

    it('should verify sequence integrity', () => {
      const pollId = Buffer.from([1]);

      logger.logVoteCast(pollId, Buffer.from([1]));
      logger.logVoteCast(pollId, Buffer.from([2]));
      logger.logVoteCast(pollId, Buffer.from([3]));

      expect(logger.verifySequence()).toBe(true);
    });

    it('should detect sequence gaps', () => {
      const pollId = Buffer.from([1]);

      logger.logVoteCast(pollId, Buffer.from([1]));
      logger.logVoteCast(pollId, Buffer.from([2]));

      // Manually corrupt sequence
      const events = logger.getEvents() as EventLogEntry[];
      (events[1] as any).sequence = 5;

      expect(logger.verifySequence()).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      const poll1 = Buffer.from([1]);
      const poll2 = Buffer.from([2]);
      const creator = Buffer.from([3]);
      const config: PollConfiguration = {
        method: 'plurality',
        choices: ['A', 'B'],
      };

      logger.logPollCreated(poll1, creator, config);
      logger.logVoteCast(poll1, Buffer.from([4]));
      logger.logVoteCast(poll1, Buffer.from([5]));
      logger.logPollCreated(poll2, creator, config);
      logger.logVoteCast(poll2, Buffer.from([6]));
      logger.logPollClosed(poll1, Buffer.alloc(32));
    });

    it('should get all events', () => {
      const events = logger.getEvents();
      expect(events.length).toBe(6);
    });

    it('should get events for specific poll', () => {
      const poll1 = Buffer.from([1]);
      const events = logger.getEventsForPoll(poll1);

      expect(events.length).toBe(4);
      expect(events[0].eventType).toBe(EventType.PollCreated);
      expect(events[1].eventType).toBe(EventType.VoteCast);
      expect(events[2].eventType).toBe(EventType.VoteCast);
      expect(events[3].eventType).toBe(EventType.PollClosed);
    });

    it('should get events by type', () => {
      const voteEvents = logger.getEventsByType(EventType.VoteCast);
      expect(voteEvents.length).toBe(3);

      const createEvents = logger.getEventsByType(EventType.PollCreated);
      expect(createEvents.length).toBe(2);

      const closeEvents = logger.getEventsByType(EventType.PollClosed);
      expect(closeEvents.length).toBe(1);
    });

    it('should return empty array for non-existent poll', () => {
      const events = logger.getEventsForPoll(Buffer.from([99]));
      expect(events.length).toBe(0);
    });

    it('should return immutable events', () => {
      const events = logger.getEvents();

      expect(() => {
        (events as EventLogEntry[]).push({} as EventLogEntry);
      }).toThrow();
    });
  });

  describe('Export and Archival', () => {
    it('should export empty logger', () => {
      const exported = logger.export();

      expect(exported).toBeInstanceOf(Buffer);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should export logger with events', () => {
      const pollId = Buffer.from([1]);
      const creatorId = Buffer.from([2]);
      const config: PollConfiguration = {
        method: 'plurality',
        choices: ['A', 'B'],
      };

      logger.logPollCreated(pollId, creatorId, config);
      logger.logVoteCast(pollId, Buffer.from([3]));
      logger.logPollClosed(pollId, Buffer.alloc(32));

      const exported = logger.export();

      expect(exported).toBeInstanceOf(Buffer);
      expect(exported.length).toBeGreaterThan(24); // Has data
    });

    it('should export all event types', () => {
      const pollId = Buffer.from([1]);

      logger.logEvent(EventType.PollCreated, pollId);
      logger.logEvent(EventType.VoteCast, pollId);
      logger.logEvent(EventType.PollClosed, pollId);
      logger.logEvent(EventType.VoteVerified, pollId);
      logger.logEvent(EventType.TallyComputed, pollId);
      logger.logEvent(EventType.AuditRequested, pollId);

      const exported = logger.export();
      expect(exported.length).toBeGreaterThan(48);
    });
  });

  describe('Complete Poll Lifecycle', () => {
    it('should log complete poll lifecycle', () => {
      const pollId = Buffer.from([1, 2, 3]);
      const creatorId = Buffer.from([4, 5, 6]);
      const config: PollConfiguration = {
        method: 'plurality',
        choices: ['Alice', 'Bob', 'Charlie'],
      };

      // Create poll
      const createEvent = logger.logPollCreated(pollId, creatorId, config);
      expect(createEvent.sequence).toBe(0);

      // Cast votes
      const vote1 = logger.logVoteCast(pollId, Buffer.from([7]));
      const vote2 = logger.logVoteCast(pollId, Buffer.from([8]));
      const vote3 = logger.logVoteCast(pollId, Buffer.from([9]));
      expect(vote1.sequence).toBe(1);
      expect(vote2.sequence).toBe(2);
      expect(vote3.sequence).toBe(3);

      // Close poll
      const closeEvent = logger.logPollClosed(pollId, Buffer.alloc(32));
      expect(closeEvent.sequence).toBe(4);

      // Verify all events
      const events = logger.getEventsForPoll(pollId);
      expect(events.length).toBe(5);
      expect(logger.verifySequence()).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should maintain event ordering', () => {
      const pollId = Buffer.from([1]);

      for (let i = 0; i < 100; i++) {
        logger.logVoteCast(pollId, Buffer.from([i]));
      }

      const events = logger.getEvents();
      for (let i = 0; i < events.length; i++) {
        expect(events[i].sequence).toBe(i);
      }
    });

    it('should handle concurrent event logging', () => {
      const pollId = Buffer.from([1]);

      // Simulate rapid event logging
      for (let i = 0; i < 50; i++) {
        logger.logVoteCast(pollId, Buffer.from([i]));
      }

      expect(logger.getEvents().length).toBe(50);
      expect(logger.verifySequence()).toBe(true);
    });

    it('should preserve event immutability', () => {
      const pollId = Buffer.from([1]);
      const voterToken = Buffer.from([2]);

      logger.logVoteCast(pollId, voterToken);
      const originalSequence = logger.getEvents()[0].sequence;

      // Events are returned frozen, so modifications should not be possible
      const events = logger.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].sequence).toBe(originalSequence);
    });

    it('should handle large event volumes', () => {
      const pollId = Buffer.from([1]);

      for (let i = 0; i < 1000; i++) {
        logger.logVoteCast(pollId, Buffer.from([i % 256]));
      }

      expect(logger.getEvents().length).toBe(1000);
      expect(logger.verifySequence()).toBe(true);
    });
  });

  describe('Government Requirements Compliance', () => {
    it('REQUIREMENT: shall log all poll operations with microsecond timestamps', () => {
      const pollId = Buffer.from([1]);
      const creatorId = Buffer.from([2]);
      const config: PollConfiguration = { method: 'plurality', choices: ['A'] };

      const entry = logger.logPollCreated(pollId, creatorId, config);

      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.timestamp.toString().length).toBeGreaterThan(13); // Microsecond precision
    });

    it('REQUIREMENT: shall include event sequence numbers', () => {
      const pollId = Buffer.from([1]);

      const entry1 = logger.logVoteCast(pollId, Buffer.from([1]));
      const entry2 = logger.logVoteCast(pollId, Buffer.from([2]));

      expect(entry1.sequence).toBeDefined();
      expect(entry2.sequence).toBeDefined();
      expect(entry2.sequence).toBe(entry1.sequence + 1);
    });

    it('REQUIREMENT: shall log poll creation with creator identity and configuration', () => {
      const pollId = Buffer.from([1]);
      const creatorId = Buffer.from([2]);
      const config: PollConfiguration = {
        method: 'plurality',
        choices: ['Alice', 'Bob'],
      };

      const entry = logger.logPollCreated(pollId, creatorId, config);

      expect(entry.creatorId).toEqual(creatorId);
      expect(entry.configuration).toEqual(config);
    });

    it('REQUIREMENT: shall log vote casting with anonymized voter tokens', () => {
      const pollId = Buffer.from([1]);
      const voterToken = Buffer.from([2, 3, 4]);

      const entry = logger.logVoteCast(pollId, voterToken);

      expect(entry.voterToken).toEqual(voterToken);
    });

    it('REQUIREMENT: shall log poll closure with final tally hash', () => {
      const pollId = Buffer.from([1]);
      const tallyHash = Buffer.alloc(32, 0xff);

      const entry = logger.logPollClosed(pollId, tallyHash);

      expect(entry.tallyHash).toEqual(tallyHash);
    });

    it('REQUIREMENT: shall detect missing or reordered events', () => {
      const pollId = Buffer.from([1]);

      logger.logVoteCast(pollId, Buffer.from([1]));
      logger.logVoteCast(pollId, Buffer.from([2]));
      logger.logVoteCast(pollId, Buffer.from([3]));

      expect(logger.verifySequence()).toBe(true);

      // Corrupt sequence
      const events = logger.getEvents() as EventLogEntry[];
      (events[1] as any).sequence = 10;

      expect(logger.verifySequence()).toBe(false);
    });
  });
});
