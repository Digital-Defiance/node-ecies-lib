/**
 * Platform-agnostic ID type for Node.js.
 * Extends the base PlatformID with Node.js-specific types.
 */
import type { PlatformID as BasePlatformID } from '@digitaldefiance/ecies-lib';
import type { ObjectId } from 'bson';

import type { GuidV4Buffer } from '../types/guid-versions';

export type PlatformID = BasePlatformID | GuidV4Buffer | Buffer | ObjectId;
