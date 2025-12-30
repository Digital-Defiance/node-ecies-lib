/**
 * Immutable Audit Log for Government-Grade Voting
 * Node.js optimized with native crypto
 */
import { createHash } from 'crypto';

import type { IMember } from '../../interfaces/member';
import type { SignatureBuffer } from '../../types';

export enum AuditEventType {
  PollCreated = 'poll_created',
  VoteCast = 'vote_cast',
  PollClosed = 'poll_closed',
}

export interface AuditEntry {
  readonly sequence: number;
  readonly eventType: AuditEventType;
  readonly timestamp: number;
  readonly pollId: Buffer;
  readonly voterIdHash?: Buffer;
  readonly authorityId?: Buffer;
  readonly previousHash: Buffer;
  readonly entryHash: Buffer;
  readonly signature: Buffer;
  readonly metadata?: Record<string, unknown>;
}

export interface AuditLog {
  getEntries(): readonly AuditEntry[];
  getEntriesForPoll(pollId: Buffer): readonly AuditEntry[];
  verifyChain(): boolean;
  verifyEntry(entry: AuditEntry): boolean;
}

export class ImmutableAuditLog implements AuditLog {
  private readonly entries: AuditEntry[] = [];
  private readonly authority: IMember;
  private sequence = 0;

  constructor(authority: IMember) {
    this.authority = authority;
  }

  recordPollCreated(
    pollId: Buffer,
    metadata?: Record<string, unknown>,
  ): AuditEntry {
    return this.appendEntry({
      eventType: AuditEventType.PollCreated,
      pollId,
      authorityId: this.authority.id,
      metadata,
    });
  }

  recordVoteCast(
    pollId: Buffer,
    voterIdHash: Buffer,
    metadata?: Record<string, unknown>,
  ): AuditEntry {
    return this.appendEntry({
      eventType: AuditEventType.VoteCast,
      pollId,
      voterIdHash,
      metadata,
    });
  }

  recordPollClosed(
    pollId: Buffer,
    metadata?: Record<string, unknown>,
  ): AuditEntry {
    return this.appendEntry({
      eventType: AuditEventType.PollClosed,
      pollId,
      authorityId: this.authority.id,
      metadata,
    });
  }

  getEntries(): readonly AuditEntry[] {
    return Object.freeze([...this.entries]);
  }

  getEntriesForPoll(pollId: Buffer): readonly AuditEntry[] {
    const pollIdStr = pollId.toString('hex');
    return Object.freeze(
      this.entries.filter((e) => e.pollId.toString('hex') === pollIdStr),
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

  verifyEntry(entry: AuditEntry): boolean {
    const data = this.serializeEntryForSigning(entry);
    return this.authority.verify(
      entry.signature as unknown as SignatureBuffer,
      data,
    );
  }

  private appendEntry(
    partial: Omit<
      AuditEntry,
      'sequence' | 'timestamp' | 'previousHash' | 'entryHash' | 'signature'
    >,
  ): AuditEntry {
    const previousHash =
      this.entries.length > 0
        ? this.entries[this.entries.length - 1].entryHash
        : Buffer.alloc(32);
    const entry: Omit<AuditEntry, 'entryHash' | 'signature'> = {
      sequence: this.sequence++,
      timestamp: this.getMicrosecondTimestamp(),
      previousHash,
      ...partial,
    };
    const entryHash = this.computeEntryHash(entry);
    const data = this.serializeEntryForSigning({ ...entry, entryHash });
    const signature = this.authority.sign(data);
    const finalEntry: AuditEntry = { ...entry, entryHash, signature };
    this.entries.push(finalEntry);
    return finalEntry;
  }

  private computeEntryHash(
    entry: Omit<AuditEntry, 'entryHash' | 'signature'>,
  ): Buffer {
    const data = this.serializeEntryForHashing(entry);
    return createHash('sha256').update(data).digest();
  }

  private serializeEntryForHashing(
    entry: Omit<AuditEntry, 'entryHash' | 'signature'>,
  ): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(entry.sequence),
      Buffer.from(entry.eventType, 'utf8'),
      this.encodeNumber(entry.timestamp),
      entry.pollId,
      entry.previousHash,
    ];
    if (entry.voterIdHash) parts.push(entry.voterIdHash);
    if (entry.authorityId) parts.push(entry.authorityId);
    if (entry.metadata)
      parts.push(Buffer.from(JSON.stringify(entry.metadata), 'utf8'));
    return Buffer.concat(parts);
  }

  private serializeEntryForSigning(
    entry: Omit<AuditEntry, 'signature'>,
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
