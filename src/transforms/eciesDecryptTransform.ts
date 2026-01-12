import { Transform, TransformCallback, TransformOptions } from 'stream';

import { PlatformID } from '../interfaces';
import { ECIESService } from '../services';

export class EciesDecryptionTransform<
  TID extends PlatformID = Buffer,
> extends Transform {
  private readonly blockSize: number;
  private readonly privateKey: Buffer;
  private buffer: Buffer;
  private readonly logger: Console;
  private readonly eciesService: ECIESService<TID>;

  constructor(
    eciesService: ECIESService<TID>,
    privateKey: Buffer,
    blockSize: number,
    options?: TransformOptions,
    logger: Console = console,
  ) {
    super(options);
    this.logger = logger;
    this.privateKey = privateKey;
    this.blockSize = blockSize as number;
    this.buffer = Buffer.alloc(0);

    // Use provided service or create one with GuidV4Provider config
    this.eciesService = eciesService;
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    try {
      if (chunk.length === 0) {
        callback();
        return;
      }

      // Add new chunk to buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      // Process complete blocks
      while (this.buffer.length >= this.blockSize) {
        const encryptedBlock = this.buffer.subarray(0, this.blockSize);
        this.buffer = this.buffer.subarray(this.blockSize);

        try {
          const decryptedBlock =
            this.eciesService.decryptSimpleOrSingleWithHeader(
              true, // decryptSimple = true
              this.privateKey,
              encryptedBlock,
            );
          this.push(decryptedBlock);
        } catch (decryptError) {
          console.error('Block decryption error:', {
            error: decryptError,
            blockSize: this.blockSize,
            encryptedBlockLength: encryptedBlock.length,
            privateKeyLength: this.privateKey.length,
          });
          throw decryptError;
        }
      }

      callback();
    } catch (error) {
      this.logger.error('Transform error details:', {
        error,
        blockSize: this.blockSize,
        bufferLength: this.buffer.length,
        chunkLength: chunk.length,
        privateKeyLength: this.privateKey.length,
      });
      const finalError =
        error instanceof Error ? error : new Error('Decryption failed');
      this.logger.error('Transform error:', finalError);
      callback(finalError);
    }
  }

  public override _flush(callback: TransformCallback): void {
    try {
      // Handle any remaining data in buffer
      if (this.buffer.length > 0) {
        const decryptedBlock =
          this.eciesService.decryptSimpleOrSingleWithHeader(
            true, // decryptSimple = true
            this.privateKey,
            this.buffer,
          );
        this.push(decryptedBlock);
      }
      callback();
    } catch (error) {
      const finalError =
        error instanceof Error ? error : new Error('Decryption failed');
      this.logger.error('Flush error:', finalError);
      callback(finalError);
    }
  }
}
