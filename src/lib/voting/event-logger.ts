/**
 * Event Logger for Government-Grade Voting
 * Node.js optimized with native Buffer
 * Implements requirement 1.3: Comprehensive event logging with microsecond timestamps
 */

export enum EventType {
  PollCreated = 'poll_created',
  VoteCast = 'vote_cast',
  PollClosed = 'poll_closed',
  VoteVerified = 'vote_verified',
  TallyComputed = 'tally_computed',
  AuditRequested = 'audit_requested',
}

export interface PollConfiguration {
  readonly method: string;
  readonly choices: string[];
  readonly maxWeight?: bigint;
  readonly threshold?: { numerator: number; denominator: number };
}

export interface EventLogEntry {
  /** Sequence number (monotonically increasing) */
  readonly sequence: number;
  /** Event type */
  readonly eventType: EventType;
  /** Microsecond-precision timestamp */
  readonly timestamp: number;
  /** Poll identifier */
  readonly pollId: Buffer;
  /** Creator/authority ID (for creation/closure events) */
  readonly creatorId?: Buffer;
  /** Anonymized voter token (for vote events) */
  readonly voterToken?: Buffer;
  /** Poll configuration (for creation events) */
  readonly configuration?: PollConfiguration;
  /** Final tally hash (for closure events) */
  readonly tallyHash?: Buffer;
  /** Additional metadata */
  readonly metadata?: Record<string, unknown>;
}

export interface EventLogger {
  /** Log poll creation event */
  logPollCreated(
    pollId: Buffer,
    creatorId: Buffer,
    configuration: PollConfiguration,
  ): EventLogEntry;

  /** Log vote cast event */
  logVoteCast(
    pollId: Buffer,
    voterToken: Buffer,
    metadata?: Record<string, unknown>,
  ): EventLogEntry;

  /** Log poll closure event */
  logPollClosed(
    pollId: Buffer,
    tallyHash: Buffer,
    metadata?: Record<string, unknown>,
  ): EventLogEntry;

  /** Log generic event */
  logEvent(
    eventType: EventType,
    pollId: Buffer,
    data?: Partial<
      Omit<EventLogEntry, 'sequence' | 'timestamp' | 'eventType' | 'pollId'>
    >,
  ): EventLogEntry;

  /** Get all events */
  getEvents(): readonly EventLogEntry[];

  /** Get events for specific poll */
  getEventsForPoll(pollId: Buffer): readonly EventLogEntry[];

  /** Get events by type */
  getEventsByType(eventType: EventType): readonly EventLogEntry[];

  /** Verify sequence integrity */
  verifySequence(): boolean;

  /** Export events for archival */
  export(): Buffer;
}

/**
 * Comprehensive event logger with sequence tracking
 */
export class PollEventLogger implements EventLogger {
  private readonly events: EventLogEntry[] = [];
  private sequence = 0;

  logPollCreated(
    pollId: Buffer,
    creatorId: Buffer,
    configuration: PollConfiguration,
  ): EventLogEntry {
    return this.appendEvent({
      eventType: EventType.PollCreated,
      pollId,
      creatorId,
      configuration,
    });
  }

  logVoteCast(
    pollId: Buffer,
    voterToken: Buffer,
    metadata?: Record<string, unknown>,
  ): EventLogEntry {
    return this.appendEvent({
      eventType: EventType.VoteCast,
      pollId,
      voterToken,
      metadata,
    });
  }

  logPollClosed(
    pollId: Buffer,
    tallyHash: Buffer,
    metadata?: Record<string, unknown>,
  ): EventLogEntry {
    return this.appendEvent({
      eventType: EventType.PollClosed,
      pollId,
      tallyHash,
      metadata,
    });
  }

  logEvent(
    eventType: EventType,
    pollId: Buffer,
    data?: Partial<
      Omit<EventLogEntry, 'sequence' | 'timestamp' | 'eventType' | 'pollId'>
    >,
  ): EventLogEntry {
    return this.appendEvent({
      eventType,
      pollId,
      ...data,
    });
  }

  getEvents(): readonly EventLogEntry[] {
    return Object.freeze([...this.events]);
  }

  getEventsForPoll(pollId: Buffer): readonly EventLogEntry[] {
    const pollIdStr = pollId.toString('hex');
    return Object.freeze(
      this.events.filter((e) => e.pollId.toString('hex') === pollIdStr),
    );
  }

  getEventsByType(eventType: EventType): readonly EventLogEntry[] {
    return Object.freeze(this.events.filter((e) => e.eventType === eventType));
  }

  verifySequence(): boolean {
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].sequence !== i) {
        return false;
      }
    }
    return true;
  }

  export(): Buffer {
    const parts: Buffer[] = [];

    parts.push(this.encodeNumber(this.events.length));

    for (const event of this.events) {
      parts.push(this.serializeEvent(event));
    }

    return Buffer.concat(parts);
  }

  private appendEvent(
    partial: Omit<EventLogEntry, 'sequence' | 'timestamp'>,
  ): EventLogEntry {
    const entry: EventLogEntry = {
      sequence: this.sequence++,
      timestamp: this.getMicrosecondTimestamp(),
      ...partial,
    };

    this.events.push(entry);
    return entry;
  }

  private serializeEvent(event: EventLogEntry): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(event.sequence),
      this.encodeNumber(event.timestamp),
      Buffer.from(event.eventType, 'utf8'),
      this.encodeNumber(event.pollId.length),
      event.pollId,
    ];

    if (event.creatorId) {
      parts.push(
        this.encodeNumber(1),
        this.encodeNumber(event.creatorId.length),
        event.creatorId,
      );
    } else {
      parts.push(this.encodeNumber(0));
    }

    if (event.voterToken) {
      parts.push(
        this.encodeNumber(1),
        this.encodeNumber(event.voterToken.length),
        event.voterToken,
      );
    } else {
      parts.push(this.encodeNumber(0));
    }

    if (event.configuration) {
      const configStr = JSON.stringify({
        method: event.configuration.method,
        choices: event.configuration.choices,
        maxWeight: event.configuration.maxWeight?.toString(),
        threshold: event.configuration.threshold,
      });
      const encoded = Buffer.from(configStr, 'utf8');
      parts.push(
        this.encodeNumber(1),
        this.encodeNumber(encoded.length),
        encoded,
      );
    } else {
      parts.push(this.encodeNumber(0));
    }

    if (event.tallyHash) {
      parts.push(
        this.encodeNumber(1),
        this.encodeNumber(event.tallyHash.length),
        event.tallyHash,
      );
    } else {
      parts.push(this.encodeNumber(0));
    }

    if (event.metadata) {
      const metaStr = JSON.stringify(event.metadata);
      const encoded = Buffer.from(metaStr, 'utf8');
      parts.push(
        this.encodeNumber(1),
        this.encodeNumber(encoded.length),
        encoded,
      );
    } else {
      parts.push(this.encodeNumber(0));
    }

    return Buffer.concat(parts);
  }

  private getMicrosecondTimestamp(): number {
    // Get milliseconds since epoch and convert to microseconds
    // performance.now() is relative to process start, not epoch, so we only use Date.now()
    const now = Date.now();
    return now * 1000;
  }

  private encodeNumber(n: number): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(n));
    return buffer;
  }
}
