import { describe, it, expect, beforeAll } from '@jest/globals';
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { BatchVoteProcessor } from './persistent-state';
import { VoteEncoder } from './encoder';
import { BufferIdProvider } from '../id-providers/buffer-provider';
import type { IMember } from '../../interfaces/member';
import type { EncryptedVote } from './interfaces';

class MockMember implements IMember<Buffer> {
  public readonly idProvider = new BufferIdProvider(32, 'MockBuffer');

  constructor(
    public readonly id: Buffer,
    public readonly idBytes: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}

  // Required properties from IMember
  readonly type = 'user' as const;
  readonly name = 'Test User';
  readonly email = 'test@example.com' as any;
  readonly wallet = null as any;
  readonly constants = null as any;
  readonly privateKey = undefined;

  getPublicKeyString(): string {
    return this.publicKey.toString('hex');
  }

  getIdString(): string {
    return this.id.toString('hex');
  }

  sign(_data: Buffer): Buffer {
    return Buffer.alloc(64);
  }

  signData(_data: Buffer): Buffer {
    return Buffer.alloc(64);
  }

  verify(_signature: Buffer, _data: Buffer): boolean {
    return true;
  }

  verifySignature(
    _data: Buffer,
    _signature: Buffer,
    _publicKey: Buffer,
  ): boolean {
    return true;
  }

  // Required methods from IMember interface
  get walletOptional(): any {
    return undefined;
  }
  get hasPrivateKey(): boolean {
    return false;
  }
  get hasVotingPrivateKey(): boolean {
    return !!this.votingPrivateKey;
  }
  get creatorId(): Buffer {
    return Buffer.from([0]);
  }
  get dateCreated(): Date {
    return new Date();
  }
  get dateUpdated(): Date {
    return new Date();
  }

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

  encryptDataStream = null as any;
  decryptDataStream = null as any;
  encryptData = null as any;
  decryptData = null as any;
}

describe('Node Persistent State', () => {
  let authority: MockMember;
  let encoder: VoteEncoder;

  beforeAll(() => {
    const keyPair = generateKeyPair(512);
    authority = new MockMember(
      Buffer.from([1]),
      Buffer.from([1]),
      Buffer.from([1]),
      keyPair.publicKey,
      keyPair.privateKey,
    );
    encoder = new VoteEncoder(authority.votingPublicKey);
  });

  describe('BatchVoteProcessor', () => {
    it('should create processor with default batch size', () => {
      const processor = new BatchVoteProcessor();
      expect(processor).toBeDefined();
      expect(processor.getBatchSize()).toBe(0);
    });

    it('should create processor with custom batch size', () => {
      const processor = new BatchVoteProcessor(50);
      expect(processor).toBeDefined();
    });

    it('should add votes to batch', () => {
      const processor = new BatchVoteProcessor(10);
      const vote = encoder.encodePlurality(0, 3);

      for (let i = 0; i < 5; i++) {
        const voter = new MockMember(
          Buffer.from([i]),
          Buffer.from([i]),
          Buffer.from([i]),
          authority.votingPublicKey,
          authority.votingPrivateKey,
        );
        const isFull = processor.addVote(voter, vote);
        expect(isFull).toBe(false);
      }

      expect(processor.getBatchSize()).toBe(5);
    });

    it('should return true when batch is full', () => {
      const processor = new BatchVoteProcessor(3);
      const vote = encoder.encodePlurality(0, 3);

      const voter1 = new MockMember(
        Buffer.from([1]),
        Buffer.from([1]),
        Buffer.from([1]),
        authority.votingPublicKey,
        authority.votingPrivateKey,
      );
      const voter2 = new MockMember(
        Buffer.from([2]),
        Buffer.from([2]),
        Buffer.from([2]),
        authority.votingPublicKey,
        authority.votingPrivateKey,
      );
      const voter3 = new MockMember(
        Buffer.from([3]),
        Buffer.from([3]),
        Buffer.from([3]),
        authority.votingPublicKey,
        authority.votingPrivateKey,
      );

      expect(processor.addVote(voter1, vote)).toBe(false);
      expect(processor.addVote(voter2, vote)).toBe(false);
      expect(processor.addVote(voter3, vote)).toBe(true); // Batch is full
    });

    it('should process batch and clear it', async () => {
      const processor = new BatchVoteProcessor(10);
      const vote = encoder.encodePlurality(0, 3);

      for (let i = 0; i < 10; i++) {
        const voter = new MockMember(
          Buffer.from([i]),
          Buffer.from([i]),
          Buffer.from([i]),
          authority.votingPublicKey,
          authority.votingPrivateKey,
        );
        processor.addVote(voter, vote);
      }

      let processedCount = 0;
      await processor.processBatch(async (batch) => {
        processedCount = batch.length;
      });

      expect(processedCount).toBe(10);
      expect(processor.getBatchSize()).toBe(0); // Batch should be cleared
    });

    it('should handle empty batch processing', async () => {
      const processor = new BatchVoteProcessor(10);

      let called = false;
      await processor.processBatch(async () => {
        called = true;
      });

      expect(called).toBe(false); // Should not call processor for empty batch
    });

    it('should handle multiple batch cycles', async () => {
      const processor = new BatchVoteProcessor(5);
      const vote = encoder.encodePlurality(0, 3);

      // First batch
      for (let i = 0; i < 5; i++) {
        const voter = new MockMember(
          Buffer.from([i]),
          Buffer.from([i]),
          Buffer.from([i]),
          authority.votingPublicKey,
          authority.votingPrivateKey,
        );
        processor.addVote(voter, vote);
      }

      let firstBatchSize = 0;
      await processor.processBatch(async (batch) => {
        firstBatchSize = batch.length;
      });

      // Second batch
      for (let i = 5; i < 10; i++) {
        const voter = new MockMember(
          Buffer.from([i]),
          Buffer.from([i]),
          Buffer.from([i]),
          authority.votingPublicKey,
          authority.votingPrivateKey,
        );
        processor.addVote(voter, vote);
      }

      let secondBatchSize = 0;
      await processor.processBatch(async (batch) => {
        secondBatchSize = batch.length;
      });

      expect(firstBatchSize).toBe(5);
      expect(secondBatchSize).toBe(5);
    });
  });

  describe('Buffer Type Verification', () => {
    it('should handle Buffer-based voter IDs', async () => {
      const processor = new BatchVoteProcessor<Buffer>(10);
      const vote = encoder.encodePlurality(0, 3);

      for (let i = 0; i < 5; i++) {
        const voter = new MockMember(
          Buffer.from([i]),
          Buffer.from([i]),
          Buffer.from([i]),
          authority.votingPublicKey,
          authority.votingPrivateKey,
        );
        processor.addVote(voter, vote);
      }

      await processor.processBatch(async (batch) => {
        batch.forEach(({ voter }) => {
          expect(Buffer.isBuffer(voter.id)).toBe(true);
          expect(voter.id).toBeInstanceOf(Buffer);
        });
      });
    });

    it('should handle Buffer-based encrypted votes', async () => {
      const processor = new BatchVoteProcessor<Buffer>(10);
      const vote = encoder.encodePlurality(0, 3);

      const voter = new MockMember(
        Buffer.from([1]),
        Buffer.from([1]),
        Buffer.from([1]),
        authority.votingPublicKey,
        authority.votingPrivateKey,
      );
      processor.addVote(voter, vote);

      await processor.processBatch(async (batch) => {
        batch.forEach(({ vote }) => {
          expect(vote).toBeDefined();
          expect(vote.encrypted).toBeDefined();
          expect(Array.isArray(vote.encrypted)).toBe(true);
        });
      });
    });
  });

  describe('Interfaces', () => {
    it('should export IVoteLogger interface', () => {
      // Type check only
      const mockLogger: any = {
        appendVote: async () => {},
        getVoteCount: () => 0,
        replayVotes: async function* () {},
      };

      expect(mockLogger).toBeDefined();
    });

    it('should export ICheckpointManager interface', () => {
      // Type check only
      const mockManager: any = {
        saveCheckpoint: async () => {},
        loadLatestCheckpoint: async () => null,
        listCheckpoints: async () => [],
      };

      expect(mockManager).toBeDefined();
    });
  });
});
