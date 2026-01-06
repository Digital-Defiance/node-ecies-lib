/**
 * Voting Poll System Interfaces (Node.js Buffer version)
 *
 * Node.js-specific interfaces for the voting poll system using Buffer instead of Uint8Array.
 * These interfaces ensure type safety and API consistency with the browser version.
 */

import type { PublicKey, PrivateKey, KeyPair } from 'paillier-bigint';

/**
 * Voting methods supported by the poll system
 */
export enum VotingMethod {
  // Fully homomorphic (single-round, privacy-preserving)
  Plurality = 'plurality',
  Approval = 'approval',
  Weighted = 'weighted',
  Borda = 'borda',
  Score = 'score',
  YesNo = 'yes-no',
  YesNoAbstain = 'yes-no-abstain',
  Supermajority = 'supermajority',

  // Multi-round (requires decryption between rounds)
  RankedChoice = 'ranked-choice',
  TwoRound = 'two-round',
  STAR = 'star',
  STV = 'stv',

  // Insecure (requires non-additive operations)
  Quadratic = 'quadratic',
  Consensus = 'consensus',
  ConsentBased = 'consent-based',
}

/**
 * Vote receipt proving participation.
 * Cryptographically signed proof that a vote was cast.
 */
export interface IVoteReceipt {
  /** Unique identifier of the voter */
  voterId: Buffer;
  /** Unique identifier of the poll */
  pollId: Buffer;
  /** Unix timestamp when vote was cast */
  timestamp: number;
  /** Cryptographic signature from poll authority */
  signature: Buffer;
  /** Random nonce for uniqueness */
  nonce: Buffer;
}

/**
 * Encrypted vote data using Paillier homomorphic encryption.
 * Structure varies by voting method.
 */
export interface IEncryptedVote {
  /** Single choice index (for Plurality, Weighted, etc.) */
  choiceIndex?: number;
  /** Multiple choice indices (for Approval voting) */
  choices?: number[];
  /** Ranked choice indices in preference order (for RCV, Borda) */
  rankings?: number[];
  /** Vote weight (for Weighted voting) */
  weight?: bigint;
  /** Score value 0-10 (for Score voting) */
  score?: number;
  /** Array of encrypted vote values (one per choice) */
  encrypted: bigint[];
  /** Plaintext vote data (only for insecure methods) */
  plaintext?: IPlaintextVote;
}

/**
 * Plaintext vote data for insecure voting methods.
 * WARNING: Only use for Quadratic, Consensus, or ConsentBased methods.
 */
export interface IPlaintextVote {
  /** Unique identifier of the voter */
  voterId: Buffer;
  /** Single choice index */
  choiceIndex?: number;
  /** Multiple choice indices */
  choices?: number[];
  /** Vote weight */
  weight?: bigint;
  /** Objection text (for consent-based voting) */
  objection?: string;
}

/**
 * Results of a completed poll after tallying.
 * Includes winner(s), tallies, and round-by-round data for multi-round methods.
 */
export interface IPollResults {
  /** Voting method used */
  method: VotingMethod;
  /** Array of choice names */
  choices: string[];
  /** Index of winning choice (undefined if tie) */
  winner?: number;
  /** Indices of tied winners (for ties or multi-winner methods) */
  winners?: number[];
  /** Indices of eliminated choices (for RCV) */
  eliminated?: number[];
  /** Round-by-round results (for multi-round methods) */
  rounds?: IRoundResult[];
  /** Final vote tallies for each choice */
  tallies: bigint[];
  /** Total number of unique voters */
  voterCount: number;
}

/**
 * Results from a single round of multi-round voting.
 * Used in RCV, Two-Round, STAR, and STV methods.
 */
export interface IRoundResult {
  /** Round number (1-indexed) */
  round: number;
  /** Vote tallies for this round */
  tallies: bigint[];
  /** Index of choice eliminated this round (if any) */
  eliminated?: number;
  /** Index of winner determined this round (if any) */
  winner?: number;
}

/**
 * Configuration for supermajority voting.
 * Defines the required threshold as a fraction (e.g., 2/3, 3/4).
 */
export interface ISupermajorityConfig {
  /** Numerator of the fraction (e.g., 2 for 2/3) */
  numerator: number;
  /** Denominator of the fraction (e.g., 3 for 2/3) */
  denominator: number;
}

/**
 * Member interface for voting operations.
 * Extends base member with voting-specific capabilities.
 */
export interface IVotingMember {
  /** Unique identifier of the member */
  readonly id: Buffer;
  /** ECDSA public key for signing */
  readonly publicKey: Buffer;
  /** Paillier public key for vote encryption (optional) */
  readonly votingPublicKey?: PublicKey;
  /** Paillier private key for vote decryption (optional) */
  readonly votingPrivateKey?: PrivateKey;
  /**
   * Sign data with member's private key.
   * @param data - Data to sign
   * @returns Signature
   */
  sign(data: Buffer): Buffer;
  /**
   * Verify signature against data.
   * @param signature - Signature to verify
   * @param data - Original data
   * @returns True if signature is valid
   */
  verify(signature: Buffer, data: Buffer): boolean;
}

/**
 * Poll interface for vote aggregation and management.
 * Holds encrypted votes and issues receipts, but cannot decrypt votes.
 */
export interface IPoll {
  /** Unique identifier of the poll */
  readonly id: Buffer;
  /** Array of choice names */
  readonly choices: ReadonlyArray<string>;
  /** Voting method used */
  readonly method: VotingMethod;
  /** Whether poll is closed to new votes */
  readonly isClosed: boolean;
  /** Total number of unique voters */
  readonly voterCount: number;
  /** Unix timestamp when poll was created */
  readonly createdAt: number;
  /** Unix timestamp when poll was closed (undefined if open) */
  readonly closedAt: number | undefined;

  /**
   * Cast a vote in the poll.
   * @param voter - Member casting the vote
   * @param vote - Encrypted vote data
   * @returns Vote receipt
   * @throws Error if poll is closed or voter already voted
   */
  vote(voter: IVotingMember, vote: IEncryptedVote): IVoteReceipt;

  /**
   * Verify a vote receipt is valid.
   * @param voter - Member who cast the vote
   * @param receipt - Receipt to verify
   * @returns True if receipt is valid
   */
  verifyReceipt(voter: IVotingMember, receipt: IVoteReceipt): boolean;

  /**
   * Close the poll to new votes.
   * @throws Error if poll is already closed
   */
  close(): void;

  /**
   * Get encrypted votes for tallying (read-only).
   * @returns Map of voter ID to encrypted vote data
   */
  getEncryptedVotes(): ReadonlyMap<string, readonly bigint[]>;
}

/**
 * Vote encoder interface for encrypting votes.
 * Converts vote choices into encrypted Paillier ciphertexts.
 */
export interface IVoteEncoder {
  /**
   * Encode a plurality vote (single choice).
   * @param choiceIndex - Index of chosen option
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encodePlurality(choiceIndex: number, choiceCount: number): IEncryptedVote;
  /**
   * Encode an approval vote (multiple choices).
   * @param choices - Indices of approved options
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encodeApproval(choices: number[], choiceCount: number): IEncryptedVote;
  /**
   * Encode a weighted vote.
   * @param choiceIndex - Index of chosen option
   * @param weight - Vote weight (must be positive)
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encodeWeighted(
    choiceIndex: number,
    weight: bigint,
    choiceCount: number,
  ): IEncryptedVote;
  /**
   * Encode a Borda count vote (ranked with points).
   * @param rankings - Indices in preference order
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encodeBorda(rankings: number[], choiceCount: number): IEncryptedVote;
  /**
   * Encode a ranked choice vote (for IRV).
   * @param rankings - Indices in preference order
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encodeRankedChoice(rankings: number[], choiceCount: number): IEncryptedVote;
  /**
   * Encode vote based on method.
   * @param method - Voting method
   * @param data - Vote data
   * @param choiceCount - Total number of choices
   * @returns Encrypted vote
   */
  encode(
    method: VotingMethod,
    data: {
      choiceIndex?: number;
      choices?: number[];
      rankings?: number[];
      weight?: bigint;
    },
    choiceCount: number,
  ): IEncryptedVote;
}

/**
 * Poll tallier interface for decrypting and tallying votes.
 * Holds private key and can decrypt results after poll closes.
 */
export interface IPollTallier {
  /**
   * Tally votes and determine winner(s).
   * @param poll - Poll to tally
   * @returns Poll results
   * @throws Error if poll is not closed
   */
  tally(poll: IPoll): IPollResults;
  /**
   * Tally ranked choice votes using IRV algorithm.
   * @param poll - Poll to tally
   * @returns Poll results with elimination rounds
   */
  tallyRankedChoice(poll: IPoll): IPollResults;
}

/**
 * Poll factory interface for creating polls.
 */
export interface IPollFactory {
  /**
   * Create a poll with specified method.
   * @param choices - Array of choice names
   * @param method - Voting method
   * @param authority - Poll authority
   * @param options - Optional configuration
   * @returns New poll
   */
  create(
    choices: string[],
    method: VotingMethod,
    authority: IVotingMember,
    options?: { maxWeight?: bigint },
  ): IPoll;
  /**
   * Create a plurality poll.
   * @param choices - Array of choice names
   * @param authority - Poll authority
   * @returns New poll
   */
  createPlurality(choices: string[], authority: IVotingMember): IPoll;
  /**
   * Create an approval voting poll.
   * @param choices - Array of choice names
   * @param authority - Poll authority
   * @returns New poll
   */
  createApproval(choices: string[], authority: IVotingMember): IPoll;
  /**
   * Create a weighted voting poll.
   * @param choices - Array of choice names
   * @param authority - Poll authority
   * @param maxWeight - Maximum vote weight
   * @returns New poll
   */
  createWeighted(
    choices: string[],
    authority: IVotingMember,
    maxWeight: bigint,
  ): IPoll;
  /**
   * Create a Borda count poll.
   * @param choices - Array of choice names
   * @param authority - Poll authority
   * @returns New poll
   */
  createBorda(choices: string[], authority: IVotingMember): IPoll;
  /**
   * Create a ranked choice poll.
   * @param choices - Array of choice names
   * @param authority - Poll authority
   * @returns New poll
   */
  createRankedChoice(choices: string[], authority: IVotingMember): IPoll;
}

/**
 * Options for deriving Paillier voting keys from ECDH keys.
 */
export interface IVotingKeyDerivationOptions {
  /** Elliptic curve name (default: 'secp256k1') */
  curveName?: string;
  /** Public key magic byte (default: 0x04) */
  publicKeyMagic?: number;
  /** Raw public key length (default: 64) */
  rawPublicKeyLength?: number;
  /** Public key length with prefix (default: 65) */
  publicKeyLength?: number;
  /** HMAC algorithm (default: 'sha512') */
  hmacAlgorithm?: string;
  /** HKDF info string (default: 'PaillierPrimeGen') */
  hkdfInfo?: string;
  /** HKDF output length (default: 64) */
  hkdfLength?: number;
  /** Key pair bit length (default: 3072) */
  keypairBitLength?: number;
  /** Prime test iterations (default: 256) */
  primeTestIterations?: number;
  /** Max prime generation attempts (default: 20000) */
  maxPrimeAttempts?: number;
}

/**
 * Security level classification for voting methods.
 * Determines cryptographic security guarantees.
 */
export enum SecurityLevel {
  /** Fully homomorphic - no intermediate decryption required */
  FullyHomomorphic = 'fully-homomorphic',
  /** Multi-round - requires intermediate decryption between rounds */
  MultiRound = 'multi-round',
  /** Insecure - cannot be made secure with Paillier encryption */
  Insecure = 'insecure',
}

/**
 * Voting security validator interface.
 * Validates voting methods against security requirements.
 */
export interface IVotingSecurityValidator {
  /**
   * Check if voting method is fully secure (no intermediate decryption).
   * @param method - Voting method to check
   * @returns True if method is fully homomorphic
   */
  isFullySecure(method: VotingMethod): boolean;

  /**
   * Check if voting method requires multiple rounds.
   * @param method - Voting method to check
   * @returns True if method requires intermediate decryption
   */
  requiresMultipleRounds(method: VotingMethod): boolean;

  /**
   * Get security level for voting method.
   * @param method - Voting method to check
   * @returns Security level classification
   */
  getSecurityLevel(method: VotingMethod): SecurityLevel;

  /**
   * Validate voting method against security requirements.
   * Throws error if method doesn't meet requirements.
   * @param method - Voting method to validate
   * @param options - Validation options
   * @throws Error if validation fails
   */
  validate(
    method: VotingMethod,
    options?: {
      requireFullySecure?: boolean;
      allowInsecure?: boolean;
    },
  ): void;
}

/**
 * Integrated ECIES service with voting support.
 * Provides access to voting key derivation and serialization.
 */
export interface IECIESServiceWithVoting {
  /** Voting service accessor */
  readonly voting: {
    /**
     * Derive Paillier voting keys from ECDH key pair.
     * @param ecdhPrivateKey - ECDH private key
     * @param ecdhPublicKey - ECDH public key
     * @param options - Derivation options
     * @returns Paillier key pair
     */
    deriveVotingKeysFromECDH(
      ecdhPrivateKey: Buffer,
      ecdhPublicKey: Buffer,
      options?: IVotingKeyDerivationOptions,
    ): Promise<KeyPair>;

    /**
     * Generate deterministic key pair from seed.
     * WARNING: For testing only!
     * @param seed - Random seed (min 32 bytes)
     * @param bitLength - Key bit length
     * @param iterations - Prime test iterations
     * @returns Paillier key pair
     */
    generateDeterministicKeyPair(
      seed: Buffer,
      bitLength?: number,
      iterations?: number,
    ): Promise<KeyPair>;

    /**
     * Serialize public key to buffer.
     * @param publicKey - Public key
     * @returns Serialized buffer
     */
    votingPublicKeyToBuffer(publicKey: PublicKey): Buffer | Promise<Buffer>;
    /**
     * Deserialize public key from buffer.
     * @param buffer - Serialized buffer
     * @returns Public key
     */
    bufferToVotingPublicKey(buffer: Buffer): Promise<PublicKey>;
    /**
     * Serialize private key to buffer.
     * @param privateKey - Private key
     * @returns Serialized buffer
     */
    votingPrivateKeyToBuffer(privateKey: PrivateKey): Buffer;
    /**
     * Deserialize private key from buffer.
     * @param buffer - Serialized buffer
     * @param publicKey - Corresponding public key
     * @returns Private key
     */
    bufferToVotingPrivateKey(
      buffer: Buffer,
      publicKey: PublicKey,
    ): Promise<PrivateKey>;
  };
}
