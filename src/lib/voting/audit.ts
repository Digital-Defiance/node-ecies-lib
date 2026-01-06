/**
 * Immutable Audit Log for Government-Grade Voting
 * Node.js optimized with native crypto
 */
import { createHash } from 'crypto';

import type { IMember } from '../../interfaces/member';
import type { PlatformID } from '../../interfaces';
import type { SignatureBuffer } from '../../types';

export enum AuditEventType {
  PollCreated = 'poll_created',
  VoteCast = 'vote_cast',
  PollClosed = 'poll_closed',
}

export interface AuditEntry<TID extends PlatformID = Buffer> {
  /** Sequence number (monotonically increasing) */
  readonly sequence: number;
  /** Event type */
  readonly eventType: AuditEventType;
  /** Microsecond-precision timestamp */
  readonly timestamp: number;
  /** Poll identifier */
  readonly pollId: TID;
  /** Hash of voter ID (for vote events) */
  readonly voterIdHash?: Buffer;
  /** Authority/creator ID (for creation/closure events) */
  readonly authorityId?: TID;
  /** Hash of previous entry (chain integrity) */
  readonly previousHash: Buffer;
  /** Hash of this entry's data */
  readonly entryHash: Buffer;
  /** Digital signature from authority */
  readonly signature: Buffer;
  /** Additional event metadata */
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLog<TID extends PlatformID = Buffer> {
  getEntries(): readonly AuditEntry<TID>[];
  getEntriesForPoll(pollId: TID): readonly AuditEntry<TID>[];
  verifyChain(): boolean;
  verifyEntry(entry: AuditEntry<TID>): boolean;
}

export class ImmutableAuditLog<TID extends PlatformID = Buffer> implements AuditLog<TID> {
  private readonly entries: AuditEntry<TID>[] = [];
  private readonly authority: IMember<TID>;
  private sequence = 0;

  constructor(authority: IMember<TID>) {
    this.authority = authority;
  }

  recordPollCreated(
    pollId: TID,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    return this.appendEntry({
      eventType: AuditEventType.PollCreated,
      pollId,
      authorityId: this.authority.id,
      metadata,
    });
  }

  recordVoteCast(
    pollId: TID,
    voterIdHash: Buffer,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    return this.appendEntry({
      eventType: AuditEventType.VoteCast,
      pollId,
      voterIdHash,
      metadata,
    });
  }

  recordPollClosed(
    pollId: TID,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    return this.appendEntry({
      eventType: AuditEventType.PollClosed,
      pollId,
      authorityId: this.authority.id,
      metadata,
    });
  }

  getEntries(): readonly AuditEntry<TID>[] {
    return Object.freeze([...this.entries]);
  }

  getEntriesForPoll(pollId: TID): readonly AuditEntry<TID>[] {
    const pollIdStr = Buffer.from(pollId as Buffer).toString('hex');
    return Object.freeze(
      this.entries.filter((e) => Buffer.from(e.pollId as Buffer).toString('hex') === pollIdStr),
    );
  }

  verifyChain(): boolean {
    if (this.entries.length === 0) return true;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const computedHash = this.computeEntryHash(entry);
      if (!computedHash.equals(entry.entryHash)) return false;
      if (!this.verifyEntry(entry)) return false;
      if (i > 0) {
        const prevEntry = this.entries[i - 1];
        if (!entry.previousHash.equals(prevEntry.entryHash)) return false;
      }
    }
    return true;
  }

  verifyEntry(entry: AuditEntry<TID>): boolean {
    const data = this.serializeEntryForSigning(entry);
    return this.authority.verify(
      entry.signature as unknown as SignatureBuffer,
      data,
    );
  }

  private appendEntry(
    partial: Omit<
      AuditEntry<TID>,
      'sequence' | 'timestamp' | 'previousHash' | 'entryHash' | 'signature'
    >,
  ): AuditEntry<TID> {
    const previousHash =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].entryHash
        : Buffer.alloc(32);
    const entry: Omit<AuditEntry<TID>, 'entryHash' | 'signature'> = {
      sequence: this.sequence++,
      timestamp: this.getMicrosecondTimestamp(),
      previousHash,
      ...partial,
    };
    const entryHash = this.computeEntryHash(entry);
    const data = this.serializeEntryForSigning({ ...entry, entryHash });
    const signature = this.authority.sign(data);
    const finalEntry: AuditEntry<TID> = { ...entry, entryHash, signature };
    this.entries.push(finalEntry);
    return finalEntry;
  }

  private computeEntryHash(
    entry: Omit<AuditEntry<TID>, 'entryHash' | 'signature'>,
  ): Buffer {
    const data = this.serializeEntryForHashing(entry);
    return createHash('sha256').update(data).digest();
  }

  private serializeEntryForHashing(
    entry: Omit<AuditEntry<TID>, 'entryHash' | 'signature'>,
  ): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(entry.sequence),
      Buffer.from(entry.eventType, 'utf8'),
      this.encodeNumber(entry.timestamp),
      Buffer.from(entry.pollId as Buffer),
      entry.previousHash,
    ];
    if (entry.voterIdHash) parts.push(entry.voterIdHash);
    if (entry.authorityId) parts.push(Buffer.from(entry.authorityId as Buffer));
    if (entry.metadata)
      parts.push(Buffer.from(JSON.stringify(entry.metadata), 'utf8'));
    return Buffer.concat(parts);
  }

  private serializeEntryForSigning(
    entry: Omit<AuditEntry<TID>, 'signature'>,
  ): Buffer {
    return Buffer.concat([
      this.serializeEntryForHashing(entry),
      entry.entryHash,
    ]);
  }

  private getMicrosecondTimestamp(): number {
    // Get milliseconds since epoch and convert to microseconds
    // performance.now() is relative to process start, not epoch, so we only use Date.now()
    const now = Date.now();
    return now * 1000;
  }

  private encodeNumber(n: number): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(n));
    return buf;
  }
}
