/**
 * RFC 4122 compliant GUID implementation for Node.js.
 * Extends GuidUint8Array from ecies-lib to ensure type compatibility while using Buffer internally.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GuidInput, GuidUint8Array, IGuid } from '@digitaldefiance/ecies-lib';
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
 * Node.js GUID implementation that extends GuidUint8Array but uses Buffer internally.
 * This ensures type compatibility with ecies-lib while leveraging Node.js Buffer capabilities.
 */
export class GuidBuffer extends GuidUint8Array implements IGuid {
  constructor(value: GuidInput) {
    // Convert to Buffer if it's a Uint8Array
    const bufferValue =
      value instanceof Uint8Array && !Buffer.isBuffer(value)
        ? Buffer.from(value)
        : value;
    super(bufferValue);
  }

  /**
   * Returns the GUID as a raw Buffer.
   */
  public get asBuffer(): Buffer {
    return Buffer.isBuffer(this._value)
      ? this._value
      : Buffer.from(this._value);
  }

  /**
   * Returns the GUID as a native Uint8Array (not a Buffer).
   */
  public get asUint8Array(): Uint8Array {
    return new Uint8Array(this._value);
  }

  public get asPlatformBuffer(): PlatformBuffer {
    return Buffer.isBuffer(this._value)
      ? this._value
      : Buffer.from(this._value);
  }

  /**
   * Factory method to create a GUID from a raw buffer.
   */
  public static fromBuffer(buffer: Buffer): VersionedGuidBuffer {
    return GuidBuffer.parse(buffer) as VersionedGuidBuffer;
  }

  /**
   * Factory method to create a GUID from a raw Uint8Array.
   */
  public static fromUint8Array(bytes: Uint8Array): VersionedGuidBuffer {
    return GuidBuffer.parse(Buffer.from(bytes)) as VersionedGuidBuffer;
  }

  /**
   * Alias for isRawGuidPlatformBuffer for backward compatibility
   */
  public static isRawGuidBuffer = GuidUint8Array.isRawGuidUint8Array;

  /**
   * Converts a GUID input to a raw Buffer (Node.js specific).
   */
  public static toRawGuidBuffer(value: GuidInput): Buffer {
    const uint8 = GuidUint8Array.toRawGuidPlatformBuffer(value);
    return Buffer.from(uint8);
  }

  /**
   * Attaches the RFC 4122 version to a GuidBuffer instance.
   */
  private static attachVersion<T extends GuidBuffer>(
    guid: T,
  ): VersionedGuidBuffer {
    const version = guid.getVersion() as 1 | 3 | 4 | 5 | 6 | 7 | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (guid as any).__version = version;
    return guid as VersionedGuidBuffer;
  }

  public static override v4(): VersionedGuidBuffer<4> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v4().asFullHexGuid),
    ) as VersionedGuidBuffer<4>;
  }

  public static override v5(
    name: string,
    namespace: string | Uint8Array,
  ): VersionedGuidBuffer<5> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v5(name, namespace).asFullHexGuid),
    ) as VersionedGuidBuffer<5>;
  }

  public static override v3(
    name: string,
    namespace: string | Uint8Array,
  ): VersionedGuidBuffer<3> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v3(name, namespace).asFullHexGuid),
    ) as VersionedGuidBuffer<3>;
  }

  public static override v6(
    options?: uuid.Version6Options,
  ): VersionedGuidBuffer<6> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v6(options).asFullHexGuid),
    ) as VersionedGuidBuffer<6>;
  }

  public static override v7(
    options?: uuid.Version7Options,
  ): VersionedGuidBuffer<7> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v7(options).asFullHexGuid),
    ) as VersionedGuidBuffer<7>;
  }

  public static override v1(
    options?: uuid.Version1Options,
  ): VersionedGuidBuffer<1> {
    return GuidBuffer.attachVersion(
      new GuidBuffer(GuidUint8Array.v1(options).asFullHexGuid),
    ) as VersionedGuidBuffer<1>;
  }

  public static override parse(value: GuidInput): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(value));
  }

  public static override tryParse(
    value: GuidInput,
  ): VersionedGuidBuffer | null {
    try {
      return GuidBuffer.attachVersion(new GuidBuffer(value));
    } catch {
      return null;
    }
  }

  public static override generate(): VersionedGuidBuffer<4> {
    return GuidBuffer.v4();
  }

  public static override new(): VersionedGuidBuffer<4> {
    return GuidBuffer.v4();
  }

  public static override fromFullHex(fullHex: string): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(fullHex));
  }

  public static override fromShortHex(shortHex: string): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(shortHex));
  }

  public static override fromBase64(base64: string): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(base64));
  }

  public static override fromBigInt(bigint: bigint): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(bigint));
  }

  public static override fromPlatformBuffer(
    bytes: Uint8Array,
  ): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(bytes));
  }

  public override clone(): VersionedGuidBuffer {
    return GuidBuffer.attachVersion(new GuidBuffer(Buffer.from(this._value)));
  }
}
