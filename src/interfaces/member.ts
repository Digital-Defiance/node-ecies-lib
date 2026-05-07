/**
 * Interface definitions for member.
 * Extends the base IMember from ecies-lib with Node.js-specific
 * Buffer types and additional methods.
 */
import type {
  IECIESConstants,
  IMember as IBaseMember,
} from '@digitaldefiance/ecies-lib';

import type { SignatureBuffer } from '../node_ecies_types';

import type { PlatformID } from './platform-id';

/**
 * Interface representing a member with cryptographic capabilities.
 * Extends the base IMember interface from ecies-lib with Node.js-specific
 * types (Buffer instead of Uint8Array) and additional methods.
 *
 * Streaming methods (encryptDataStream, decryptDataStream) are inherited
 * from the base interface. The node-ecies-lib Member class provides
 * Buffer-typed implementations that satisfy the base Uint8Array contract.
 *
 * @template TID - The ID type (Buffer, string, or ObjectId)
 * @template TSignature - The signature type (SignatureBuffer for Node.js)
 */
export interface IMember<
  TID extends PlatformID = Buffer,
  TSignature extends Buffer = SignatureBuffer,
  TDate extends Date | number = Date,
> extends IBaseMember<TID, TSignature, TDate> {
  // --- Node.js-specific additions (not in base IMember) ---

  /** ECIES constants from the underlying service */
  readonly constants: IECIESConstants;

  /** Returns the hex-encoded public key string */
  getPublicKeyString(): string;

  /** Returns the string representation of the member ID */
  getIdString(): string;

  /** Creator ID as Buffer (not in base IMember interface) */
  readonly creatorIdBytes: Buffer;

  // --- Narrowed property types (covariant: Buffer extends Uint8Array) ---

  readonly publicKey: Buffer;
  readonly idBytes: Buffer;

  // --- Narrowed method signatures (Buffer params) ---

  sign(data: Buffer): TSignature;
  signData(data: Buffer): TSignature;
  verify(signature: TSignature, data: Buffer): boolean;
  verifySignature(data: Buffer, signature: Buffer, publicKey: Buffer): boolean;

  // --- Narrowed encryption/decryption return types ---

  encryptData(
    data: string | Buffer,
    recipientPublicKey?: Buffer,
  ): Promise<Buffer> | Buffer;

  decryptData(encryptedData: Buffer): Promise<Buffer> | Buffer;
}
