import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import { Types } from 'mongoose';
import { SignatureBuffer } from '../types';

/**
 * Operational interface for member - defines getters and methods
 */
export interface IMemberOperational<I extends string | Types.ObjectId> {
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

  // Private key management
  loadWallet(mnemonic: SecureString): void;
  unloadPrivateKey(): void;
  unloadWallet(): void;
  unloadWalletAndPrivateKey(): void;
}

/**
 * Extended operational interface for test members
 */
export interface ITestBrightChainMemberOperational
  extends IMemberOperational<Types.ObjectId> {
  get mnemonic(): SecureString | undefined;
}
