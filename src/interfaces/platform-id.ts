/**
 * Platform-agnostic ID type for Node.js.
 * Extends the base PlatformID with Node.js-specific types.
 */
import type { PlatformID as BasePlatformID } from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';

import type { GuidV4Buffer } from '../types/guid-versions';

export type PlatformID =
  | BasePlatformID
  | GuidV4Buffer
  | Buffer
  | Types.ObjectId;
