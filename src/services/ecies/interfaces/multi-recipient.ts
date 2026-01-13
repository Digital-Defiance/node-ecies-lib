/**
 * Interface definitions for multi-recipient.
 */
import type { PlatformID } from '../../../interfaces';

export interface IMultiRecipient<TID extends PlatformID = Buffer> {
  id: TID;
  publicKey: Buffer;
}
