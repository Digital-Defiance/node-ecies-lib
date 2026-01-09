import type { EventLogger as BaseEventLogger } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Event logger interface for tracking poll lifecycle events.
 * Provides methods to log and query events with sequence integrity.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type EventLogger<TID extends PlatformID = Buffer> = BaseEventLogger<TID>;
