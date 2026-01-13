/**
 * SHA3-512 checksum transform stream for data integrity verification.
 * Computes cryptographic checksums while passing data through, emitting the final
 * checksum when the stream ends.
 */
import { Transform, TransformCallback } from 'stream';

import { Hasher, sha3_512 } from 'js-sha3';

import { ChecksumBuffer } from '../types';

export class ChecksumTransform extends Transform {
  private sha3: Hasher;
  constructor() {
    super();
    this.sha3 = sha3_512.create();
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ) {
    this.sha3.update(chunk);
    callback(null, chunk);
  }

  public override _flush(callback: TransformCallback) {
    const checksum = this.sha3.digest();
    this.emit('checksum', Buffer.from(checksum) as unknown as ChecksumBuffer);
    callback();
  }
}
