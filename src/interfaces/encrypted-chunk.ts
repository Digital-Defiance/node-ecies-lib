/**
 * Interface definitions for encrypted-chunk.
 * Extends the base ecies-lib interfaces with Buffer-typed data.
 */
import {
  IEncryptedChunk as IBaseEncryptedChunk,
  IChunkMetadata as IBaseChunkMetadata,
} from '@digitaldefiance/ecies-lib';

/**
 * Node.js chunk metadata — extends base with optional fields.
 * The base requires originalSize, encryptedSize, timestamp;
 * the node streaming implementation may not always populate all of them,
 * so we re-export the base type directly.
 */
export type IChunkMetadata = IBaseChunkMetadata;

/**
 * Node.js encrypted chunk — narrows data from Uint8Array to Buffer.
 */
export interface IEncryptedChunk extends IBaseEncryptedChunk {
  data: Buffer;
}
