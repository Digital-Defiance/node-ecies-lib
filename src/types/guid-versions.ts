/**
 * Version-branded GUID types for type-safe UUID version handling.
 * These types ensure compile-time safety when working with specific UUID versions.
 */

import type { GuidBuffer } from '../lib/guid';

/**
 * Brand for v1 (time-based) GUIDs
 */
export type GuidV1Buffer = GuidBuffer & { readonly __version: 1 };

/**
 * Brand for v3 (MD5 namespace) GUIDs
 */
export type GuidV3Buffer = GuidBuffer & { readonly __version: 3 };

/**
 * Brand for v4 (random) GUIDs
 */
export type GuidV4Buffer = GuidBuffer & { readonly __version: 4 };

/**
 * Brand for v5 (SHA-1 namespace) GUIDs
 */
export type GuidV5Buffer = GuidBuffer & { readonly __version: 5 };

/**
 * Union type of all versioned GUIDs
 */
export type VersionedGuidBuffer =
  | GuidV1Buffer
  | GuidV3Buffer
  | GuidV4Buffer
  | GuidV5Buffer;
