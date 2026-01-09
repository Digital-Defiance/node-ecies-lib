import type {
  EmailString,
  IECIESConstants,
  IIdProvider,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import type { Wallet } from '@ethereumjs/wallet';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import type { SignatureBuffer } from '../types';

import type { IEncryptedChunk } from './encrypted-chunk';
import type { PlatformID } from './platform-id';
import type { IStreamProgress } from './stream-progress';

/**
 * Interface representing a member with cryptographic capabilities.
 * This interface extends the shared IMember interface from ecies-lib
 * with Node.js-specific types (Buffer instead of Uint8Array).
 *
 * Note: When TID includes ObjectId, we don't strictly extend ISharedMember
 * because ObjectId is not compatible with the shared interface's constraints.
 *
 * @template TID - The ID type (Buffer, string, or ObjectId)
 * @template TSignature - The signature type (SignatureBuffer for Node.js)
 */
export interface IMember<
  TID extends PlatformID = Buffer,
  TSignature extends Buffer = SignatureBuffer,
> {
  // Required properties
  readonly id: TID;
  readonly idBytes: Buffer; // Canonical storage format for crypto operations
  readonly type: MemberType;
  readonly name: string;
  readonly email: EmailString;
  readonly publicKey: Buffer;
  readonly creatorId: TID;
  readonly dateCreated: Date;
  readonly dateUpdated: Date;

  // ID provider for voting system compatibility
  readonly idProvider: IIdProvider<TID>;

  // Optional private data properties
  readonly privateKey: SecureBuffer | undefined;
  readonly wallet: Wallet;

  // Optional wallet getter for compatibility
  get walletOptional(): Wallet | undefined;

  // Optional voting keys (for homomorphic encryption voting systems)
  readonly votingPublicKey?: PublicKey;
  readonly votingPrivateKey?: PrivateKey;

  // State properties
  readonly hasPrivateKey: boolean;
  readonly hasVotingPrivateKey: boolean;

  // Constants
  readonly constants: IECIESConstants;

  // Key management methods
  unloadPrivateKey(): void;
  unloadWallet(): void;
  unloadWalletAndPrivateKey(): void;
  loadWallet(mnemonic: SecureString, eciesParams?: IECIESConstants): void;
  loadPrivateKey(privateKey: SecureBuffer): void;

  // Voting key management methods
  loadVotingKeys(
    votingPublicKey: PublicKey,
    votingPrivateKey?: PrivateKey,
  ): void;
  deriveVotingKeys(options?: Record<string, unknown>): Promise<void>;
  unloadVotingPrivateKey(): void;

  // Utility methods
  getPublicKeyString(): string;
  getIdString(): string;

  // Signature methods with Node.js-specific types
  sign(data: Buffer): TSignature;
  signData(data: Buffer): TSignature;
  verify(signature: TSignature, data: Buffer): boolean;
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean;

  // Encryption/decryption methods with Node.js-specific types
  encryptDataStream(
    source: AsyncIterable<Buffer> | ReadableStream<Buffer>,
    options?: {
      recipientPublicKey?: Buffer;
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<IEncryptedChunk, void, unknown>;

  decryptDataStream(
    source: AsyncIterable<Buffer> | ReadableStream<Buffer>,
    options?: {
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<Buffer, void, unknown>;

  encryptData(
    data: string | Buffer,
    recipientPublicKey?: Buffer,
  ): Promise<Buffer> | Buffer;

  decryptData(encryptedData: Buffer): Promise<Buffer> | Buffer;

  // Serialization methods
  toJson(): string;
  dispose(): void;
}
