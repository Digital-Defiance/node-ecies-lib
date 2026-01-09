/**
 * Poll Core Tests
 * Tests Poll class functionality
 * Node.js version - adapted for Buffer usage
 */
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { MemberType, IECIESConstants } from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import { Poll } from './poll-core';
import { VotingMethod } from './enumerations';
import { BufferIdProvider } from '../../lib/id-providers/buffer-provider';
import type { IMember } from '../../interfaces/member';
import type { EncryptedVote } from './interfaces';

class MockMember implements IMember<Buffer> {
  public readonly idProvider = new BufferIdProvider(32, 'MockBuffer');
  public readonly type = MemberType.Individual;
  public readonly name = 'Mock Member';
  public readonly email = 'mock@example.com' as any;
  public readonly creatorId = Buffer.from([0]);
  public readonly dateCreated = new Date();
  public readonly dateUpdated = new Date();
  public readonly privateKey = undefined;
  public readonly wallet = {} as Wallet;
  public readonly constants = {} as IECIESConstants;

  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  get walletOptional(): Wallet | undefined {
    return undefined;
  }

  get hasPrivateKey(): boolean {
    return false;
  }

  get hasVotingPrivateKey(): boolean {
    return !!this.votingPrivateKey;
  }

  sign(data: Buffer): Buffer {
    // Generate unique signature based on data
    const sig = Buffer.alloc(64);
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      sig[i] = data[i];
    }
    return sig;
  }

  verify(signature: Buffer, data: Buffer): boolean {
    // Verify signature matches data
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      if (signature[i] !== data[i]) return false;
    }
    return true;
  }

  // Required methods from IMember interface
  unloadPrivateKey(): void {}
  unloadWallet(): void {}
  unloadWalletAndPrivateKey(): void {}
  loadWallet(): void {}
  loadPrivateKey(): void {}
  loadVotingKeys(): void {}
  deriveVotingKeys(): Promise<void> {
    return Promise.resolve();
  }
  unloadVotingPrivateKey(): void {}
}

describe('Poll', () => {
  let authority: MockMember;
  let voters: MockMember[];
  let poll: Poll;
  let keyPair: any;

  beforeAll(() => {
    keyPair = generateKeyPair(512);
    authority = new MockMember(
      Buffer.from([0]),
      Buffer.from([0]),
      keyPair.publicKey,
      keyPair.privateKey,
    );
    voters = Array.from(
      { length: 5 },
      (_, i) =>
        new MockMember(
          Buffer.from([i + 1]),
          Buffer.from([i + 1]),
          keyPair.publicKey,
          keyPair.privateKey,
        ),
    );
  });

  beforeEach(() => {
    poll = new Poll(
      Buffer.from([1, 2, 3]),
      ['A', 'B', 'C'],
      VotingMethod.Plurality,
      authority,
      keyPair.publicKey,
    );
  });

  describe('Construction', () => {
    test('should create poll with valid parameters', () => {
      expect(poll.id).toEqual(Buffer.from([1, 2, 3]));
      expect(poll.choices).toEqual(['A', 'B', 'C']);
      expect(poll.method).toBe(VotingMethod.Plurality);
      expect(poll.isClosed).toBe(false);
      expect(poll.voterCount).toBe(0);
    });

    test('should reject < 2 choices', () => {
      const keyPair = generateKeyPair(512);
      expect(() => {
        new Poll(
          Buffer.from([1]),
          ['Only One'],
          VotingMethod.Plurality,
          authority,
          keyPair.publicKey,
        );
      }).toThrow('at least 2 choices');
    });

    test('should reject authority without voting keys', () => {
      const badAuthority = new MockMember(
        Buffer.from([1]),
        Buffer.from([1]),
        undefined,
        undefined,
      );

      expect(() => {
        new Poll(
          Buffer.from([1]),
          ['A', 'B'],
          VotingMethod.Plurality,
          badAuthority,
          keyPair.publicKey,
        );
      }).toThrow('voting keys');
    });

    test('should freeze choices array', () => {
      expect(Object.isFrozen(poll.choices)).toBe(true);
    });
  });

  describe('Voting', () => {
    test('should accept valid vote', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const receipt = poll.vote(voters[0], vote);

      expect(receipt).toBeDefined();
      expect(receipt.voterId).toEqual(voters[0].id);
      expect(receipt.pollId).toEqual(poll.id);
    });

    test('should increment voter count', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      poll.vote(voters[0], vote);
      expect(poll.voterCount).toBe(1);

      poll.vote(voters[1], vote);
      expect(poll.voterCount).toBe(2);
    });

    test('should prevent double voting', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      poll.vote(voters[0], vote);

      expect(() => {
        poll.vote(voters[0], vote);
      }).toThrow('Already voted');
    });

    test('should prevent voting after close', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      poll.close();

      expect(() => {
        poll.vote(voters[0], vote);
      }).toThrow('Poll is closed');
    });

    test('should validate vote structure for plurality', () => {
      const invalidVote: EncryptedVote = {
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        poll.vote(voters[0], invalidVote);
      }).toThrow('Choice required');
    });

    test('should validate choice index bounds', () => {
      const invalidVote: EncryptedVote = {
        choiceIndex: 5,
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        poll.vote(voters[0], invalidVote);
      }).toThrow('Invalid choice');
    });

    test('should validate negative choice index', () => {
      const invalidVote: EncryptedVote = {
        choiceIndex: -1,
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        poll.vote(voters[0], invalidVote);
      }).toThrow('Invalid choice');
    });
  });

  describe('Receipt Generation', () => {
    test('should generate unique receipts', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const receipt1 = poll.vote(voters[0], vote);
      const receipt2 = poll.vote(voters[1], vote);

      expect(receipt1.signature).not.toEqual(receipt2.signature);
      expect(receipt1.nonce).not.toEqual(receipt2.nonce);
    });

    test('should include timestamp in receipt', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const before = Date.now();
      const receipt = poll.vote(voters[0], vote);
      const after = Date.now();

      expect(receipt.timestamp).toBeGreaterThanOrEqual(before);
      expect(receipt.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Receipt Verification', () => {
    test('should verify valid receipt', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const receipt = poll.vote(voters[0], vote);
      const isValid = poll.verifyReceipt(voters[0], receipt);

      expect(isValid).toBe(true);
    });

    test('should reject receipt from non-voter', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const receipt = poll.vote(voters[0], vote);
      const isValid = poll.verifyReceipt(voters[1], receipt);

      expect(isValid).toBe(false);
    });

    test('should reject modified receipt', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      const receipt = poll.vote(voters[0], vote);
      const modifiedReceipt = {
        ...receipt,
        timestamp: receipt.timestamp + 1000,
      };
      const isValid = poll.verifyReceipt(voters[0], modifiedReceipt);

      expect(isValid).toBe(false);
    });
  });

  describe('Poll Lifecycle', () => {
    test('should start as open', () => {
      expect(poll.isClosed).toBe(false);
      expect(poll.closedAt).toBeUndefined();
    });

    test('should close poll', () => {
      const before = Date.now();
      poll.close();
      const after = Date.now();

      expect(poll.isClosed).toBe(true);
      expect(poll.closedAt).toBeDefined();
      expect(poll.closedAt!).toBeGreaterThanOrEqual(before);
      expect(poll.closedAt!).toBeLessThanOrEqual(after);
    });

    test('should prevent double closing', () => {
      poll.close();

      expect(() => {
        poll.close();
      }).toThrow('Already closed');
    });

    test('should track creation time', () => {
      expect(poll.createdAt).toBeDefined();
      expect(poll.createdAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Encrypted Votes Access', () => {
    test('should return encrypted votes', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      poll.vote(voters[0], vote);
      poll.vote(voters[1], vote);

      const encryptedVotes = poll.getEncryptedVotes();

      expect(encryptedVotes.size).toBe(2);
    });

    test('should return readonly map', () => {
      const encryptedVotes = poll.getEncryptedVotes();

      expect(() => {
        (encryptedVotes as any).clear();
      }).toThrow();
    });

    test('should return readonly vote arrays', () => {
      const vote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n, 3n],
      };

      poll.vote(voters[0], vote);
      const encryptedVotes = poll.getEncryptedVotes();
      const voteArray = Array.from(encryptedVotes.values())[0];

      expect(() => {
        (voteArray as any).push(4n);
      }).toThrow();
    });
  });

  describe('Approval Voting Validation', () => {
    test('should validate approval vote structure', () => {
      const approvalPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B', 'C'],
        VotingMethod.Approval,
        authority,
        authority.votingPublicKey,
      );

      const invalidVote: EncryptedVote = {
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        approvalPoll.vote(voters[0], invalidVote);
      }).toThrow('Choices required');
    });

    test('should validate approval choice indices', () => {
      const approvalPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B', 'C'],
        VotingMethod.Approval,
        authority,
        authority.votingPublicKey,
      );

      const invalidVote: EncryptedVote = {
        choices: [0, 5],
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        approvalPoll.vote(voters[0], invalidVote);
      }).toThrow('Invalid choice');
    });
  });

  describe('Weighted Voting Validation', () => {
    test('should validate weight presence', () => {
      const weightedPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B'],
        VotingMethod.Weighted,
        authority,
        authority.votingPublicKey,
        1000n,
      );

      const invalidVote: EncryptedVote = {
        choiceIndex: 0,
        encrypted: [1n, 2n],
      };

      expect(() => {
        weightedPoll.vote(voters[0], invalidVote);
      }).toThrow('Weight must be positive');
    });

    test('should validate weight bounds', () => {
      const weightedPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B'],
        VotingMethod.Weighted,
        authority,
        authority.votingPublicKey,
        100n,
      );

      const invalidVote: EncryptedVote = {
        choiceIndex: 0,
        weight: 101n,
        encrypted: [1n, 2n],
      };

      expect(() => {
        weightedPoll.vote(voters[0], invalidVote);
      }).toThrow('Weight exceeds maximum');
    });
  });

  describe('Ranked Voting Validation', () => {
    test('should validate rankings presence', () => {
      const rankedPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B', 'C'],
        VotingMethod.Borda,
        authority,
        authority.votingPublicKey,
      );

      const invalidVote: EncryptedVote = {
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        rankedPoll.vote(voters[0], invalidVote);
      }).toThrow('Rankings required');
    });

    test('should validate ranking indices', () => {
      const rankedPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B', 'C'],
        VotingMethod.Borda,
        authority,
        authority.votingPublicKey,
      );

      const invalidVote: EncryptedVote = {
        rankings: [0, 5],
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        rankedPoll.vote(voters[0], invalidVote);
      }).toThrow('Invalid choice');
    });

    test('should reject duplicate rankings', () => {
      const rankedPoll = new Poll(
        Buffer.from([1]),
        ['A', 'B', 'C'],
        VotingMethod.Borda,
        authority,
        authority.votingPublicKey,
      );

      const invalidVote: EncryptedVote = {
        rankings: [0, 1, 0],
        encrypted: [1n, 2n, 3n],
      };

      expect(() => {
        rankedPoll.vote(voters[0], invalidVote);
      }).toThrow('Duplicate ranking');
    });
  });
});
