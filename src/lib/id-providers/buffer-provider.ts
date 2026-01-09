import { randomBytes } from 'crypto';

import {
  IdProviderErrorType,
  IdProviderError,
  BaseIdProvider,
} from '@digitaldefiance/ecies-lib';

/**
 * Buffer ID provider that accepts any fixed byte length.
 *
 * Use this when you need a non-standard ID size or custom validation logic with Node.js Buffers.
 * For standard formats, prefer ObjectIdProvider, GuidV4Provider, or UuidProvider.
 *
 * Example:
 * ```typescript
 * // 20-byte SHA-1 hash as recipient ID
 * const provider = new BufferIdProvider(20, 'SHA1Hash');
 * ```
 */
export class BufferIdProvider extends BaseIdProvider<Buffer> {
  readonly byteLength: number;
  readonly name: string;

  constructor(byteLength: number, name = 'Buffer') {
    super();

    if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > 255) {
      throw new IdProviderError(
        IdProviderErrorType.InvalidByteLengthParameter,
        undefined,
        undefined,
        { value: byteLength },
      );
    }

    this.byteLength = byteLength;
    this.name = name;
  }

  /**
   * Generate a new random ID of the specified byte length.
   */
  generate(): Buffer {
    return randomBytes(this.byteLength);
  }

  /**
   * Validate an ID buffer.
   * Only checks length - override this method for custom validation.
   */
  validate(id: Buffer): boolean {
    return id.length === this.byteLength;
  }

  /**
   * Serialize to hexadecimal string.
   */
  serialize(id: Buffer): string {
    this.validateLength(id, `${this.name}.serialize`);
    return id.toString('hex');
  }

  /**
   * Deserialize a hexadecimal string to buffer.
   */
  deserialize(str: string): Buffer {
    if (typeof str !== 'string') {
      throw new IdProviderError(IdProviderErrorType.InputMustBeString);
    }

    const expectedLength = this.byteLength * 2;
    if (str.length !== expectedLength) {
      throw new IdProviderError(
        IdProviderErrorType.InvalidStringLength,
        undefined,
        undefined,
        { expected: expectedLength, actual: str.length },
      );
    }

    if (!/^[0-9a-fA-F]+$/.test(str)) {
      throw new IdProviderError(IdProviderErrorType.InvalidCharacters);
    }

    return Buffer.from(str, 'hex');
  }

  /**
   * Create a defensive copy of an ID.
   */
  clone(id: Buffer): Buffer {
    return Buffer.from(id);
  }

  /**
   * Convert Buffer to the provider's native representation.
   * For BufferIdProvider, the native type is Buffer, so this is a pass-through.
   */
  fromBytes(bytes: Buffer): Buffer {
    return bytes;
  }

  /**
   * Convert the provider's native representation to Buffer.
   * For BufferIdProvider, the native type is Buffer, so this is a pass-through.
   */
  toBytes(id: Buffer): Buffer {
    return id;
  }

  /**
   * Compare two IDs for equality.
   */
  equals(a: Buffer, b: Buffer): boolean {
    return a.equals(b);
  }
}
