import { IEncryptedChunk } from '../interfaces/encrypted-chunk';
import { ECIESService } from './ecies/service';

export class ChunkProcessor {
  constructor(private readonly ecies: ECIESService) {}

  public async encryptChunk(
    data: Buffer,
    publicKey: Buffer,
    chunkIndex: number,
    isLast: boolean,
    includeChecksums: boolean = false,
  ): Promise<IEncryptedChunk> {
    const encrypted = this.ecies.encryptSimpleOrSingle(false, publicKey, data);
    
    // Prepend chunk header: 4 bytes index + 1 byte flags
    const header = Buffer.alloc(5);
    header.writeUInt32BE(chunkIndex, 0);
    header.writeUInt8(isLast ? 1 : 0, 4);
    
    const dataWithHeader = Buffer.concat([header, encrypted]);
    
    return {
      index: chunkIndex,
      data: dataWithHeader,
      isLast,
      metadata: includeChecksums ? { totalChunks: chunkIndex + 1 } : undefined,
    };
  }

  public async decryptChunk(
    chunkData: Buffer,
    privateKey: Buffer,
  ): Promise<{ data: Buffer; header: { index: number; flags: number } }> {
    // Extract chunk header: 4 bytes index + 1 byte flags
    const index = chunkData.readUInt32BE(0);
    const flags = chunkData.readUInt8(4);
    const encrypted = chunkData.subarray(5);
    
    const decrypted = this.ecies.decryptSimpleOrSingleWithHeader(false, privateKey, encrypted);
    
    return {
      data: decrypted,
      header: { index, flags },
    };
  }
}
