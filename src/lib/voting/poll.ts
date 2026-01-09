/**
 * VotingPoll - High-level interface for secure, verifiable polls
 * Node.js optimized with native crypto and Buffer
 */
import { createHash, randomBytes } from 'crypto';

import { KeyPair as PaillierKeyPair } from 'paillier-bigint';

import { getNodeRuntimeConfiguration } from '../../constants';
import type { PlatformID } from '../../interfaces';
import { Member } from '../../member';
import { ECIESService } from '../../services/ecies/service';
import { VotingService } from '../../services/voting.service';
import { SignatureBuffer } from '../../types';
const Constants = getNodeRuntimeConfiguration();

export interface ECKeyPairBuffer {
  privateKey: Buffer;
  publicKey: Buffer;
}

/**
 * Result of a voting poll with decrypted tallies
 */
export interface VotingPollResults {
  /** Total number of votes cast */
  totalVotes: bigint;
  /** Tallies for each choice */
  tallies: bigint[];
  /** Choice names */
  choices: string[];
  /** Percentage for each choice (0-100) */
  percentages: number[];
  /** Index of the winning choice */
  winnerIndex: number;
  /** Name of the winning choice */
  winnerName: string;
  /** Number of unique voters */
  voterCount: number;
}

/**
 * VotingPoll provides a high-level interface for conducting secure, verifiable polls
 * using Paillier homomorphic encryption.
 *
 * Features:
 * - Privacy-preserving vote aggregation (votes remain encrypted until tally)
 * - Verifiable receipts for each voter
 * - Multiple tallying and analysis methods
 * - Ranked choice voting support
 * - Weighted voting support
 */
export class VotingPoll<TID extends PlatformID = Buffer> {
  public readonly choices: string[];
  public readonly votes: bigint[];
  private readonly paillierKeyPair: PaillierKeyPair;
  private readonly ecKeyPair: ECKeyPairBuffer;
  private readonly eciesService: ECIESService;
  public readonly receipts: Map<string, Buffer> = new Map<string, Buffer>();
  private readonly createdAt: Date;
  private closedAt?: Date;

  constructor(
    eciesService: ECIESService,
    choices: string[],
    paillierKeyPair: PaillierKeyPair,
    ecKeyPair: ECKeyPairBuffer,
    votes: bigint[],
  ) {
    this.eciesService = eciesService;
    if (choices.length === 0) {
      throw new Error('Poll must have at least one choice');
    }
    if (choices.length !== votes.length) {
      throw new Error('Number of choices must match number of vote tallies');
    }
    this.choices = choices;
    this.paillierKeyPair = paillierKeyPair;
    this.ecKeyPair = ecKeyPair;
    this.votes = votes;
    this.createdAt = new Date();
  }

  public async generateEncryptedReceipt(member: Member<TID>): Promise<Buffer> {
    const randomNonce = randomBytes(16).toString(
      Constants.VOTING.KEY_FORMAT as BufferEncoding,
    );
    const memberId = member.idProvider.serialize(
      member.idProvider.toBytes(member.id),
    );
    const hashInput = `${Date.now()}-${randomNonce}-${memberId}`;
    const hash = createHash('sha256').update(hashInput).digest();
    const signature = this.eciesService.signMessage(
      this.ecKeyPair.privateKey,
      hash,
    );
    const receipt = Buffer.concat([hash, signature]);
    // Encrypt to the poll's public key so the poll can decrypt and verify later
    const encryptedReceipt = this.eciesService.encryptSimpleOrSingle(
      false,
      this.ecKeyPair.publicKey,
      receipt,
    );
    this.receipts.set(memberId, encryptedReceipt);
    return encryptedReceipt;
  }

  public memberVoted(member: Member<TID>): boolean {
    const memberId = member.idProvider.serialize(
      member.idProvider.toBytes(member.id),
    );
    return this.receipts.has(memberId);
  }

  public verifyReceipt(member: Member<TID>, encryptedReceipt: Buffer): boolean {
    const memberId = member.idProvider.serialize(
      member.idProvider.toBytes(member.id),
    );
    const foundReceipt = this.receipts.get(memberId);
    if (!foundReceipt) {
      return false;
    }
    if (!foundReceipt.equals(encryptedReceipt)) {
      return false;
    }
    const decryptedReceipt = this.eciesService.decryptSimpleOrSingleWithHeader(
      false,
      this.ecKeyPair.privateKey,
      encryptedReceipt,
    );
    const hash = decryptedReceipt.subarray(0, 32);
    const signature = decryptedReceipt.subarray(32) as SignatureBuffer;
    return this.eciesService.verifyMessage(
      this.ecKeyPair.publicKey,
      hash,
      signature,
    );
  }

  public async vote(choiceIndex: number, member: Member<TID>): Promise<Buffer> {
    if (this.isClosed) {
      throw new Error('Poll is closed');
    }
    if (this.memberVoted(member)) {
      throw new Error('Member has already voted');
    }
    if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
      throw new Error(`Invalid option index ${choiceIndex}`);
    }
    // vote a 1 for the selected candidate and a 0 for all others
    for (let i = 0; i < this.choices.length; i++) {
      if (i == choiceIndex) {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(
          this.votes[i],
          this.paillierKeyPair.publicKey.encrypt(1n),
        );
      } else {
        this.votes[i] = this.paillierKeyPair.publicKey.addition(
          this.votes[i],
          this.paillierKeyPair.publicKey.encrypt(0n),
        );
      }
    }
    return await this.generateEncryptedReceipt(member);
  }

  public async voteWeighted(
    choiceIndex: number,
    weight: bigint,
    member: Member<TID>,
  ): Promise<Buffer> {
    if (this.isClosed) {
      throw new Error('Poll is closed');
    }
    if (this.memberVoted(member)) {
      throw new Error('Member has already voted');
    }
    if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
      throw new Error(`Invalid option index ${choiceIndex}`);
    }
    if (weight <= 0n) {
      throw new Error('Vote weight must be positive');
    }

    // Add weighted vote to selected choice
    this.votes[choiceIndex] = this.paillierKeyPair.publicKey.addition(
      this.votes[choiceIndex],
      this.paillierKeyPair.publicKey.encrypt(weight),
    );

    return await this.generateEncryptedReceipt(member);
  }

  public async voteRanked(
    rankedChoices: number[],
    member: Member<TID>,
  ): Promise<Buffer> {
    if (this.isClosed) {
      throw new Error('Poll is closed');
    }
    if (this.memberVoted(member)) {
      throw new Error('Member has already voted');
    }
    if (rankedChoices.length === 0) {
      throw new Error('Must provide at least one ranked choice');
    }

    // Validate all choices are valid and unique
    const seen = new Set<number>();
    for (const choiceIndex of rankedChoices) {
      if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
        throw new Error(`Invalid choice index ${choiceIndex}`);
      }
      if (seen.has(choiceIndex)) {
        throw new Error(`Duplicate choice index ${choiceIndex}`);
      }
      seen.add(choiceIndex);
    }

    // Award points based on ranking (first choice gets highest points)
    const maxPoints = BigInt(rankedChoices.length);
    for (let i = 0; i < rankedChoices.length; i++) {
      const choiceIndex = rankedChoices[i];
      const points = maxPoints - BigInt(i); // First choice gets n points, second gets n-1, etc.
      this.votes[choiceIndex] = this.paillierKeyPair.publicKey.addition(
        this.votes[choiceIndex],
        this.paillierKeyPair.publicKey.encrypt(points),
      );
    }

    return await this.generateEncryptedReceipt(member);
  }

  public async voteApproval(
    approvedChoices: number[],
    member: Member<TID>,
  ): Promise<Buffer> {
    if (this.isClosed) {
      throw new Error('Poll is closed');
    }
    if (this.memberVoted(member)) {
      throw new Error('Member has already voted');
    }
    if (approvedChoices.length === 0) {
      throw new Error('Must approve at least one choice');
    }

    // Validate all choices and check for duplicates
    const seen = new Set<number>();
    for (const choiceIndex of approvedChoices) {
      if (choiceIndex < 0 || choiceIndex >= this.choices.length) {
        throw new Error(`Invalid choice index ${choiceIndex}`);
      }
      if (seen.has(choiceIndex)) {
        throw new Error(`Duplicate choice index ${choiceIndex}`);
      }
      seen.add(choiceIndex);
    }

    // Add 1 vote to each approved choice
    for (const choiceIndex of approvedChoices) {
      this.votes[choiceIndex] = this.paillierKeyPair.publicKey.addition(
        this.votes[choiceIndex],
        this.paillierKeyPair.publicKey.encrypt(1n),
      );
    }

    return await this.generateEncryptedReceipt(member);
  }

  public get tallies(): bigint[] {
    return this.votes.map((encryptedVote) =>
      this.paillierKeyPair.privateKey.decrypt(encryptedVote),
    );
  }

  public getTally(choiceIndex: number): bigint {
    return this.paillierKeyPair.privateKey.decrypt(this.votes[choiceIndex]);
  }

  public get leadingChoice(): string {
    const tallies = this.tallies;
    let leadingOptionIndex = 0;
    for (let i = 1; i < tallies.length; i++) {
      if (tallies[i] > tallies[leadingOptionIndex]) {
        leadingOptionIndex = i;
      }
    }
    return this.choices[leadingOptionIndex];
  }

  /**
   * Get the index of the leading choice
   */
  public get leadingChoiceIndex(): number {
    const tallies = this.tallies;
    let leadingOptionIndex = 0;
    for (let i = 1; i < tallies.length; i++) {
      if (tallies[i] > tallies[leadingOptionIndex]) {
        leadingOptionIndex = i;
      }
    }
    return leadingOptionIndex;
  }

  /**
   * Get complete poll results with percentages and winner
   */
  public getResults(): VotingPollResults {
    const tallies = this.tallies;
    const totalVotes = tallies.reduce((sum, tally) => sum + tally, 0n);
    const percentages = tallies.map((tally) =>
      totalVotes > 0n ? Number((tally * 10000n) / totalVotes) / 100 : 0,
    );

    return {
      totalVotes,
      tallies,
      choices: [...this.choices],
      percentages,
      winnerIndex: this.leadingChoiceIndex,
      winnerName: this.leadingChoice,
      voterCount: this.receipts.size,
    };
  }

  /**
   * Get sorted results (descending by vote count)
   */
  public getSortedResults(): Array<{
    choice: string;
    index: number;
    tally: bigint;
    percentage: number;
  }> {
    const results = this.getResults();
    return this.choices
      .map((choice, index) => ({
        choice,
        index,
        tally: results.tallies[index],
        percentage: results.percentages[index],
      }))
      .sort((a, b) => (b.tally > a.tally ? 1 : b.tally < a.tally ? -1 : 0));
  }

  /**
   * Check if there is a tie for first place
   */
  public get hasTie(): boolean {
    const tallies = this.tallies;
    const maxTally = tallies.reduce(
      (max, tally) => (tally > max ? tally : max),
      0n,
    );
    return tallies.filter((tally) => tally === maxTally).length > 1;
  }

  /**
   * Get all choices tied for first place
   */
  public get tiedChoices(): string[] {
    if (!this.hasTie) {
      return [];
    }
    const tallies = this.tallies;
    const maxTally = tallies.reduce(
      (max, tally) => (tally > max ? tally : max),
      0n,
    );
    return this.choices.filter((_, index) => tallies[index] === maxTally);
  }

  /**
   * Get total number of unique voters
   */
  public get voterCount(): number {
    return this.receipts.size;
  }

  /**
   * Get total encrypted votes (sum of all choice tallies)
   * Note: This returns encrypted sum - decrypt with getTotalVotes()
   */
  public get encryptedTotalVotes(): bigint {
    return this.votes.reduce(
      (sum, vote) => this.paillierKeyPair.publicKey.addition(sum, vote),
      this.paillierKeyPair.publicKey.encrypt(0n),
    );
  }

  /**
   * Get total decrypted vote count
   */
  public getTotalVotes(): bigint {
    return this.paillierKeyPair.privateKey.decrypt(this.encryptedTotalVotes);
  }

  /**
   * Close the poll (no more votes can be cast)
   */
  public close(): void {
    if (this.isClosed) {
      throw new Error('Poll is already closed');
    }
    this.closedAt = new Date();
  }

  /**
   * Check if poll is closed
   */
  public get isClosed(): boolean {
    return this.closedAt !== undefined;
  }

  /**
   * Get poll creation timestamp
   */
  public get createdAtTimestamp(): Date {
    return new Date(this.createdAt);
  }

  /**
   * Get poll closed timestamp (undefined if not closed)
   */
  public get closedAtTimestamp(): Date | undefined {
    return this.closedAt ? new Date(this.closedAt) : undefined;
  }

  /**
   * Get poll duration in milliseconds (undefined if not closed)
   */
  public get durationMs(): number | undefined {
    if (!this.closedAt) {
      return undefined;
    }
    return this.closedAt.getTime() - this.createdAt.getTime();
  }

  public static newPoll<TID extends PlatformID = Buffer>(
    eciesService: ECIESService,
    choices: string[],
    paillierKeyPair: PaillierKeyPair,
    ecKeyPair: ECKeyPairBuffer,
  ): VotingPoll<TID> {
    const votes = new Array<bigint>(choices.length);
    for (let i = 0; i < choices.length; i++) {
      votes[i] = paillierKeyPair.publicKey.encrypt(0n);
    }

    return new VotingPoll<TID>(
      eciesService,
      choices,
      paillierKeyPair,
      ecKeyPair,
      votes,
    );
  }

  public static async newPollWithKeys<TID extends PlatformID = Buffer>(
    eciesService: ECIESService,
    votingService: VotingService,
    choices: string[],
  ): Promise<{
    poll: VotingPoll<TID>;
    paillierKeyPair: PaillierKeyPair;
    ecKeyPair: ECKeyPairBuffer;
  }> {
    const mnemonic = eciesService.generateNewMnemonic();
    const keyPair = eciesService.mnemonicToSimpleKeyPair(mnemonic);
    const ecKeyPair: ECKeyPairBuffer = {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
    };
    const paillierKeyPair = await votingService.deriveVotingKeysFromECDH(
      ecKeyPair.privateKey,
      ecKeyPair.publicKey,
    );
    const poll = VotingPoll.newPoll<TID>(
      eciesService,
      choices,
      paillierKeyPair,
      ecKeyPair,
    );
    return { poll, paillierKeyPair, ecKeyPair };
  }
}
