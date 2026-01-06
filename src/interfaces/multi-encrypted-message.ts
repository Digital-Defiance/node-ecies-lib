import type { IMultiEncryptedParsedHeader } from './multi-encrypted-parsed-header';
import type { PlatformID } from './platform-id';

export interface IMultiEncryptedMessage<
  TID extends PlatformID = Buffer,
> extends IMultiEncryptedParsedHeader<TID> {
  /**
   * The encrypted message.
   */
  readonly encryptedMessage: Buffer;
}
