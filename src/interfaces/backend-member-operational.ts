import type {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import type { Types } from '@digitaldefiance/mongoose-types';
import type { Wallet } from '@ethereumjs/wallet';

import type { SignatureBuffer } from '../types';

import type { IEncryptedChunk } from './encrypted-chunk';
import type { IStreamProgress } from './stream-progress';

/**
 * Operational interface for member - defines getters and methods
 */
export interface IBackendMemberOperational<
  I extends string | Types.ObjectId | Buffer | Uint8Array
> {
  // Required getters
  get id(): I;
  get type(): MemberType;
  get name(): string;
  get email(): EmailString;
  get publicKey(): Uint8Array;
  get creatorId(): I;
  get dateCreated(): Date;
  get dateUpdated(): Date;

  // Optional private data getters
  get privateKey(): SecureBuffer | undefined;
  get wallet(): Wallet | undefined;

  // State getters
  get hasPrivateKey(): boolean;

  // Methods
  sign(data: Buffer): SignatureBuffer;
  verify(signature: SignatureBuffer, data: Buffer): boolean;
  encryptData(data: string | Buffer): Uint8Array;
  decryptData(encryptedData: Buffer): Uint8Array;
  toJson(): string;
  dispose(): void;

  // Streaming methods
  encryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      recipientPublicKey?: Buffer;
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    }
  ): AsyncGenerator<IEncryptedChunk, void, unknown>;

  decryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    }
  ): AsyncGenerator<Buffer, void, unknown>;

  // Private key management
  loadWallet(mnemonic: SecureString): void;
  unloadPrivateKey(): void;
  unloadWallet(): void;
  unloadWalletAndPrivateKey(): void;
}

/**
 * Extended operational interface for test members
 */
export interface ITestNodeEciesMemberOperational
  extends IBackendMemberOperational<Types.ObjectId> {
  get mnemonic(): SecureString | undefined;
}
