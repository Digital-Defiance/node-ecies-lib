/**
 * Voting System - Stress Tests & Attack Scenarios
 * Tests system under load and adversarial conditions
 * Node.js version - adapted for Buffer usage
 */
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { VoteEncoder } from './encoder';
import { PollFactory } from './factory';
import { Poll as _Poll } from './poll-core';
import { PollTallier } from './tallier';
import { VotingMethod as _VotingMethod } from './enumerations';
import type { IMember } from '../../interfaces/member';
import type { IIdProvider } from '@digitaldefiance/ecies-lib';

/**
 * Simple ID provider for test MockMember class
 * Handles 4-byte Buffer IDs used in voting tests
 */
class MockBufferIdProvider implements IIdProvider<Buffer> {
  readonly byteLength = 4;
  readonly name = 'MockBuffer';

  generate(): Uint8Array {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    return buffer;
  }

  validate(id: Uint8Array): boolean {
    return id.length === 4;
  }

  serialize(id: Uint8Array): string {
    return Array.from(id)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  deserialize(str: string): Uint8Array {
    if (str.length !== 8) throw new Error('Invalid hex string length');
    const bytes = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      bytes[i] = parseInt(str.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  clone(id: Buffer): Buffer {
    return Buffer.from(id);
  }

  fromBytes(bytes: Uint8Array): Buffer {
    return Buffer.from(bytes);
  }

  toBytes(id: Buffer): Uint8Array {
    return new Uint8Array(id);
  }

  equals(a: Buffer, b: Buffer): boolean {
    return a.equals(b);
  }

  idToString(id: Buffer): string {
    return this.serialize(this.toBytes(id));
  }

  idFromString(str: string): Buffer {
    return this.fromBytes(this.deserialize(str));
  }
}

class MockMember implements IMember {
  private static _idProvider = new MockBufferIdProvider();
  public readonly idProvider = MockMember._idProvider;

  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  get idProvider(): IIdProvider<Buffer> {
    return MockMember._idProvider;
  }

  sign(_data: Buffer): Buffer {
    return Buffer.alloc(64);
  }
  verify(_signature: Buffer, _data: Buffer): boolean {
    return true;
  }
}

function createMockMember(id: number, keyPair?: any): MockMember {
  const keys = keyPair || generateKeyPair(512);
  const idBytes = Buffer.alloc(4);
  idBytes[0] = (id >> 24) & 0xff;
  idBytes[1] = (id >> 16) & 0xff;
  idBytes[2] = (id >> 8) & 0xff;
  idBytes[3] = id & 0xff;
  return new MockMember(
    idBytes,
    Buffer.from([id & 0xff]),
    keys.publicKey,
    keys.privateKey,
  );
}

describe('Voting System - Stress & Security Tests', () => {
  let sharedKeyPair: any;

  beforeAll(() => {
    // Generate keys ONCE for all tests - this is the major bottleneck
    sharedKeyPair = generateKeyPair(512); // Use 512-bit for faster tests
  });
  describe('Large Scale Tests', () => {
    test('should handle 1000 voters', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 1000 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );
      const poll = PollFactory.createPlurality(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      // Cast 1000 votes
      voters.forEach((voter, i) => {
        poll.vote(voter, encoder.encodePlurality(i % 3, 3));
      });

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.voterCount).toBe(1000);
      expect(results.tallies[0] + results.tallies[1] + results.tallies[2]).toBe(
        1000n,
      );
    }, 30000); // 30s timeout

    test('should handle 100 choices', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 50 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );
      const choices = Array.from({ length: 100 }, (_, i) => `Choice ${i}`);
      const poll = PollFactory.createPlurality(choices, authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      voters.forEach((voter, i) => {
        poll.vote(voter, encoder.encodePlurality(i % 100, 100));
      });

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.choices).toHaveLength(100);
      expect(results.voterCount).toBe(50);
    }, 30000);
  });

  describe('Attack Scenarios', () => {
    test('should prevent vote manipulation by modifying encrypted votes', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      poll.vote(voter, encoder.encodePlurality(0, 2));

      // Try to access and modify encrypted votes
      const encryptedVotes = poll.getEncryptedVotes();
      expect(encryptedVotes).toBeDefined();

      // Votes are readonly - cannot be modified
      expect(() => {
        (encryptedVotes as any).clear();
      }).toThrow();
    });

    test('should prevent tallying before poll closes', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );

      poll.vote(voter, encoder.encodePlurality(0, 2));

      expect(() => {
        tallier.tally(poll);
      }).toThrow('Poll must be closed');
    });

    test('should prevent double closing', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const poll = PollFactory.createPlurality(['A', 'B'], authority);

      poll.close();

      expect(() => {
        poll.close();
      }).toThrow('Already closed');
    });

    test('should reject invalid choice indices', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      expect(() => {
        poll.vote(voter, encoder.encodePlurality(-1, 2));
      }).toThrow('Invalid choice');

      expect(() => {
        poll.vote(voter, encoder.encodePlurality(5, 2));
      }).toThrow('Invalid choice');
    });

    test('should reject duplicate rankings in RCV', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createRankedChoice(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      expect(() => {
        poll.vote(voter, encoder.encodeRankedChoice([0, 1, 0], 3));
      }).toThrow('Duplicate');
    });

    test('should reject negative weights', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createWeighted(['A', 'B'], authority, 1000n);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      expect(() => {
        poll.vote(voter, encoder.encodeWeighted(0, -10n, 2));
      }).toThrow();
    });

    test('should reject zero weights', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createWeighted(['A', 'B'], authority, 1000n);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      expect(() => {
        poll.vote(voter, encoder.encodeWeighted(0, 0n, 2));
      }).toThrow('positive');
    });
  });

  describe('Correctness Verification', () => {
    test('plurality: sum of tallies equals voter count', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 100 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );
      const poll = PollFactory.createPlurality(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      voters.forEach((voter, i) => {
        poll.vote(voter, encoder.encodePlurality(i % 3, 3));
      });

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      const sum = results.tallies.reduce((a, b) => a + b, 0n);
      expect(sum).toBe(BigInt(voters.length));
    });

    test('approval: tallies can exceed voter count', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 10 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );
      const poll = PollFactory.createApproval(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      // Each voter approves all 3
      voters.forEach((voter) => {
        poll.vote(voter, encoder.encodeApproval([0, 1, 2], 3));
      });

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(10n);
      expect(results.tallies[1]).toBe(10n);
      expect(results.tallies[2]).toBe(10n);
    });

    test('borda: points distributed correctly', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createBorda(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      // Ranking: A > B > C should give A=3, B=2, C=1
      poll.vote(voter, encoder.encodeBorda([0, 1, 2], 3));

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(3n);
      expect(results.tallies[1]).toBe(2n);
      expect(results.tallies[2]).toBe(1n);
    });

    test('RCV: eliminated candidates not counted in later rounds', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 10 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );
      const poll = PollFactory.createRankedChoice(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      // A: 4, B: 3, C: 3 first round
      // B eliminated (higher index breaks ties), votes transfer
      for (let i = 0; i < 4; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([0, 1], 3));
      }
      for (let i = 4; i < 7; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([1, 0], 3));
      }
      for (let i = 7; i < 10; i++) {
        poll.vote(voters[i], encoder.encodeRankedChoice([2, 0], 3));
      }

      poll.close();
      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.eliminated).toContain(1); // B eliminated (lowest index breaks ties)
      expect(results.rounds!.length).toBeGreaterThan(1);
    });
  });

  describe('Determinism Tests', () => {
    test('same votes should produce same results', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voters = Array.from({ length: 10 }, (_, i) =>
        createMockMember(i + 1, sharedKeyPair),
      );

      // Run poll twice with identical votes
      const runPoll = () => {
        const poll = PollFactory.createPlurality(['A', 'B'], authority);
        const encoder = new VoteEncoder(authority.votingPublicKey);

        voters.forEach((voter, i) => {
          poll.vote(voter, encoder.encodePlurality(i % 2, 2));
        });

        poll.close();
        const tallier = new PollTallier(
          authority,
          authority.votingPrivateKey,
          authority.votingPublicKey,
        );
        return tallier.tally(poll);
      };

      const results1 = runPoll();
      const results2 = runPoll();

      expect(results1.winner).toBe(results2.winner);
      expect(results1.tallies).toEqual(results2.tallies);
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle maximum bigint weights', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const maxWeight = 2n ** 32n;
      const poll = PollFactory.createWeighted(['A', 'B'], authority, maxWeight);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      poll.vote(voter, encoder.encodeWeighted(0, maxWeight, 2));
      poll.close();

      const tallier = new PollTallier(
        authority,
        authority.votingPrivateKey,
        authority.votingPublicKey,
      );
      const results = tallier.tally(poll);

      expect(results.tallies[0]).toBe(maxWeight);
    });

    test('should handle empty rankings in RCV', () => {
      const authority = createMockMember(0, sharedKeyPair);
      const voter = createMockMember(1, sharedKeyPair);
      const poll = PollFactory.createRankedChoice(['A', 'B', 'C'], authority);
      const encoder = new VoteEncoder(authority.votingPublicKey);

      expect(() => {
        poll.vote(voter, encoder.encodeRankedChoice([], 3));
      }).toThrow();
    });
  });
});
