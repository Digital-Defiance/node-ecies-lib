/**
 * PollFactory Tests - Node.js
 */
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { PollFactory } from './factory';
import { VotingMethod } from './types';
import type { IMember } from './types';

class MockMember implements IMember {
  constructor(
    public readonly id: Buffer,
    public readonly publicKey: Buffer,
    public readonly votingPublicKey: any,
    public readonly votingPrivateKey: any,
  ) {}
  sign(_data: Buffer): Buffer {
    return Buffer.alloc(64);
  }
  verify(_signature: Buffer, _data: Buffer): boolean {
    return true;
  }
}

describe('PollFactory', () => {
  let authority: MockMember;

  beforeAll(() => {
    const keyPair = generateKeyPair(512);
    authority = new MockMember(
      Buffer.from([1]),
      Buffer.from([1]),
      keyPair.publicKey,
      keyPair.privateKey,
    );
  });

  describe('createPlurality', () => {
    test('should create plurality poll', () => {
      const poll = PollFactory.createPlurality(['A', 'B', 'C'], authority);
      expect(poll.method).toBe(VotingMethod.Plurality);
      expect(poll.choices).toEqual(['A', 'B', 'C']);
      expect(poll.isClosed).toBe(false);
    });

    test('should generate unique poll IDs', () => {
      const poll1 = PollFactory.createPlurality(['A', 'B'], authority);
      const poll2 = PollFactory.createPlurality(['A', 'B'], authority);
      expect(poll1.id).not.toEqual(poll2.id);
    });
  });

  describe('createApproval', () => {
    test('should create approval poll', () => {
      const poll = PollFactory.createApproval(
        ['Red', 'Green', 'Blue'],
        authority,
      );
      expect(poll.method).toBe(VotingMethod.Approval);
      expect(poll.choices).toHaveLength(3);
    });
  });

  describe('createWeighted', () => {
    test('should create weighted poll with max weight', () => {
      const poll = PollFactory.createWeighted(['A', 'B'], authority, 1000n);
      expect(poll.method).toBe(VotingMethod.Weighted);
      expect(poll.choices).toEqual(['A', 'B']);
    });

    test('should require max weight parameter', () => {
      const poll = PollFactory.createWeighted(['A', 'B'], authority, 100n);
      expect(poll).toBeDefined();
    });
  });

  describe('createBorda', () => {
    test('should create borda poll', () => {
      const poll = PollFactory.createBorda(['X', 'Y', 'Z'], authority);
      expect(poll.method).toBe(VotingMethod.Borda);
      expect(poll.choices).toEqual(['X', 'Y', 'Z']);
    });
  });

  describe('createRankedChoice', () => {
    test('should create ranked choice poll', () => {
      const poll = PollFactory.createRankedChoice(
        ['A', 'B', 'C', 'D'],
        authority,
      );
      expect(poll.method).toBe(VotingMethod.RankedChoice);
      expect(poll.choices).toHaveLength(4);
    });
  });

  describe('Generic create', () => {
    test('should create poll with any method', () => {
      const poll = PollFactory.create(
        ['A', 'B'],
        VotingMethod.Plurality,
        authority,
      );
      expect(poll.method).toBe(VotingMethod.Plurality);
    });

    test('should pass options to poll', () => {
      const poll = PollFactory.create(
        ['A', 'B'],
        VotingMethod.Weighted,
        authority,
        { maxWeight: 500n },
      );
      expect(poll.method).toBe(VotingMethod.Weighted);
    });
  });

  describe('Validation', () => {
    test('should reject authority without voting keys', () => {
      const badAuthority = new MockMember(
        Buffer.from([1]),
        Buffer.from([1]),
        undefined,
        undefined,
      );
      expect(() =>
        PollFactory.createPlurality(['A', 'B'], badAuthority),
      ).toThrow('voting public key');
    });

    test('should reject < 2 choices', () => {
      expect(() =>
        PollFactory.createPlurality(['Only One'], authority),
      ).toThrow('at least 2 choices');
    });

    test('should reject empty choices', () => {
      expect(() => PollFactory.createPlurality([], authority)).toThrow(
        'at least 2 choices',
      );
    });
  });

  describe('Poll Properties', () => {
    test('created polls should not be closed', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      expect(poll.isClosed).toBe(false);
    });

    test('created polls should have zero voters', () => {
      const poll = PollFactory.createPlurality(['A', 'B'], authority);
      expect(poll.voterCount).toBe(0);
    });

    test('created polls should have unique IDs', () => {
      const polls = Array.from({ length: 10 }, () =>
        PollFactory.createPlurality(['A', 'B'], authority),
      );
      const ids = polls.map((p) => p.id.toString('hex'));
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('Choice Handling', () => {
    test('should preserve choice order', () => {
      const choices = ['First', 'Second', 'Third', 'Fourth'];
      const poll = PollFactory.createPlurality(choices, authority);
      expect(poll.choices).toEqual(choices);
    });

    test('should handle many choices', () => {
      const choices = Array.from({ length: 100 }, (_, i) => `Choice ${i}`);
      const poll = PollFactory.createPlurality(choices, authority);
      expect(poll.choices).toHaveLength(100);
    });

    test('should handle special characters in choices', () => {
      const choices = ['Option #1', 'Option @2', 'Option $3'];
      const poll = PollFactory.createPlurality(choices, authority);
      expect(poll.choices).toEqual(choices);
    });
  });
});
