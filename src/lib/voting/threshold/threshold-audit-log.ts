/**
 * Threshold Audit Log - Node.js Optimized
 *
 * Extends ecies-lib ThresholdAuditLog with Buffer support,
 * converting Uint8Array fields (previousHash, entryHash, signature)
 * to Buffer in returned entries.
 *
 * @module voting/threshold
 */

import {
  ThresholdAuditLog as BaseThresholdAuditLog,
  type IMember as BaseIMember,
  ThresholdAuditEntry,
} from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';
import type { IMember } from '../../../interfaces/member';
import type { SignatureBuffer } from '../../../node_ecies_types';

/**
 * Convert Uint8Array fields in a ThresholdAuditEntry to Buffer.
 */
function convertEntryToBuffer<TID extends PlatformID>(
  entry: ThresholdAuditEntry<TID>,
): ThresholdAuditEntry<TID> {
  return {
    ...entry,
    previousHash:
      entry.previousHash instanceof Buffer
        ? entry.previousHash
        : Buffer.from(entry.previousHash),
    entryHash:
      entry.entryHash instanceof Buffer
        ? entry.entryHash
        : Buffer.from(entry.entryHash),
    signature:
      entry.signature instanceof Buffer
        ? entry.signature
        : Buffer.from(entry.signature),
  };
}

/**
 * Node.js ThresholdAuditLog that extends ecies-lib ThresholdAuditLog.
 *
 * Overrides methods to convert Uint8Array fields to Buffer in returned entries,
 * following the same pattern as the node-ecies-lib ImmutableAuditLog.
 */
export class ThresholdAuditLog<
  TID extends PlatformID = Buffer,
> extends BaseThresholdAuditLog<TID> {
  constructor(authority: IMember<TID>) {
    const authorityAdapter: BaseIMember<TID, Uint8Array> = {
      ...authority,
      sign: (data: Uint8Array): Uint8Array => {
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const signature = authority.sign(bufferData);
        return signature instanceof Uint8Array
          ? signature
          : new Uint8Array(signature);
      },
      verify: (signature: Uint8Array, data: Uint8Array): boolean => {
        const bufferSignature = Buffer.isBuffer(signature)
          ? signature
          : Buffer.from(signature);
        const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return authority.verify(bufferSignature as SignatureBuffer, bufferData);
      },
      publicKey:
        authority.publicKey instanceof Uint8Array
          ? authority.publicKey
          : new Uint8Array(authority.publicKey),
      idBytes:
        authority.idBytes instanceof Uint8Array
          ? authority.idBytes
          : new Uint8Array(authority.idBytes),
      encryptDataStream: authority.encryptDataStream as BaseIMember<
        TID,
        Uint8Array
      >['encryptDataStream'],
      decryptDataStream: authority.decryptDataStream as BaseIMember<
        TID,
        Uint8Array
      >['decryptDataStream'],
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

  recordKeyGeneration(
    pollId: TID,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(super.recordKeyGeneration(pollId, metadata));
  }

  recordKeyShareDistribution(
    pollId: TID,
    guardianId: TID,
    guardianIndex: number,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(
      super.recordKeyShareDistribution(
        pollId,
        guardianId,
        guardianIndex,
        metadata,
      ),
    );
  }

  recordCeremonyStarted(
    pollId: TID,
    ceremonyId: string,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(
      super.recordCeremonyStarted(pollId, ceremonyId, metadata),
    );
  }

  recordPartialSubmitted(
    pollId: TID,
    ceremonyId: string,
    guardianId: TID,
    guardianIndex: number,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(
      super.recordPartialSubmitted(
        pollId,
        ceremonyId,
        guardianId,
        guardianIndex,
        metadata,
      ),
    );
  }

  recordCeremonyCompleted(
    pollId: TID,
    ceremonyId: string,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(
      super.recordCeremonyCompleted(pollId, ceremonyId, metadata),
    );
  }

  recordTallyPublished(
    pollId: TID,
    metadata: Record<string, string | number | boolean>,
  ): ThresholdAuditEntry<TID> {
    return convertEntryToBuffer(super.recordTallyPublished(pollId, metadata));
  }

  getEntries(): readonly ThresholdAuditEntry<TID>[] {
    return super.getEntries().map((entry) => convertEntryToBuffer(entry));
  }

  getEntriesForPoll(pollId: TID): readonly ThresholdAuditEntry<TID>[] {
    return super
      .getEntriesForPoll(pollId)
      .map((entry) => convertEntryToBuffer(entry));
  }

  getEntriesForCeremony(
    ceremonyId: string,
  ): readonly ThresholdAuditEntry<TID>[] {
    return super
      .getEntriesForCeremony(ceremonyId)
      .map((entry) => convertEntryToBuffer(entry));
  }
}
