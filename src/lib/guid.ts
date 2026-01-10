import {
  Base64Guid,
  BigIntGuid,
  FullHexGuid,
  GuidBrandType,
  GuidError,
  GuidErrorType,
  GuidInput,
  IGuid,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import * as uuid from 'uuid';

import { PlatformBuffer } from '../interfaces';
import { RawGuidPlatformBuffer } from '../types';

/**
 * Guid represents a GUID (Globally Unique Identifier) that is compliant with the RFC 4122 standard.
 * Guid instances can be created from a variety of input types, including:
 * - FullHexGuid: A 36-character string representation of the GUID, including dashes
 * - ShortHexGuid: A 32-character string representation of the GUID, excluding dashes
 * - Base64Guid: A 24-character base64-encoded string representation of the GUID
 * - BigIntGuid: A bigint representation of the GUID
 * - RawGuidPlatformBuffer: A 16-byte Buffer representation of the GUID
 * Guid instances can be converted to any of these representations using the appropriate method.
 */
export class Guid implements IGuid {
  /**
   * GUID is stored internally as a raw 16-byte Buffer.
   */
  private readonly _value: RawGuidPlatformBuffer;

  /**
   * Boundary value constants for special GUID validation
   */
  private static readonly BOUNDARY_VALUES = {
    ALL_ZEROS_FULL: '00000000-0000-0000-0000-000000000000' as const,
    ALL_ZEROS_SHORT: '00000000000000000000000000000000' as const,
    ALL_FS_FULL: 'ffffffff-ffff-ffff-ffff-ffffffffffff' as const,
    ALL_FS_SHORT: 'ffffffffffffffffffffffffffffffff' as const,
  } as const;

  /**
   * Maximum valid bigint value for a 128-bit GUID
   */
  private static readonly MAX_BIGINT_VALUE = BigInt(
    '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  );

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
   * Regex for validating hex strings (case insensitive)
   */
  private static readonly HEX_PATTERN = /^[0-9a-f]+$/i;

  /**
   * Regex for validating full hex GUID format
   */
  private static readonly FULL_HEX_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * Type guard to check if a value is a Buffer
   */
  private static isBuffer(value: unknown): value is Buffer {
    return Buffer.isBuffer(value);
  }

  /**
   * Type guard to check if a value is a Buffer or Uint8Array
   */
  private static isBufferLike(value: unknown): value is Buffer | Uint8Array {
    return Buffer.isBuffer(value) || value instanceof Uint8Array;
  }

  /**
   * Cached empty/nil GUID constant (all zeros)
   */
  private static _empty?: Guid;

  /**
   * Empty/nil GUID constant (all zeros)
   */
  public static get Empty(): Guid {
    if (!Guid._empty) {
      Guid._empty = Object.freeze(
        new Guid('00000000-0000-0000-0000-000000000000' as FullHexGuid),
      ) as Guid;
    }
    return Guid._empty;
  }

  constructor(value: GuidInput) {
    const buffer = Guid.validateAndConvert(value);
    // Note: We cannot freeze a Buffer as it's an ArrayBuffer view
    // Instead, we ensure the buffer is never directly modified after construction
    this._value = buffer;

    // Initialize cache properties so they exist before sealing
    this._cachedFullHex = undefined;
    this._cachedShortHex = undefined;
    this._cachedBase64 = undefined;

    // Seal the instance to prevent property addition/deletion
    // Cache properties can still be set once since they were initialized
    Object.seal(this);
  }

  /**
   * Validates input and converts to raw buffer with comprehensive error handling.
   * This centralizes all validation logic for better maintainability.
   * @param value The input value to validate and convert
   * @returns The validated raw GUID buffer
   * @throws {GuidError} If validation fails
   */
  private static validateAndConvert(value: GuidInput): RawGuidPlatformBuffer {
    try {
      // Null/undefined check
      if (value === null || value === undefined) {
        throw new GuidError(GuidErrorType.InvalidGuid);
      }

      // Empty string check (but allow 0n bigint)
      const strValue = String(value);
      if (!strValue && value !== 0n) {
        throw new GuidError(GuidErrorType.InvalidGuid);
      }

      // Validate bigint is non-negative
      if (typeof value === 'bigint' && value < 0n) {
        throw new GuidError(GuidErrorType.InvalidGuid);
      }

      // Validate hex strings contain only valid hex characters
      if (typeof value === 'string') {
        const isFullHex = value.length === 36 && value.includes('-');
        const isShortHex = value.length === 32 && !value.includes('-');

        if (isFullHex && !Guid.FULL_HEX_PATTERN.test(value)) {
          const buffer = Buffer.from(value);
          throw new GuidError(
            GuidErrorType.InvalidGuidWithDetails,
            GuidBrandType.FullHexGuid,
            value.length,
            buffer,
          );
        } else if (isShortHex && !Guid.HEX_PATTERN.test(value)) {
          const buffer = Buffer.from(value);
          throw new GuidError(
            GuidErrorType.InvalidGuidWithDetails,
            GuidBrandType.ShortHexGuid,
            value.length,
            buffer,
          );
        }
      }

      // Determine and verify the brand/type
      const expectedBrand = Guid.whichBrand(value);
      const verifiedBrand = Guid.verifyGuid(expectedBrand, value);

      if (!verifiedBrand) {
        const valueBuffer = Buffer.isBuffer(value)
          ? value
          : Buffer.from(strValue);
        throw new GuidError(
          GuidErrorType.InvalidGuidWithDetails,
          expectedBrand,
          undefined,
          valueBuffer,
        );
      }

      // Convert to raw buffer
      const buffer = Guid.toRawGuidPlatformBuffer(value);

      // Validate against UUID standard (skip for boundary values)
      const hexString = buffer.toString('hex');
      const fullHex = Guid.toFullHexGuid(hexString);
      const isBoundary = Guid.isBoundaryValue(fullHex);

      if (!isBoundary && !uuid.validate(fullHex)) {
        throw new GuidError(
          GuidErrorType.InvalidGuid,
          expectedBrand,
          undefined,
          buffer,
        );
      }

      return buffer;
    } catch (error) {
      // Re-throw GuidError as-is
      if (error instanceof GuidError) {
        throw error;
      }

      // Wrap other errors with context
      if (typeof value === 'bigint') {
        throw new GuidError(GuidErrorType.InvalidGuid);
      }

      const length = Buffer.isBuffer(value)
        ? value.length
        : String(value).length;
      throw new GuidError(
        GuidErrorType.InvalidGuidUnknownLength,
        undefined,
        length,
      );
    }
  }

  public static validateUuid(value: string): boolean {
    return uuid.validate(value);
  }

  public serialize(): string {
    return this.asBase64Guid;
  }

  public static hydrate(value: string): Guid {
    return new Guid(value as Base64Guid);
  }

  private static readonly LengthMap: Record<GuidBrandType, number> = {
    [GuidBrandType.Unknown]: -1,
    [GuidBrandType.FullHexGuid]: 36,
    [GuidBrandType.ShortHexGuid]: 32,
    [GuidBrandType.Base64Guid]: 24,
    [GuidBrandType.RawGuidPlatformBuffer]: 16,
    [GuidBrandType.BigIntGuid]: -1, // Variable length
  };

  private static readonly ReverseLengthMap: Record<number, GuidBrandType> = {
    0: GuidBrandType.Unknown,
    36: GuidBrandType.FullHexGuid,
    32: GuidBrandType.ShortHexGuid,
    24: GuidBrandType.Base64Guid,
    16: GuidBrandType.RawGuidPlatformBuffer,
    // BigIntGuid is variable length, so it is not included in the reverse map
  };

  private static readonly VerifyFunctions: Record<
    GuidBrandType,
    (guid: GuidInput, validate?: boolean) => boolean
  > = {
    [GuidBrandType.Unknown]: () => false,
    [GuidBrandType.FullHexGuid]: (guid: GuidInput) => this.isFullHexGuid(guid),
    [GuidBrandType.ShortHexGuid]: (guid: GuidInput) =>
      this.isShortHexGuid(guid),
    [GuidBrandType.Base64Guid]: (guid: GuidInput) => this.isBase64Guid(guid),
    [GuidBrandType.BigIntGuid]: (guid: GuidInput) => this.isBigIntGuid(guid),
    [GuidBrandType.RawGuidPlatformBuffer]: (guid: GuidInput) =>
      this.isRawGuidPlatformBuffer(guid),
  };

  /**
   * Returns the GUID as a raw Buffer.
   * NOTE: Returns a defensive copy to prevent external mutation.
   * Use asRawGuidPlatformBufferUnsafe() if you need the internal buffer and guarantee no mutation.
   */
  public get asRawGuidPlatformBuffer(): RawGuidPlatformBuffer {
    return Buffer.from(this._value) as RawGuidPlatformBuffer;
  }

  /**
   * Returns the internal raw Buffer without copying.
   * ⚠️ WARNING: Do NOT mutate the returned buffer! This is for performance-critical paths only.
   * Mutating this buffer will corrupt the GUID instance.
   * @internal
   */
  public get asRawGuidPlatformBufferUnsafe(): RawGuidPlatformBuffer {
    return this._value;
  }

  /**
   * Generates a new random v4 GUID.
   * @returns A new Guid instance with a randomly generated value
   */
  public static generate(): Guid {
    try {
      const uuidStr = uuid.v4();
      if (!uuidStr) {
        throw new GuidError(GuidErrorType.InvalidGuid);
      }
      return new Guid(uuidStr as FullHexGuid) as Guid & {
        readonly __version: 4;
      };
    } catch (error) {
      if (error instanceof GuidError) {
        throw error;
      }
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  /**
   * Alias for generate() to create a v4 GUID.
   * @returns A new Guid instance with a randomly generated v4 value
   */
  public static v4(): Guid {
    return Guid.generate();
  }

  /**
   * Alias for generate() for backward compatibility.
   * @deprecated Use generate() instead for clearer intent
   */
  public static new(): Guid {
    return Guid.generate();
  }

  /**
   * Parses a GUID from any valid format, throwing on invalid input.
   * This is the primary parsing method for when you expect valid input.
   * @param value The value to parse
   * @returns A new Guid instance
   * @throws {GuidError} If the value is not a valid GUID
   */
  public static parse(value: GuidInput): Guid {
    return new Guid(value);
  }

  /**
   * Attempts to parse a GUID, returning null on failure instead of throwing.
   * Use this when you're uncertain if the input is valid.
   * @param value The value to parse
   * @returns A new Guid instance or null if parsing fails
   */
  public static tryParse(value: GuidInput): Guid | null {
    try {
      return new Guid(value);
    } catch {
      return null;
    }
  }

  /**
   * Validates whether a value is a valid GUID without creating an instance.
   * More efficient than tryParse when you only need validation.
   * @param value The value to validate
   * @returns True if valid, false otherwise
   */
  public static isValid(value: unknown): boolean {
    if (!value) return false;
    try {
      const guid = new Guid(value as GuidInput);
      return guid.isValidV4();
    } catch {
      return false;
    }
  }

  /**
   * Factory method to create a GUID from a full hex string.
   * @param fullHex The full hex string (with dashes)
   * @returns A new Guid instance
   */
  public static fromFullHex(fullHex: string): Guid {
    return new Guid(fullHex as FullHexGuid);
  }

  /**
   * Factory method to create a GUID from a short hex string.
   * @param shortHex The short hex string (without dashes)
   * @returns A new Guid instance
   */
  public static fromShortHex(shortHex: string): Guid {
    return new Guid(shortHex as ShortHexGuid);
  }

  /**
   * Factory method to create a GUID from a base64 string.
   * @param base64 The base64 encoded string
   * @returns A new Guid instance
   */
  public static fromBase64(base64: string): Guid {
    return new Guid(base64 as Base64Guid);
  }

  /**
   * Factory method to create a GUID from a bigint.
   * @param bigint The bigint value
   * @returns A new Guid instance
   */
  public static fromBigInt(bigint: bigint): Guid {
    return new Guid(bigint as BigIntGuid);
  }

  /**
   * Factory method to create a GUID from a raw buffer.
   * @param buffer The raw 16-byte buffer
   * @returns A new Guid instance
   */
  public static fromBuffer(buffer: Buffer): Guid {
    return new Guid(buffer as RawGuidPlatformBuffer);
  }

  /**
   * Factory method to create a GUID from a raw Uint8Array.
   * This converts the Uint8Array to a Buffer first.
   * @param bytes The raw 16-byte Uint8Array
   * @returns A new Guid instance
   */
  public static fromUint8Array(bytes: Uint8Array): Guid {
    return new Guid(Buffer.from(bytes) as RawGuidPlatformBuffer);
  }

  /**
   * Creates a namespace-based v3 GUID (MD5 hash).
   * Use this for deterministic GUIDs based on a namespace and name.
   * @param namespace The namespace GUID (e.g., uuid.v3.DNS)
   * @param name The name to hash within the namespace
   * @returns A new Guid instance containing the v3 GUID
   * @example
   * const guid = Guid.v3('example.com', uuid.v3.DNS);
   */
  public static v3(name: string, namespace: string | Buffer): Guid {
    try {
      const namespaceStr = Buffer.isBuffer(namespace)
        ? Guid.toFullHexGuid(namespace.toString('hex'))
        : namespace;
      const v3Guid = uuid.v3(name, namespaceStr);
      return new Guid(v3Guid as FullHexGuid);
    } catch (error) {
      if (error instanceof GuidError) {
        throw error;
      }
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  /**
   * Creates a namespace-based v5 GUID (SHA-1 hash).
   * Use this for deterministic GUIDs based on a namespace and name.
   * Preferred over v3 as SHA-1 is stronger than MD5.
   * @param namespace The namespace GUID (e.g., uuid.v5.DNS)
   * @param name The name to hash within the namespace
   * @returns A new Guid instance containing the v5 GUID
   * @example
   * const guid = Guid.v5('example.com', uuid.v5.DNS);
   */
  public static v5(name: string, namespace: string | Buffer): Guid {
    try {
      const namespaceStr = Buffer.isBuffer(namespace)
        ? Guid.toFullHexGuid(namespace.toString('hex'))
        : namespace;
      const v5Guid = uuid.v5(name, namespaceStr);
      return new Guid(v5Guid as FullHexGuid);
    } catch (error) {
      if (error instanceof GuidError) {
        throw error;
      }
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  /**
   * Common namespace constants for use with v3/v5 GUIDs.
   * These are the standard RFC 4122 namespace UUIDs, defined inline for browser compatibility.
   * (Avoids issues with uuid library's namespace exports in some bundler configurations)
   */
  public static readonly Namespaces = {
    /** DNS namespace UUID per RFC 4122 */
    DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    /** URL namespace UUID per RFC 4122 */
    URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  } as const;
  /**
   * Returns the GUID as a full hex string.
   * Result is cached for performance.
   */
  public get asFullHexGuid(): FullHexGuid {
    if (!this._cachedFullHex) {
      const hexString = this._value.toString('hex');
      this._cachedFullHex = Guid.toFullHexGuid(hexString);
    }
    return this._cachedFullHex;
  }
  /**
   * Returns the GUID as a raw Buffer.
   */
  public get asBuffer(): Buffer {
    return this._value;
  }

  /**
   * Returns the GUID as a native Uint8Array (not a Buffer).
   */
  public get asUint8Array(): Uint8Array {
    return new Uint8Array(this._value);
  }

  /**
   * Returns the GUID as a short hex string.
   * Result is cached for performance.
   */
  public get asShortHexGuid(): ShortHexGuid {
    if (!this._cachedShortHex) {
      this._cachedShortHex = Guid.toShortHexGuid(this.asFullHexGuid);
    }
    return this._cachedShortHex;
  }
  /**
   * Returns the GUID as a base64 string.
   */
  public toString(): Base64Guid {
    return this.asBase64Guid as Base64Guid;
  }
  /**
   * Returns the GUID as a JSON string.
   * @returns The GUID as a JSON string.
   */
  public toJson(): string {
    return JSON.stringify(this.asBase64Guid);
  }
  /**
   * Returns the GUID as a bigint.
   */
  public get asBigIntGuid(): BigIntGuid {
    return BigInt('0x' + this._value.toString('hex')) as BigIntGuid;
  }
  /**
   * Returns the GUID as a base64 string.
   * Result is cached for performance.
   */
  public get asBase64Guid(): Base64Guid {
    if (!this._cachedBase64) {
      this._cachedBase64 = this._value.toString('base64') as Base64Guid;
    }
    return this._cachedBase64;
  }

  public get asPlatformBuffer(): PlatformBuffer {
    return this._value;
  }

  /**
   * Checks if a GUID value is a boundary value (all zeros or all Fs).
   * @param value The GUID value to check.
   * @returns True if the value is a boundary value.
   */
  private static isBoundaryValue(value: string): boolean {
    return (
      value === Guid.BOUNDARY_VALUES.ALL_ZEROS_FULL ||
      value === Guid.BOUNDARY_VALUES.ALL_ZEROS_SHORT ||
      value === Guid.BOUNDARY_VALUES.ALL_FS_FULL ||
      value === Guid.BOUNDARY_VALUES.ALL_FS_SHORT
    );
  }

  /**
   * Verifies if a given GUID is valid for the given brand.
   * @param guidBrand The brand of the GUID to verify.
   * @param guid The GUID to verify.
   * @returns True if the GUID is valid for the given brand, false otherwise.
   */
  public static verifyGuid(guidBrand: GuidBrandType, guid: GuidInput): boolean {
    if (guid === null || guid === undefined) {
      return false;
    }
    try {
      const verifyFunc = Guid.VerifyFunctions[guidBrand];
      return verifyFunc(guid);
    } catch {
      return false;
    }
  }

  /**
   * Returns the length of the GUID for the given brand.
   * @param guidBrand The brand of the GUID to get the length for.
   * @returns The length of the GUID for the given brand.
   */
  public static guidBrandToLength(guidBrand: GuidBrandType): number {
    const length = Guid.LengthMap[guidBrand];
    if (length <= 0) {
      throw new GuidError(GuidErrorType.InvalidGuidUnknownBrand, guidBrand);
    }
    return length as number;
  }

  /**
   * Returns the brand of the GUID for the given length.
   * @param length The length of the GUID to get the brand for.
   * @param isBuffer Whether the GUID is a Buffer.
   * @returns The brand of the GUID for the given length.
   */
  public static lengthToGuidBrand(
    length: number,
    isBuffer: boolean,
  ): GuidBrandType {
    if (length <= 0) {
      throw new GuidError(
        GuidErrorType.InvalidGuidUnknownLength,
        undefined,
        length,
      );
    }

    const brand = Guid.ReverseLengthMap[length];

    if (!brand || brand === GuidBrandType.Unknown) {
      throw new GuidError(
        GuidErrorType.InvalidGuidUnknownLength,
        undefined,
        length,
      );
    }

    // Validate buffer vs string type consistency
    const isBrandBuffer = brand === GuidBrandType.RawGuidPlatformBuffer;
    if (isBuffer !== isBrandBuffer) {
      throw new GuidError(
        GuidErrorType.InvalidGuidUnknownLength,
        brand,
        length,
      );
    }

    return brand;
  }

  /**
   * Verifies if a given GUID is a valid full hex GUID.
   * @param fullHexGuidValue The full hex GUID to verify.
   * @returns True if the GUID is a valid full hex GUID, false otherwise.
   */
  public static isFullHexGuid(fullHexGuidValue: GuidInput): boolean {
    try {
      if (fullHexGuidValue === null || fullHexGuidValue === undefined) {
        return false;
      }
      const expectedLength = Guid.guidBrandToLength(GuidBrandType.FullHexGuid);
      const strValue = String(fullHexGuidValue);

      if (strValue.length !== expectedLength) {
        return false;
      }

      // Boundary values are always valid
      if (Guid.isBoundaryValue(strValue)) {
        return true;
      }

      return Guid.validateUuid(strValue);
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid short hex GUID.
   * @param shortHexGuidValue The short hex GUID to verify.
   * @returns True if the GUID is a valid short hex GUID, false otherwise.
   */
  public static isShortHexGuid(shortHexGuidValue: GuidInput): boolean {
    try {
      if (shortHexGuidValue === null || shortHexGuidValue === undefined) {
        return false;
      }
      const expectedLength = Guid.guidBrandToLength(GuidBrandType.ShortHexGuid);
      const strValue = String(shortHexGuidValue);

      if (strValue.length !== expectedLength) {
        return false;
      }

      try {
        const fullHexGuid = Guid.toFullHexGuid(strValue);
        // Boundary values are always valid
        if (Guid.isBoundaryValue(fullHexGuid)) {
          return true;
        }
        return uuid.validate(fullHexGuid);
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid base64 GUID.
   * @param value The base64 GUID to verify.
   * @returns True if the GUID is a valid base64 GUID, false otherwise.
   */
  public static isBase64Guid(value: GuidInput): boolean {
    try {
      if (value === null || value === undefined) {
        return false;
      }
      let valueLength: number;
      if (typeof value === 'bigint') {
        valueLength = value.toString(16).length;
      } else if (Guid.isBufferLike(value)) {
        valueLength = value.length;
      } else {
        valueLength = String(value).length;
      }

      const result =
        valueLength === Guid.guidBrandToLength(GuidBrandType.Base64Guid);

      if (result) {
        try {
          const fromBase64: Uint8Array = Guid.toRawGuidPlatformBuffer(value);
          const hexString = (fromBase64 as Buffer).toString('hex');
          const fullHexGuid = Guid.toFullHexGuid(hexString);
          // Boundary values are always valid
          if (Guid.isBoundaryValue(fullHexGuid)) {
            return true;
          }
          return uuid.validate(fullHexGuid);
        } catch {
          return false;
        }
      }
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid raw GUID buffer.
   * @param value The raw GUID buffer to verify.
   * @returns True if the GUID is a valid raw GUID buffer, false otherwise.
   */
  public static isRawGuidPlatformBuffer(value: GuidInput): boolean {
    try {
      if (value === null || value === undefined) {
        return false;
      }
      const expectedLength = Guid.guidBrandToLength(
        GuidBrandType.RawGuidPlatformBuffer,
      );
      let valueLength: number;
      if (typeof value === 'bigint') {
        valueLength = value.toString(16).length;
      } else if (Guid.isBufferLike(value)) {
        valueLength = value.length;
      } else {
        valueLength = String(value).length;
      }

      if (valueLength !== expectedLength) {
        return false;
      }

      try {
        if (!Guid.isBufferLike(value)) {
          return false;
        }
        // Convert Uint8Array to Buffer if needed
        const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
        const hexString = buffer.toString('hex');
        const fullHexGuid = Guid.toFullHexGuid(hexString);
        // Boundary values are always valid
        if (Guid.isBoundaryValue(fullHexGuid)) {
          return true;
        }
        return Guid.validateUuid(fullHexGuid);
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Verifies if a given GUID is a valid bigint GUID.
   * @param value The bigint GUID to verify.
   * @returns True if the GUID is a valid bigint GUID, false otherwise.
   */
  public static isBigIntGuid(value: GuidInput): boolean {
    try {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value !== 'bigint') {
        return false;
      }
      if (value < 0n || value > Guid.MAX_BIGINT_VALUE) {
        return false;
      }

      try {
        const fromBigInt = Guid.toFullHexFromBigInt(value);
        // Boundary values are always valid
        if (Guid.isBoundaryValue(fromBigInt)) {
          return true;
        }
        return uuid.validate(fromBigInt);
      } catch {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Determines the brand of a given GUID value.
   * @param value The GUID value to determine the brand of.
   * @returns The brand of the GUID value.
   */
  public static whichBrand(value: GuidInput): GuidBrandType {
    if (value === null || value === undefined) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }

    if (typeof value === 'bigint') {
      return GuidBrandType.BigIntGuid;
    }

    const isBuffer = Guid.isBufferLike(value);
    const expectedLength = isBuffer
      ? (value as Buffer | Uint8Array).length
      : String(value).length;

    return Guid.lengthToGuidBrand(expectedLength, isBuffer);
  }

  /**
   * Converts a given short hex GUID to a full hex GUID.
   * @param shortGuid The short hex GUID to convert.
   * @returns The short hex GUID as a full hex GUID.
   */
  private static shortGuidToFullGuid(shortGuid: string): FullHexGuid {
    // insert dashes
    const str = shortGuid.replace(
      /(.{8})(.{4})(.{4})(.{4})(.{12})/,
      '$1-$2-$3-$4-$5',
    );
    return str as FullHexGuid;
  }

  /**
   * Converts a given GUID value to a full hex GUID.
   * @param guid The GUID value to convert.
   * @returns The GUID value as a full hex GUID.
   */
  public static toFullHexGuid(
    guid:
      | RawGuidPlatformBuffer
      | BigIntGuid
      | Base64Guid
      | ShortHexGuid
      | FullHexGuid
      | string,
  ): FullHexGuid {
    if (guid === null || guid === undefined) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }

    if (typeof guid === 'bigint') {
      return Guid.toFullHexFromBigInt(guid);
    } else if (
      Guid.isBufferLike(guid) &&
      guid.length ===
        Guid.guidBrandToLength(GuidBrandType.RawGuidPlatformBuffer)
    ) {
      const hexString = (guid as Buffer).toString('hex');
      const shortHex = hexString as ShortHexGuid;
      return Guid.shortGuidToFullGuid(shortHex);
    } else if (Guid.isBufferLike(guid)) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
    // all remaining cases are string types
    const strValue = String(guid);
    if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      // short hex guid
      return Guid.shortGuidToFullGuid(strValue);
    } else if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      // already a full hex guid
      return strValue as FullHexGuid;
    } else if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      // base64 guid
      const shortGuid = Buffer.from(strValue, 'base64').toString('hex');
      return Guid.shortGuidToFullGuid(shortGuid);
    } else {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  public static toShortHexGuid(
    guid:
      | RawGuidPlatformBuffer
      | BigIntGuid
      | Base64Guid
      | ShortHexGuid
      | FullHexGuid
      | string,
  ): ShortHexGuid {
    if (guid === null || guid === undefined) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }

    if (typeof guid === 'bigint') {
      const fullHex = Guid.toFullHexFromBigInt(guid);
      return fullHex.replace(/-/g, '') as ShortHexGuid;
    } else if (
      Guid.isBufferLike(guid) &&
      guid.length ===
        Guid.guidBrandToLength(GuidBrandType.RawGuidPlatformBuffer)
    ) {
      return (guid as Buffer).toString('hex') as ShortHexGuid;
    } else if (Guid.isBufferLike(guid)) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
    // all remaining cases are string types
    const strValue = String(guid);

    if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.ShortHexGuid)
    ) {
      // already a short hex guid
      return strValue as ShortHexGuid;
    } else if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.FullHexGuid)
    ) {
      // full hex guid
      return strValue.replace(/-/g, '') as ShortHexGuid;
    } else if (
      strValue.length === Guid.guidBrandToLength(GuidBrandType.Base64Guid)
    ) {
      // base64 guid
      return Buffer.from(strValue, 'base64').toString('hex') as ShortHexGuid;
    } else {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  /**
   * Converts a given bigint to a full hex GUID.
   * @param bigInt The bigint to convert.
   * @returns The bigint as a full hex GUID.
   */
  public static toFullHexFromBigInt(bigInt: bigint): FullHexGuid {
    if (bigInt < 0n || bigInt > Guid.MAX_BIGINT_VALUE) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
    const uuidBigInt = bigInt.toString(16).padStart(32, '0');
    // After padding, should always be exactly 32 characters
    if (uuidBigInt.length !== 32) {
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
    const rebuiltUuid =
      uuidBigInt.slice(0, 8) +
      '-' +
      uuidBigInt.slice(8, 12) +
      '-' +
      uuidBigInt.slice(12, 16) +
      '-' +
      uuidBigInt.slice(16, 20) +
      '-' +
      uuidBigInt.slice(20);
    return rebuiltUuid as FullHexGuid;
  }

  /**
   * Converts a given GUID value to a raw GUID buffer.
   * @param value The GUID value to convert.
   * @returns The GUID value as a raw GUID buffer.
   */
  public static toRawGuidPlatformBuffer(
    value: GuidInput,
  ): RawGuidPlatformBuffer {
    const expectedBrand = Guid.whichBrand(value);
    let rawGuidBufferResult: RawGuidPlatformBuffer = Buffer.alloc(
      0,
    ) as RawGuidPlatformBuffer;
    switch (expectedBrand) {
      case GuidBrandType.FullHexGuid:
        rawGuidBufferResult = Buffer.from(
          Guid.toShortHexGuid(value as FullHexGuid),
          'hex',
        ) as RawGuidPlatformBuffer;
        break;
      case GuidBrandType.ShortHexGuid:
        rawGuidBufferResult = Buffer.from(
          Guid.toShortHexGuid(value as ShortHexGuid),
          'hex',
        ) as RawGuidPlatformBuffer;
        break;
      case GuidBrandType.Base64Guid:
        // Ensure value is a string before using it with Buffer.from
        if (typeof value === 'string' || Buffer.isBuffer(value)) {
          rawGuidBufferResult = Buffer.from(
            value.toString(),
            'base64',
          ) as RawGuidPlatformBuffer;
        } else {
          throw new GuidError(GuidErrorType.InvalidGuid);
        }
        break;
      case GuidBrandType.RawGuidPlatformBuffer:
        // Convert Uint8Array to Buffer if needed
        if (Buffer.isBuffer(value)) {
          rawGuidBufferResult = value as RawGuidPlatformBuffer;
        } else if (value instanceof Uint8Array) {
          rawGuidBufferResult = Buffer.from(value) as RawGuidPlatformBuffer;
        } else {
          throw new GuidError(GuidErrorType.InvalidGuid);
        }
        break;
      case GuidBrandType.BigIntGuid:
        rawGuidBufferResult = Buffer.from(
          Guid.toShortHexGuid(Guid.toFullHexFromBigInt(value as bigint)),
          'hex',
        ) as RawGuidPlatformBuffer;
        break;
      default:
        throw new GuidError(GuidErrorType.InvalidGuidUnknownBrand);
    }
    if (
      rawGuidBufferResult.length !==
      Guid.guidBrandToLength(GuidBrandType.RawGuidPlatformBuffer)
    ) {
      throw new GuidError(
        GuidErrorType.InvalidGuidUnknownLength,
        undefined,
        rawGuidBufferResult.length,
      );
    }
    return rawGuidBufferResult;
  }

  /**
   * Compare two Guid instances for equality.
   * @param other - The other Guid instance to compare (can be null/undefined)
   * @param constantTime - Use constant-time comparison to prevent timing attacks (default: false)
   * @returns True if the two Guid instances are equal, false otherwise
   */
  public equals(
    other: IGuid | null | undefined,
    constantTime = false,
  ): boolean {
    if (!other) {
      return false;
    }

    if (constantTime) {
      // Constant-time comparison to prevent timing attacks
      // Always compare all 16 bytes regardless of early mismatches
      const a = this.asRawGuidPlatformBufferUnsafe;
      const b = other.asRawGuidPlatformBuffer;
      let result = 0;
      for (let i = 0; i < 16; i++) {
        result |= a[i] ^ b[i];
      }
      return result === 0;
    }

    return (
      Buffer.compare(
        this.asRawGuidPlatformBufferUnsafe,
        other.asRawGuidPlatformBuffer,
      ) === 0
    );
  }

  /**
   * Checks if this GUID is empty (all zeros).
   * @returns True if the GUID is all zeros, false otherwise
   */
  public isEmpty(): boolean {
    // Check if all bytes are zero
    for (let i = 0; i < this._value.length; i++) {
      if (this._value[i] !== 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Static helper to check if a GUID is null, undefined, or empty.
   * @param guid The GUID to check
   * @returns True if the GUID is null, undefined, or empty
   */
  public static isNilOrEmpty(guid: IGuid | null | undefined): boolean {
    return !guid || (guid instanceof Guid && guid.isEmpty());
  }

  /**
   * Creates a new Guid instance with the same value as this one.
   * @returns A new Guid instance with identical value
   */
  public clone(): Guid {
    return new Guid(Buffer.from(this._value) as RawGuidPlatformBuffer);
  }

  /**
   * Returns the hash code for this GUID based on its buffer content.
   * Useful for using GUIDs as Map/Set keys.
   * @returns A numeric hash code
   */
  public hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this._value.length; i++) {
      hash = (hash << 5) - hash + this._value[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Extracts the RFC 4122 version from the GUID.
   * Returns undefined for boundary values or invalid GUIDs.
   * @returns The version number (1-5) or undefined
   */
  public getVersion(): number | undefined {
    // Skip boundary values
    if (Guid.isBoundaryValue(this.asFullHexGuid)) {
      return undefined;
    }

    // Version is in bits 48-51 (byte 6, high nibble)
    const versionByte = this._value[6];
    const version = (versionByte >> 4) & 0x0f;

    // Valid RFC 4122 versions are 1-5
    return version >= 1 && version <= 5 ? version : undefined;
  }

  /**
   * Validates that this GUID is a proper v3 GUID according to RFC 4122.
   * @returns True if valid v3 GUID, false otherwise
   */
  public isValidV3(): boolean {
    return this.getVersion() === 3;
  }

  /**
   * Validates that this GUID is a proper v4 GUID according to RFC 4122.
   * Boundary values (all zeros/all Fs) return true as they're mathematically valid.
   * @returns True if valid v4 GUID or boundary value, false otherwise
   */
  public isValidV4(): boolean {
    // Boundary values are considered valid
    if (Guid.isBoundaryValue(this.asFullHexGuid)) {
      return true;
    }

    const version = this.getVersion();
    return version === 4;
  }

  /**
   * Validates that this GUID is a proper v5 GUID according to RFC 4122.
   * @returns True if valid v5 GUID, false otherwise
   */
  public isValidV5(): boolean {
    return this.getVersion() === 5;
  }

  /**
   * Returns a human-readable string representation.
   */
  public toDebugString(): string {
    const version = this.getVersion();
    const variant = this.getVariant();
    return `Guid(${this.asFullHexGuid}, v${version ?? '?'}, variant=${variant ?? '?'})`;
  }

  /**
   * Compares two GUIDs for ordering.
   * Useful for sorting GUID arrays.
   * @param other The other GUID to compare to
   * @returns -1 if this < other, 0 if equal, 1 if this > other
   */
  public compareTo(other: IGuid): number {
    return Buffer.compare(
      this.asRawGuidPlatformBufferUnsafe,
      other.asRawGuidPlatformBuffer,
    );
  }

  /**
   * Returns the timestamp from a v1 GUID.
   * @returns Date object or undefined if not a v1 GUID
   */
  public getTimestamp(): Date | undefined {
    if (this.getVersion() !== 1) return undefined;

    const bytes = this._value;
    const timeLow =
      (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    const timeMid = (bytes[4] << 8) | bytes[5];
    const timeHigh = ((bytes[6] & 0x0f) << 8) | bytes[7];
    const timestamp =
      (BigInt(timeHigh) << 48n) |
      (BigInt(timeMid) << 32n) |
      BigInt(timeLow >>> 0);
    const unixTimestamp = Number(timestamp - 122192928000000000n) / 10000;
    return new Date(unixTimestamp);
  }

  /**
   * Extracts the variant from the GUID.
   * @returns The variant (0-2) or undefined
   */
  public getVariant(): number | undefined {
    const variantByte = this._value[8];
    if ((variantByte & 0x80) === 0) return 0; // NCS
    if ((variantByte & 0xc0) === 0x80) return 1; // RFC 4122
    if ((variantByte & 0xe0) === 0xc0) return 2; // Microsoft
    return undefined;
  }

  /**
   * Creates a v1 GUID (time-based).
   * @returns A new Guid instance containing a v1 GUID
   */
  public static v1(): Guid {
    try {
      const v1Guid = uuid.v1();
      return new Guid(v1Guid as FullHexGuid) as Guid & {
        readonly __version: 1;
      };
    } catch (error) {
      if (error instanceof GuidError) throw error;
      throw new GuidError(GuidErrorType.InvalidGuid);
    }
  }

  /**
   * Validates that this GUID is a proper v1 GUID.
   * @returns True if valid v1 GUID, false otherwise
   */
  public isValidV1(): boolean {
    return this.getVersion() === 1;
  }

  /**
   * Returns a URL-safe base64 representation (no padding, URL-safe chars).
   */
  public get asUrlSafeBase64(): string {
    return this._value
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Creates a GUID from URL-safe base64.
   */
  public static fromUrlSafeBase64(urlSafe: string): Guid {
    const base64 = urlSafe
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(24, '=');
    return new Guid(base64 as Base64Guid);
  }

  /**
   * Alias for isRawGuidPlatformBuffer for backward compatibility
   */
  public static isRawGuidBuffer = Guid.isRawGuidPlatformBuffer;

  /**
   * Alias for toRawGuidPlatformBuffer for backward compatibility
   */
  public static toRawGuidBuffer = Guid.toRawGuidPlatformBuffer;
}
