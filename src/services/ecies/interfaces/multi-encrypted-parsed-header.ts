/**
 * Interface definitions for multi-encrypted-parsed-header.
 */
import type { PlatformID } from '../../../interfaces';

export interface IMultiEncryptedParsedHeader<TID extends PlatformID = Buffer> {
  dataLength: number;
  recipientCount: number;
  recipientIds: TID[];
  recipientKeys: Buffer[];
  headerSize: number;
  ephemeralPublicKey?: Buffer;
}
