/**
 * Provider-to-GUID conversion utilities for Node.js Buffer-based GUIDs.
 *
 * Extracted from GuidBuffer to break the circular dependency between
 * guid.ts and id-providers. These functions import both modules without
 * creating a cycle since nothing imports back into this file from either side.
 */

import {
  BaseIdProvider,
  CustomIdProvider,
  GuidError,
  GuidErrorType,
  ObjectIdProvider,
  Uint8ArrayIdProvider,
  UuidProvider,
  GuidV4Provider as GuidV4Uint8ArrayProvider,
} from '@digitaldefiance/ecies-lib';

import { GuidBuffer, VersionedGuidBuffer } from './guid';
import { BufferIdProvider } from './id-providers/buffer-provider';
import { GuidV4Provider } from './id-providers/guidv4-provider';

// Well-known v5 namespace UUIDs for deterministic derivation.
const NS_OBJECTID = '6ba7b814-9dad-11d1-80b4-00c04fd430c8';
const NS_CUSTOM = '6ba7b815-9dad-11d1-80b4-00c04fd430c8';
const NS_UINT8ARRAY = '6ba7b816-9dad-11d1-80b4-00c04fd430c8';
const NS_BUFFER = '6ba7b817-9dad-11d1-80b4-00c04fd430c8';

/**
 * Convert a provider's native ID to a GuidBuffer.
 *
 * For 16-byte providers (GuidV4Provider, UuidProvider) the bytes are
 * reinterpreted directly as a GUID — they already are one.
 *
 * For non-16-byte providers (ObjectIdProvider, CustomIdProvider,
 * Uint8ArrayIdProvider, BufferIdProvider) a deterministic UUID v5 is
 * derived using a provider-specific namespace.
 */
export function fromProviderId<T>(
  id: T,
  provider: BaseIdProvider<T>,
): VersionedGuidBuffer {
  const bytes = Buffer.from(provider.toBytes(id));
  return fromProviderIdBytes(bytes, provider);
}

/**
 * Convert raw ID bytes (from any provider) to a GuidBuffer.
 *
 * Same strategy as {@link fromProviderId} but starts from the Buffer
 * byte representation rather than the provider's native type.
 */
export function fromProviderIdBytes<T>(
  idBytes: Buffer,
  provider: BaseIdProvider<T>,
): VersionedGuidBuffer {
  if (idBytes.length !== provider.byteLength) {
    throw new GuidError(GuidErrorType.InvalidGuid);
  }

  // 16-byte providers: the bytes already represent a valid GUID
  if (
    provider instanceof GuidV4Provider ||
    provider instanceof GuidV4Uint8ArrayProvider ||
    provider instanceof UuidProvider
  ) {
    return GuidBuffer.fromPlatformBuffer(idBytes);
  }

  // Non-16-byte providers: derive a deterministic v5 GUID
  const serialized = provider.serialize(idBytes);
  let namespace: string;

  if (provider instanceof ObjectIdProvider) {
    namespace = NS_OBJECTID;
  } else if (provider instanceof CustomIdProvider) {
    namespace = NS_CUSTOM;
  } else if (provider instanceof Uint8ArrayIdProvider) {
    namespace = NS_UINT8ARRAY;
  } else if (provider instanceof BufferIdProvider) {
    namespace = NS_BUFFER;
  } else {
    // Fallback for unknown providers
    namespace = NS_CUSTOM;
  }

  return GuidBuffer.v5(serialized, namespace);
}
