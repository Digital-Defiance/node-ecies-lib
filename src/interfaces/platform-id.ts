import { Types } from '@digitaldefiance/mongoose-types';
import { ObjectId } from 'bson';

export type PlatformID =
  | Uint8Array
  | Buffer
  | ObjectId
  | Types.ObjectId
  | string;
