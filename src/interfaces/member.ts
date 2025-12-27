import type {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import type { Types } from '@digitaldefiance/mongoose-types';
import type { Wallet } from '@ethereumjs/wallet';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import type { SignatureBuffer } from '../types';

import type { IEncryptedChunk } from './encrypted-chunk';
import type { IStreamProgress } from './stream-progress';

/**
 * Interface representing a member with cryptographic capabilities.
 * This interface defines the contract for member operations without
 * referencing concrete class implementations.
 */
export interface IMember<
  TID extends string | Types.ObjectId | Buffer | Uint8Array = Buffer,
> {
  // Required properties
  readonly id: TID;
  readonly type: MemberType;
  readonly name: string;
  readonly email: EmailString;
  readonly publicKey: Buffer;
  readonly creatorId: TID;
  readonly dateCreated: Date;
  readonly dateUpdated: Date;

  // Optional private data properties
  readonly privateKey: SecureBuffer | undefined;
  readonly wallet: Wallet;

  // Optional voting keys (for homomorphic encryption voting systems)
  readonly votingPublicKey?: PublicKey;
  readonly votingPrivateKey?: PrivateKey;

  // State properties
  readonly hasPrivateKey: boolean;
  readonly hasVotingPrivateKey: boolean;

  // Key management methods
  unloadPrivateKey(): void;
  unloadWallet(): void;
  unloadWalletAndPrivateKey(): void;
  loadWallet(mnemonic: SecureString): void;
  loadPrivateKey(privateKey: SecureBuffer): void;

  // Voting key management methods (optional, for systems that need voting)
  loadVotingKeys?(
    votingPublicKey: PublicKey,
    votingPrivateKey?: PrivateKey,
  ): void;
  deriveVotingKeys?(
    options?: import('../services/voting.service').DeriveVotingKeysOptions,
  ): Promise<void>;
  unloadVotingPrivateKey?(): void;

  // Cryptographic methods
  sign(data: Buffer): SignatureBuffer;
  signData(data: Buffer): SignatureBuffer;
  verify(signature: SignatureBuffer, data: Buffer): boolean;
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean;

  // Encryption/Decryption methods
  encryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      recipientPublicKey?: Buffer;
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<IEncryptedChunk, void, unknown>;

  decryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<Buffer, void, unknown>;

  encryptData(data: string | Buffer, recipientPublicKey?: Buffer): Buffer;

  decryptData(encryptedData: Buffer): Buffer;

  // Serialization methods
  toJson(): string;
  dispose(): void;
}
