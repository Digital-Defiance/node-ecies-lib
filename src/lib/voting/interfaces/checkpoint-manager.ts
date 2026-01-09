import type { ICheckpointManager as BaseICheckpointManager } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Checkpoint manager interface for persistent state management.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type ICheckpointManager<TID extends PlatformID = Buffer> =
  BaseICheckpointManager<TID>;
