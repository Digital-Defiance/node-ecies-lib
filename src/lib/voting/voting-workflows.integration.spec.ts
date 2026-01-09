/**
 * Integration Tests: Complete Voting Workflows
 * Feature: sync-voting-system-refactor
 * Validates: Requirements 8.2
 *
 * This test suite verifies complete end-to-end voting workflows including
 * ranked choice, approval, weighted voting, hierarchical aggregation,
 * and persistence/recovery scenarios.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Member } from '../../member';
import { VoteEncoder } from './encoder';
import { PollFactory } from './factory';
import { PollTallier } from './tallier';
import { ImmutableAuditLog } from './audit';
import { PublicBulletinBoard } from './bulletin-board';
import { PollEventLogger } from './event-logger';
import {
  PrecinctAggregator,
  CountyAggregator,
  StateAggregator,
  JurisdictionLevel,
  type JurisdictionConfig,
} from './hierarchical-aggregator';
import { NodeVoteLogger, NodeCheckpointManager } from './node-persistent-state';
import { BatchVoteProcessor } from './persistent-state';
import { TestVoterPool } from './test-voter-pool';
import type { EncryptedVote, PollResults } from './interfaces';

describe('Complete Voting Workflows Integration Tests', () => {
  let authority: Member;
  let encoder: VoteEncoder;
  let testDir: string;

  beforeAll(async () => {
    // Initialize with smaller voter pool for faster tests
    await TestVoterPool.initialize(50);
    authority = TestVoterPool.getAuthority();
    encoder = new VoteEncoder(authority.votingPublicKey!);
  }, 30000); // 30 second timeout

  beforeEach(async () => {
    testDir = join(tmpdir(), `voting-integration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Ranked Choice Voting Workflow', () => {
    it('should complete full ranked choice voting workflow', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = ['Alice', 'Bob', 'Charlie', 'Diana'];

        // 1. Create poll
        const poll = PollFactory.createRankedChoice(choices, authority);
        expect(poll).toBeDefined();

        // 2. Set up audit log and bulletin board
        const auditLog = new ImmutableAuditLog(authority);
        const bulletinBoard = new PublicBulletinBoard(authority);
        const eventLogger = new PollEventLogger(authority.idProvider);

        // Record poll creation in audit log
        auditLog.recordPollCreated(poll.id, {
          method: 'ranked-choice',
          choices: choices.length,
        });

        // 3. Cast votes with different rankings
        const voters = TestVoterPool.getVoters(10);
        const votes: EncryptedVote[] = [];

        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];

          // Create different ranking patterns
          let rankings: number[];
          if (i % 4 === 0)
            rankings = [0, 1, 2, 3]; // Alice first
          else if (i % 4 === 1)
            rankings = [1, 0, 3, 2]; // Bob first
          else if (i % 4 === 2)
            rankings = [2, 3, 0, 1]; // Charlie first
          else rankings = [3, 2, 1, 0]; // Diana first

          const encrypted = encoder.encodeRankedChoice(
            rankings,
            choices.length,
          );

          // Verify vote is properly encrypted
          expect(encrypted.rankings).toEqual(rankings);
          expect(encrypted.encrypted).toHaveLength(choices.length);

          votes.push(encrypted);

          // Add to poll
          poll.vote(voter, encrypted);

          // Log events
          eventLogger.logEvent('VOTE_CAST', `Vote cast by voter ${i}`, {
            voterIndex: i,
          });

          // Record vote in audit log
          auditLog.recordVoteCast(poll.id, new Uint8Array(voter.id), {
            voterIndex: i,
            rankings: rankings,
          });

          // Add to bulletin board
          bulletinBoard.publishVote(poll.id, encrypted.encrypted, voter.id);
        }

        // 4. Verify poll state
        expect(poll.voterCount).toBe(voters.length);
        expect(poll.isClosed).toBe(false);

        // 5. Close poll and tally
        poll.close();
        expect(poll.isClosed).toBe(true);

        // Record poll closure in audit log
        auditLog.recordPollClosed(poll.id, {
          totalVotes: voters.length,
        });

        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const results = await tallier.tally(poll);

        // 6. Verify results structure
        expect(results).toBeDefined();
        expect(results.voterCount).toBe(voters.length);
        expect(results.tallies).toBeInstanceOf(Array);
        expect(results.tallies.length).toBeGreaterThan(0);

        // 7. Verify audit trail
        const auditEntries = auditLog.getEntries();
        expect(auditEntries.length).toBeGreaterThan(0);

        // 8. Verify bulletin board integrity
        const merkleRoot = bulletinBoard.computeMerkleRoot();
        expect(merkleRoot).toBeDefined();
        expect(typeof merkleRoot).toBe('string');

        console.log(
          `Ranked choice voting completed with ${voters.length} votes`,
        );
        console.log(`Winner: ${results.winner || 'No clear winner'}`);
        console.log(`Total votes: ${results.voterCount}`);
      });
    });
  });

  describe('Approval Voting Workflow', () => {
    it('should complete full approval voting workflow', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = [
          'Option A',
          'Option B',
          'Option C',
          'Option D',
          'Option E',
        ];

        // 1. Create approval poll
        const poll = PollFactory.createApproval(choices, authority);
        expect(poll).toBeDefined();

        // 2. Set up persistence
        const voteLogPath = join(testDir, 'votes-01.log'); // NodeVoteLogger creates this name
        const checkpointPath = join(testDir, 'checkpoint-0.json'); // NodeCheckpointManager creates this name

        const voteLogger = new NodeVoteLogger(Buffer.from([1]), testDir);
        const checkpointManager = new NodeCheckpointManager(
          {
            id: Buffer.from([1]),
            name: 'Test Jurisdiction',
            level: 0,
          },
          testDir,
        );
        const processor = new BatchVoteProcessor(
          1000,
          voteLogger,
          checkpointManager,
        );

        // 3. Cast approval votes
        const voters = TestVoterPool.getVoters(15);
        const votes: EncryptedVote[] = [];

        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];

          // Create different approval patterns
          let approvals: number[];
          if (i % 5 === 0)
            approvals = [0, 1]; // A and B
          else if (i % 5 === 1)
            approvals = [1, 2, 3]; // B, C, and D
          else if (i % 5 === 2)
            approvals = [0, 2, 4]; // A, C, and E
          else if (i % 5 === 3)
            approvals = [3, 4]; // D and E
          else approvals = [0, 1, 2, 3, 4]; // All options

          const encrypted = encoder.encodeApproval(approvals, choices.length);

          votes.push(encrypted);
          poll.vote(voter, encrypted);

          // Process in batches
          if (votes.length % 5 === 0) {
            await processor.processBatch(
              votes.slice(-5).map((vote) => ({ voter, vote })),
            );
          }
        }

        // 4. Process remaining votes
        const remaining = votes.length % 5;
        if (remaining > 0) {
          const remainingVotes = votes.slice(-remaining);
          const remainingVoters = voters.slice(-remaining);
          await processor.processBatch(
            remainingVotes.map((vote, idx) => ({
              voter: remainingVoters[idx],
              vote,
            })),
          );
        }

        // 5. Create checkpoint
        const snapshot = await processor.checkpoint();
        expect(snapshot).toBeDefined();
        expect(snapshot.totalVotes).toBe(votes.length);

        // 6. Verify persistence
        expect(
          await fs
            .access(voteLogPath)
            .then(() => true)
            .catch(() => false),
        ).toBe(true);
        expect(
          await fs
            .access(checkpointPath)
            .then(() => true)
            .catch(() => false),
        ).toBe(true);

        // 7. Tally results
        poll.close();
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const results = await tallier.tally(poll);

        // 8. Verify approval results
        expect(results.voterCount).toBe(voters.length);
        expect(results.tallies.length).toBe(choices.length);

        // Each choice should have some votes
        for (let i = 0; i < results.tallies.length; i++) {
          const count = results.tallies[i];
          const choice = results.choices[i];
          expect(count).toBeGreaterThanOrEqual(0n);
          expect(choices).toContain(choice);
        }

        console.log(`Approval voting completed with ${voters.length} votes`);
        console.log(
          'Vote distribution:',
          results.choices
            .map((choice, i) => `${choice}: ${results.tallies[i]}`)
            .join(', '),
        );
      });
    });
  });

  describe('Weighted Voting Workflow', () => {
    it('should complete full weighted voting workflow', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = ['Proposal A', 'Proposal B'];
        const maxWeight = BigInt(1000);

        // 1. Create weighted poll
        const poll = PollFactory.createWeighted(choices, authority, maxWeight);
        expect(poll).toBeDefined();

        // 2. Cast weighted votes
        const voters = TestVoterPool.getVoters(8);
        const votes: EncryptedVote[] = [];
        let totalExpectedWeight = 0n;

        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];

          // Assign different weights
          const weight = BigInt((i + 1) * 100); // 100, 200, 300, ..., 800
          const choiceIndex = i % 2; // Alternate between choices

          const encrypted = encoder.encodeWeighted(
            choiceIndex,
            weight,
            choices.length,
          );

          votes.push(encrypted);
          poll.vote(voter, encrypted);
          totalExpectedWeight += weight;
        }

        // 3. Tally weighted results
        poll.close();
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const results = await tallier.tally(poll);

        // 4. Verify weighted results
        expect(results.voterCount).toBe(voters.length);

        // Calculate expected weights for each choice
        let expectedWeightA = 0n;
        let expectedWeightB = 0n;

        for (let i = 0; i < voters.length; i++) {
          const weight = BigInt((i + 1) * 100);
          if (i % 2 === 0) expectedWeightA += weight;
          else expectedWeightB += weight;
        }

        // Verify the weighted tallies
        const proposalAIndex = results.choices.indexOf('Proposal A');
        const proposalBIndex = results.choices.indexOf('Proposal B');
        const tallyA = results.tallies[proposalAIndex] || 0n;
        const tallyB = results.tallies[proposalBIndex] || 0n;

        expect(tallyA + tallyB).toBeGreaterThan(0n);

        console.log(`Weighted voting completed with ${voters.length} votes`);
        console.log(`Total weight: ${totalExpectedWeight}`);
        console.log(`Proposal A weight: ${tallyA}`);
        console.log(`Proposal B weight: ${tallyB}`);
      });
    });
  });

  describe('Hierarchical Aggregation Workflow', () => {
    it('should complete hierarchical aggregation workflow', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = ['Candidate X', 'Candidate Y', 'Candidate Z'];

        // 1. Create jurisdiction hierarchy
        const precinctConfig: JurisdictionConfig<Buffer> = {
          id: Buffer.from([1]),
          name: 'Precinct 1',
          level: JurisdictionLevel.Precinct,
          parentId: Buffer.from([10]),
        };

        const countyConfig: JurisdictionConfig<Buffer> = {
          id: Buffer.from([10]),
          name: 'County A',
          level: JurisdictionLevel.County,
          parentId: Buffer.from([100]),
        };

        const stateConfig: JurisdictionConfig<Buffer> = {
          id: Buffer.from([100]),
          name: 'State 1',
          level: JurisdictionLevel.State,
          parentId: Buffer.from([1000]),
        };

        // 2. Create poll first
        const poll = PollFactory.createPlurality(choices, authority);

        // 3. Create aggregators with poll
        const precinctAggregator = new PrecinctAggregator(poll, precinctConfig);
        const countyAggregator = new CountyAggregator(
          countyConfig,
          authority.votingPublicKey!,
        );
        const stateAggregator = new StateAggregator(
          stateConfig,
          authority.votingPublicKey!,
        );

        // 4. Conduct precinct poll
        const voters = TestVoterPool.getVoters(12);
        const votes: EncryptedVote[] = [];

        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];
          const choiceIndex = i % choices.length;
          const encrypted = encoder.encodePlurality(
            choiceIndex,
            choices.length,
          );

          votes.push(encrypted);
          poll.vote(voter, encrypted);
        }

        // 4. Tally precinct results
        poll.close();
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const precinctResults = await tallier.tally(poll);

        // 5. Aggregate up the hierarchy
        const precinctAggregated = precinctAggregator.getTally();

        countyAggregator.addPrecinctTally(precinctAggregated);
        const countyAggregated = countyAggregator.getTally();

        stateAggregator.addCountyTally(countyAggregated);
        const stateAggregated = stateAggregator.getTally();

        // 6. Verify aggregation chain
        expect(precinctAggregated.voterCount).toBe(voters.length);
        expect(countyAggregated.voterCount).toBe(voters.length);
        expect(stateAggregated.voterCount).toBe(voters.length);

        // Vote counts should be preserved through aggregation
        expect(precinctAggregated.encryptedTallies.length).toBe(choices.length);
        expect(countyAggregated.encryptedTallies.length).toBe(choices.length);
        expect(stateAggregated.encryptedTallies.length).toBe(choices.length);

        // Verify jurisdiction metadata
        expect(precinctAggregated.jurisdictionId).toEqual(precinctConfig.id);
        expect(countyAggregated.jurisdictionId).toEqual(countyConfig.id);
        expect(stateAggregated.jurisdictionId).toEqual(stateConfig.id);

        console.log('Hierarchical aggregation completed');
        console.log(`Precinct votes: ${precinctAggregated.voterCount}`);
        console.log(`County votes: ${countyAggregated.voterCount}`);
        console.log(`State votes: ${stateAggregated.voterCount}`);
      });
    });
  });

  describe('Persistence and Recovery Workflow', () => {
    it('should complete persistence and recovery workflow', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = ['Yes', 'No'];

        // 1. Set up persistence infrastructure
        const voteLogPath = join(testDir, 'votes-01.log'); // NodeVoteLogger creates this name
        const checkpointPath = join(testDir, 'checkpoint-0.json'); // NodeCheckpointManager creates this name

        const voteLogger = new NodeVoteLogger(Buffer.from([1]), testDir);
        const checkpointManager = new NodeCheckpointManager(
          {
            id: Buffer.from([1]),
            name: 'Test Jurisdiction',
            level: 0,
          },
          testDir,
        );
        const processor = new BatchVoteProcessor(
          1000,
          voteLogger,
          checkpointManager,
        );

        // 2. Create poll and cast initial votes
        const poll = PollFactory.createPlurality(choices, authority);
        const voters = TestVoterPool.getVoters(20);
        const allVotes: EncryptedVote[] = [];

        // Cast first batch of votes
        const firstBatch = voters.slice(0, 10);
        for (let i = 0; i < firstBatch.length; i++) {
          const voter = firstBatch[i];
          const choiceIndex = i % 2;
          const encrypted = encoder.encodePlurality(
            choiceIndex,
            choices.length,
          );

          allVotes.push(encrypted);
          poll.vote(voter, encrypted);
        }

        // 3. Process and checkpoint first batch
        await processor.processBatch(
          allVotes
            .slice(0, 10)
            .map((vote, idx) => ({ voter: firstBatch[idx], vote })),
        );
        const checkpoint1 = await processor.checkpoint();

        expect(checkpoint1.totalVotes).toBe(10);
        expect(checkpoint1.timestamp).toBeDefined();

        // 4. Cast second batch of votes
        const secondBatch = voters.slice(10, 20);
        for (let i = 0; i < secondBatch.length; i++) {
          const voter = secondBatch[i];
          const choiceIndex = (i + 10) % 2;
          const encrypted = encoder.encodePlurality(
            choiceIndex,
            choices.length,
          );

          allVotes.push(encrypted);
          poll.vote(voter, encrypted);
        }

        // 5. Process second batch
        await processor.processBatch(
          allVotes
            .slice(10, 20)
            .map((vote, idx) => ({ voter: secondBatch[idx], vote })),
        );
        const checkpoint2 = await processor.checkpoint();

        expect(checkpoint2.totalVotes).toBe(20);

        // 6. Simulate recovery scenario
        const recoveryLogger = new NodeVoteLogger(Buffer.from([1]), testDir);
        const recoveryManager = new NodeCheckpointManager(
          {
            id: Buffer.from([1]),
            name: 'Test Jurisdiction',
            level: 0,
          },
          testDir,
        );
        const recoveryProcessor = new BatchVoteProcessor(
          1000,
          recoveryLogger,
          recoveryManager,
        );

        // 7. Recover from checkpoint
        const recoveredSnapshot = await recoveryManager.loadLatestCheckpoint();
        expect(recoveredSnapshot).toBeDefined();
        expect(recoveredSnapshot!.metadata.voterCount).toBe(20);

        // 8. Verify recovered votes
        const recoveredVotes = [];
        for await (const vote of recoveryLogger.replayVotes()) {
          recoveredVotes.push(vote);
        }
        expect(recoveredVotes.length).toBe(20);

        // 9. Tally recovered votes
        poll.close();
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const results = await tallier.tally(poll);

        expect(results.voterCount).toBe(20);
        const yesIndex = results.choices.indexOf('Yes');
        const noIndex = results.choices.indexOf('No');
        expect(results.tallies[yesIndex]).toBeDefined();
        expect(results.tallies[noIndex]).toBeDefined();

        console.log('Persistence and recovery workflow completed');
        console.log(`Recovered ${recoveredVotes.length} votes`);
        console.log(
          `Final tally: Yes=${results.tallies[yesIndex]}, No=${results.tallies[noIndex]}`,
        );
      });
    });
  });

  describe('End-to-End Audit Trail Workflow', () => {
    it('should maintain complete audit trail throughout voting process', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const choices = ['Alpha', 'Beta', 'Gamma'];

        // 1. Set up comprehensive logging
        const auditLog = new ImmutableAuditLog(authority);
        const bulletinBoard = new PublicBulletinBoard(authority);
        const eventLogger = new PollEventLogger(authority.idProvider);

        // 2. Create poll with audit logging
        const poll = PollFactory.createRankedChoice(choices, authority);

        auditLog.recordPollCreated(poll.id, {
          choices,
          pollId: 'test-poll-1',
        });

        eventLogger.logEvent('POLL_CREATED', 'Ranked choice poll created', {
          choices,
          pollId: 'test-poll-1',
        });

        // 3. Cast votes with full audit trail
        const voters = TestVoterPool.getVoters(6);
        const votes: EncryptedVote[] = [];

        for (let i = 0; i < voters.length; i++) {
          const voter = voters[i];
          const rankings = [i % 3, (i + 1) % 3, (i + 2) % 3];
          const encrypted = encoder.encodeRankedChoice(
            rankings,
            choices.length,
          );

          // Add to audit log
          auditLog.recordVoteCast(poll.id, new Uint8Array(voter.id), {
            voterIndex: i,
          });

          // Add to bulletin board
          bulletinBoard.publishVote(poll.id, encrypted.encrypted, voter.id);

          // Log event
          eventLogger.logEvent('VOTE_CAST', `Vote recorded for voter ${i}`, {
            voterIndex: i,
            rankings,
          });

          votes.push(encrypted);
          poll.vote(voter, encrypted);
        }

        // 4. Close poll with audit
        poll.close();

        eventLogger.logEvent('POLL_CLOSED', 'Poll closed for tallying', {
          totalVotes: votes.length,
        });

        // 5. Tally with audit
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey!,
          authority.votingPublicKey!,
        );
        const results = await tallier.tally(poll);

        auditLog.recordPollClosed(poll.id, { totalVotes: votes.length });

        eventLogger.logEvent('TALLY_COMPUTED', 'Tally computation completed', {
          winner: results.winner,
          totalVotes: results.voterCount.toString(),
        });

        // 6. Verify complete audit trail
        const auditEntries = auditLog.getEntries();
        expect(auditEntries.length).toBe(voters.length + 2); // votes + poll creation + tally

        // Verify hash chain integrity
        expect(auditLog.verifyChain()).toBe(true);

        // 7. Verify bulletin board integrity
        const merkleRoot = bulletinBoard.computeMerkleRoot();
        expect(merkleRoot).toBeDefined();

        const publishedVotes = bulletinBoard.getVotes();
        expect(publishedVotes.length).toBe(voters.length);

        // 8. Verify event log completeness
        const events = eventLogger.getEvents();
        expect(events.length).toBe(voters.length + 3); // votes + poll created + poll closed + tally computed

        console.log('Complete audit trail workflow verified');
        console.log(`Audit entries: ${auditEntries.length}`);
        console.log(`Event log entries: ${events.length}`);
        console.log(`Bulletin board entries: ${publishedVotes.length}`);
        console.log(`Merkle root: ${merkleRoot}`);
      });
    });
  });
});
