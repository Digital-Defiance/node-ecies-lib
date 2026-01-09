/**
 * Public Bulletin Board for Government-Grade Voting
 * Node.js optimized - extends ecies-lib PublicBulletinBoard with Buffer support
 * Implements requirement 1.2: Append-only, publicly verifiable vote publication
 */
import {
  PublicBulletinBoard as BasePublicBulletinBoard,
  type IMember as BaseIMember,
} from '@digitaldefiance/ecies-lib';

import type { IMember } from '../../interfaces/member';

import type { BulletinBoardEntry, TallyProof } from './interfaces';

// Re-export types and interfaces from the interfaces directory
export type {
  BulletinBoardEntry,
  TallyProof,
  BulletinBoard,
} from './interfaces';

/**
 * Node.js PublicBulletinBoard that extends ecies-lib PublicBulletinBoard
 * Uses Buffer for binary data instead of Uint8Array
 *
 * The base class handles all the logic, we just provide Node.js-specific defaults
 * and ensure Buffer is used by default instead of Uint8Array.
 */
export class PublicBulletinBoard extends BasePublicBulletinBoard {
  constructor(authority: IMember<Buffer>) {
    // Cast to the ecies-lib IMember type which has a different signature
    // The node-ecies-lib IMember is compatible but has a different signature
    super(authority as unknown as BaseIMember<Buffer, Uint8Array>);
  }

  /**
   * Override publishVote to ensure Buffer types are returned
   */
  publishVote(
    pollId: Buffer,
    encryptedVote: bigint[],
    voterIdHash: Buffer,
  ): BulletinBoardEntry<Buffer> {
    // Convert Buffer arguments to Uint8Array for parent class
    const entry = super.publishVote(
      new Uint8Array(pollId),
      encryptedVote,
      new Uint8Array(voterIdHash),
    );

    // Convert Uint8Array fields to Buffer
    return {
      ...entry,
      pollId: Buffer.from(entry.pollId),
      voterIdHash: Buffer.from(entry.voterIdHash),
      entryHash: Buffer.from(entry.entryHash),
      signature: Buffer.from(entry.signature),
      merkleRoot: Buffer.from(entry.merkleRoot),
    };
  }

  /**
   * Override publishTally to ensure Buffer types are returned
   */
  publishTally(
    pollId: Buffer,
    tallies: bigint[],
    choices: string[],
    encryptedVotes: bigint[][],
  ): TallyProof<Buffer> {
    // Convert Buffer argument to Uint8Array for parent class
    const proof = super.publishTally(
      new Uint8Array(pollId),
      tallies,
      choices,
      encryptedVotes,
    );

    // Convert Uint8Array fields to Buffer
    return {
      ...proof,
      pollId: Buffer.from(proof.pollId),
      votesHash: Buffer.from(proof.votesHash),
      decryptionProof: Buffer.from(proof.decryptionProof),
      signature: Buffer.from(proof.signature),
    };
  }

  /**
   * Override getEntries to ensure Buffer types are returned and array is immutable
   */
  getEntries(pollId: Buffer): readonly BulletinBoardEntry<Buffer>[] {
    // Convert Buffer argument to Uint8Array for parent class
    const entries = super.getEntries(new Uint8Array(pollId));
    const bufferEntries = entries.map((entry) => ({
      ...entry,
      pollId: Buffer.from(entry.pollId),
      voterIdHash: Buffer.from(entry.voterIdHash),
      entryHash: Buffer.from(entry.entryHash),
      signature: Buffer.from(entry.signature),
      merkleRoot: Buffer.from(entry.merkleRoot),
    }));
    return Object.freeze(bufferEntries);
  }

  /**
   * Override getAllEntries to ensure Buffer types are returned and array is immutable
   */
  getAllEntries(): readonly BulletinBoardEntry<Buffer>[] {
    const entries = super.getAllEntries();
    const bufferEntries = entries.map((entry) => ({
      ...entry,
      pollId: Buffer.from(entry.pollId),
      voterIdHash: Buffer.from(entry.voterIdHash),
      entryHash: Buffer.from(entry.entryHash),
      signature: Buffer.from(entry.signature),
      merkleRoot: Buffer.from(entry.merkleRoot),
    }));
    return Object.freeze(bufferEntries);
  }

  /**
   * Override getTallyProof to ensure Buffer types are returned
   */
  getTallyProof(pollId: Buffer): TallyProof<Buffer> | undefined {
    // Convert Buffer argument to Uint8Array for parent class
    const proof = super.getTallyProof(new Uint8Array(pollId));
    if (!proof) return undefined;

    return {
      ...proof,
      pollId: Buffer.from(proof.pollId),
      votesHash: Buffer.from(proof.votesHash),
      decryptionProof: Buffer.from(proof.decryptionProof),
      signature: Buffer.from(proof.signature),
    };
  }

  /**
   * Override export method to return Buffer instead of Uint8Array
   */
  export(): Buffer {
    const exported = super.export();
    return Buffer.from(exported);
  }

  /**
   * Get all votes published to the bulletin board
   * Returns the encrypted votes for verification
   */
  getVotes(): readonly {
    pollId: Buffer;
    encryptedVote: bigint[];
    voterIdHash: Buffer;
  }[] {
    const entries = this.getAllEntries();
    return entries.map((entry) => ({
      pollId: entry.pollId,
      encryptedVote: entry.encryptedVote,
      voterIdHash: Buffer.from(entry.voterIdHash), // Convert Uint8Array to Buffer
    }));
  }
}
