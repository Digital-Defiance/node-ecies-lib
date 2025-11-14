export interface IStreamProgress {
  processedBytes: number;
  totalBytes: number;
  percentComplete: number;
  throughputBytesPerSec: number;
  estimatedTimeRemainingMs: number;
}
