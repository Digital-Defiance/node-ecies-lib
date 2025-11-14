import { IStreamProgress } from '../interfaces/stream-progress';

export class ProgressTracker {
  private processedBytes = 0;
  private startTime = Date.now();
  private recentSamples: Array<{ bytes: number; timestamp: number }> = [];
  private readonly maxSamples = 5;

  public update(bytesProcessed: number): IStreamProgress {
    this.processedBytes += bytesProcessed;
    const now = Date.now();
    
    this.recentSamples.push({ bytes: bytesProcessed, timestamp: now });
    if (this.recentSamples.length > this.maxSamples) {
      this.recentSamples.shift();
    }

    const elapsedMs = now - this.startTime;
    const elapsedSec = elapsedMs / 1000;
    
    let throughputBytesPerSec = 0;
    if (this.recentSamples.length >= 2) {
      const firstSample = this.recentSamples[0];
      const lastSample = this.recentSamples[this.recentSamples.length - 1];
      const sampleBytes = this.recentSamples.reduce((sum, s) => sum + s.bytes, 0);
      const sampleTime = (lastSample.timestamp - firstSample.timestamp) / 1000;
      
      if (sampleTime > 0) {
        throughputBytesPerSec = sampleBytes / sampleTime;
      }
    } else if (elapsedSec > 0) {
      throughputBytesPerSec = this.processedBytes / elapsedSec;
    }

    return {
      processedBytes: this.processedBytes,
      totalBytes: 0,
      percentComplete: 0,
      throughputBytesPerSec,
      estimatedTimeRemainingMs: 0,
    };
  }
}
