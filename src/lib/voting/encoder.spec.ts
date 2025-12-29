/**
 * VoteEncoder Tests - Node.js
 */
import { generateRandomKeysSync as generateKeyPair } from 'paillier-bigint';
import { VoteEncoder } from './encoder';
import { VotingMethod } from './types';

describe('VoteEncoder', () => {
  let encoder: VoteEncoder;
  let publicKey: any;
  let privateKey: any;

  beforeAll(() => {
    const keyPair = generateKeyPair(512);
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
    encoder = new VoteEncoder(publicKey);
  });

  describe('Plurality Encoding', () => {
    test('should encrypt vote for selected choice', () => {
      const vote = encoder.encodePlurality(1, 3);
      expect(vote.choiceIndex).toBe(1);
      expect(vote.encrypted).toHaveLength(3);
      expect(typeof vote.encrypted[0]).toBe('bigint');
    });

    test('should decrypt to correct values', () => {
      const vote = encoder.encodePlurality(1, 3);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(0n);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(0n);
    });

    test('should produce different ciphertexts for same vote', () => {
      const vote1 = encoder.encodePlurality(0, 2);
      const vote2 = encoder.encodePlurality(0, 2);
      expect(vote1.encrypted[0]).not.toBe(vote2.encrypted[0]);
    });
  });

  describe('Approval Encoding', () => {
    test('should encrypt multiple approvals', () => {
      const vote = encoder.encodeApproval([0, 2], 4);
      expect(vote.choices).toEqual([0, 2]);
      expect(vote.encrypted).toHaveLength(4);
    });

    test('should decrypt to correct approvals', () => {
      const vote = encoder.encodeApproval([0, 2], 4);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(0n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[3])).toBe(0n);
    });

    test('should handle empty approval set', () => {
      const vote = encoder.encodeApproval([], 3);
      vote.encrypted.forEach((enc) => {
        expect(privateKey.decrypt(enc)).toBe(0n);
      });
    });
  });

  describe('Weighted Encoding', () => {
    test('should encrypt weight for choice', () => {
      const vote = encoder.encodeWeighted(1, 500n, 3);
      expect(vote.choiceIndex).toBe(1);
      expect(vote.weight).toBe(500n);
      expect(vote.encrypted).toHaveLength(3);
    });

    test('should decrypt to correct weight', () => {
      const vote = encoder.encodeWeighted(1, 500n, 3);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(0n);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(500n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(0n);
    });

    test('should handle large weights', () => {
      const largeWeight = 2n ** 32n;
      const vote = encoder.encodeWeighted(0, largeWeight, 2);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(largeWeight);
    });
  });

  describe('Borda Encoding', () => {
    test('should assign points by ranking', () => {
      const vote = encoder.encodeBorda([2, 0, 1], 3);
      expect(vote.rankings).toEqual([2, 0, 1]);
      expect(vote.encrypted).toHaveLength(3);
    });

    test('should decrypt to correct points', () => {
      const vote = encoder.encodeBorda([2, 0, 1], 3);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(3n);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(2n);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(1n);
    });

    test('should handle partial rankings', () => {
      const vote = encoder.encodeBorda([1, 0], 4);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(2n);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(0n);
      expect(privateKey.decrypt(vote.encrypted[3])).toBe(0n);
    });
  });

  describe('Ranked Choice Encoding', () => {
    test('should store ranking positions', () => {
      const vote = encoder.encodeRankedChoice([1, 2, 0], 3);
      expect(vote.rankings).toEqual([1, 2, 0]);
      expect(vote.encrypted).toHaveLength(3);
    });

    test('should decrypt to ranking positions', () => {
      const vote = encoder.encodeRankedChoice([1, 2, 0], 3);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(2n);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(3n);
    });

    test('should handle partial rankings', () => {
      const vote = encoder.encodeRankedChoice([2, 0], 4);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(2n);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(0n);
      expect(privateKey.decrypt(vote.encrypted[3])).toBe(0n);
    });
  });

  describe('Generic Encode Method', () => {
    test('should encode plurality via generic method', () => {
      const vote = encoder.encode(
        VotingMethod.Plurality,
        { choiceIndex: 1 },
        3,
      );
      expect(vote.choiceIndex).toBe(1);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(1n);
    });

    test('should encode approval via generic method', () => {
      const vote = encoder.encode(
        VotingMethod.Approval,
        { choices: [0, 2] },
        3,
      );
      expect(vote.choices).toEqual([0, 2]);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(1n);
      expect(privateKey.decrypt(vote.encrypted[2])).toBe(1n);
    });

    test('should encode weighted via generic method', () => {
      const vote = encoder.encode(
        VotingMethod.Weighted,
        { choiceIndex: 0, weight: 100n },
        2,
      );
      expect(vote.weight).toBe(100n);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(100n);
    });

    test('should encode borda via generic method', () => {
      const vote = encoder.encode(VotingMethod.Borda, { rankings: [1, 0] }, 2);
      expect(vote.rankings).toEqual([1, 0]);
      expect(privateKey.decrypt(vote.encrypted[1])).toBe(2n);
    });

    test('should encode ranked choice via generic method', () => {
      const vote = encoder.encode(
        VotingMethod.RankedChoice,
        { rankings: [0, 1] },
        2,
      );
      expect(vote.rankings).toEqual([0, 1]);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(1n);
    });

    test('should throw for missing required data', () => {
      expect(() => encoder.encode(VotingMethod.Plurality, {}, 2)).toThrow(
        'Choice required',
      );
      expect(() => encoder.encode(VotingMethod.Approval, {}, 2)).toThrow(
        'Choices required',
      );
      expect(() =>
        encoder.encode(VotingMethod.Weighted, { choiceIndex: 0 }, 2),
      ).toThrow('weight required');
      expect(() => encoder.encode(VotingMethod.Borda, {}, 2)).toThrow(
        'Rankings required',
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle single choice', () => {
      const vote = encoder.encodePlurality(0, 1);
      expect(vote.encrypted).toHaveLength(1);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(1n);
    });

    test('should handle many choices', () => {
      const vote = encoder.encodePlurality(50, 100);
      expect(vote.encrypted).toHaveLength(100);
      expect(privateKey.decrypt(vote.encrypted[50])).toBe(1n);
    });

    test('should handle zero weight', () => {
      const vote = encoder.encodeWeighted(0, 0n, 2);
      expect(privateKey.decrypt(vote.encrypted[0])).toBe(0n);
    });
  });
});
