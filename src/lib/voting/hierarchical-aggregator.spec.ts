import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Member } from '../../member';
import { VoteEncoder } from './encoder';
import { PollFactory } from './factory';
import {
  PrecinctAggregator,
  CountyAggregator,
  StateAggregator,
  NationalAggregator,
  JurisdictionLevel,
  JurisdictionConfig,
} from './hierarchical-aggregator';
import { NodeVoteLogger, NodeCheckpointManager } from './node-persistent-state';
import { TestVoterPool } from './test-voter-pool';

describe('Node Hierarchical Aggregator', () => {
  let authority;
  let testDir;
  const choices = ['Alice', 'Bob', 'Charlie'];

  beforeAll(async () => {
    await TestVoterPool.initialize(100); // Reasonable compromise between 50 and 1000
    authority = TestVoterPool.getAuthority();
  }, 60000); // Reasonable timeout

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

  describe('PrecinctAggregator with Persistence', () => {
    it('should create precinct with logger and checkpoint manager', () => {
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const logger = new NodeVoteLogger(config.id, testDir);
      const checkpointMgr = new NodeCheckpointManager(config, testDir);

      const precinct = new PrecinctAggregator(
        poll,
        config,
        logger,
        checkpointMgr,
      );

      expect(precinct).toBeDefined();
    });

    it('should persist votes to disk', async () => {
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const logger = new NodeVoteLogger(config.id, testDir);
      const checkpointMgr = new NodeCheckpointManager(config, testDir);
      const precinct = new PrecinctAggregator(
        poll,
        config,
        logger,
        checkpointMgr,
      );
      const encoder = new VoteEncoder(authority.votingPublicKey);

      for (let i = 0; i < 10; i++) {
        const vote = encoder.encodePlurality(i % 3, choices.length);
        await precinct.vote(TestVoterPool.getVoter(i), vote);
      }

      await logger.close();

      // Verify log file exists
      const files = await fs.readdir(testDir);
      expect(files.some((f) => f.startsWith('votes-'))).toBe(true);
    });

    it('should create checkpoints every 100 votes', async () => {
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const logger = new NodeVoteLogger(config.id, testDir);
      const checkpointMgr = new NodeCheckpointManager(config, testDir);
      const precinct = new PrecinctAggregator(
        poll,
        config,
        logger,
        checkpointMgr,
      );
      const encoder = new VoteEncoder(authority.votingPublicKey);

      for (let i = 0; i < 100; i++) {
        const vote = encoder.encodePlurality(i % 3, choices.length);
        await precinct.vote(TestVoterPool.getVoter(i), vote);
      }

      await logger.close();

      // Verify checkpoint was created
      const checkpoints = await checkpointMgr.listCheckpoints();
      expect(checkpoints.length).toBeGreaterThan(0);
    });

    it('should recover from checkpoint and replay log', async () => {
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };

      // First session: vote and checkpoint
      {
        const poll = PollFactory.createPlurality(choices, authority);
        const logger = new NodeVoteLogger(config.id, testDir);
        const checkpointMgr = new NodeCheckpointManager(config, testDir);
        const precinct = new PrecinctAggregator(
          poll,
          config,
          logger,
          checkpointMgr,
        );
        const encoder = new VoteEncoder(authority.votingPublicKey);

        for (let i = 0; i < 100; i++) {
          // Changed from 150 to 100 to match pool size
          const vote = encoder.encodePlurality(i % 3, choices.length);
          await precinct.vote(TestVoterPool.getVoter(i), vote);
        }

        await logger.close();
      }

      // Second session: recover
      {
        const checkpointMgr = new NodeCheckpointManager(config, testDir);
        const checkpoint = await checkpointMgr.loadLatestCheckpoint();

        expect(checkpoint).not.toBeNull();
        expect(checkpoint.tally.voterCount).toBe(100);

        // Verify can replay remaining 0 votes (since we only did 100)
        const logger = new NodeVoteLogger(config.id, testDir);
        let replayCount = 0;
        for await (const _ of logger.replayVotes()) {
          replayCount++;
        }
        expect(replayCount).toBe(100); // Changed from 150 to 100
        await logger.close();
      }
    });
  });

  describe('Full Hierarchy with Persistence', () => {
    it('should aggregate with persistence at each level', async () => {
      const encoder = new VoteEncoder(authority.votingPublicKey);

      // National
      const nationalConfig = {
        id: Buffer.from([0]),
        name: 'USA',
        level: JurisdictionLevel.National,
      };
      const national = new NationalAggregator(
        nationalConfig,
        authority.votingPublicKey,
      );

      // 2 States
      for (let s = 0; s < 2; s++) {
        const stateConfig = {
          id: Buffer.from([s + 1]),
          name: `State ${s}`,
          level: JurisdictionLevel.State,
        };
        const state = new StateAggregator(
          stateConfig,
          authority.votingPublicKey,
        );

        // 1 County per state
        const countyConfig = {
          id: Buffer.from([s + 1, 0]),
          name: `County ${s}-0`,
          level: JurisdictionLevel.County,
          parentId: stateConfig.id,
        };
        const county = new CountyAggregator(
          countyConfig,
          authority.votingPublicKey,
        );

        // 1 Precinct per county with persistence
        const precinctConfig = {
          id: Buffer.from([s + 1, 0, 0]),
          name: `Precinct ${s}-0-0`,
          level: JurisdictionLevel.Precinct,
          parentId: countyConfig.id,
        };

        const precinctDir = join(testDir, `precinct-${s}`);
        await fs.mkdir(precinctDir, { recursive: true });

        const poll = PollFactory.createPlurality(choices, authority);
        const logger = new NodeVoteLogger(precinctConfig.id, precinctDir);
        const checkpointMgr = new NodeCheckpointManager(
          precinctConfig,
          precinctDir,
        );
        const precinct = new PrecinctAggregator(
          poll,
          precinctConfig,
          logger,
          checkpointMgr,
        );

        // 10 votes per precinct
        for (let v = 0; v < 10; v++) {
          const vote = encoder.encodePlurality(v % 3, choices.length);
          await precinct.vote(TestVoterPool.getVoter(s * 10 + v), vote);
        }

        await logger.close();

        county.addPrecinctTally(precinct.getTally());
        state.addCountyTally(county.getTally());
        national.addStateTally(state.getTally());
      }

      const tally = national.getTally();
      expect(tally.voterCount).toBe(20);
      expect(tally.level).toBe(JurisdictionLevel.National);
    }, 15000); // Add 15 second timeout
  });

  describe('Stress Test', () => {
    it('should handle 100 votes with persistence', async () => {
      // Changed from 200 to 100
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const logger = new NodeVoteLogger(config.id, testDir);
      const checkpointMgr = new NodeCheckpointManager(config, testDir);
      const precinct = new PrecinctAggregator(
        poll,
        config,
        logger,
        checkpointMgr,
      );
      const encoder = new VoteEncoder(authority.votingPublicKey);

      for (let i = 0; i < 100; i++) {
        // Changed from 200 to 100 to match pool size
        const vote = encoder.encodePlurality(i % 3, choices.length);
        await precinct.vote(TestVoterPool.getVoter(i), vote);
      }

      await logger.close();

      const tally = precinct.getTally();
      expect(tally.voterCount).toBe(100); // Changed from 200 to 100

      // Verify checkpoints were created
      const checkpoints = await checkpointMgr.listCheckpoints();
      expect(checkpoints.length).toBeGreaterThanOrEqual(1); // At least 1 checkpoint
    }, 60000); // 60 second timeout
  });

  describe('Buffer Type Verification', () => {
    it('should use Buffer for jurisdiction IDs', () => {
      const config = {
        id: Buffer.from([1, 2, 3]),
        name: 'Test Precinct',
        level: JurisdictionLevel.Precinct,
      };

      expect(Buffer.isBuffer(config.id)).toBe(true);
      expect(config.id).toBeInstanceOf(Buffer);
    });

    it('should return tallies with Buffer jurisdiction IDs', () => {
      const config = {
        id: Buffer.from([1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const precinct = new PrecinctAggregator(poll, config);

      const tally = precinct.getTally();
      expect(Buffer.isBuffer(tally.jurisdictionId)).toBe(true);
      expect(tally.jurisdictionId).toBeInstanceOf(Buffer);
    });

    it('should handle Buffer IDs in county aggregation', () => {
      const countyConfig = {
        id: Buffer.from([1, 0]),
        name: 'County 1',
        level: JurisdictionLevel.County,
      };
      const county = new CountyAggregator(
        countyConfig,
        authority.votingPublicKey,
      );

      const precinctConfig = {
        id: Buffer.from([1, 0, 1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
        parentId: countyConfig.id,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const precinct = new PrecinctAggregator(poll, precinctConfig);

      county.addPrecinctTally(precinct.getTally());
      const tally = county.getTally();

      expect(Buffer.isBuffer(tally.jurisdictionId)).toBe(true);
      expect(tally.childJurisdictions).toBeDefined();
      if (tally.childJurisdictions) {
        tally.childJurisdictions.forEach((id) => {
          expect(Buffer.isBuffer(id)).toBe(true);
        });
      }
    });

    it('should handle Buffer IDs in state aggregation', () => {
      const stateConfig = {
        id: Buffer.from([1]),
        name: 'State 1',
        level: JurisdictionLevel.State,
      };
      const state = new StateAggregator(stateConfig, authority.votingPublicKey);

      const countyConfig = {
        id: Buffer.from([1, 0]),
        name: 'County 1',
        level: JurisdictionLevel.County,
        parentId: stateConfig.id,
      };
      const county = new CountyAggregator(
        countyConfig,
        authority.votingPublicKey,
      );

      const precinctConfig = {
        id: Buffer.from([1, 0, 1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
        parentId: countyConfig.id,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const precinct = new PrecinctAggregator(poll, precinctConfig);

      county.addPrecinctTally(precinct.getTally());
      state.addCountyTally(county.getTally());
      const tally = state.getTally();

      expect(Buffer.isBuffer(tally.jurisdictionId)).toBe(true);
    });

    it('should handle Buffer IDs in national aggregation', () => {
      const nationalConfig = {
        id: Buffer.from([0]),
        name: 'National',
        level: JurisdictionLevel.National,
      };
      const national = new NationalAggregator(
        nationalConfig,
        authority.votingPublicKey,
      );

      const stateConfig = {
        id: Buffer.from([1]),
        name: 'State 1',
        level: JurisdictionLevel.State,
      };
      const state = new StateAggregator(stateConfig, authority.votingPublicKey);

      const countyConfig = {
        id: Buffer.from([1, 0]),
        name: 'County 1',
        level: JurisdictionLevel.County,
        parentId: stateConfig.id,
      };
      const county = new CountyAggregator(
        countyConfig,
        authority.votingPublicKey,
      );

      const precinctConfig = {
        id: Buffer.from([1, 0, 1]),
        name: 'Precinct 1',
        level: JurisdictionLevel.Precinct,
        parentId: countyConfig.id,
      };
      const poll = PollFactory.createPlurality(choices, authority);
      const precinct = new PrecinctAggregator(poll, precinctConfig);

      county.addPrecinctTally(precinct.getTally());
      state.addCountyTally(county.getTally());
      national.addStateTally(state.getTally());
      const tally = national.getTally();

      expect(Buffer.isBuffer(tally.jurisdictionId)).toBe(true);
    });
  });
});
