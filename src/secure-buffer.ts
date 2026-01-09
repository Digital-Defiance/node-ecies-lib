import { randomFillSync } from 'crypto';

import {
  SecureStorageErrorType,
  DisposedError,
  SecureStorageError,
  ObjectIdProvider,
  XorService,
} from '@digitaldefiance/ecies-lib';

/**
 * A secure buffer implementation for Node.js using Buffer instead of Uint8Array.
 * The buffer is encrypted with a key derived from a random ID.
 * The ID is stored in the clear, but the buffer is encrypted with a key derived from the ID.
 * This allows the buffer to be decrypted, but only if the ID and salt are known.
 *
 * Supports explicit resource management (TC39 proposal) for automatic disposal:
 * ```typescript
 * using buffer = new SecureBuffer(sensitiveData);
 * // buffer automatically disposed when leaving scope
 * ```
 */
export class SecureBuffer implements Disposable {
  private _disposed: boolean = false;
  private readonly _id: Buffer;
  private readonly _idProvider: ObjectIdProvider;
  private readonly _length: number;
  private readonly _obfuscatedValue: Buffer;
  private readonly _key: Buffer;
  private readonly _obfuscatedChecksum: Buffer;
  private _disposedAt?: string;

  constructor(data?: Buffer) {
    this._idProvider = new ObjectIdProvider();
    this._id = Buffer.from(this._idProvider.generate());
    // don't bother encrypting an empty buffer
    if (data === undefined || data.length === 0) {
      this._length = 0;
      this._obfuscatedValue = Buffer.alloc(0);
      this._key = Buffer.alloc(0);
      this._obfuscatedChecksum = Buffer.alloc(0);
      return;
    }
    this._length = data.length;
    this._key = this._id;
    this._obfuscatedValue = this.obfuscateData(data);
    // Create a simple checksum without crypto for synchronous operation
    this._obfuscatedChecksum = this.createSimpleObfuscatedChecksum(data);
  }

  public dispose(): void {
    const err = new DisposedError();
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(err, this.dispose);
    }
    this._disposedAt = err.stack ?? 'stack unavailable';
    this._obfuscatedValue.fill(0);
    this._key.fill(0);
    this._obfuscatedChecksum.fill(0);
    this._disposed = true;
  }

  /**
   * Symbol.dispose implementation for explicit resource management
   * Allows using 'using' keyword (TC39 proposal)
   */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Factory method for backward compatibility that uses Constants.idProvider
   * @param data Optional data to secure
   * @returns A new SecureBuffer instance using the global ID provider
   */
  static create(data?: Buffer): SecureBuffer {
    return new SecureBuffer(data);
  }

  /**
   * Static factory method that creates a SecureBuffer for a symmetric key
   * Useful for managing encryption keys securely
   */
  static allocateKey(sizeBytes: number = 32): SecureBuffer {
    const keyData = Buffer.alloc(sizeBytes);
    // Fill with random data using Node.js crypto
    randomFillSync(keyData);
    return new SecureBuffer(keyData);
  }

  private assertNotDisposed(): void {
    if (this._disposed) {
      const e = new DisposedError();
      try {
        e.disposedAt = this._disposedAt;
      } catch {
        // ignore if Error object is sealed/frozen
      }
      throw e;
    }
  }

  public static fromString(data: string): SecureBuffer {
    return new SecureBuffer(Buffer.from(data, 'utf8'));
  }

  public get disposedAtStack(): string | undefined {
    return this._disposedAt;
  }

  public get id(): string {
    this.assertNotDisposed();
    return this._idProvider.serialize(this._id);
  }

  public get idUint8Array(): Uint8Array {
    this.assertNotDisposed();
    return new Uint8Array(this._id);
  }

  public get idBuffer(): Buffer {
    this.assertNotDisposed();
    return this._id;
  }

  public get originalLength(): number {
    this.assertNotDisposed();
    return this._length;
  }

  public get value(): Buffer {
    this.assertNotDisposed();
    if (this._length === 0) {
      return Buffer.alloc(0);
    }
    try {
      const deobfuscatedResult = this.deobfuscateData(this._obfuscatedValue);
      if (deobfuscatedResult.length !== this._length) {
        throw new SecureStorageError(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }
      if (!this.validateObfuscatedChecksum(deobfuscatedResult)) {
        throw new SecureStorageError(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
      return deobfuscatedResult;
    } catch (error) {
      // If it's already a SecureStorageError, re-throw it
      if (error instanceof SecureStorageError) {
        throw error;
      }
      // Convert any other error (including AES-GCM authentication errors) to SecureStorageError
      throw new SecureStorageError(
        SecureStorageErrorType.DecryptedValueChecksumMismatch,
      );
    }
  }

  public get valueAsString(): string {
    this.assertNotDisposed();
    return this.value.toString('utf8');
  }

  public get valueAsHexString(): string {
    this.assertNotDisposed();
    return this.value.toString('hex');
  }

  public get valueAsBase64String(): string {
    this.assertNotDisposed();
    return this.value.toString('base64');
  }

  public get checksum(): string {
    this.assertNotDisposed();
    const deobfuscatedChecksum = this.deobfuscateData(
      this._obfuscatedChecksum,
    ).toString('utf8');
    return deobfuscatedChecksum;
  }

  private generateSimpleChecksum(data: string | Buffer): string {
    const dataBytes =
      typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    let hash = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      hash = ((hash << 5) - hash + dataBytes[i]) & 0xffffffff;
    }
    return hash.toString(16);
  }

  private createSimpleObfuscatedChecksum(data: string | Buffer): Buffer {
    const checksum = this.generateSimpleChecksum(data);
    const result = this.obfuscateData(Buffer.from(checksum, 'utf8'));
    return result;
  }

  private validateSimpleChecksum(
    data: string | Buffer,
    checksum: string,
  ): boolean {
    const generatedChecksum = this.generateSimpleChecksum(data);
    const a = Buffer.from(generatedChecksum, 'utf8');
    const b = Buffer.from(checksum, 'utf8');
    return this.timingSafeEqual(a, b);
  }

  private timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  }

  private validateObfuscatedChecksum(data: string | Buffer): boolean {
    const deobfuscatedChecksum = this.deobfuscateData(
      this._obfuscatedChecksum,
    ).toString('utf8');
    return this.validateSimpleChecksum(data, deobfuscatedChecksum);
  }

  private obfuscateData(data: Buffer): Buffer {
    return Buffer.from(
      XorService.xor(new Uint8Array(data), new Uint8Array(this._key)),
    );
  }

  private deobfuscateData(data: Buffer): Buffer {
    return Buffer.from(
      XorService.xor(new Uint8Array(data), new Uint8Array(this._key)),
    );
  }

  public get length(): number {
    this.assertNotDisposed();
    return this._length;
  }
}
