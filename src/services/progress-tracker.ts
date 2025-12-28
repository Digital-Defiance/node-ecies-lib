import { IStreamProgress } from '../interfaces/stream-progress';

export class ProgressTracker {
  private startTime: number;
  private lastUpdateTime: number;
  private bytesProcessed: number = 0;
  private chunksProcessed: number = 0;
  private recentThroughputs: number[] = [];
  private readonly maxThroughputSamples = 5;

  constructor(private readonly totalBytes?: number) {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
  }

  public update(chunkBytes: number): IStreamProgress {
    if (chunkBytes < 0) {
      throw new Error('Chunk bytes cannot be negative');
    }

    this.bytesProcessed += chunkBytes;
    this.chunksProcessed++;

    const now = Date.now();
    const elapsedTime = Math.max(0, now - this.startTime);
    const timeSinceLastUpdate = Math.max(0, now - this.lastUpdateTime);

    // Calculate instantaneous throughput
    const timeWindow =
      timeSinceLastUpdate > 0 ? timeSinceLastUpdate : Math.max(1, elapsedTime);
    if (chunkBytes > 0 && timeWindow > 0) {
      const instantThroughput = (chunkBytes / timeWindow) * 1000;
      // Guard against unrealistic throughput (>10GB/s)
      if (
        isFinite(instantThroughput) &&
        instantThroughput < 10 * 1024 * 1024 * 1024
      ) {
        this.recentThroughputs.push(instantThroughput);
        if (this.recentThroughputs.length > this.maxThroughputSamples) {
          this.recentThroughputs.shift();
        }
      }
    }

    this.lastUpdateTime = now;

    // Calculate average throughput
    const throughputBytesPerSec =
      this.recentThroughputs.length > 0
        ? this.recentThroughputs.reduce((a, b) => a + b, 0) /
          this.recentThroughputs.length
        : 0;

    // Calculate ETA
    let estimatedTimeRemaining: number | undefined;
    if (
      this.totalBytes &&
      throughputBytesPerSec > 0 &&
      this.bytesProcessed < this.totalBytes
    ) {
      const remainingBytes = this.totalBytes - this.bytesProcessed;
      estimatedTimeRemaining = Math.max(0, remainingBytes / throughputBytesPerSec);
    }

    return {
      bytesProcessed: this.bytesProcessed,
      totalBytes: this.totalBytes,
      chunksProcessed: this.chunksProcessed,
      percentComplete: this.totalBytes
        ? Math.min(100, (this.bytesProcessed / this.totalBytes) * 100)
        : undefined,
      throughputBytesPerSec,
      estimatedTimeRemaining,
      startTime: this.startTime,
      elapsedTime,
    };
  }

  public getProgress(): IStreamProgress {
    const elapsedTime = Math.max(0, Date.now() - this.startTime);
    const throughputBytesPerSec =
      this.recentThroughputs.length > 0
        ? this.recentThroughputs.reduce((a, b) => a + b, 0) /
          this.recentThroughputs.length
        : 0;

    let estimatedTimeRemaining: number | undefined;
    if (
      this.totalBytes &&
      throughputBytesPerSec > 0 &&
      this.bytesProcessed < this.totalBytes
    ) {
      const remainingBytes = this.totalBytes - this.bytesProcessed;
      estimatedTimeRemaining = Math.max(0, remainingBytes / throughputBytesPerSec);
    }

    return {
      bytesProcessed: this.bytesProcessed,
      totalBytes: this.totalBytes,
      chunksProcessed: this.chunksProcessed,
      percentComplete: this.totalBytes
        ? Math.min(100, (this.bytesProcessed / this.totalBytes) * 100)
        : undefined,
      throughputBytesPerSec,
      estimatedTimeRemaining,
      startTime: this.startTime,
      elapsedTime,
    };
  }
}
