import type { PlatformBuffer as BasePlatformBuffer } from '@digitaldefiance/ecies-lib';

/**
 * Platform-agnostic buffer type (Node.js extended)
 *
 * Extends the base PlatformBuffer from ecies-lib with Node.js Buffer support.
 * Buffer extends Uint8Array, so this is fully compatible with the base type.
 */
export type PlatformBuffer = BasePlatformBuffer | Buffer;
