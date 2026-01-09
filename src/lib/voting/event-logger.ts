/**
 * Event Logger for Government-Grade Voting
 * Node.js optimized - extends ecies-lib PollEventLogger with Buffer support
 * Implements requirement 1.3: Comprehensive event logging with microsecond timestamps
 */
import {
  PollEventLogger as BasePollEventLogger,
  EventType,
} from '@digitaldefiance/ecies-lib';

// Re-export types and interfaces from the interfaces directory
export type {
  EventLogEntry,
  EventLogger,
  PollConfiguration,
} from './interfaces';

// Re-export enumerations needed by tests
export { EventType };

/**
 * Node.js PollEventLogger that extends ecies-lib PollEventLogger
 * Uses Buffer for binary data instead of Uint8Array
 *
 * The base class handles all the logic, we just provide Node.js-specific defaults
 * and ensure Buffer is used by default instead of Uint8Array.
 */
export class PollEventLogger extends BasePollEventLogger {
  // All methods are inherited from BasePollEventLogger
  // The methods will work with Buffer since Buffer extends Uint8Array
  // Node.js will automatically handle the conversion

  /**
   * Override export method to return Buffer instead of Uint8Array
   */
  export(): Buffer {
    const exported = super.export();
    return Buffer.from(exported);
  }
}
