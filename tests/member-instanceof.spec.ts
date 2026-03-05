/**
 * Tests for runtime instanceof correctness across the inheritance chain.
 *
 * Requirements:
 * - R9-AC1: Node_Member instanceof BaseMember returns true
 * - R9-AC2: BaseMember instanceof Node_Member returns false
 * - R9-AC3: Node_Member instanceof Node_Member returns true
 */
import {
  EmailString,
  Member as BaseMember,
  MemberType,
  ECIESService as BaseECIESService,
} from '@digitaldefiance/ecies-lib';
import { Member as NodeMember } from '../src/member';
import { ECIESService as NodeECIESService } from '../src/services/ecies/service';

describe('Member instanceof correctness', () => {
  let nodeEcies: NodeECIESService;
  let baseEcies: BaseECIESService;

  beforeEach(() => {
    nodeEcies = new NodeECIESService();
    baseEcies = new BaseECIESService();
  });

  describe('Node_Member instanceof checks (R9-AC1, R9-AC3)', () => {
    it('Node_Member instanceof BaseMember should return true', () => {
      const { member } = NodeMember.newMember(
        nodeEcies,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(member instanceof BaseMember).toBe(true);
    });

    it('Node_Member instanceof NodeMember should return true', () => {
      const { member } = NodeMember.newMember(
        nodeEcies,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(member instanceof NodeMember).toBe(true);
    });
  });

  describe('Base_Member instanceof checks (R9-AC2)', () => {
    it('BaseMember instanceof Node_Member should return false', () => {
      const { member } = BaseMember.newMember(
        baseEcies,
        MemberType.User,
        'Base User',
        new EmailString('base@example.com'),
      );

      expect(member instanceof NodeMember).toBe(false);
    });

    it('BaseMember instanceof BaseMember should return true', () => {
      const { member } = BaseMember.newMember(
        baseEcies,
        MemberType.User,
        'Base User',
        new EmailString('base@example.com'),
      );

      expect(member instanceof BaseMember).toBe(true);
    });
  });
});
