import type { ICheckpointManagerExtended as BaseICheckpointManagerExtended } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Extended checkpoint manager interface - implemented in node-ecies-lib.
 * Provides additional functionality for checkpoint management.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type ICheckpointManagerExtended<TID extends PlatformID = Buffer> =
  BaseICheckpointManagerExtended<TID>;
