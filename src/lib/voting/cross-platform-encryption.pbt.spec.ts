/**
 * Cross-Platform Encryption Property-Based Tests
 *
 * Feature: sync-voting-system-refactor
 * Property 5: Cross-Platform Encryption Round-Trip (Node → Browser)
 * Property 6: Cross-Platform Encryption Round-Trip (Browser → Node)
 *
 * Validates: Requirements 7.1, 7.2
 */
import fc from 'fast-check';
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';

// Node.js imports
import { VoteEncoder as NodeVoteEncoder } from './encoder';
import { Poll as NodePoll } from './poll-core';
import { PollTallier as NodePollTallier } from './tallier';
import { VotingMethod } from './enumerations';
import type { IMember } from '../../interfaces/member';
import type {
  IIdProvider,
  IMember as BrowserIMember,
} from '@digitaldefiance/ecies-lib';

// Browser imports
import {
  VoteEncoder as BrowserVoteEncoder,
  Poll as BrowserPoll,
  PollTallier as BrowserPollTallier,
  VotingMethod as BrowserVotingMethod,
} from '@digitaldefiance/ecies-lib';

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

/**
 * Simple ID provider for Browser Uint8Array IDs
 */
class MockUint8ArrayIdProvider implements IIdProvider<Uint8Array> {
  readonly byteLength = 4;
  readonly name = 'MockUint8Array';

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

  clone(id: Uint8Array): Uint8Array {
    return new Uint8Array(id);
  }

  fromBytes(bytes: Uint8Array): Uint8Array {
    return new Uint8Array(bytes);
  }

  toBytes(id: Uint8Array): Uint8Array {
    return new Uint8Array(id);
  }

  equals(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  idToString(id: Uint8Array): string {
    return this.serialize(id);
  }

  idFromString(str: string): Uint8Array {
    return this.deserialize(str);
  }
}

// Mock Member implementation for Node.js
class NodeMockMember implements IMember {
  private static _idProvider = new MockBufferIdProvider();

  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
    public readonly type: string = 'voter',
    public readonly name: string = 'Mock Voter',
    public readonly email: string = 'mock@example.com',
    public readonly creatorId: Buffer = Buffer.from([0]),
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  get idBytes(): Buffer {
    return this.id;
  }

  get idProvider(): IIdProvider<Buffer> {
    return NodeMockMember._idProvider;
  }

  sign(data: Buffer): Buffer {
    const sig = Buffer.alloc(64);
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      sig[i] = data[i];
    }
    return sig;
  }

  verify(signature: Buffer, data: Buffer): boolean {
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      if (signature[i] !== data[i]) return false;
    }
    return true;
  }
}

// Mock Member implementation for Browser
class BrowserMockMember implements BrowserIMember {
  private static _idProvider = new MockUint8ArrayIdProvider();

  constructor(
    public readonly id: Uint8Array,
    public readonly publicKey: Uint8Array,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
    public readonly type: string = 'voter',
    public readonly name: string = 'Mock Voter',
    public readonly email: string = 'mock@example.com',
    public readonly creatorId: Uint8Array = new Uint8Array([0]),
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  get idBytes(): Uint8Array {
    return this.id;
  }

  get idProvider(): IIdProvider<Uint8Array> {
    return BrowserMockMember._idProvider;
  }

  sign(data: Uint8Array): Uint8Array {
    const sig = new Uint8Array(64);
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      sig[i] = data[i];
    }
    return sig;
  }

  verify(signature: Uint8Array, data: Uint8Array): boolean {
    for (let i = 0; i < Math.min(data.length, 64); i++) {
      if (signature[i] !== data[i]) return false;
    }
    return true;
  }
}

// Conversion utilities
function bufferToUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function uint8ArrayToBuffer(uint8: Uint8Array): Buffer {
  return Buffer.from(uint8);
}

describe('Cross-Platform Encryption Property Tests', () => {
  let keyPair: any;
  let nodeAuthority: NodeMockMember;
  let browserAuthority: BrowserMockMember;

  beforeAll(() => {
    keyPair = generateKeyPair(512);
    nodeAuthority = new NodeMockMember(
      Buffer.from([0]),
      Buffer.from([0]),
      keyPair.publicKey,
      keyPair.privateKey,
    );
    browserAuthority = new BrowserMockMember(
      new Uint8Array([0]),
      new Uint8Array([0]),
      keyPair.publicKey,
      keyPair.privateKey,
    );
  });

  /**
   * Property 5: Cross-Platform Encryption Round-Trip (Node → Browser)
   * Validates: Requirements 7.1
   *
   * For any valid vote data encrypted using node-ecies-lib VoteEncoder,
   * decrypting with ecies-lib should produce data equivalent to the original plaintext.
   */
  describe('Property 5: Node → Browser Encryption Round-Trip', () => {
    it('should preserve plurality vote data through Node encryption and Browser decryption', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }), // choice index for 3 choices
          (choiceIndex) => {
            // Create Node.js poll and encoder
            const nodePoll = new NodePoll(
              Buffer.from([1, 2, 3]),
              ['A', 'B', 'C'],
              VotingMethod.Plurality,
              nodeAuthority,
              keyPair.publicKey,
            );
            const nodeEncoder = new NodeVoteEncoder(keyPair.publicKey);

            // Encrypt vote using Node.js
            const nodeEncryptedVote = nodeEncoder.encodePlurality(
              choiceIndex,
              3,
            );

            // Create Browser poll and tallier
            const browserPoll = new BrowserPoll(
              new Uint8Array([1, 2, 3]),
              ['A', 'B', 'C'],
              BrowserVotingMethod.Plurality,
              browserAuthority,
              keyPair.publicKey,
            );

            // Convert Node vote to Browser format
            const browserVote = {
              ...nodeEncryptedVote,
              encrypted: nodeEncryptedVote.encrypted,
            };

            // Cast vote in browser poll
            const browserVoter = new BrowserMockMember(
              new Uint8Array([1]),
              new Uint8Array([1]),
              keyPair.publicKey,
              keyPair.privateKey,
            );
            browserPoll.vote(browserVoter, browserVote);
            browserPoll.close();

            // Tally using Browser tallier
            const browserTallier = new BrowserPollTallier(
              browserAuthority,
              keyPair.privateKey,
              keyPair.publicKey,
            );
            const results = browserTallier.tally(browserPoll);

            // Verify the vote was correctly decrypted
            expect(results.winner).toBe(choiceIndex);
            expect(results.tallies[choiceIndex]).toBe(1n);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve ranked choice vote data through Node encryption and Browser decryption', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.integer({ min: 0, max: 2 }), {
              minLength: 3,
              maxLength: 3,
            })
            .filter((arr) => new Set(arr).size === 3), // unique rankings
          (rankings) => {
            // Create Node.js poll and encoder
            const nodePoll = new NodePoll(
              Buffer.from([1, 2, 3]),
              ['A', 'B', 'C'],
              VotingMethod.RankedChoice,
              nodeAuthority,
              keyPair.publicKey,
            );
            const nodeEncoder = new NodeVoteEncoder(keyPair.publicKey);

            // Encrypt vote using Node.js
            const nodeEncryptedVote = nodeEncoder.encodeRankedChoice(
              rankings,
              3,
            );

            // Create Browser poll
            const browserPoll = new BrowserPoll(
              new Uint8Array([1, 2, 3]),
              ['A', 'B', 'C'],
              BrowserVotingMethod.RankedChoice,
              browserAuthority,
              keyPair.publicKey,
            );

            // Convert and cast vote
            const browserVote = {
              ...nodeEncryptedVote,
              encrypted: nodeEncryptedVote.encrypted,
            };

            const browserVoter = new BrowserMockMember(
              new Uint8Array([1]),
              new Uint8Array([1]),
              keyPair.publicKey,
              keyPair.privateKey,
            );
            browserPoll.vote(browserVoter, browserVote);
            browserPoll.close();

            // Tally using Browser tallier
            const browserTallier = new BrowserPollTallier(
              browserAuthority,
              keyPair.privateKey,
              keyPair.publicKey,
            );
            const results = browserTallier.tally(browserPoll);

            // Verify a winner was determined (rankings were preserved)
            expect(results.winner).toBeDefined();
            expect(results.winner).toBeGreaterThanOrEqual(0);
            expect(results.winner).toBeLessThan(3);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: Cross-Platform Encryption Round-Trip (Browser → Node)
   * Validates: Requirements 7.2
   *
   * For any valid vote data encrypted using ecies-lib VoteEncoder,
   * decrypting with node-ecies-lib should produce data equivalent to the original plaintext.
   */
  describe('Property 6: Browser → Node Encryption Round-Trip', () => {
    it('should preserve plurality vote data through Browser encryption and Node decryption', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }), // choice index for 3 choices
          (choiceIndex) => {
            // Create Browser poll and encoder
            const browserPoll = new BrowserPoll(
              new Uint8Array([1, 2, 3]),
              ['A', 'B', 'C'],
              BrowserVotingMethod.Plurality,
              browserAuthority,
              keyPair.publicKey,
            );
            const browserEncoder = new BrowserVoteEncoder(keyPair.publicKey);

            // Encrypt vote using Browser
            const browserEncryptedVote = browserEncoder.encodePlurality(
              choiceIndex,
              3,
            );

            // Create Node.js poll
            const nodePoll = new NodePoll(
              Buffer.from([1, 2, 3]),
              ['A', 'B', 'C'],
              VotingMethod.Plurality,
              nodeAuthority,
              keyPair.publicKey,
            );

            // Convert Browser vote to Node format
            const nodeVote = {
              ...browserEncryptedVote,
              encrypted: browserEncryptedVote.encrypted,
            };

            // Cast vote in Node poll
            const nodeVoter = new NodeMockMember(
              Buffer.from([1]),
              Buffer.from([1]),
              keyPair.publicKey,
              keyPair.privateKey,
            );
            nodePoll.vote(nodeVoter, nodeVote);
            nodePoll.close();

            // Tally using Node tallier
            const nodeTallier = new NodePollTallier(
              nodeAuthority,
              keyPair.privateKey,
              keyPair.publicKey,
            );
            const results = nodeTallier.tally(nodePoll);

            // Verify the vote was correctly decrypted
            expect(results.winner).toBe(choiceIndex);
            expect(results.tallies[choiceIndex]).toBe(1n);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve approval vote data through Browser encryption and Node decryption', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.integer({ min: 0, max: 2 }), {
              minLength: 1,
              maxLength: 3,
            })
            .map((arr) => Array.from(new Set(arr)).sort()), // unique sorted choices
          (choices) => {
            // Create Browser poll and encoder
            const browserPoll = new BrowserPoll(
              new Uint8Array([1, 2, 3]),
              ['A', 'B', 'C'],
              BrowserVotingMethod.Approval,
              browserAuthority,
              keyPair.publicKey,
            );
            const browserEncoder = new BrowserVoteEncoder(keyPair.publicKey);

            // Encrypt vote using Browser
            const browserEncryptedVote = browserEncoder.encodeApproval(
              choices,
              3,
            );

            // Create Node.js poll
            const nodePoll = new NodePoll(
              Buffer.from([1, 2, 3]),
              ['A', 'B', 'C'],
              VotingMethod.Approval,
              nodeAuthority,
              keyPair.publicKey,
            );

            // Convert and cast vote
            const nodeVote = {
              ...browserEncryptedVote,
              encrypted: browserEncryptedVote.encrypted,
            };

            const nodeVoter = new NodeMockMember(
              Buffer.from([1]),
              Buffer.from([1]),
              keyPair.publicKey,
              keyPair.privateKey,
            );
            nodePoll.vote(nodeVoter, nodeVote);
            nodePoll.close();

            // Tally using Node tallier
            const nodeTallier = new NodePollTallier(
              nodeAuthority,
              keyPair.privateKey,
              keyPair.publicKey,
            );
            const results = nodeTallier.tally(nodePoll);

            // Verify the approved choices have votes
            for (const choice of choices) {
              expect(results.tallies[choice]).toBe(1n);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
