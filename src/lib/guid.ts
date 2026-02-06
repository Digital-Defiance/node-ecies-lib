/**
 * RFC 4122 compliant GUID implementation for Node.js.
 * Extends Buffer directly to ensure full Buffer compatibility in Node.js environments.
 */
import {
  GuidInput,
  GuidUint8Array,
  IGuid,
  type Base64Guid,
  type BigIntGuid,
  type FullHexGuid,
  type RawGuidPlatformBuffer,
  type ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import * as uuid from 'uuid';

import { PlatformBuffer } from '../interfaces';

/**
 * Type representing a GuidBuffer with its RFC 4122 version attached.
 */
export type VersionedGuidBuffer<
  V extends 1 | 3 | 4 | 5 | 6 | 7 | undefined =
    | 1
    | 3
    | 4
    | 5
    | 6
    | 7
    | undefined,
> = GuidBuffer & { readonly __version: V };

/**
 * Node.js GUID implementation that extends Buffer directly.
 * This ensures full Buffer compatibility while providing GUID-specific functionality.
 *
 * Implements IGuid interface for compatibility with ecies-lib.
 */
export class GuidBuffer extends Buffer implements IGuid {
  /**
   * Cached full hex representation for performance
   */
  private _cachedFullHex?: FullHexGuid;

  /**
   * Cached short hex representation for performance
   */
  private _cachedShortHex?: ShortHexGuid;

  /**
   * Cached base64 representation for performance
   */
  private _cachedBase64?: Base64Guid;

  /**
   * The RFC 4122 version of this GUID
   */
  public __version?: 1 | 3 | 4 | 5 | 6 | 7 | undefined;

  /**
   * Creates a new GuidBuffer from any valid GUID input.
   *
   * Note: Due to Buffer subclassing limitations, this constructor
   * returns a new instance created via Object.setPrototypeOf.
   */
  constructor(value: GuidInput) {
    // We must call super, but the actual instance is created differently
    super(0);

    // Validate and convert the input using GuidUint8Array
    const validated = new GuidUint8Array(value);

    // Create a proper Buffer and set its prototype to GuidBuffer
    const buffer = Buffer.from(validated);
    Object.setPrototypeOf(buffer, GuidBuffer.prototype);

    // Initialize cache properties on the buffer
    const guid = buffer as unknown as GuidBuffer;
    guid._cachedFullHex = undefined;
    guid._cachedShortHex = undefined;
    guid._cachedBase64 = undefined;
    guid.__version = undefined;

    // Return the properly constructed buffer
    // This is a valid pattern for TypedArray subclasses
    return guid;
  }

  /**
   * Override species to return Buffer for methods like slice(), map(), etc.
   */
  static get [Symbol.species](): typeof Buffer {
    return Buffer;
  }

  /**
   * Internal factory to create a GuidBuffer from validated bytes (no validation).
   */
  private static createFromBytes(bytes: Uint8Array): GuidBuffer {
    // Create a Buffer from the bytes
    const buffer = Buffer.from(bytes);
    // Set the prototype to GuidBuffer
    Object.setPrototypeOf(buffer, GuidBuffer.prototype);
    // Initialize cache properties
    const guid = buffer as unknown as GuidBuffer;
    guid._cachedFullHex = undefined;
    guid._cachedShortHex = undefined;
    guid._cachedBase64 = undefined;
    guid.__version = undefined;
    return guid;
  }

  /**
   * Static factory method (alternative to constructor).
   */
  public static create(value: GuidInput): GuidBuffer {
    // Use GuidUint8Array for validation and conversion
    const validated = new GuidUint8Array(value);
    return GuidBuffer.createFromBytes(validated);
  }

  /**
   * Returns the GUID as a raw Buffer.
   * Returns itself since GuidBuffer IS a Buffer.
   * @deprecated Use asRawBuffer for a plain Buffer copy to avoid type mismatches.
   */
  public get asBuffer(): Buffer {
    return this;
  }

  /**
   * Returns the GUID as a plain Buffer (defensive copy).
   * Use this when you need a plain Buffer type rather than GuidBuffer.
   */
  public get asRawBuffer(): Buffer {
    return Buffer.from(this);
  }

  /**
   * Returns the GUID as a raw Uint8Array (defensive copy).
   */
  public get asRawGuidPlatformBuffer(): RawGuidPlatformBuffer {
    return new Uint8Array(this) as RawGuidPlatformBuffer;
  }

  /**
   * Returns the internal buffer without copying.
   * @internal
   */
  public get asRawGuidPlatformBufferUnsafe(): RawGuidPlatformBuffer {
    return this as unknown as RawGuidPlatformBuffer;
  }

  /**
   * Returns the GUID as a native Uint8Array (not a Buffer).
   */
  public get asUint8Array(): Uint8Array {
    return new Uint8Array(this);
  }

  /**
   * Returns the GUID as a PlatformBuffer (Buffer in Node.js).
   * Returns itself since GuidBuffer IS a Buffer.
   */
  public get asPlatformBuffer(): PlatformBuffer {
    // Return as Buffer type to satisfy PlatformBuffer
    return this as unknown as PlatformBuffer;
  }

  /**
   * Returns the GUID as a full hex string (with dashes).
   * Result is cached for performance.
   */
  public get asFullHexGuid(): FullHexGuid {
    if (!this._cachedFullHex) {
      const hexString = this.toString('hex');
      this._cachedFullHex = GuidUint8Array.toFullHexGuid(hexString);
    }
    return this._cachedFullHex;
  }

  /**
   * Returns the GUID as a short hex string (without dashes).
   * Result is cached for performance.
   */
  public get asShortHexGuid(): ShortHexGuid {
    if (!this._cachedShortHex) {
      this._cachedShortHex = this.toString('hex') as ShortHexGuid;
    }
    return this._cachedShortHex;
  }

  /**
   * Returns the GUID as a base64 string.
   * Result is cached for performance.
   */
  public get asBase64Guid(): Base64Guid {
    if (!this._cachedBase64) {
      this._cachedBase64 = this.toString('base64') as Base64Guid;
    }
    return this._cachedBase64;
  }

  /**
   * Returns the GUID as a bigint.
   */
  public get asBigIntGuid(): BigIntGuid {
    return BigInt('0x' + this.toString('hex')) as BigIntGuid;
  }

  /**
   * Returns a URL-safe base64 representation.
   */
  public get asUrlSafeBase64(): string {
    return this.toString('base64url');
  }

  /**
   * Serializes the GUID to a base64 string.
   */
  public serialize(): string {
    return this.asBase64Guid;
  }

  /**
   * Returns the GUID as a JSON string.
   */
  public toJson(): string {
    return JSON.stringify(this.asBase64Guid);
  }

  /**
   * Returns the GUID as a base64 string (default string representation).
   * Overloaded to support both Buffer encoding and IGuid interface.
   */
  public override toString(): Base64Guid;
  public override toString(encoding: BufferEncoding): string;
  public override toString(encoding?: BufferEncoding): string | Base64Guid {
    if (encoding) {
      return super.toString(encoding);
    }
    return this.asBase64Guid;
  }

  /**
   * Extracts the RFC 4122 version from the GUID.
   */
  public getVersion(): number | undefined {
    // Version is in bits 48-51 (byte 6, high nibble)
    const versionByte = this[6];
    const version = (versionByte >> 4) & 0x0f;
    return version >= 1 && version <= 7 ? version : undefined;
  }

  /**
   * Extracts the variant from the GUID.
   */
  public getVariant(): number | undefined {
    const variantByte = this[8];
    if ((variantByte & 0x80) === 0) return 0; // NCS
    if ((variantByte & 0xc0) === 0x80) return 1; // RFC 4122
    if ((variantByte & 0xe0) === 0xc0) return 2; // Microsoft
    return undefined;
  }

  /**
   * Returns the timestamp from a v1 GUID.
   */
  public getTimestamp(): Date | undefined {
    if (this.getVersion() !== 1) return undefined;

    const timeLow =
      (this[0] << 24) | (this[1] << 16) | (this[2] << 8) | this[3];
    const timeMid = (this[4] << 8) | this[5];
    const timeHigh = ((this[6] & 0x0f) << 8) | this[7];
    const timestamp =
      (BigInt(timeHigh) << 48n) |
      (BigInt(timeMid) << 32n) |
      BigInt(timeLow >>> 0);
    const unixTimestamp = Number(timestamp - 122192928000000000n) / 10000;
    return new Date(unixTimestamp);
  }

  /**
   * Checks if this GUID is empty (all zeros).
   */
  public isEmpty(): boolean {
    for (let i = 0; i < this.length; i++) {
      if (this[i] !== 0) return false;
    }
    return true;
  }

  /**
   * Validates that this GUID is a proper v1 GUID.
   */
  public isValidV1(): boolean {
    return this.getVersion() === 1;
  }

  /**
   * Validates that this GUID is a proper v3 GUID.
   */
  public isValidV3(): boolean {
    return this.getVersion() === 3;
  }

  /**
   * Validates that this GUID is a proper v4 GUID.
   */
  public isValidV4(): boolean {
    const fullHex = this.asFullHexGuid;
    // Boundary values are considered valid
    if (
      fullHex === '00000000-0000-0000-0000-000000000000' ||
      fullHex === 'ffffffff-ffff-ffff-ffff-ffffffffffff'
    ) {
      return true;
    }
    return this.getVersion() === 4;
  }

  /**
   * Validates that this GUID is a proper v5 GUID.
   */
  public isValidV5(): boolean {
    return this.getVersion() === 5;
  }

  /**
   * Validates that this GUID is a proper v6 GUID.
   */
  public isValidV6(): boolean {
    return this.getVersion() === 6;
  }

  /**
   * Validates that this GUID is a proper v7 GUID.
   */
  public isValidV7(): boolean {
    return this.getVersion() === 7;
  }

  /**
   * Compare two Guid instances for equality (IGuid interface).
   * Note: This is named guidEquals to avoid conflict with Buffer.equals()
   */
  public guidEquals(
    other: IGuid | null | undefined,
    constantTime = false,
  ): boolean {
    if (!other) return false;

    const b = other.asRawGuidPlatformBuffer;
    if (constantTime) {
      let result = 0;
      for (let i = 0; i < 16; i++) {
        result |= this[i] ^ b[i];
      }
      return result === 0;
    }

    for (let i = 0; i < 16; i++) {
      if (this[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * IGuid.equals implementation - delegates to guidEquals.
   * Uses method overloading to satisfy both Buffer and IGuid interfaces.
   */
  public override equals(otherBuffer: Uint8Array): boolean;
  public equals(
    other: IGuid | null | undefined,
    constantTime?: boolean,
  ): boolean;
  public equals(
    other: Uint8Array | IGuid | null | undefined,
    constantTime = false,
  ): boolean {
    if (!other) return false;

    // If it's a plain Uint8Array (Buffer.equals signature), use Buffer comparison
    if (other instanceof Uint8Array && !('asRawGuidPlatformBuffer' in other)) {
      return super.equals(other);
    }

    // Otherwise treat as IGuid
    return this.guidEquals(other as IGuid, constantTime);
  }

  /**
   * Creates a clone of this GUID.
   */
  public clone(): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(GuidBuffer.createFromBytes(this));
  }

  /**
   * Returns a hash code for this GUID.
   */
  public hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      hash = (hash << 5) - hash + this[i];
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Compares two GUIDs for ordering.
   */
  public compareTo(other: IGuid): number {
    const b = other.asRawGuidPlatformBuffer;
    for (let i = 0; i < 16; i++) {
      if (this[i] < b[i]) return -1;
      if (this[i] > b[i]) return 1;
    }
    return 0;
  }

  /**
   * Returns a human-readable debug string.
   */
  public toDebugString(): string {
    const version = this.getVersion();
    const variant = this.getVariant();
    return `GuidBuffer(${this.asFullHexGuid}, v${version ?? '?'}, variant=${variant ?? '?'})`;
  }

  // ============ Static Factory Methods ============

  /**
   * Attaches the RFC 4122 version to a GuidBuffer instance.
   */
  private static attachVersion<T extends GuidBuffer>(
    guid: T,
  ): VersionedGuidBuffer {
    guid.__version = guid.getVersion() as 1 | 3 | 4 | 5 | 6 | 7 | undefined;
    return guid as VersionedGuidBuffer;
  }

  /**
   * Generates a new random v4 GUID.
   */
  public static v4(): VersionedGuidBuffer<4> {
    const uuidStr = uuid.v4();
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<4>;
  }

  /**
   * Alias for v4().
   */
  public static generate(): VersionedGuidBuffer<4> {
    return GuidBuffer.v4();
  }

  /**
   * Alias for v4() for backward compatibility.
   * @deprecated Use generate() instead
   */
  public static new(): VersionedGuidBuffer<4> {
    return GuidBuffer.v4();
  }

  /**
   * Creates a v1 (time-based) GUID.
   */
  public static v1(options?: uuid.Version1Options): VersionedGuidBuffer<1> {
    const uuidStr = uuid.v1(options);
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<1>;
  }

  /**
   * Creates a v3 (MD5 namespace) GUID.
   */
  public static v3(
    name: string,
    namespace: string | Uint8Array,
  ): VersionedGuidBuffer<3> {
    const namespaceStr =
      typeof namespace === 'string'
        ? namespace
        : GuidUint8Array.toFullHexGuid(namespace as RawGuidPlatformBuffer);
    const uuidStr = uuid.v3(name, namespaceStr);
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<3>;
  }

  /**
   * Creates a v5 (SHA-1 namespace) GUID.
   */
  public static v5(
    name: string,
    namespace: string | Uint8Array,
  ): VersionedGuidBuffer<5> {
    const namespaceStr =
      typeof namespace === 'string'
        ? namespace
        : GuidUint8Array.toFullHexGuid(namespace as RawGuidPlatformBuffer);
    const uuidStr = uuid.v5(name, namespaceStr);
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<5>;
  }

  /**
   * Creates a v6 GUID.
   */
  public static v6(options?: uuid.Version6Options): VersionedGuidBuffer<6> {
    const uuidStr = uuid.v6(options);
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<6>;
  }

  /**
   * Creates a v7 GUID.
   */
  public static v7(options?: uuid.Version7Options): VersionedGuidBuffer<7> {
    const uuidStr = uuid.v7(options);
    return GuidBuffer.attachVersion(
      GuidBuffer.create(uuidStr),
    ) as VersionedGuidBuffer<7>;
  }

  /**
   * Parses a GUID from any valid format.
   */
  public static parse(value: GuidInput): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(GuidBuffer.create(value));
  }

  /**
   * Attempts to parse a GUID, returning null on failure.
   */
  public static tryParse(value: GuidInput): VersionedGuidBuffer | null {
    try {
      return GuidBuffer.attachVersion(GuidBuffer.create(value));
    } catch {
      return null;
    }
  }

  /**
   * Hydrates a GuidBuffer from a serialized string.
   */
  public static hydrate(value: string): VersionedGuidBuffer {
    return GuidBuffer.parse(value);
  }

  /**
   * Factory method to create a GUID from a full hex string.
   */
  public static fromFullHex(fullHex: string): VersionedGuidBuffer {
    return GuidBuffer.parse(fullHex);
  }

  /**
   * Factory method to create a GUID from a short hex string.
   */
  public static fromShortHex(shortHex: string): VersionedGuidBuffer {
    return GuidBuffer.parse(shortHex);
  }

  /**
   * Factory method to create a GUID from a base64 string.
   */
  public static fromBase64(base64: string): VersionedGuidBuffer {
    return GuidBuffer.parse(base64);
  }

  /**
   * Factory method to create a GUID from a bigint.
   */
  public static fromBigInt(bigint: bigint): VersionedGuidBuffer {
    return GuidBuffer.parse(bigint);
  }

  /**
   * Factory method to create a GUID from a raw Buffer.
   */
  public static fromBuffer(buffer: Buffer): VersionedGuidBuffer {
    return GuidBuffer.parse(buffer);
  }

  /**
   * Factory method to create a GUID from a raw Uint8Array.
   */
  public static fromUint8Array(bytes: Uint8Array): VersionedGuidBuffer {
    return GuidBuffer.parse(bytes);
  }

  /**
   * Factory method to create a GUID from a platform buffer.
   */
  public static fromPlatformBuffer(bytes: Uint8Array): VersionedGuidBuffer {
    return GuidBuffer.parse(bytes);
  }

  /**
   * Creates a GUID from URL-safe base64.
   */
  public static fromUrlSafeBase64(urlSafe: string): VersionedGuidBuffer {
    const base64 = urlSafe
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(24, '=');
    return GuidBuffer.parse(base64);
  }

  /**
   * Converts a GUID input to a raw Buffer.
   */
  public static toRawGuidBuffer(value: GuidInput): Buffer {
    return GuidBuffer.create(value);
  }

  /**
   * Validates a UUID string.
   */
  public static validateUuid(value: string): boolean {
    return uuid.validate(value);
  }

  /**
   * Checks if a value is a valid raw GUID buffer.
   */
  public static isRawGuidBuffer(value: GuidInput): boolean {
    return GuidUint8Array.isRawGuidUint8Array(value);
  }

  // ============ Static Methods Delegated to GuidUint8Array ============

  /**
   * Converts a GUID to full hex format.
   */
  public static toFullHexGuid = GuidUint8Array.toFullHexGuid;

  /**
   * Converts a GUID to short hex format.
   */
  public static toShortHexGuid = GuidUint8Array.toShortHexGuid;

  /**
   * Converts a bigint to full hex GUID format.
   */
  public static toFullHexFromBigInt = GuidUint8Array.toFullHexFromBigInt;

  /**
   * Converts a GUID to raw platform buffer.
   */
  public static toRawGuidPlatformBuffer =
    GuidUint8Array.toRawGuidPlatformBuffer;

  /**
   * Determines the brand/type of a GUID value.
   */
  public static whichBrand = GuidUint8Array.whichBrand;

  /**
   * Verifies if a GUID is valid for a given brand.
   */
  public static verifyGuid = GuidUint8Array.verifyGuid;

  /**
   * Returns the expected length for a GUID brand.
   */
  public static guidBrandToLength = GuidUint8Array.guidBrandToLength;

  /**
   * Returns the GUID brand for a given length.
   */
  public static lengthToGuidBrand = GuidUint8Array.lengthToGuidBrand;

  /**
   * Checks if a value is a valid full hex GUID.
   */
  public static isFullHexGuid = GuidUint8Array.isFullHexGuid;

  /**
   * Checks if a value is a valid short hex GUID.
   */
  public static isShortHexGuid = GuidUint8Array.isShortHexGuid;

  /**
   * Checks if a value is a valid base64 GUID.
   */
  public static isBase64Guid = GuidUint8Array.isBase64Guid;

  /**
   * Checks if a value is a valid bigint GUID.
   */
  public static isBigIntGuid = GuidUint8Array.isBigIntGuid;

  /**
   * Checks if a value is a valid raw GUID Uint8Array.
   */
  public static isRawGuidUint8Array = GuidUint8Array.isRawGuidUint8Array;

  /**
   * Validates whether a value is a valid GUID.
   */
  public static isValid = GuidUint8Array.isValid;

  /**
   * Static helper to check if a GUID is null, undefined, or empty.
   */
  public static isNilOrEmpty(guid: IGuid | null | undefined): boolean {
    return !guid || (guid instanceof GuidBuffer && guid.isEmpty());
  }

  /**
   * Common namespace constants for use with v3/v5 GUIDs.
   */
  public static readonly Namespaces = {
    DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  } as const;

  /**
   * Empty/nil GUID constant (all zeros).
   */
  private static _empty?: GuidBuffer;
  public static get Empty(): GuidBuffer {
    if (!GuidBuffer._empty) {
      GuidBuffer._empty = GuidBuffer.create(
        '00000000-0000-0000-0000-000000000000',
      );
    }
    return GuidBuffer._empty;
  }
}
