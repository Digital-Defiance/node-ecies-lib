/**
 * Interface definitions for guid.
 */
import type {
  Base64Guid,
  BigIntGuid,
  FullHexGuid,
  IGuid as IGuidBase,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';

import type { RawGuidPlatformBuffer } from '../node_ecies_types';

import type { PlatformBuffer } from './platform-buffer';

export interface IGuidV4 extends IGuidBase {
  /**
   * Returns the GUID as a raw buffer.
   */
  get asRawGuidPlatformBuffer(): RawGuidPlatformBuffer;
  /**
   * Returns the GUID as a full hex string.
   */
  get asFullHexGuid(): FullHexGuid;
  /**
   * Returns the GUID as a Buffer.
   */
  get asPlatformBuffer(): PlatformBuffer;
  /**
   * Returns the GUID as a short hex string.
   */
  get asShortHexGuid(): ShortHexGuid;
  /**
   * Returns the GUID as a BigInt.
   */
  get asBigIntGuid(): BigIntGuid;
  /**
   * Returns the GUID as a Base64 string.
   */
  get asBase64Guid(): Base64Guid;

  /**
   * Returns the GUID as a base64 string
   */
  serialize(): string;
  /**
   * Returns the GUID as a JSON string
   */
  toJson(): string;
  /**
   * Returns the GUID as a Base64 string
   */
  toString(): Base64Guid;
  /**
   * Compares this GUID to another GUID
   * @param other The GUID to compare to (can be null/undefined)
   * @param constantTime Use constant-time comparison to prevent timing attacks
   */
  equals(other: IGuidV4 | null | undefined, constantTime?: boolean): boolean;
  /**
   * Creates a new GuidV4 instance with the same value as this one.
   * @returns A new GuidV4 instance with identical value
   */
  clone(): IGuidV4;
  /**
   * Returns the hash code for this GUID based on its buffer content.
   * Useful for using GUIDs as Map/Set keys.
   * @returns A numeric hash code
   */
  hashCode(): number;
  /**
   * Checks if this GUID is empty (all zeros).
   * @returns True if the GUID is all zeros, false otherwise
   */
  isEmpty(): boolean;
  /**
   * Extracts the RFC 4122 version from the GUID.
   * @returns The version number (1-5) or undefined
   */
  getVersion(): number | undefined;
  /**
   * Validates that this GUID is a proper v4 GUID according to RFC 4122.
   * @returns True if valid v4 GUID or boundary value, false otherwise
   */
  isValidV4(): boolean;
  /**
   * Compares two GUIDs for ordering.
   * @param other The other GUID to compare to
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  compareTo(other: IGuidV4): number;
}
