import type {
  EmailString,
  IECIESConstants,
  MemberType,
  SecureBuffer,
} from '@digitaldefiance/ecies-lib';
import type { Types } from '@digitaldefiance/mongoose-types';
import type { Wallet } from '@ethereumjs/wallet';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import type { SignatureBuffer } from '../types';

import type { IEncryptedChunk } from './encrypted-chunk';
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
 */
export interface IMember<
  TID extends string | Types.ObjectId | Buffer = Buffer,
> {
  // Properties from ISharedMember with Node.js-specific types
  readonly id: TID;
  readonly type: MemberType;
  readonly name: string;
  readonly email: EmailString;
  readonly publicKey: Buffer;
  readonly privateKey?: SecureBuffer;
  readonly wallet: Wallet;
  readonly constants: IECIESConstants;

  // Voting keys
  votingPublicKey?: PublicKey;
  votingPrivateKey?: PrivateKey;

  // Methods
  getPublicKeyString(): string;
  getIdString(): string;

  // Signature methods with Node.js-specific types
  sign(data: Buffer): SignatureBuffer;
  signData(data: Buffer): SignatureBuffer;
  verify(signature: SignatureBuffer, data: Buffer): boolean;
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean;

  // Encryption/decryption methods with Node.js-specific types
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
}
