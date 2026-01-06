/**
 * Secure Voting Poll - Node.js Optimized
 */
import { randomBytes, createHash } from 'crypto';

import type { PublicKey } from 'paillier-bigint';

import type { IMember } from '../../interfaces/member';
import type { PlatformID } from '../../interfaces';
import type { SignatureBuffer } from '../../types';

import { ImmutableAuditLog, type AuditLog } from './audit';
import { VotingSecurityValidator } from './security';
import { VotingMethod, type VoteReceipt, type EncryptedVote } from './types';

export class Poll<TID extends PlatformID = Buffer> {
  private readonly _id: TID;
  private readonly _choices: ReadonlyArray<string>;
  private readonly _method: VotingMethod;
  private readonly _authority: IMember<TID>;
  private readonly ___votingPublicKey: PublicKey;
  private readonly _votes: Map<string, bigint[]> = new Map();
  private readonly _receipts: Map<string, VoteReceipt> = new Map();
  private readonly _createdAt: number;
  private _closedAt?: number;
  private _maxWeight?: bigint;
  private readonly _auditLog: ImmutableAuditLog<TID>;

  constructor(
    id: TID,
    choices: string[],
    method: VotingMethod,
    authority: IMember<TID>,
    votingPublicKey: PublicKey,
    maxWeight?: bigint,
    allowInsecure?: boolean,
  ) {
    if (choices.length < 2) throw new Error('Poll requires at least 2 choices');
    if (!authority.votingPublicKey)
      throw new Error('Authority must have voting keys');
    VotingSecurityValidator.validate(method, { allowInsecure });
    this._id = id;
    this._choices = Object.freeze([...choices]);
    this._method = method;
    this._authority = authority;
    this.___votingPublicKey = votingPublicKey;
    this._maxWeight = maxWeight;
    this._createdAt = Date.now();
    this._auditLog = new ImmutableAuditLog(authority);
    this._auditLog.recordPollCreated(id, {
      method,
      choiceCount: choices.length,
      maxWeight: maxWeight?.toString(),
    });
  }

  get id(): TID {
    return this._id;
  }
  get choices(): ReadonlyArray<string> {
    return this._choices;
  }
  get method(): VotingMethod {
    return this._method;
  }
  get isClosed(): boolean {
    return this._closedAt !== undefined;
  }
  get voterCount(): number {
    return this._receipts.size;
  }
  get createdAt(): number {
    return this._createdAt;
  }
  get closedAt(): number | undefined {
    return this._closedAt;
  }
  get auditLog(): AuditLog<TID> {
    return this._auditLog;
  }

  vote(voter: IMember<TID>, vote: EncryptedVote): VoteReceipt {
    if (this.isClosed) throw new Error('Poll is closed');
    const voterId = Buffer.from(voter.id as Buffer).toString('hex');
    if (this._receipts.has(voterId)) throw new Error('Already voted');
    this._validateVote(vote);
    this._votes.set(voterId, vote.encrypted);
    const receipt = this._generateReceipt(voter);
    this._receipts.set(voterId, receipt);
    const voterIdHash = createHash('sha256').update(Buffer.from(voter.id as Buffer)).digest();
    this._auditLog.recordVoteCast(this._id, voterIdHash);
    return receipt;
  }

  verifyReceipt(voter: IMember<TID>, receipt: VoteReceipt): boolean {
    const voterId = Buffer.from(voter.id as Buffer).toString('hex');
    const stored = this._receipts.get(voterId);
    if (!stored) return false;
    const data = this._receiptData(receipt);
    return this._authority.verify(
      receipt.signature as unknown as SignatureBuffer,
      data,
    );
  }

  close(): void {
    if (this.isClosed) throw new Error('Already closed');
    this._closedAt = Date.now();
    this._auditLog.recordPollClosed(this._id, {
      voterCount: this.voterCount,
      closedAt: this._closedAt,
    });
  }

  getEncryptedVotes(): ReadonlyMap<string, readonly bigint[]> {
    const frozenEntries = Array.from(this._votes.entries()).map(
      ([key, value]) => [key, Object.freeze([...value])] as const,
    );
    const readonlyMap = new Map(frozenEntries);
    return new Proxy(readonlyMap, {
      get(target, prop) {
        if (prop === 'set' || prop === 'delete' || prop === 'clear') {
          throw new Error('Cannot modify readonly map');
        }
        const value = Reflect.get(target, prop) as unknown;
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(target);
        }
        return value;
      },
    }) as ReadonlyMap<string, readonly bigint[]>;
  }

  private _validateVote(vote: EncryptedVote): void {
    switch (this._method) {
      case VotingMethod.Plurality:
        if (vote.choiceIndex === undefined) throw new Error('Choice required');
        if (vote.choiceIndex < 0 || vote.choiceIndex >= this._choices.length) {
          throw new Error('Invalid choice');
        }
        break;
      case VotingMethod.Approval:
        if (!vote.choices?.length) throw new Error('Choices required');
        for (const c of vote.choices) {
          if (c < 0 || c >= this._choices.length)
            throw new Error('Invalid choice');
        }
        break;
      case VotingMethod.Weighted:
        if (vote.choiceIndex === undefined) throw new Error('Choice required');
        if (!vote.weight || vote.weight <= 0n)
          throw new Error('Weight must be positive');
        if (this._maxWeight && vote.weight > this._maxWeight) {
          throw new Error('Weight exceeds maximum');
        }
        break;
      case VotingMethod.Borda:
      case VotingMethod.RankedChoice: {
        if (!vote.rankings?.length) throw new Error('Rankings required');
        const seen = new Set<number>();
        for (const r of vote.rankings) {
          if (r < 0 || r >= this._choices.length)
            throw new Error('Invalid choice');
          if (seen.has(r)) throw new Error('Duplicate ranking');
          seen.add(r);
        }
        break;
      }
    }
    if (!vote.encrypted?.length) throw new Error('Encrypted data required');
  }

  private _generateReceipt(voter: IMember<TID>): VoteReceipt {
    const nonce = randomBytes(16);
    const receipt: VoteReceipt = {
      voterId: Buffer.from(voter.id as Buffer),
      pollId: Buffer.from(this._id as Buffer),
      timestamp: Date.now(),
      signature: Buffer.alloc(0),
      nonce,
    };
    const data = this._receiptData(receipt);
    receipt.signature = this._authority.sign(data);
    return receipt;
  }

  private _receiptData(receipt: VoteReceipt): Buffer {
    const timestamp = Buffer.alloc(8);
    timestamp.writeBigUInt64BE(BigInt(receipt.timestamp));
    return Buffer.concat([
      receipt.voterId,
      receipt.pollId,
      timestamp,
      receipt.nonce,
    ]);
  }
}
