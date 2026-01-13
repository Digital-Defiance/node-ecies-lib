/**
 * Interface definitions for multi-recipient-chunk.
 */
export interface IMultiRecipientChunkHeader {
  chunkIndex: number;
  flags: number;
  recipientCount: number;
  magic?: number;
  version?: number;
  originalSize?: number;
  encryptedSize?: number;
}

export interface IMultiRecipientChunk {
  header: IMultiRecipientChunkHeader;
  data: Buffer;
  isLast?: boolean;
  recipientCount?: number;
  index?: number;
}

export interface IMultiRecipientConstants {
  MAGIC: number;
  VERSION: number;
  HEADER_SIZE: number;
  KEY_SIZE_BYTES: number;
  FLAG_IS_LAST: number;
  MAX_RECIPIENTS: number;
}

export const getMultiRecipientConstants = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _recipientIdSize: number,
): IMultiRecipientConstants => ({
  MAGIC: 0x45434945, // 'ECIE'
  VERSION: 1,
  HEADER_SIZE: 64, // Fixed header size before recipient list
  KEY_SIZE_BYTES: 2, // Size of the key size field
  FLAG_IS_LAST: 1,
  MAX_RECIPIENTS: 65535,
});
