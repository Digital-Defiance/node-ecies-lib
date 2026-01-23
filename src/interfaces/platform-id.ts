/**
 * Interface definitions for platform-id.
 */
import type { PlatformID as BasePlatformID } from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { GuidV4Buffer } from '../types/guid-versions';

export type PlatformID = BasePlatformID | GuidV4Buffer | Buffer | Types.ObjectId;
