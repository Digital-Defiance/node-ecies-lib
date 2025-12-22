import * as fs from 'fs';

import { ECIESService } from './service';

interface ChunkedFileHeader {
  version: number;
  chunkSize: number;
  totalChunks: number;
  originalSize: number;
}

export class EciesFileService {
  protected readonly eciesService: ECIESService;
  protected readonly userPrivateKey: Buffer;
  protected readonly config: { chunkSize: number; headerSize: number };

  constructor(
    eciesService: ECIESService,
    userPrivateKey: Buffer,
    config: { chunkSize: number; headerSize: number } = {
      chunkSize: 1024 * 1024, // 1MB chunks
      headerSize: 20,
    },
  ) {
    this.eciesService = eciesService;
    this.userPrivateKey = userPrivateKey;
    this.config = Object.freeze(config);
  }

  decryptFile(encryptedData: Buffer): Buffer {
    const { header, chunks } = this.parseEncryptedFile(encryptedData);
    const decryptedChunks: Buffer[] = [];

    for (const chunk of chunks) {
      const decrypted = this.eciesService.decryptSimpleOrSingleWithHeader(
        false,
        this.userPrivateKey,
        chunk,
      );
      decryptedChunks.push(decrypted);
    }

    const result = Buffer.alloc(header.originalSize);
    let offset = 0;
    for (const chunk of decryptedChunks) {
      const copyLength = Math.min(chunk.length, header.originalSize - offset);
      chunk.copy(result, offset, 0, copyLength);
      offset += copyLength;
    }
    return result;
  }

  encryptFileFromPath(filePath: string, recipientPublicKey: Buffer): Buffer {
    const stats = fs.statSync(filePath);
    const totalChunks = Math.ceil(stats.size / this.config.chunkSize);
    const header: ChunkedFileHeader = {
      version: 1,
      chunkSize: this.config.chunkSize,
      totalChunks,
      originalSize: stats.size,
    };

    const headerBytes = this.serializeHeader(header);
    const encryptedHeader = this.eciesService.encryptSimpleOrSingle(
      false,
      recipientPublicKey,
      headerBytes,
    );

    const chunks: Buffer[] = [encryptedHeader];
    const fd = fs.openSync(filePath, 'r');

    try {
      for (let i = 0; i < totalChunks; i++) {
        const offset = i * this.config.chunkSize;
        const chunkSize = Math.min(this.config.chunkSize, stats.size - offset);
        const chunkData = Buffer.alloc(chunkSize);
        fs.readSync(fd, chunkData, 0, chunkSize, offset);

        const encryptedChunk = this.eciesService.encryptSimpleOrSingle(
          false,
          recipientPublicKey,
          chunkData,
        );
        chunks.push(encryptedChunk);
      }
    } finally {
      fs.closeSync(fd);
    }

    return Buffer.concat(chunks);
  }

  decryptFileToPath(encryptedData: Buffer, outputPath: string): void {
    const { header, chunks } = this.parseEncryptedFile(encryptedData);
    const fd = fs.openSync(outputPath, 'w');
    let offset = 0;

    try {
      for (const chunk of chunks) {
        const decrypted = this.eciesService.decryptSimpleOrSingleWithHeader(
          false,
          this.userPrivateKey,
          chunk,
        );
        const writeLength = Math.min(
          decrypted.length,
          header.originalSize - offset,
        );
        fs.writeSync(fd, decrypted, 0, writeLength, offset);
        offset += writeLength;
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  protected serializeHeader(header: ChunkedFileHeader): Buffer {
    const buffer = Buffer.alloc(this.config.headerSize);
    buffer.writeUInt32BE(header.version, 0);
    buffer.writeUInt32BE(header.chunkSize, 4);
    buffer.writeUInt32BE(header.totalChunks, 8);
    buffer.writeUInt32BE(header.originalSize, 12);
    return buffer;
  }

  protected deserializeHeader(data: Buffer): ChunkedFileHeader {
    return {
      version: data.readUInt32BE(0),
      chunkSize: data.readUInt32BE(4),
      totalChunks: data.readUInt32BE(8),
      originalSize: data.readUInt32BE(12),
    };
  }

  protected parseEncryptedFile(encryptedData: Buffer): {
    header: ChunkedFileHeader;
    chunks: Buffer[];
  } {
    const headerLength = this.eciesService.computeEncryptedLengthFromDataLength(
      this.config.headerSize,
      'single',
    );

    const encryptedHeader = encryptedData.subarray(0, headerLength);
    const decryptedHeaderBytes =
      this.eciesService.decryptSimpleOrSingleWithHeader(
        false,
        this.userPrivateKey,
        encryptedHeader,
      );

    const header = this.deserializeHeader(decryptedHeaderBytes);
    const chunks: Buffer[] = [];
    let offset = headerLength;

    for (let i = 0; i < header.totalChunks; i++) {
      const chunkLength =
        this.eciesService.computeEncryptedLengthFromDataLength(
          i === header.totalChunks - 1
            ? header.originalSize % header.chunkSize || header.chunkSize
            : header.chunkSize,
          'single',
        );

      chunks.push(encryptedData.subarray(offset, offset + chunkLength));
      offset += chunkLength;
    }

    return { header, chunks };
  }
}
