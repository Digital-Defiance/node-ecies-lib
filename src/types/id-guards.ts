/**
 * Type guards and converters for ID types
 * Used to safely convert between Buffer and Uint8Array without unsafe type casts
 */

/**
 * Type guard to check if a value is a Buffer
 * @param value - The value to check
 * @returns True if the value is a Buffer
 */
export function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

/**
 * Type guard to check if a value is a Uint8Array
 * @param value - The value to check
 * @returns True if the value is a Uint8Array
 */
export function isUint8Array(value: unknown): value is Uint8Array {
  return value instanceof Uint8Array;
}

/**
 * Safely converts an ID value to Buffer
 * @param id - The ID to convert (Buffer, Uint8Array, or string)
 * @returns The ID as a Buffer
 * @throws Error if the ID type is not supported
 */
export function toBuffer(id: Buffer | Uint8Array | string): Buffer {
  if (isBuffer(id)) {
    return id;
  }
  if (isUint8Array(id)) {
    return Buffer.from(id);
  }
  if (typeof id === 'string') {
    return Buffer.from(id, 'hex');
  }
  throw new Error(`Cannot convert ID of type ${typeof id} to Buffer`);
}

/**
 * Safely converts an ID value to Uint8Array
 * @param id - The ID to convert (Buffer, Uint8Array, or string)
 * @returns The ID as a Uint8Array
 * @throws Error if the ID type is not supported
 */
export function toUint8Array(id: Buffer | Uint8Array | string): Uint8Array {
  if (isUint8Array(id)) {
    return id;
  }
  if (isBuffer(id)) {
    return new Uint8Array(id);
  }
  if (typeof id === 'string') {
    return new Uint8Array(Buffer.from(id, 'hex'));
  }
  throw new Error(`Cannot convert ID of type ${typeof id} to Uint8Array`);
}

/**
 * Generic ID converter that can convert between Buffer, Uint8Array, and string
 * @param id - The ID to convert
 * @param toType - The target type ('Buffer', 'Uint8Array', or 'string')
 * @returns The converted ID
 * @throws Error if the conversion is not supported
 */
export function convertId<T extends 'Buffer' | 'Uint8Array' | 'string'>(
  id: Buffer | Uint8Array | string,
  toType: T,
): T extends 'Buffer' ? Buffer : T extends 'Uint8Array' ? Uint8Array : string {
  if (toType === 'Buffer') {
    return toBuffer(id) as T extends 'Buffer'
      ? Buffer
      : T extends 'Uint8Array'
        ? Uint8Array
        : string;
  }
  if (toType === 'Uint8Array') {
    return toUint8Array(id) as T extends 'Buffer'
      ? Buffer
      : T extends 'Uint8Array'
        ? Uint8Array
        : string;
  }
  if (toType === 'string') {
    if (typeof id === 'string') {
      return id as T extends 'Buffer'
        ? Buffer
        : T extends 'Uint8Array'
          ? Uint8Array
          : string;
    }
    if (isBuffer(id)) {
      return id.toString('hex') as T extends 'Buffer'
        ? Buffer
        : T extends 'Uint8Array'
          ? Uint8Array
          : string;
    }
    if (isUint8Array(id)) {
      return Buffer.from(id).toString('hex') as T extends 'Buffer'
        ? Buffer
        : T extends 'Uint8Array'
          ? Uint8Array
          : string;
    }
  }
  throw new Error(`Cannot convert ID to type ${toType}`);
}
