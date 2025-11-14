export interface IMultiRecipientChunkHeader {
  chunkIndex: number;
  flags: number;
  recipientCount: number;
}

export interface IMultiRecipientChunk {
  header: IMultiRecipientChunkHeader;
  data: Buffer;
}
