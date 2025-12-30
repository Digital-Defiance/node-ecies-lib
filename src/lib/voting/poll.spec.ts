/**
 * Tests for VotingPoll
 * Node.js optimized voting poll with Paillier homomorphic encryption
 */
import { KeyPair as PaillierKeyPair } from 'paillier-bigint';
import { Member } from '../../member';
import { ECIESService } from '../../services/ecies/service';
import { VotingService } from '../../services/voting.service';
import { ECKeyPairBuffer, VotingPoll, VotingPollResults } from './poll';
import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';

describe('VotingPoll', () => {
  let choices: string[];
  let paillierKeyPair: PaillierKeyPair;
  let ecKeyPair: ECKeyPairBuffer;
  let poll: VotingPoll;
  let member1: Member;
  let member2: Member;
  let member3: Member;
  let eciesService: ECIESService;
  let votingService: VotingService;

  beforeAll(async () => {
    eciesService = new ECIESService();
    votingService = VotingService.getInstance();
    choices = ['Alice', 'Bob', 'Charlie'];

    // Create test members once
    member1 = Member.newMember(
      eciesService,
      MemberType.User,
      'Member 1',
      new EmailString('member1@test.com'),
    ).member;
    member2 = Member.newMember(
      eciesService,
      MemberType.User,
      'Member 2',
      new EmailString('member2@test.com'),
    ).member;
    member3 = Member.newMember(
      eciesService,
      MemberType.User,
      'Member 3',
      new EmailString('member3@test.com'),
    ).member;

    // Generate keys ONCE for all tests
    const result = await VotingPoll.newPollWithKeys(
      eciesService,
      votingService,
      choices,
    );
    paillierKeyPair = result.paillierKeyPair;
    ecKeyPair = result.ecKeyPair;
  });

  beforeEach(() => {
    // Reuse keys, just create fresh poll
    poll = VotingPoll.newPoll(
      eciesService,
      choices,
      paillierKeyPair,
      ecKeyPair,
    );
  });

  describe('Constructor and Factory Methods', () => {
    it('should create a poll with choices', () => {
      expect(poll.choices).toEqual(choices);
      expect(poll.votes.length).toBe(choices.length);
    });

    it('should throw error for empty choices', () => {
      expect(() => {
        new VotingPoll(eciesService, [], paillierKeyPair, ecKeyPair, []);
      }).toThrow('Poll must have at least one choice');
    });

    it('should throw error for mismatched choices and votes', () => {
      expect(() => {
        new VotingPoll(eciesService, ['A', 'B'], paillierKeyPair, ecKeyPair, [
          1n,
        ]);
      }).toThrow('Number of choices must match number of vote tallies');
    });

    it('should create poll with newPoll factory', () => {
      const newPoll = VotingPoll.newPoll(
        eciesService,
        choices,
        paillierKeyPair,
        ecKeyPair,
      );
      expect(newPoll.choices).toEqual(choices);
    });

    it('should create poll with keys using newPollWithKeys', async () => {
      const result = await VotingPoll.newPollWithKeys(
        eciesService,
        votingService,
        ['Option A', 'Option B'],
      );
      expect(result.poll).toBeInstanceOf(VotingPoll);
      expect(result.paillierKeyPair).toBeDefined();
      expect(result.ecKeyPair).toBeDefined();
    });
  });

  describe('Basic Voting', () => {
    it('should allow a member to vote', async () => {
      const receipt = await poll.vote(0, member1);
      expect(receipt).toBeInstanceOf(Buffer);
      expect(poll.memberVoted(member1)).toBe(true);
    });

    it('should prevent double voting', async () => {
      await poll.vote(0, member1);
      await expect(poll.vote(1, member1)).rejects.toThrow(
        'Member has already voted',
      );
    });

    it('should reject invalid choice index', async () => {
      await expect(poll.vote(-1, member1)).rejects.toThrow(
        'Invalid option index',
      );
      await expect(poll.vote(10, member1)).rejects.toThrow(
        'Invalid option index',
      );
    });

    it('should track multiple voters', async () => {
      await poll.vote(0, member1);
      await poll.vote(1, member2);
      await poll.vote(2, member3);

      expect(poll.voterCount).toBe(3);
      expect(poll.memberVoted(member1)).toBe(true);
      expect(poll.memberVoted(member2)).toBe(true);
      expect(poll.memberVoted(member3)).toBe(true);
    });
  });

  describe('Weighted Voting', () => {
    it('should allow weighted voting', async () => {
      const receipt = await poll.voteWeighted(0, 5n, member1);
      expect(receipt).toBeInstanceOf(Buffer);
      expect(poll.getTally(0)).toBe(5n);
    });

    it('should reject zero or negative weights', async () => {
      await expect(poll.voteWeighted(0, 0n, member1)).rejects.toThrow(
        'Vote weight must be positive',
      );
      await expect(poll.voteWeighted(0, -1n, member1)).rejects.toThrow(
        'Vote weight must be positive',
      );
    });

    it('should accumulate weighted votes correctly', async () => {
      await poll.voteWeighted(0, 10n, member1);
      await poll.voteWeighted(0, 15n, member2);
      await poll.voteWeighted(1, 20n, member3);

      expect(poll.getTally(0)).toBe(25n);
      expect(poll.getTally(1)).toBe(20n);
      expect(poll.getTally(2)).toBe(0n);
    });
  });

  describe('Ranked Choice Voting', () => {
    it('should allow ranked choice voting', async () => {
      const receipt = await poll.voteRanked([1, 0, 2], member1);
      expect(receipt).toBeInstanceOf(Buffer);

      // First choice gets 3 points, second gets 2, third gets 1
      expect(poll.getTally(1)).toBe(3n); // Bob (first choice)
      expect(poll.getTally(0)).toBe(2n); // Alice (second choice)
      expect(poll.getTally(2)).toBe(1n); // Charlie (third choice)
    });

    it('should reject empty ranked choices', async () => {
      await expect(poll.voteRanked([], member1)).rejects.toThrow(
        'Must provide at least one ranked choice',
      );
    });

    it('should reject invalid choice indices in ranking', async () => {
      await expect(poll.voteRanked([0, 10], member1)).rejects.toThrow(
        'Invalid choice index',
      );
    });

    it('should reject duplicate choices in ranking', async () => {
      await expect(poll.voteRanked([0, 1, 0], member1)).rejects.toThrow(
        'Duplicate choice index',
      );
    });

    it('should calculate winner correctly with ranked voting', async () => {
      await poll.voteRanked([0, 1, 2], member1); // Alice: 3, Bob: 2, Charlie: 1
      await poll.voteRanked([1, 0, 2], member2); // Bob: 3, Alice: 2, Charlie: 1
      await poll.voteRanked([0, 2, 1], member3); // Alice: 3, Charlie: 2, Bob: 1

      const tallies = poll.tallies;
      expect(tallies[0]).toBe(8n); // Alice: 3+2+3 = 8
      expect(tallies[1]).toBe(6n); // Bob: 2+3+1 = 6
      expect(tallies[2]).toBe(4n); // Charlie: 1+1+2 = 4
      expect(poll.leadingChoice).toBe('Alice');
    });
  });

  describe('Approval Voting', () => {
    it('should allow approval voting', async () => {
      const receipt = await poll.voteApproval([0, 2], member1);
      expect(receipt).toBeInstanceOf(Buffer);

      expect(poll.getTally(0)).toBe(1n); // Alice approved
      expect(poll.getTally(1)).toBe(0n); // Bob not approved
      expect(poll.getTally(2)).toBe(1n); // Charlie approved
    });

    it('should reject empty approvals', async () => {
      await expect(poll.voteApproval([], member1)).rejects.toThrow(
        'Must approve at least one choice',
      );
    });

    it('should reject invalid choice indices', async () => {
      await expect(poll.voteApproval([0, 10], member1)).rejects.toThrow(
        'Invalid choice index',
      );
    });

    it('should reject duplicate approvals', async () => {
      await expect(poll.voteApproval([0, 1, 0], member1)).rejects.toThrow(
        'Duplicate choice index',
      );
    });

    it('should accumulate approval votes correctly', async () => {
      await poll.voteApproval([0, 1], member1); // Approve Alice and Bob
      await poll.voteApproval([1, 2], member2); // Approve Bob and Charlie
      await poll.voteApproval([0], member3); // Approve only Alice

      expect(poll.getTally(0)).toBe(2n); // Alice: 2 approvals
      expect(poll.getTally(1)).toBe(2n); // Bob: 2 approvals
      expect(poll.getTally(2)).toBe(1n); // Charlie: 1 approval
    });
  });

  describe('Tallying and Results', () => {
    let votedPoll: VotingPoll;

    beforeEach(async () => {
      votedPoll = VotingPoll.newPoll(
        eciesService,
        choices,
        paillierKeyPair,
        ecKeyPair,
      );
      await votedPoll.vote(0, member1);
      await votedPoll.vote(0, member2);
      await votedPoll.vote(1, member3);
    });

    it('should return correct tallies', () => {
      const tallies = votedPoll.tallies;
      expect(tallies[0]).toBe(2n);
      expect(tallies[1]).toBe(1n);
      expect(tallies[2]).toBe(0n);
    });

    it('should return correct tally for specific choice', () => {
      expect(votedPoll.getTally(0)).toBe(2n);
      expect(votedPoll.getTally(1)).toBe(1n);
      expect(votedPoll.getTally(2)).toBe(0n);
    });

    it('should identify leading choice', () => {
      expect(votedPoll.leadingChoice).toBe('Alice');
      expect(votedPoll.leadingChoiceIndex).toBe(0);
    });

    it('should return complete results', () => {
      const results: VotingPollResults = votedPoll.getResults();

      expect(results.totalVotes).toBe(3n);
      expect(results.tallies).toEqual([2n, 1n, 0n]);
      expect(results.choices).toEqual(choices);
      expect(results.percentages).toEqual([
        expect.closeTo(66.66, 0.01),
        expect.closeTo(33.33, 0.01),
        0,
      ]);
      expect(results.winnerIndex).toBe(0);
      expect(results.winnerName).toBe('Alice');
      expect(results.voterCount).toBe(3);
    });

    it('should return sorted results', () => {
      const sorted = votedPoll.getSortedResults();

      expect(sorted[0].choice).toBe('Alice');
      expect(sorted[0].tally).toBe(2n);
      expect(sorted[1].choice).toBe('Bob');
      expect(sorted[1].tally).toBe(1n);
      expect(sorted[2].choice).toBe('Charlie');
      expect(sorted[2].tally).toBe(0n);
    });

    it('should calculate total votes correctly', () => {
      expect(votedPoll.getTotalVotes()).toBe(3n);
    });
  });

  describe('Tie Detection', () => {
    it('should detect no tie when there is a clear winner', async () => {
      await poll.vote(0, member1);
      await poll.vote(0, member2);
      await poll.vote(1, member3);

      expect(poll.hasTie).toBe(false);
      expect(poll.tiedChoices).toEqual([]);
    });

    it('should detect tie between two choices', async () => {
      await poll.vote(0, member1);
      await poll.vote(1, member2);

      expect(poll.hasTie).toBe(true);
      expect(poll.tiedChoices).toContain('Alice');
      expect(poll.tiedChoices).toContain('Bob');
      expect(poll.tiedChoices.length).toBe(2);
    });

    it('should detect three-way tie', async () => {
      await poll.vote(0, member1);
      await poll.vote(1, member2);
      await poll.vote(2, member3);

      expect(poll.hasTie).toBe(true);
      expect(poll.tiedChoices).toEqual(choices);
    });
  });

  describe('Poll Lifecycle', () => {
    it('should track creation time', () => {
      const now = Date.now();
      const createdAt = poll.createdAtTimestamp.getTime();

      expect(createdAt).toBeGreaterThanOrEqual(now - 1000);
      expect(createdAt).toBeLessThanOrEqual(now + 1000);
    });

    it('should start as open', () => {
      expect(poll.isClosed).toBe(false);
      expect(poll.closedAtTimestamp).toBeUndefined();
    });

    it('should allow closing poll', () => {
      poll.close();

      expect(poll.isClosed).toBe(true);
      expect(poll.closedAtTimestamp).toBeDefined();
    });

    it('should throw error when closing already closed poll', () => {
      poll.close();
      expect(() => poll.close()).toThrow('Poll is already closed');
    });

    it('should prevent voting after close', async () => {
      poll.close();
      await expect(poll.vote(0, member1)).rejects.toThrow('Poll is closed');
    });

    it('should calculate poll duration', () => {
      // Wait a bit
      const waitTime = 100;
      const start = Date.now();
      while (Date.now() - start < waitTime) {
        // busy wait
      }

      poll.close();
      const duration = poll.durationMs;

      expect(duration).toBeDefined();
      expect(duration!).toBeGreaterThanOrEqual(waitTime - 10);
    });

    it('should return undefined duration for open poll', () => {
      expect(poll.durationMs).toBeUndefined();
    });
  });

  describe('Receipt Verification', () => {
    it('should generate verifiable receipts', async () => {
      const receipt = await poll.vote(0, member1);

      expect(poll.verifyReceipt(member1, receipt)).toBe(true);
    });

    it('should reject receipt for non-voter', async () => {
      const receipt = await poll.vote(0, member1);

      expect(poll.verifyReceipt(member2, receipt)).toBe(false);
    });

    it('should reject tampered receipt', async () => {
      const receipt = await poll.vote(0, member1);
      const tamperedReceipt = Buffer.from(receipt);
      tamperedReceipt[0] = tamperedReceipt[0] ^ 0xff; // Flip bits

      expect(poll.verifyReceipt(member1, tamperedReceipt)).toBe(false);
    });

    it('should store receipts for all voters', async () => {
      await poll.vote(0, member1);
      await poll.vote(1, member2);
      await poll.vote(2, member3);

      expect(poll.receipts.size).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle poll with single choice', async () => {
      const singlePoll = VotingPoll.newPoll(
        eciesService,
        ['Only Option'],
        paillierKeyPair,
        ecKeyPair,
      );
      await singlePoll.vote(0, member1);

      expect(singlePoll.getTally(0)).toBe(1n);
      expect(singlePoll.leadingChoice).toBe('Only Option');
    });

    it('should handle poll with no votes', () => {
      const results = poll.getResults();

      expect(results.totalVotes).toBe(0n);
      expect(results.percentages).toEqual([0, 0, 0]);
    });

    it('should handle large number of choices', async () => {
      const manyChoices = Array.from({ length: 100 }, (_, i) => `Option ${i}`);
      const largePoll = VotingPoll.newPoll(
        eciesService,
        manyChoices,
        paillierKeyPair,
        ecKeyPair,
      );

      await largePoll.vote(50, member1);
      expect(largePoll.getTally(50)).toBe(1n);
      expect(largePoll.leadingChoiceIndex).toBe(50);
    });
  });
});
