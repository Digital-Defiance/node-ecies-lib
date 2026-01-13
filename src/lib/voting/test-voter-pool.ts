/**
 * Test voter pool for performance testing and benchmarking.
 * Pre-generates a pool of Member instances with voting keys for use in voting system tests,
 * avoiding the overhead of key generation during test execution.
 */
import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';

import { Member } from '../../member';
import { ECIESService } from '../../services/ecies/service';

export class TestVoterPool {
  private static voters: Member[] = [];
  private static authority: Member<Buffer> | undefined = undefined;
  private static eciesService: ECIESService<Buffer> | undefined = undefined;
  private static initialized = false;

  static async initialize(poolSize = 1000): Promise<void> {
    if (this.initialized) return;

    // Create ECIESService with proper configuration
    this.eciesService = new ECIESService<Buffer>({
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    });

    const result = Member.newMember<Buffer>(
      this.eciesService,
      MemberType.System,
      'Authority',
      new EmailString('auth@test.com'),
    );
    this.authority = result.member as Member<Buffer>;
    await this.authority.deriveVotingKeys();

    // Create voters in parallel
    const voterPromises = Array.from({ length: poolSize }, (_, i) => {
      const voter = Member.newMember(
        this.eciesService!,
        MemberType.User,
        `Voter${i}`,
        new EmailString(`voter${i}@test.com`),
      ).member;
      return voter.deriveVotingKeys().then(() => voter);
    });

    this.voters = await Promise.all(voterPromises);
    this.initialized = true;
  }

  static getAuthority(): Member {
    if (!this.authority) throw new Error('Pool not initialized');
    return this.authority;
  }

  static getEciesService(): ECIESService {
    if (!this.eciesService) throw new Error('Pool not initialized');
    return this.eciesService;
  }

  static getVoter(index: number): Member {
    if (!this.initialized) throw new Error('Pool not initialized');
    if (index < 0 || index >= this.voters.length) {
      throw new Error(
        `Voter index ${index} out of range [0, ${this.voters.length})`,
      );
    }
    return this.voters[index];
  }

  static getVoters(count: number, startIndex = 0): Member[] {
    if (!this.initialized) throw new Error('Pool not initialized');
    if (startIndex + count > this.voters.length) {
      throw new Error(
        `Not enough voters: requested ${count} from ${startIndex}, pool size ${this.voters.length}`,
      );
    }
    return this.voters.slice(startIndex, startIndex + count);
  }

  static getPoolSize(): number {
    return this.voters.length;
  }

  static reset(): void {
    this.voters = [];
    this.authority = undefined;
    this.eciesService = undefined;
    this.initialized = false;
  }
}
