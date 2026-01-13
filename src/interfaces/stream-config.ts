/**
 * Interface definitions for stream-config.
 */
export interface IStreamConfig {
  chunkSize: number;
  includeChecksums: boolean;
}

export const DEFAULT_STREAM_CONFIG: IStreamConfig = {
  chunkSize: 65536, // 64KB
  includeChecksums: false,
};
