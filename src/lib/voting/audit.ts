/**
 * Immutable Audit Log for Government-Grade Voting
 * Node.js optimized - extends ecies-lib ImmutableAuditLog with Buffer support
 */
import {
  ImmutableAuditLog as BaseImmutableAuditLog,
  type IMember as BaseIMember,
} from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';

import type { AuditEntry } from './interfaces';

// Re-export types and interfaces from the interfaces directory
export type { AuditEntry, AuditLog } from './interfaces';

/**
 * Converts Uint8Array fields in an audit entry to Buffer
 */
function convertAuditEntryToBuffer<TID extends PlatformID>(
  entry: AuditEntry<TID>,
): AuditEntry<TID> {
  return {
    ...entry,
    previousHash:
      entry.previousHash instanceof Uint8Array &&
      !(entry.previousHash instanceof Buffer)
        ? Buffer.from(entry.previousHash)
        : entry.previousHash,
    entryHash:
      entry.entryHash instanceof Uint8Array &&
      !(entry.entryHash instanceof Buffer)
        ? Buffer.from(entry.entryHash)
        : entry.entryHash,
    signature:
      entry.signature instanceof Uint8Array &&
      !(entry.signature instanceof Buffer)
        ? Buffer.from(entry.signature)
        : entry.signature,
    voterIdHash:
      entry.voterIdHash instanceof Uint8Array &&
      !(entry.voterIdHash instanceof Buffer)
        ? Buffer.from(entry.voterIdHash)
        : entry.voterIdHash,
  } as AuditEntry<TID>;
}

/**
 * Node.js ImmutableAuditLog that extends ecies-lib ImmutableAuditLog
 * Keeps the generic TID parameter for flexibility, defaulting to Buffer
 *
 * The base class handles all the logic, we override methods to convert
 * Uint8Array to Buffer for Node.js compatibility.
 */
export class ImmutableAuditLog<
  TID extends PlatformID = Buffer,
> extends BaseImmutableAuditLog<TID> {
  constructor(authority: IMember<TID>) {
    // Create an adapter that bridges the Buffer-based Member with Uint8Array-based ecies-lib
    const authorityAdapter: BaseIMember<TID, Uint8Array> = {
      ...authority,
      // Convert the sign method from Buffer-based to Uint8Array-based
      sign: (data: Uint8Array): Uint8Array => {
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const signature = authority.sign(bufferData);
        return signature instanceof Uint8Array
          ? signature
          : new Uint8Array(signature);
      },
      // Convert the verify method from Buffer-based to Uint8Array-based
      verify: (signature: Uint8Array, data: Uint8Array): boolean => {
        const bufferSignature = Buffer.isBuffer(signature)
          ? signature
          : Buffer.from(signature);
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        // Type assertion is safe here as we know SignatureBuffer extends Buffer
        return authority.verify(
          bufferSignature as import('../../node_ecies_types').SignatureBuffer,
          bufferData,
        );
      },
      // Ensure publicKey is Uint8Array
      publicKey:
        authority.publicKey instanceof Uint8Array
          ? authority.publicKey
          : new Uint8Array(authority.publicKey),
      // Ensure idBytes is Uint8Array
      idBytes:
        authority.idBytes instanceof Uint8Array
          ? authority.idBytes
          : new Uint8Array(authority.idBytes),
      // Type assertions are safe here as the methods won't be used in audit log context
      // and the underlying implementations are compatible
      encryptDataStream: authority.encryptDataStream as BaseIMember<
        TID,
        Uint8Array
      >['encryptDataStream'],
      decryptDataStream: authority.decryptDataStream as BaseIMember<
        TID,
        Uint8Array
      >['decryptDataStream'],
      // Cast the encrypt/decrypt methods to handle the sync/async differences
      encryptData: authority.encryptData as BaseIMember<
        TID,
        Uint8Array
      >['encryptData'],
      decryptData: authority.decryptData as BaseIMember<
        TID,
        Uint8Array
      >['decryptData'],
    };

    super(authorityAdapter);
  }

  /**
   * Record poll creation event
   * Overrides base method to convert Uint8Array to Buffer
   */
  recordPollCreated(
    pollId: TID,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    const entry = super.recordPollCreated(pollId, metadata);
    return convertAuditEntryToBuffer(entry);
  }

  /**
   * Record vote cast event
   * Overrides base method to convert Uint8Array to Buffer
   * Note: voterIdHash is Uint8Array for compatibility with base class
   */
  recordVoteCast(
    pollId: TID,
    voterIdHash: Uint8Array,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    const entry = super.recordVoteCast(pollId, voterIdHash, metadata);
    return convertAuditEntryToBuffer(entry);
  }

  /**
   * Record poll closed event
   * Overrides base method to convert Uint8Array to Buffer
   */
  recordPollClosed(
    pollId: TID,
    metadata?: Record<string, unknown>,
  ): AuditEntry<TID> {
    const entry = super.recordPollClosed(pollId, metadata);
    return convertAuditEntryToBuffer(entry);
  }

  /**
   * Get all audit entries
   * Overrides base method to convert Uint8Array to Buffer
   */
  getEntries(): ReadonlyArray<AuditEntry<TID>> {
    const entries = super.getEntries();
    return entries.map((entry) => convertAuditEntryToBuffer(entry));
  }

  /**
   * Get entries for a specific poll
   * Overrides base method to convert Uint8Array to Buffer
   */
  getEntriesForPoll(pollId: TID): ReadonlyArray<AuditEntry<TID>> {
    const entries = super.getEntriesForPoll(pollId);
    return entries.map((entry) => convertAuditEntryToBuffer(entry));
  }
}
