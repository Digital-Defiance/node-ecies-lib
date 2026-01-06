/**
 * Poll Tallier - Node.js optimized
 */
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import type { PlatformID } from '../../interfaces';
import type { IMember } from '../../interfaces/member';

import { Poll } from './poll-core';
import { VotingMethod, type PollResults, type RoundResult } from './types';

export class PollTallier<TID extends PlatformID = Buffer> {
  constructor(
    private readonly __authority: IMember<TID>,
    private readonly votingPrivateKey: PrivateKey,
    private readonly __votingPublicKey: PublicKey,
  ) {
    if (!__authority.votingPrivateKey)
      throw new Error('Authority must have private key');
  }

  tally(poll: Poll<TID>): PollResults {
    if (!poll.isClosed) throw new Error('Poll must be closed');
    const votes = poll.getEncryptedVotes();
    const choiceCount = poll.choices.length;
    switch (poll.method) {
      case VotingMethod.Plurality:
      case VotingMethod.Approval:
      case VotingMethod.Weighted:
        return this._tallyAdditive(poll, votes, choiceCount);
      case VotingMethod.Borda:
      case VotingMethod.Score:
        return this._tallyScored(poll, votes, choiceCount);
      case VotingMethod.YesNo:
      case VotingMethod.YesNoAbstain:
      case VotingMethod.Supermajority:
        return this._tallyYesNo(poll, votes, choiceCount);
      case VotingMethod.RankedChoice:
        return this._tallyRankedChoice(poll, votes, choiceCount);
      case VotingMethod.TwoRound:
        return this._tallyTwoRound(poll, votes, choiceCount);
      case VotingMethod.STAR:
        return this._tallySTAR(poll, votes, choiceCount);
      case VotingMethod.STV:
        return this._tallySTV(poll, votes, choiceCount);
      case VotingMethod.Quadratic:
        return this._tallyQuadratic(poll, votes, choiceCount);
      case VotingMethod.Consensus:
        return this._tallyConsensus(poll, votes, choiceCount);
      case VotingMethod.ConsentBased:
        return this._tallyConsentBased(poll, votes, choiceCount);
      default:
        throw new Error(`Unknown voting method: ${poll.method}`);
    }
  }

  private _tallyAdditive(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const tallies = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        tallies[i] += this.votingPrivateKey.decrypt(encrypted[i]) as bigint;
      }
    }
    const maxVotes = tallies.reduce((max, v) => (v > max ? v : max), 0n);
    const winners = tallies
      .map((v, i) => (v === maxVotes ? i : -1))
      .filter((i) => i >= 0);
    return {
      method: poll.method,
      choices: [...poll.choices],
      winner: winners.length === 1 ? winners[0] : undefined,
      winners: winners.length > 1 ? winners : undefined,
      tallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallyScored(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    return this._tallyAdditive(poll, votes, choiceCount);
  }

  private _tallyYesNo(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    return this._tallyAdditive(poll, votes, choiceCount);
  }

  private _tallyRankedChoice(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const rounds: RoundResult[] = [];
    const eliminated = new Set<number>();
    const rankings = this._decryptRankings(votes, choiceCount);
    let round = 0;
    while (true) {
      round++;
      const tallies = this._countFirstChoices(
        rankings,
        eliminated,
        choiceCount,
      );
      const totalVotes = tallies.reduce((sum, v) => sum + v, 0n);
      const majority = totalVotes / 2n;
      let maxVotes = 0n;
      for (let i = 0; i < choiceCount; i++) {
        if (!eliminated.has(i) && tallies[i] > maxVotes) maxVotes = tallies[i];
      }
      const topCandidates = tallies
        .map((v, i) => (!eliminated.has(i) && v === maxVotes ? i : -1))
        .filter((i) => i >= 0);
      rounds.push({
        round,
        tallies: [...tallies],
        eliminated: undefined,
        winner: undefined,
      });
      if (maxVotes > majority && topCandidates.length === 1) {
        rounds[rounds.length - 1].winner = topCandidates[0];
        return {
          method: VotingMethod.RankedChoice,
          choices: [...poll.choices],
          winner: topCandidates[0],
          eliminated: Array.from(eliminated),
          rounds,
          tallies,
          voterCount: poll.voterCount,
        };
      }
      const remaining = choiceCount - eliminated.size;
      if (remaining === 1) {
        const winner = tallies.findIndex((_, i) => !eliminated.has(i));
        rounds[rounds.length - 1].winner = winner;
        return {
          method: VotingMethod.RankedChoice,
          choices: [...poll.choices],
          winner,
          eliminated: Array.from(eliminated),
          rounds,
          tallies,
          voterCount: poll.voterCount,
        };
      }
      let minVotes = totalVotes;
      let toEliminate = -1;
      for (let i = choiceCount - 1; i >= 0; i--) {
        if (!eliminated.has(i) && tallies[i] <= minVotes) {
          minVotes = tallies[i];
          toEliminate = i;
        }
      }
      if (toEliminate === -1) break;
      eliminated.add(toEliminate);
      rounds[rounds.length - 1].eliminated = toEliminate;
    }
    const finalTallies = this._countFirstChoices(
      rankings,
      eliminated,
      choiceCount,
    );
    let maxVotes = 0n;
    let winner = 0;
    for (let i = 0; i < choiceCount; i++) {
      if (!eliminated.has(i) && finalTallies[i] > maxVotes) {
        maxVotes = finalTallies[i];
        winner = i;
      }
    }
    return {
      method: VotingMethod.RankedChoice,
      choices: [...poll.choices],
      winner,
      eliminated: Array.from(eliminated),
      rounds,
      tallies: finalTallies,
      voterCount: poll.voterCount,
    };
  }

  private _decryptRankings(
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): number[][] {
    const rankings: number[][] = [];
    for (const encrypted of votes.values()) {
      const rankedChoices: { choice: number; rank: number }[] = [];
      for (let i = 0; i < choiceCount; i++) {
        const rank = Number(this.votingPrivateKey.decrypt(encrypted[i]));
        if (rank > 0) rankedChoices.push({ choice: i, rank });
      }
      rankedChoices.sort((a, b) => a.rank - b.rank);
      rankings.push(rankedChoices.map((rc) => rc.choice));
    }
    return rankings;
  }

  private _countFirstChoices(
    rankings: number[][],
    eliminated: Set<number>,
    choiceCount: number,
  ): bigint[] {
    const tallies: bigint[] = new Array(choiceCount).fill(0n) as bigint[];
    for (const ranking of rankings) {
      for (const choice of ranking) {
        if (!eliminated.has(choice)) {
          tallies[choice]++;
          break;
        }
      }
    }
    return tallies;
  }

  private _tallyQuadratic(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const tallies = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        const weight = this.votingPrivateKey.decrypt(encrypted[i]) as bigint;
        tallies[i] += weight * weight;
      }
    }
    const maxVotes = tallies.reduce((max, v) => (v > max ? v : max), 0n);
    const winners = tallies
      .map((v, i) => (v === maxVotes ? i : -1))
      .filter((i) => i >= 0);
    return {
      method: VotingMethod.Quadratic,
      choices: [...poll.choices],
      winner: winners.length === 1 ? winners[0] : undefined,
      winners: winners.length > 1 ? winners : undefined,
      tallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallyConsensus(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const tallies = new Array(choiceCount).fill(0n) as bigint[];
    const totalVoters = BigInt(votes.size);
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        tallies[i] += this.votingPrivateKey.decrypt(encrypted[i]);
      }
    }
    const threshold = (totalVoters * 95n) / 100n;
    const winners = tallies
      .map((v, i) => (v >= threshold ? i : -1))
      .filter((i) => i >= 0);
    return {
      method: VotingMethod.Consensus,
      choices: [...poll.choices],
      winner: winners.length === 1 ? winners[0] : undefined,
      winners: winners.length > 0 ? winners : undefined,
      tallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallyConsentBased(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const tallies = new Array(choiceCount).fill(0n) as bigint[];
    const objections = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        const vote = this.votingPrivateKey.decrypt(encrypted[i]);
        if (vote > 0n) tallies[i]++;
        else if (vote < 0n) objections[i]++;
      }
    }
    const winners = objections
      .map((obj, i) => (obj === 0n ? i : -1))
      .filter((i) => i >= 0);
    return {
      method: VotingMethod.ConsentBased,
      choices: [...poll.choices],
      winner: winners.length === 1 ? winners[0] : undefined,
      winners: winners.length > 0 ? winners : undefined,
      tallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallyTwoRound(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const rounds: RoundResult[] = [];
    const tallies = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        tallies[i] += this.votingPrivateKey.decrypt(encrypted[i]) as bigint;
      }
    }
    const totalVotes = tallies.reduce((sum, v) => sum + v, 0n);
    const majority = totalVotes / 2n;
    rounds.push({ round: 1, tallies: [...tallies] });
    const maxVotes = tallies.reduce((max, v) => (v > max ? v : max), 0n);
    if (maxVotes > majority) {
      const winner = tallies.findIndex((v) => v === maxVotes);
      rounds[0].winner = winner;
      return {
        method: VotingMethod.TwoRound,
        choices: [...poll.choices],
        winner,
        rounds,
        tallies,
        voterCount: poll.voterCount,
      };
    }
    const sorted = tallies
      .map((v, i) => ({ votes: v, index: i }))
      .sort((a, b) => (b.votes > a.votes ? 1 : -1));
    const top2 = [sorted[0].index, sorted[1].index];
    const runoffTallies = new Array(choiceCount).fill(0n) as bigint[];
    runoffTallies[top2[0]] = sorted[0].votes;
    runoffTallies[top2[1]] = sorted[1].votes;
    const winner = sorted[0].index;
    rounds.push({ round: 2, tallies: runoffTallies, winner });
    return {
      method: VotingMethod.TwoRound,
      choices: [...poll.choices],
      winner,
      rounds,
      tallies: runoffTallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallySTAR(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const rounds: RoundResult[] = [];
    const scores = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      for (let i = 0; i < choiceCount; i++) {
        scores[i] += this.votingPrivateKey.decrypt(encrypted[i]);
      }
    }
    rounds.push({ round: 1, tallies: [...scores] });
    const sorted = scores
      .map((s, i) => ({ score: s, index: i }))
      .sort((a, b) => (b.score > a.score ? 1 : -1));
    const top2 = [sorted[0].index, sorted[1].index];
    const runoffTallies = new Array(choiceCount).fill(0n) as bigint[];
    for (const encrypted of votes.values()) {
      const score0 = this.votingPrivateKey.decrypt(encrypted[top2[0]]);
      const score1 = this.votingPrivateKey.decrypt(encrypted[top2[1]]);
      if (score0 > score1) runoffTallies[top2[0]]++;
      else if (score1 > score0) runoffTallies[top2[1]]++;
    }
    const winner =
      runoffTallies[top2[0]] >= runoffTallies[top2[1]] ? top2[0] : top2[1];
    rounds.push({ round: 2, tallies: runoffTallies, winner });
    return {
      method: VotingMethod.STAR,
      choices: [...poll.choices],
      winner,
      rounds,
      tallies: runoffTallies,
      voterCount: poll.voterCount,
    };
  }

  private _tallySTV(
    poll: Poll<TID>,
    votes: ReadonlyMap<string, readonly bigint[]>,
    choiceCount: number,
  ): PollResults {
    const rounds: RoundResult[] = [];
    const eliminated = new Set<number>();
    const winners: number[] = [];
    const rankings = this._decryptRankings(votes, choiceCount);
    const seatsToFill = Math.min(3, choiceCount);
    const quota = BigInt(votes.size) / BigInt(seatsToFill + 1) + 1n;
    let round = 0;
    while (winners.length < seatsToFill && eliminated.size < choiceCount) {
      round++;
      const tallies = this._countFirstChoices(
        rankings,
        eliminated,
        choiceCount,
      );
      rounds.push({ round, tallies: [...tallies] });
      const meetingQuota = tallies
        .map((v, i) =>
          !eliminated.has(i) && !winners.includes(i) && v >= quota ? i : -1,
        )
        .filter((i) => i >= 0);
      if (meetingQuota.length > 0) {
        winners.push(...meetingQuota);
        meetingQuota.forEach((i) => eliminated.add(i));
        rounds[rounds.length - 1].winner = meetingQuota[0];
        continue;
      }
      const remaining = tallies
        .map((v, i) =>
          !eliminated.has(i) && !winners.includes(i)
            ? { votes: v, index: i }
            : null,
        )
        .filter((x) => x !== null);
      if (remaining.length === 0) break;
      const minVotes = remaining.reduce(
        (min, x) => (x!.votes < min ? x!.votes : min),
        remaining[0]!.votes,
      );
      const toEliminate = remaining.find((x) => x!.votes === minVotes)!.index;
      eliminated.add(toEliminate);
      rounds[rounds.length - 1].eliminated = toEliminate;
    }
    const finalTallies = new Array(choiceCount).fill(0n) as bigint[];
    winners.forEach((w) => (finalTallies[w] = 1n));
    return {
      method: VotingMethod.STV,
      choices: [...poll.choices],
      winners,
      eliminated: Array.from(eliminated),
      rounds,
      tallies: finalTallies,
      voterCount: poll.voterCount,
    };
  }
}
