/**
 * Node.js Persistence Implementation for Large-Scale Elections
 * Implements interfaces from node-ecies-lib with actual disk I/O
 */
import { promises as fs, createWriteStream, createReadStream } from 'fs';
import { join } from 'path';

import type { PlatformID } from '../../interfaces';

import type {
  IVoteLogger,
  ICheckpointManager,
  StateSnapshot,
  CheckpointMetadata,
  AggregatedTally,
  JurisdictionConfig,
} from './interfaces';

/**
 * Streaming vote logger with append-only disk writes
 * Uses Buffer for Node.js-optimized I/O
 */
export class NodeVoteLogger<
  TID extends PlatformID = Buffer,
> implements IVoteLogger<TID> {
  private readonly logPath: string;
  private voteCount = 0;
  private writeStream: ReturnType<typeof createWriteStream>;

  constructor(jurisdictionId: TID, logDir: string) {
    const id = this.toHex(
      Buffer.isBuffer(jurisdictionId) ? jurisdictionId : Buffer.from([0]),
    );
    this.logPath = join(logDir, `votes-${id}.log`);
    this.writeStream = createWriteStream(this.logPath, { flags: 'a' });
  }

  async appendVote(
    voterId: TID,
    encryptedVote: bigint[],
    timestamp: number,
  ): Promise<void> {
    // Convert TID to Buffer for serialization
    const voterIdBytes = Buffer.isBuffer(voterId)
      ? voterId
      : voterId instanceof Uint8Array
        ? Buffer.from(voterId)
        : Buffer.from([0]); // Fallback for other types

    const entry = this.serializeVote(voterIdBytes, encryptedVote, timestamp);
    await new Promise<void>((resolve, reject) => {
      this.writeStream.write(entry, (err) => {
        if (err) reject(err);
        else {
          this.voteCount++;
          resolve();
        }
      });
    });
  }

  getVoteCount(): number {
    return this.voteCount;
  }

  async *replayVotes(): AsyncGenerator<{
    voterId: TID;
    encryptedVote: bigint[];
    timestamp: number;
  }> {
    try {
      const stream = createReadStream(this.logPath);
      let buffer = Buffer.alloc(0);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk as Buffer]);

        while (buffer.length >= 8) {
          const entrySize = buffer.readUInt32BE(0);
          if (buffer.length < entrySize) break;

          const entry = buffer.subarray(0, entrySize);
          buffer = buffer.subarray(entrySize);

          const deserialized = this.deserializeVote(entry);
          // Keep as Buffer for node-ecies-lib consistency
          const voterId = deserialized.voterId as TID;
          yield {
            ...deserialized,
            voterId,
          };
        }
      }
    } catch (error) {
      // If file doesn't exist, just return (empty generator)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ENOENT'
      ) {
        return;
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => this.writeStream.end(resolve));
  }

  private serializeVote(
    voterId: Buffer,
    encryptedVote: bigint[],
    timestamp: number,
  ): Buffer {
    const parts: Buffer[] = [
      Buffer.alloc(8), // timestamp
      Buffer.alloc(4), // voterId length
      voterId,
      Buffer.alloc(4), // vote count
    ];

    parts[0].writeBigUInt64BE(BigInt(timestamp), 0);
    parts[1].writeUInt32BE(voterId.length, 0);
    parts[3].writeUInt32BE(encryptedVote.length, 0);

    for (const value of encryptedVote) {
      const hex = value.toString(16).padStart(64, '0');
      parts.push(Buffer.from(hex, 'hex'));
    }

    const totalSize = parts.reduce((sum, p) => sum + p.length, 4);
    const result = Buffer.alloc(totalSize);
    result.writeUInt32BE(totalSize, 0);

    let offset = 4;
    for (const part of parts) {
      part.copy(result, offset);
      offset += part.length;
    }

    return result;
  }

  private deserializeVote(entry: Buffer): {
    voterId: Buffer;
    encryptedVote: bigint[];
    timestamp: number;
  } {
    let offset = 4;
    const timestamp = Number(entry.readBigUInt64BE(offset));
    offset += 8;

    const voterIdLen = entry.readUInt32BE(offset);
    offset += 4;

    const voterId = entry.subarray(offset, offset + voterIdLen);
    offset += voterIdLen;

    const voteCount = entry.readUInt32BE(offset);
    offset += 4;

    const encryptedVote: bigint[] = [];
    for (let i = 0; i < voteCount; i++) {
      const hex = entry.subarray(offset, offset + 32).toString('hex');
      encryptedVote.push(BigInt('0x' + hex));
      offset += 32;
    }

    return { voterId, encryptedVote, timestamp };
  }

  private toHex(buf: Buffer): string {
    return buf.toString('hex');
  }
}

/**
 * Checkpoint manager with disk-based snapshots
 * Uses Buffer for Node.js-optimized I/O
 */
export class NodeCheckpointManager<
  TID extends PlatformID = Buffer,
> implements ICheckpointManager<TID> {
  private readonly config: JurisdictionConfig<TID>;
  private readonly checkpointDir: string;
  private checkpointNumber = 0;

  constructor(config: JurisdictionConfig<TID>, checkpointDir: string) {
    this.config = config;
    this.checkpointDir = checkpointDir;
  }

  async saveCheckpoint(tally: AggregatedTally<TID>): Promise<void> {
    await fs.mkdir(this.checkpointDir, { recursive: true });

    const metadata: CheckpointMetadata = {
      jurisdictionId: this.toKey(this.config.id),
      level: this.config.level,
      voterCount: tally.voterCount,
      timestamp: Date.now(),
      checkpointNumber: this.checkpointNumber++,
    };

    const snapshot: StateSnapshot<TID> = {
      metadata,
      tally,
      voteLog: Buffer.alloc(0),
    };

    const path = join(
      this.checkpointDir,
      `checkpoint-${metadata.checkpointNumber}.json`,
    );
    await fs.writeFile(path, JSON.stringify(snapshot, this.bigIntReplacer));
  }

  async loadLatestCheckpoint(): Promise<StateSnapshot<TID> | null> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpoints = files
        .filter((f) => f.startsWith('checkpoint-'))
        .sort()
        .reverse();

      if (checkpoints.length === 0) return null;

      const path = join(this.checkpointDir, checkpoints[0]);
      const data = await fs.readFile(path, 'utf-8');
      return JSON.parse(data, this.bigIntReviver) as StateSnapshot<TID>;
    } catch {
      return null;
    }
  }

  async listCheckpoints(): Promise<CheckpointMetadata[]> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpoints: CheckpointMetadata[] = [];

      for (const file of files) {
        if (!file.startsWith('checkpoint-')) continue;
        const path = join(this.checkpointDir, file);
        const data = await fs.readFile(path, 'utf-8');
        const snapshot = JSON.parse(
          data,
          this.bigIntReviver,
        ) as StateSnapshot<TID>;
        checkpoints.push(snapshot.metadata);
      }

      return checkpoints.sort(
        (a, b) => b.checkpointNumber - a.checkpointNumber,
      );
    } catch {
      return [];
    }
  }

  private toKey(id: TID): string {
    if (Buffer.isBuffer(id)) {
      return id.toString('hex');
    }
    if (id instanceof Uint8Array) {
      return Buffer.from(id).toString('hex');
    }
    return String(id);
  }

  private bigIntReplacer(_key: string, value: unknown): unknown {
    return typeof value === 'bigint' ? value.toString() : value;
  }

  private bigIntReviver(key: string, value: unknown): unknown {
    // Handle encryptedTallies array specifically
    if (key === 'encryptedTallies' && Array.isArray(value)) {
      return value.map((item: unknown) => {
        if (typeof item === 'string' && /^\d+$/.test(item)) {
          return BigInt(item);
        }
        return item;
      });
    }
    // Handle individual BigInt strings
    if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
      return BigInt(value);
    }
    return value;
  }
}
