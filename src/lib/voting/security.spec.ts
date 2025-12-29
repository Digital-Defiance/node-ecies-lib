/**
 * VotingSecurityValidator Tests - Node.js
 */
import {
  VotingSecurityValidator,
  SecurityLevel,
  VOTING_SECURITY,
} from './security';
import { VotingMethod } from './types';

describe('VotingSecurityValidator', () => {
  describe('Security Level Classification', () => {
    test('should classify fully homomorphic methods', () => {
      expect(VOTING_SECURITY[VotingMethod.Plurality]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.Approval]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.Weighted]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.Borda]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.Score]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.YesNo]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.YesNoAbstain]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
      expect(VOTING_SECURITY[VotingMethod.Supermajority]).toBe(
        SecurityLevel.FullyHomomorphic,
      );
    });

    test('should classify multi-round methods', () => {
      expect(VOTING_SECURITY[VotingMethod.RankedChoice]).toBe(
        SecurityLevel.MultiRound,
      );
      expect(VOTING_SECURITY[VotingMethod.TwoRound]).toBe(
        SecurityLevel.MultiRound,
      );
      expect(VOTING_SECURITY[VotingMethod.STAR]).toBe(SecurityLevel.MultiRound);
      expect(VOTING_SECURITY[VotingMethod.STV]).toBe(SecurityLevel.MultiRound);
    });

    test('should classify insecure methods', () => {
      expect(VOTING_SECURITY[VotingMethod.Quadratic]).toBe(
        SecurityLevel.Insecure,
      );
      expect(VOTING_SECURITY[VotingMethod.Consensus]).toBe(
        SecurityLevel.Insecure,
      );
      expect(VOTING_SECURITY[VotingMethod.ConsentBased]).toBe(
        SecurityLevel.Insecure,
      );
    });

    test('should have classification for all methods', () => {
      const allMethods = Object.values(VotingMethod);
      allMethods.forEach((method) => {
        expect(VOTING_SECURITY[method]).toBeDefined();
      });
    });
  });

  describe('isFullySecure', () => {
    test('should return true for fully homomorphic methods', () => {
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.Plurality),
      ).toBe(true);
      expect(VotingSecurityValidator.isFullySecure(VotingMethod.Approval)).toBe(
        true,
      );
      expect(VotingSecurityValidator.isFullySecure(VotingMethod.Weighted)).toBe(
        true,
      );
    });

    test('should return false for multi-round methods', () => {
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.RankedChoice),
      ).toBe(false);
      expect(VotingSecurityValidator.isFullySecure(VotingMethod.TwoRound)).toBe(
        false,
      );
    });

    test('should return false for insecure methods', () => {
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.Quadratic),
      ).toBe(false);
      expect(
        VotingSecurityValidator.isFullySecure(VotingMethod.Consensus),
      ).toBe(false);
    });
  });

  describe('requiresMultipleRounds', () => {
    test('should return true for multi-round methods', () => {
      expect(
        VotingSecurityValidator.requiresMultipleRounds(
          VotingMethod.RankedChoice,
        ),
      ).toBe(true);
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.TwoRound),
      ).toBe(true);
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.STAR),
      ).toBe(true);
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.STV),
      ).toBe(true);
    });

    test('should return false for single-round methods', () => {
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.Plurality),
      ).toBe(false);
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.Approval),
      ).toBe(false);
    });

    test('should return false for insecure methods', () => {
      expect(
        VotingSecurityValidator.requiresMultipleRounds(VotingMethod.Quadratic),
      ).toBe(false);
    });
  });

  describe('getSecurityLevel', () => {
    test('should return correct security level', () => {
      expect(
        VotingSecurityValidator.getSecurityLevel(VotingMethod.Plurality),
      ).toBe(SecurityLevel.FullyHomomorphic);
      expect(
        VotingSecurityValidator.getSecurityLevel(VotingMethod.RankedChoice),
      ).toBe(SecurityLevel.MultiRound);
      expect(
        VotingSecurityValidator.getSecurityLevel(VotingMethod.Quadratic),
      ).toBe(SecurityLevel.Insecure);
    });
  });

  describe('validate', () => {
    test('should accept fully secure methods by default', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Plurality),
      ).not.toThrow();
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Approval),
      ).not.toThrow();
    });

    test('should accept multi-round methods by default', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.RankedChoice),
      ).not.toThrow();
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.TwoRound),
      ).not.toThrow();
    });

    test('should reject insecure methods by default', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Quadratic),
      ).toThrow('not cryptographically secure');
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Consensus),
      ).toThrow('not cryptographically secure');
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.ConsentBased),
      ).toThrow('not cryptographically secure');
    });

    test('should accept insecure methods with allowInsecure flag', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Quadratic, {
          allowInsecure: true,
        }),
      ).not.toThrow();
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Consensus, {
          allowInsecure: true,
        }),
      ).not.toThrow();
    });

    test('should reject multi-round when requireFullySecure is true', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.RankedChoice, {
          requireFullySecure: true,
        }),
      ).toThrow('requires intermediate decryption');
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.STAR, {
          requireFullySecure: true,
        }),
      ).toThrow('requires intermediate decryption');
    });

    test('should accept fully secure when requireFullySecure is true', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Plurality, {
          requireFullySecure: true,
        }),
      ).not.toThrow();
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Weighted, {
          requireFullySecure: true,
        }),
      ).not.toThrow();
    });

    test('should reject insecure even with requireFullySecure', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Quadratic, {
          requireFullySecure: true,
        }),
      ).toThrow('not cryptographically secure');
    });

    test('should allow insecure with both flags', () => {
      expect(() =>
        VotingSecurityValidator.validate(VotingMethod.Quadratic, {
          requireFullySecure: false,
          allowInsecure: true,
        }),
      ).not.toThrow();
    });
  });

  describe('Error Messages', () => {
    test('should provide helpful error for insecure methods', () => {
      try {
        VotingSecurityValidator.validate(VotingMethod.Quadratic);
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('not cryptographically secure');
        expect(e.message).toContain('allowInsecure');
      }
    });

    test('should provide helpful error for multi-round restriction', () => {
      try {
        VotingSecurityValidator.validate(VotingMethod.RankedChoice, {
          requireFullySecure: true,
        });
        fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('intermediate decryption');
        expect(e.message).toContain('fully homomorphic');
      }
    });
  });

  describe('All Methods Coverage', () => {
    test('should validate all voting methods', () => {
      const allMethods = Object.values(VotingMethod);
      allMethods.forEach((method) => {
        const level = VotingSecurityValidator.getSecurityLevel(method);
        expect([
          SecurityLevel.FullyHomomorphic,
          SecurityLevel.MultiRound,
          SecurityLevel.Insecure,
        ]).toContain(level);
      });
    });
  });
});
