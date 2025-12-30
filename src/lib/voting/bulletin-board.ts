/**
 * Public Bulletin Board for Government-Grade Voting
 * Node.js optimized with native crypto
 * Implements requirement 1.2: Append-only, publicly verifiable vote publication
 */
import { createHash } from 'crypto';

import type { IMember } from '../../interfaces/member';
import type { SignatureBuffer } from '../../types';

export interface BulletinBoardEntry {
  /** Sequence number (monotonically increasing) */
  readonly sequence: number;
  /** Microsecond-precision timestamp */
  readonly timestamp: number;
  /** Poll identifier */
  readonly pollId: Buffer;
  /** Encrypted vote data */
  readonly encryptedVote: bigint[];
  /** Hash of voter ID (anonymized) */
  readonly voterIdHash: Buffer;
  /** Merkle root of all entries up to this point */
  readonly merkleRoot: Buffer;
  /** Hash of this entry */
  readonly entryHash: Buffer;
  /** Authority signature */
  readonly signature: Buffer;
}

export interface TallyProof {
  /** Poll identifier */
  readonly pollId: Buffer;
  /** Final tallies */
  readonly tallies: bigint[];
  /** Choice names */
  readonly choices: string[];
  /** Timestamp of tally */
  readonly timestamp: number;
  /** Hash of all encrypted votes */
  readonly votesHash: Buffer;
  /** Cryptographic proof of correct decryption */
  readonly decryptionProof: Buffer;
  /** Authority signature */
  readonly signature: Buffer;
}

export interface BulletinBoard {
  /** Publish encrypted vote to bulletin board */
  publishVote(
    pollId: Buffer,
    encryptedVote: bigint[],
    voterIdHash: Buffer,
  ): BulletinBoardEntry;

  /** Publish tally with cryptographic proof */
  publishTally(
    pollId: Buffer,
    tallies: bigint[],
    choices: string[],
    encryptedVotes: bigint[][],
  ): TallyProof;

  /** Get all entries for a poll */
  getEntries(pollId: Buffer): readonly BulletinBoardEntry[];

  /** Get all entries (entire bulletin board) */
  getAllEntries(): readonly BulletinBoardEntry[];

  /** Get tally proof for a poll */
  getTallyProof(pollId: Buffer): TallyProof | undefined;

  /** Verify entry signature and hash */
  verifyEntry(entry: BulletinBoardEntry): boolean;

  /** Verify tally proof */
  verifyTallyProof(proof: TallyProof): boolean;

  /** Verify Merkle tree integrity */
  verifyMerkleTree(): boolean;

  /** Export complete bulletin board for archival */
  export(): Buffer;
}

/**
 * Append-only public bulletin board with cryptographic verification
 */
export class PublicBulletinBoard implements BulletinBoard {
  private readonly entries: BulletinBoardEntry[] = [];
  private readonly tallyProofs = new Map<string, TallyProof>();
  private readonly authority: IMember;
  private sequence = 0;

  constructor(authority: IMember) {
    this.authority = authority;
  }

  publishVote(
    pollId: Buffer,
    encryptedVote: bigint[],
    voterIdHash: Buffer,
  ): BulletinBoardEntry {
    const timestamp = this.getMicrosecondTimestamp();
    const merkleRoot = this.computeMerkleRoot([...this.entries]);

    const entryData = this.serializeEntryData({
      sequence: this.sequence,
      timestamp,
      pollId,
      encryptedVote,
      voterIdHash,
      merkleRoot,
    });

    const entryHash = this.sha256(entryData);
    const signature = this.authority.sign(entryHash);

    const entry: BulletinBoardEntry = {
      sequence: this.sequence++,
      timestamp,
      pollId,
      encryptedVote,
      voterIdHash,
      merkleRoot,
      entryHash,
      signature,
    };

    this.entries.push(entry);
    return entry;
  }

  publishTally(
    pollId: Buffer,
    tallies: bigint[],
    choices: string[],
    encryptedVotes: bigint[][],
  ): TallyProof {
    const timestamp = this.getMicrosecondTimestamp();
    const votesHash = this.hashEncryptedVotes(encryptedVotes);
    const decryptionProof = this.generateDecryptionProof(
      encryptedVotes,
      tallies,
    );

    const proofData = this.serializeTallyProof({
      pollId,
      tallies,
      choices,
      timestamp,
      votesHash,
      decryptionProof,
    });

    const signature = this.authority.sign(proofData);

    const proof: TallyProof = {
      pollId,
      tallies,
      choices,
      timestamp,
      votesHash,
      decryptionProof,
      signature,
    };

    this.tallyProofs.set(pollId.toString('hex'), proof);
    return proof;
  }

  getEntries(pollId: Buffer): readonly BulletinBoardEntry[] {
    const pollIdStr = pollId.toString('hex');
    return Object.freeze(
      this.entries.filter((e) => e.pollId.toString('hex') === pollIdStr),
    );
  }

  getAllEntries(): readonly BulletinBoardEntry[] {
    return Object.freeze([...this.entries]);
  }

  getTallyProof(pollId: Buffer): TallyProof | undefined {
    return this.tallyProofs.get(pollId.toString('hex'));
  }

  verifyEntry(entry: BulletinBoardEntry): boolean {
    const entryData = this.serializeEntryData({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      pollId: entry.pollId,
      encryptedVote: entry.encryptedVote,
      voterIdHash: entry.voterIdHash,
      merkleRoot: entry.merkleRoot,
    });

    const computedHash = this.sha256(entryData);
    if (!computedHash.equals(entry.entryHash)) {
      return false;
    }

    return this.authority.verify(
      entry.signature as SignatureBuffer,
      entry.entryHash,
    );
  }

  verifyTallyProof(proof: TallyProof): boolean {
    const proofData = this.serializeTallyProof({
      pollId: proof.pollId,
      tallies: proof.tallies,
      choices: proof.choices,
      timestamp: proof.timestamp,
      votesHash: proof.votesHash,
      decryptionProof: proof.decryptionProof,
    });

    return this.authority.verify(proof.signature as SignatureBuffer, proofData);
  }

  verifyMerkleTree(): boolean {
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expectedRoot = this.computeMerkleRoot(this.entries.slice(0, i));

      if (!entry.merkleRoot.equals(expectedRoot)) {
        return false;
      }
    }
    return true;
  }

  export(): Buffer {
    const parts: Buffer[] = [];

    // Export entries
    parts.push(this.encodeNumber(this.entries.length));
    for (const entry of this.entries) {
      parts.push(this.serializeEntry(entry));
    }

    // Export tally proofs
    parts.push(this.encodeNumber(this.tallyProofs.size));
    for (const proof of this.tallyProofs.values()) {
      parts.push(this.serializeTallyProofFull(proof));
    }

    return Buffer.concat(parts);
  }

  private computeMerkleRoot(entries: BulletinBoardEntry[]): Buffer {
    if (entries.length === 0) {
      return Buffer.alloc(32);
    }

    let hashes = entries.map((e) => e.entryHash);

    while (hashes.length > 1) {
      const nextLevel: Buffer[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          nextLevel.push(
            this.sha256(Buffer.concat([hashes[i], hashes[i + 1]])),
          );
        } else {
          nextLevel.push(hashes[i]);
        }
      }
      hashes = nextLevel;
    }

    return hashes[0];
  }

  private hashEncryptedVotes(votes: bigint[][]): Buffer {
    const parts: Buffer[] = [];
    for (const vote of votes) {
      for (const value of vote) {
        parts.push(this.encodeBigInt(value));
      }
    }
    return this.sha256(Buffer.concat(parts));
  }

  private generateDecryptionProof(
    encryptedVotes: bigint[][],
    tallies: bigint[],
  ): Buffer {
    // Simplified proof: hash of encrypted votes + tallies
    // In production, use ZK-SNARK or similar
    const parts: Buffer[] = [];
    for (const vote of encryptedVotes) {
      for (const value of vote) {
        parts.push(this.encodeBigInt(value));
      }
    }
    for (const tally of tallies) {
      parts.push(this.encodeBigInt(tally));
    }
    return this.sha256(Buffer.concat(parts));
  }

  private serializeEntryData(data: {
    sequence: number;
    timestamp: number;
    pollId: Buffer;
    encryptedVote: bigint[];
    voterIdHash: Buffer;
    merkleRoot: Buffer;
  }): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(data.sequence),
      this.encodeNumber(data.timestamp),
      data.pollId,
      data.voterIdHash,
      data.merkleRoot,
    ];

    for (const value of data.encryptedVote) {
      parts.push(this.encodeBigInt(value));
    }

    return Buffer.concat(parts);
  }

  private serializeTallyProof(data: {
    pollId: Buffer;
    tallies: bigint[];
    choices: string[];
    timestamp: number;
    votesHash: Buffer;
    decryptionProof: Buffer;
  }): Buffer {
    const parts: Buffer[] = [
      data.pollId,
      this.encodeNumber(data.timestamp),
      data.votesHash,
      data.decryptionProof,
    ];

    for (const tally of data.tallies) {
      parts.push(this.encodeBigInt(tally));
    }

    for (const choice of data.choices) {
      parts.push(Buffer.from(choice, 'utf8'));
    }

    return Buffer.concat(parts);
  }

  private serializeEntry(entry: BulletinBoardEntry): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(entry.sequence),
      this.encodeNumber(entry.timestamp),
      this.encodeNumber(entry.pollId.length),
      entry.pollId,
      this.encodeNumber(entry.encryptedVote.length),
    ];

    for (const value of entry.encryptedVote) {
      parts.push(this.encodeBigInt(value));
    }

    parts.push(
      this.encodeNumber(entry.voterIdHash.length),
      entry.voterIdHash,
      this.encodeNumber(entry.merkleRoot.length),
      entry.merkleRoot,
      this.encodeNumber(entry.entryHash.length),
      entry.entryHash,
      this.encodeNumber(entry.signature.length),
      entry.signature,
    );

    return Buffer.concat(parts);
  }

  private serializeTallyProofFull(proof: TallyProof): Buffer {
    const parts: Buffer[] = [
      this.encodeNumber(proof.pollId.length),
      proof.pollId,
      this.encodeNumber(proof.tallies.length),
    ];

    for (const tally of proof.tallies) {
      parts.push(this.encodeBigInt(tally));
    }

    parts.push(this.encodeNumber(proof.choices.length));
    for (const choice of proof.choices) {
      const encoded = Buffer.from(choice, 'utf8');
      parts.push(this.encodeNumber(encoded.length), encoded);
    }

    parts.push(
      this.encodeNumber(proof.timestamp),
      this.encodeNumber(proof.votesHash.length),
      proof.votesHash,
      this.encodeNumber(proof.decryptionProof.length),
      proof.decryptionProof,
      this.encodeNumber(proof.signature.length),
      proof.signature,
    );

    return Buffer.concat(parts);
  }

  private getMicrosecondTimestamp(): number {
    // Get milliseconds since epoch and convert to microseconds
    // performance.now() is relative to process start, not epoch, so we only use Date.now()
    const now = Date.now();
    return now * 1000;
  }

  private sha256(data: Buffer): Buffer {
    return createHash('sha256').update(data).digest();
  }

  private encodeNumber(n: number): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(n));
    return buffer;
  }

  private encodeBigInt(n: bigint): Buffer {
    const hex = n.toString(16).padStart(64, '0');
    return Buffer.from(hex, 'hex');
  }
}
