export interface IChunkMetadata {
  totalChunks?: number;
  originalSize?: number;
  recipientCount?: number;
}

export interface IEncryptedChunk {
  index: number;
  data: Buffer;
  isLast: boolean;
  metadata?: IChunkMetadata;
}
