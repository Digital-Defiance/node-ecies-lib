import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { NodeVoteLogger, NodeCheckpointManager } from './node-persistent-state';
import {
  JurisdictionLevel,
  type JurisdictionConfig,
  type AggregatedTally,
} from '@digitaldefiance/ecies-lib';

describe('Node Persistent State', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `voting-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('NodeVoteLogger', () => {
    it('should create vote logger', () => {
      const jurisdictionId = new Uint8Array([1, 2, 3]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      expect(logger).toBeDefined();
      expect(logger.getVoteCount()).toBe(0);
    });

    it('should append vote', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      const voterId = new Uint8Array([10, 20, 30]);
      const encryptedVote = [100n, 200n, 300n];
      const timestamp = Date.now();

      await logger.appendVote(voterId, encryptedVote, timestamp);

      expect(logger.getVoteCount()).toBe(1);
      await logger.close();
    });

    it('should append multiple votes', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      for (let i = 0; i < 10; i++) {
        const voterId = new Uint8Array([i]);
        const encryptedVote = [BigInt(i), BigInt(i * 2), BigInt(i * 3)];
        await logger.appendVote(voterId, encryptedVote, Date.now());
      }

      expect(logger.getVoteCount()).toBe(10);
      await logger.close();
    });

    it('should replay votes', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      const votes = [
        {
          voterId: new Uint8Array([1]),
          vote: [10n, 20n, 30n],
          timestamp: 1000,
        },
        {
          voterId: new Uint8Array([2]),
          vote: [40n, 50n, 60n],
          timestamp: 2000,
        },
        {
          voterId: new Uint8Array([3]),
          vote: [70n, 80n, 90n],
          timestamp: 3000,
        },
      ];

      for (const v of votes) {
        await logger.appendVote(v.voterId, v.vote, v.timestamp);
      }
      await logger.close();

      // Create new logger to replay
      const replayLogger = new NodeVoteLogger(jurisdictionId, testDir);
      const replayed: any[] = [];

      for await (const vote of replayLogger.replayVotes()) {
        replayed.push(vote);
      }

      expect(replayed).toHaveLength(3);
      expect(Buffer.from(replayed[0].voterId)).toEqual(
        Buffer.from(votes[0].voterId),
      );
      expect(replayed[0].encryptedVote).toEqual(votes[0].vote);
      await replayLogger.close();
    });

    it('should handle large votes', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      const voterId = new Uint8Array(32).fill(255);
      const encryptedVote = Array(100)
        .fill(0n)
        .map((_, i) => BigInt(i));

      await logger.appendVote(voterId, encryptedVote, Date.now());
      expect(logger.getVoteCount()).toBe(1);
      await logger.close();
    });

    it('should persist across instances', async () => {
      const jurisdictionId = new Uint8Array([1]);

      // First instance
      const logger1 = new NodeVoteLogger(jurisdictionId, testDir);
      await logger1.appendVote(new Uint8Array([1]), [10n], Date.now());
      await logger1.close();

      // Second instance
      const logger2 = new NodeVoteLogger(jurisdictionId, testDir);
      await logger2.appendVote(new Uint8Array([2]), [20n], Date.now());

      expect(logger2.getVoteCount()).toBe(1); // Only counts new votes
      await logger2.close();

      // Verify both votes exist
      const logger3 = new NodeVoteLogger(jurisdictionId, testDir);
      const replayed: any[] = [];
      for await (const vote of logger3.replayVotes()) {
        replayed.push(vote);
      }
      expect(replayed).toHaveLength(2);
      await logger3.close();
    });

    it('should handle empty replay', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const logger = new NodeVoteLogger(jurisdictionId, testDir);

      const replayed: any[] = [];
      for await (const vote of logger.replayVotes()) {
        replayed.push(vote);
      }

      expect(replayed).toHaveLength(0);
      await logger.close();
    });
  });

  describe('NodeCheckpointManager', () => {
    it('should create checkpoint manager', () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Test',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      expect(manager).toBeDefined();
    });

    it('should save checkpoint', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const tally: AggregatedTally = {
        jurisdictionId: config.id,
        level: JurisdictionLevel.Precinct,
        encryptedTallies: [100n, 200n, 300n],
        voterCount: 10,
        timestamp: Date.now(),
      };

      await manager.saveCheckpoint(tally);

      const files = await fs.readdir(testDir);
      expect(files.some((f) => f.startsWith('checkpoint-'))).toBe(true);
    });

    it('should load latest checkpoint', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const tally: AggregatedTally = {
        jurisdictionId: config.id,
        level: JurisdictionLevel.Precinct,
        encryptedTallies: [100n, 200n, 300n],
        voterCount: 10,
        timestamp: Date.now(),
      };

      await manager.saveCheckpoint(tally);

      const loaded = await manager.loadLatestCheckpoint();
      expect(loaded).not.toBeNull();
      expect(loaded!.tally.voterCount).toBe(10);
      expect(loaded!.tally.encryptedTallies).toEqual([100n, 200n, 300n]);
    });

    it('should return null if no checkpoints', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const loaded = await manager.loadLatestCheckpoint();
      expect(loaded).toBeNull();
    });

    it('should save multiple checkpoints', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      for (let i = 0; i < 3; i++) {
        const tally: AggregatedTally = {
          jurisdictionId: config.id,
          level: JurisdictionLevel.Precinct,
          encryptedTallies: [BigInt(i * 100)],
          voterCount: i * 10,
          timestamp: Date.now(),
        };
        await manager.saveCheckpoint(tally);
      }

      const files = await fs.readdir(testDir);
      const checkpoints = files.filter((f) => f.startsWith('checkpoint-'));
      expect(checkpoints).toHaveLength(3);
    });

    it('should list checkpoints', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      for (let i = 0; i < 3; i++) {
        const tally: AggregatedTally = {
          jurisdictionId: config.id,
          level: JurisdictionLevel.Precinct,
          encryptedTallies: [BigInt(i)],
          voterCount: i,
          timestamp: Date.now(),
        };
        await manager.saveCheckpoint(tally);
      }

      const list = await manager.listCheckpoints();
      expect(list).toHaveLength(3);
      expect(list[0].checkpointNumber).toBeGreaterThan(
        list[1].checkpointNumber,
      );
    });

    it('should handle bigint serialization', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const largeBigInt = 123456789012345678901234567890n;
      const tally: AggregatedTally = {
        jurisdictionId: config.id,
        level: JurisdictionLevel.Precinct,
        encryptedTallies: [largeBigInt],
        voterCount: 1,
        timestamp: Date.now(),
      };

      await manager.saveCheckpoint(tally);
      const loaded = await manager.loadLatestCheckpoint();

      expect(loaded!.tally.encryptedTallies[0]).toBe(largeBigInt);
    });

    it('should return empty list if no checkpoints', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const list = await manager.listCheckpoints();
      expect(list).toEqual([]);
    });

    it('should handle checkpoint metadata', async () => {
      const config: JurisdictionConfig = {
        id: new Uint8Array([1, 2, 3]),
        name: 'Precinct 123',
        level: JurisdictionLevel.Precinct,
      };
      const manager = new NodeCheckpointManager(config, testDir);

      const tally: AggregatedTally = {
        jurisdictionId: config.id,
        level: JurisdictionLevel.Precinct,
        encryptedTallies: [100n],
        voterCount: 50,
        timestamp: Date.now(),
      };

      await manager.saveCheckpoint(tally);
      const list = await manager.listCheckpoints();

      expect(list[0].jurisdictionId).toBe('010203');
      expect(list[0].level).toBe(JurisdictionLevel.Precinct);
      expect(list[0].voterCount).toBe(50);
    });
  });

  describe('Integration', () => {
    it('should work together for recovery', async () => {
      const jurisdictionId = new Uint8Array([1]);
      const config: JurisdictionConfig = {
        id: jurisdictionId,
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };

      const logger = new NodeVoteLogger(jurisdictionId, testDir);
      const checkpointMgr = new NodeCheckpointManager(config, testDir);

      // Simulate voting with checkpoints
      for (let i = 0; i < 25; i++) {
        await logger.appendVote(new Uint8Array([i]), [BigInt(i)], Date.now());

        if ((i + 1) % 10 === 0) {
          const tally: AggregatedTally = {
            jurisdictionId,
            level: JurisdictionLevel.Precinct,
            encryptedTallies: [BigInt(i + 1)],
            voterCount: i + 1,
            timestamp: Date.now(),
          };
          await checkpointMgr.saveCheckpoint(tally);
        }
      }

      await logger.close();

      // Verify checkpoint
      const checkpoint = await checkpointMgr.loadLatestCheckpoint();
      expect(checkpoint).not.toBeNull();
      expect(checkpoint!.tally.voterCount).toBe(20);

      // Verify can replay remaining votes
      const replayLogger = new NodeVoteLogger(jurisdictionId, testDir);
      const replayed: any[] = [];
      for await (const vote of replayLogger.replayVotes()) {
        replayed.push(vote);
      }
      expect(replayed).toHaveLength(25);
      await replayLogger.close();
    });
  });
});
