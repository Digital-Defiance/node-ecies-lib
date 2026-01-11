import type { PlatformID } from '../../../interfaces';

export interface IMultiRecipient<TID extends PlatformID = Buffer> {
  id: TID;
  publicKey: Buffer;
}
