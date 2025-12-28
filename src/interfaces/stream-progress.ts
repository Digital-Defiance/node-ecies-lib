/**
 * Progress information for streaming operations
 */
export interface IStreamProgress {
  /** Total bytes processed so far */
  bytesProcessed: number;
  /** Total bytes to process (undefined for unknown-length streams) */
  totalBytes?: number;
  /** Number of chunks processed */
  chunksProcessed: number;
  /** Percentage complete (0-100, undefined if totalBytes unknown) */
  percentComplete?: number;
  /** Current throughput in bytes per second */
  throughputBytesPerSec: number;
  /** Estimated time remaining in seconds (undefined if totalBytes unknown) */
  estimatedTimeRemaining?: number;
  /** Timestamp when operation started */
  startTime: number;
  /** Elapsed time in milliseconds */
  elapsedTime: number;
}
