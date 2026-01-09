import type { EventLogEntry as BaseEventLogEntry } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Event log entry for poll event tracking.
 * Records poll lifecycle events with microsecond precision.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type EventLogEntry<TID extends PlatformID = Buffer> =
  BaseEventLogEntry<TID>;
