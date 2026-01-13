/**
 * Interface definitions for multi-encrypted-message.
 */
import type { PlatformID } from '../../../interfaces';

export interface IMultiEncryptedMessage<TID extends PlatformID = Buffer> {
  dataLength: number;
  recipientCount: number;
  recipientIds: TID[];
  recipientKeys: Buffer[];
  encryptedMessage: Buffer;
  headerSize: number;
  ephemeralPublicKey?: Buffer;
}
