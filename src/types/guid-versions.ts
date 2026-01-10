/**
 * Version-branded GUID types for type-safe UUID version handling.
 * These types ensure compile-time safety when working with specific UUID versions.
 */

import type { Guid } from '../lib/guid';

/**
 * Brand for v1 (time-based) GUIDs
 */
export type GuidV1 = Guid & { readonly __version: 1 };

/**
 * Brand for v3 (MD5 namespace) GUIDs
 */
export type GuidV3 = Guid & { readonly __version: 3 };

/**
 * Brand for v4 (random) GUIDs
 */
export type GuidV4 = Guid & { readonly __version: 4 };

/**
 * Brand for v5 (SHA-1 namespace) GUIDs
 */
export type GuidV5 = Guid & { readonly __version: 5 };

/**
 * Union type of all versioned GUIDs
 */
export type VersionedGuid = GuidV1 | GuidV3 | GuidV4 | GuidV5;
