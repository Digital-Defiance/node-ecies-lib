import type { PlatformID as BasePlatformID } from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';

export type PlatformID = BasePlatformID | Buffer | Types.ObjectId;
