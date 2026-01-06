import { ObjectId } from 'bson';
import { Types } from '@digitaldefiance/mongoose-types';

export type PlatformID = Uint8Array | Buffer | ObjectId | Types.ObjectId | string;
