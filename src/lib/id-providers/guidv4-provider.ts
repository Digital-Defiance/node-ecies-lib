import {
  BaseIdProvider,
  IdProviderError,
  IdProviderErrorType,
} from '@digitaldefiance/ecies-lib';

import { GuidV4Buffer } from '../../types/guid-versions';
import { GuidBuffer } from '../guid';

/**
 * ID provider for GUIDv4 (16 bytes raw, 24 bytes base64).
 *
 * Uses the Guid class which provides RFC 4122 compliant v4 GUIDs.
 * The raw binary representation is 16 bytes (128 bits).
 *
 * Serialization uses base64 for compactness (24 characters vs 36 for hex with dashes).
 */
export class GuidV4Provider extends BaseIdProvider<GuidV4Buffer> {
  readonly byteLength = 16;
  readonly name = 'GUIDv4';

  /**
   * Generate a new random GUIDv4.
   */
  generate(): Buffer {
    const guid = GuidBuffer.v4();
    return guid.asRawBuffer;
  }

  /**
   * Validate a GUID buffer.
   * Checks length and RFC 4122 v4 compliance.
   */
  validate(id: Buffer): boolean {
    if (id.length !== this.byteLength) {
      return false;
    }

    try {
      // Convert to Guid and validate
      const guid = GuidBuffer.fromBuffer(id);
      return guid.isValidV4();
    } catch {
      return false;
    }
  }

  /**
   * Serialize GUID to base64 string (24 characters).
   */
  serialize(id: Buffer): string {
    this.validateLength(id, 'GuidProvider.serialize');

    try {
      const guid = new GuidBuffer(Buffer.from(id));
      return guid.asBase64Guid;
    } catch (error) {
      throw new IdProviderError(
        IdProviderErrorType.InvalidGuidBuffer,
        { cause: error instanceof Error ? error : undefined },
        undefined,
        { message: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Deserialize a base64 or hex GUID string to buffer.
   * Accepts multiple formats: base64 (24 chars), short hex (32 chars), full hex (36 chars).
   */
  deserialize(str: string): Buffer {
    if (typeof str !== 'string') {
      throw new IdProviderError(IdProviderErrorType.InputMustBeString);
    }

    try {
      const guid = GuidBuffer.parse(str);
      return guid.asRawBuffer;
    } catch (error) {
      throw new IdProviderError(
        IdProviderErrorType.ParseFailed,
        { cause: error instanceof Error ? error : undefined },
        undefined,
        {
          input: str,
          message: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Create a GUID from a namespace and name (v5 - SHA-1 based).
   * Useful for deterministic GUIDs.
   */
  fromNamespace(namespace: string, name: string): Buffer {
    const guid = GuidBuffer.v5(name, namespace);
    return guid.asRawBuffer;
  }

  /**
   * Get the GUID version from a buffer.
   * Should return 4 for valid v4 GUIDs.
   */
  getVersion(id: Buffer): number | undefined {
    this.validateLength(id, 'GuidProvider.getVersion');

    try {
      const guid = new GuidBuffer(id);
      return guid.getVersion();
    } catch {
      return undefined;
    }
  }

  /**
   * Check if a GUID is the empty/nil GUID (all zeros).
   */
  isEmpty(id: Buffer): boolean {
    this.validateLength(id, 'GuidProvider.isEmpty');

    try {
      const guid = new GuidBuffer(id);
      return guid.isEmpty();
    } catch {
      return false;
    }
  }

  /**
   * Convert an ID to its canonical string representation.
   * Returns the 32-character lowercase hex (ShortHexGuid) format, which is
   * the storage format required by the member index schema and used throughout
   * the system. idFromString() accepts all formats (short hex, full hex, base64)
   * so round-trips are preserved.
   */
  override idToString(id: GuidV4Buffer): string {
    return id.asShortHexGuid as string;
  }

  /**
   * Convert a string representation of an ID back to an ID buffer.
   * Delegates to deserialize.
   */
  override idFromString(str: string): GuidV4Buffer {
    const guid = GuidBuffer.parse(str);
    if (guid.__version !== 4) {
      throw new IdProviderError(
        IdProviderErrorType.InvalidGuidBuffer,
        undefined,
        undefined,
        { message: `Expected GUIDv4, got version ${guid.__version}` },
      );
    }
    return guid as GuidV4Buffer;
  }

  override equals(a: GuidV4Buffer, b: GuidV4Buffer): boolean {
    return a.equals(b);
  }

  override clone(id: GuidV4Buffer): GuidV4Buffer {
    const guid = GuidBuffer.parse(id.asFullHexGuid);
    return guid as GuidV4Buffer;
  }

  override fromBytes(bytes: Buffer): GuidV4Buffer {
    const guid = GuidBuffer.fromBuffer(bytes);
    if (guid.__version !== 4) {
      throw new IdProviderError(
        IdProviderErrorType.InvalidGuidBuffer,
        undefined,
        undefined,
        { message: `Expected GUIDv4, got version ${guid.__version}` },
      );
    }
    return guid as GuidV4Buffer;
  }

  override toBytes(id: GuidV4Buffer): Buffer {
    return id.asRawBuffer;
  }

  parseSafe(str: string): GuidV4Buffer | undefined {
    try {
      const trimmed = str.trim();

      // Detect URL-safe base64 (22 chars without padding, or with URL-safe chars)
      if (
        trimmed.length === 22 ||
        (trimmed.length === 24 &&
          (trimmed.includes('-') || trimmed.includes('_')) &&
          !trimmed.includes(' '))
      ) {
        return GuidBuffer.fromUrlSafeBase64(trimmed) as GuidV4Buffer;
      }

      // Detect bigint string (all digits, not a plausible hex-only string of known GUID lengths)
      if (/^\d+$/.test(trimmed) && trimmed.length > 0) {
        return GuidBuffer.parse(BigInt(trimmed)) as GuidV4Buffer;
      }

      return GuidBuffer.parse(trimmed) as GuidV4Buffer;
    } catch {
      return undefined;
    }
  }

  toString(id: GuidV4Buffer, format: 'hex' | 'base64' | 'int'): string {
    switch (format) {
      case 'hex':
        return id.asShortHexGuid as string;
      case 'base64':
        return id.asBase64Guid;
      case 'int':
        return BigInt(`0x${id.asShortHexGuid}`).toString();
      default:
        throw new IdProviderError(IdProviderErrorType.InvalidFormat);
    }
  }
}

export { GuidV4Provider as GuidProvider };
