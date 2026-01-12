import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { crc16ccitt, crc32, crc8 } from 'crc';
import { Readable } from 'stream';
import { CrcService } from './crc';

describe('CrcService', () => {
  const testData = Buffer.from([
    84, 104, 105, 115, 32, 105, 115, 32, 115, 111, 109, 101, 32, 116, 101, 115,
    116, 32, 100, 97, 116, 97,
  ]); // 'This is some test data'
  const differentData = Buffer.from([
    84, 104, 105, 115, 32, 105, 115, 32, 97, 108, 115, 111, 32, 115, 111, 109,
    101, 32, 109, 111, 114, 101, 32, 116, 101, 115, 116, 32, 100, 97, 116, 97,
  ]); // 'This is also some more test data'
  let crcService: CrcService;
  beforeEach(() => {
    crcService = new CrcService();
  });

  // Helper function to create a readable stream from a Uint8Array
  function uint8ArrayToStream(data: Uint8Array): Readable {
    return Readable.from(Buffer.from(data));
  }

  // Helper function to create a readable stream from a Buffer
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function bufferToStream(data: Buffer): Readable {
    return Readable.from(data);
  }

  describe('synchronous CRC', () => {
    describe('crc8', () => {
      it('should calculate CRC8 correctly', () => {
        const expectedCrc8 = new Uint8Array(1);
        expectedCrc8[0] = crc8(Buffer.from(testData));
        expect(arraysEqual(crcService.crc8(testData), expectedCrc8)).toBe(true);
      });
      it('should verify CRC8 correctly', () => {
        const crc8 = crcService.crc8(testData);
        expect(crcService.verifyCrc8(testData, crc8)).toBe(true);
        expect(crcService.verifyCrc8(testData, crc8[0])).toBe(true); // Test with number input
        const badCrc = Buffer.from([0x01]);
        expect(crcService.verifyCrc8(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc8(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should handle empty buffer correctly', () => {
        const emptyData = Buffer.alloc(0);
        const crc = crcService.crc8(emptyData);
        expect(crc.length).toBe(1);
        expect(crcService.verifyCrc8(emptyData, crc)).toBe(true);
      });

      it('should generate consistent CRC8 for the same data', () => {
        const crc1 = crcService.crc8(testData);
        const crc2 = crcService.crc8(testData);
        expect(arraysEqual(crc1, crc2)).toBe(true);
      });

      it('should generate different CRC8 for different data', () => {
        const crc1 = crcService.crc8(testData);
        const crc2 = crcService.crc8(differentData);
        expect(arraysEqual(crc1, crc2)).toBe(false);
      });
    });
    describe('crc16', () => {
      it('should calculate CRC16 correctly', () => {
        const expectedCrc16 = new Uint8Array(2);
        const crcValue = crc16ccitt(testData);
        expectedCrc16[0] = (crcValue >> 8) & 0xff;
        expectedCrc16[1] = crcValue & 0xff;
        expect(arraysEqual(crcService.crc16(testData), expectedCrc16)).toBe(
          true,
        );
      });
      it('should verify CRC16 correctly', () => {
        const crc16 = crcService.crc16(testData);
        expect(crcService.verifyCrc16(testData, crc16)).toBe(true);
        const crcValue = (crc16[0] << 8) | crc16[1];
        expect(crcService.verifyCrc16(testData, crcValue)).toBe(true); // Test with number input
        const badCrc = Buffer.from([0x00, 0x01]);
        expect(crcService.verifyCrc16(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc16(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should handle empty buffer correctly', () => {
        const emptyData = Buffer.alloc(0);
        const crc = crcService.crc16(emptyData);
        expect(crc.length).toBe(2);
        expect(crcService.verifyCrc16(emptyData, crc)).toBe(true);
      });

      it('should generate consistent CRC16 for the same data', () => {
        const crc1 = crcService.crc16(testData);
        const crc2 = crcService.crc16(testData);
        expect(arraysEqual(crc1, crc2)).toBe(true);
      });

      it('should generate different CRC16 for different data', () => {
        const crc1 = crcService.crc16(testData);
        const crc2 = crcService.crc16(differentData);
        expect(arraysEqual(crc1, crc2)).toBe(false);
      });
    });

    describe('crc32', () => {
      it('should calculate CRC32 correctly', () => {
        const expectedCrc32 = Buffer.alloc(4);
        const crcValue = crc32(testData);
        expectedCrc32[0] = (crcValue >>> 24) & 0xff;
        expectedCrc32[1] = (crcValue >>> 16) & 0xff;
        expectedCrc32[2] = (crcValue >>> 8) & 0xff;
        expectedCrc32[3] = crcValue & 0xff;
        expect(arraysEqual(crcService.crc32(testData), expectedCrc32)).toBe(
          true,
        );
      });

      it('should verify CRC32 correctly', () => {
        const crc32 = crcService.crc32(testData);
        expect(crcService.verifyCrc32(testData, crc32)).toBe(true);
        const crcValue =
          (crc32[0] << 24) | (crc32[1] << 16) | (crc32[2] << 8) | crc32[3];
        expect(crcService.verifyCrc32(testData, crcValue)).toBe(true); // Test with number input
        const badCrc = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        expect(crcService.verifyCrc32(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc32(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should generate consistent CRC32 for the same data', () => {
        const crc1 = crcService.crc32(testData);
        const crc2 = crcService.crc32(testData);

        expect(arraysEqual(crc1, crc2)).toBe(true);
        expect(crcService.verifyCrc32(testData, crc1)).toBe(true);
      });

      it('should generate different CRC32 for different data', () => {
        const crc1 = crcService.crc32(testData);
        const crc2 = crcService.crc32(differentData);

        expect(arraysEqual(crc1, crc2)).toBe(false);
        expect(crcService.verifyCrc32(testData, crc2)).toBe(false);
      });

      it('should handle empty buffer correctly', () => {
        const emptyData = Buffer.alloc(0);
        const crc = crcService.crc32(emptyData);

        expect(crc instanceof Buffer).toBe(true);
        expect(crcService.verifyCrc32(emptyData, crc)).toBe(true);
      });
    });
  });
  describe('asynchronous CRC', () => {
    describe('crc8', () => {
      it('should generate consistent CRC8 for the same data using Buffer', async () => {
        const crc = await crcService.crc8Async(testData);
        const isValid = await crcService.verifyCrc8Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC8 for different data using Buffer', async () => {
        const crc1 = await crcService.crc8Async(testData);
        const crc2 = await crcService.crc8Async(differentData);
        expect(arraysEqual(crc1, crc2)).toBe(false);
      });

      it('should generate the same CRC8 for the same data using Stream', async () => {
        const stream1 = uint8ArrayToStream(testData);
        const stream2 = uint8ArrayToStream(testData);
        const crc = await crcService.crc8Async(stream1);
        const isValid = await crcService.verifyCrc8Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyData = Buffer.alloc(0);
        const emptyStream = uint8ArrayToStream(emptyData);

        const bufferCrc = await crcService.crc8Async(emptyData);
        const streamCrc = await crcService.crc8Async(emptyStream);

        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc8(testData);
        const asyncCrc = await crcService.crc8Async(testData);
        expect(arraysEqual(syncCrc, asyncCrc)).toBe(true);
      });
      it('should handle large data in chunks', async () => {
        const largeData = Buffer.alloc(100 * 1024); // 100KB
        largeData.fill(65); // 'A' character code

        const bufferCrc = await crcService.crc8Async(largeData);
        const streamCrc = await crcService.crc8Async(
          uint8ArrayToStream(largeData),
        );

        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc8Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });
    });
    describe('crc16', () => {
      it('should generate consistent CRC16 for the same data using Buffer', async () => {
        const crc = await crcService.crc16Async(testData);
        const isValid = await crcService.verifyCrc16Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC16 for different data using Buffer', async () => {
        const crc1 = await crcService.crc16Async(testData);
        const crc2 = await crcService.crc16Async(differentData);
        expect(arraysEqual(crc1, crc2)).toBe(false);
      });

      it('should generate the same CRC16 for the same data using Stream', async () => {
        const stream1 = uint8ArrayToStream(testData);
        const stream2 = uint8ArrayToStream(testData);
        const crc = await crcService.crc16Async(stream1);
        const isValid = await crcService.verifyCrc16Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyData = Buffer.alloc(0);
        const emptyStream = uint8ArrayToStream(emptyData);

        const bufferCrc = await crcService.crc16Async(emptyData);
        const streamCrc = await crcService.crc16Async(emptyStream);

        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should handle large data in chunks', async () => {
        const largeData = Buffer.alloc(100 * 1024); // 100KB
        largeData.fill(65); // 'A' character code

        const bufferCrc = await crcService.crc16Async(largeData);
        const streamCrc = await crcService.crc16Async(
          uint8ArrayToStream(largeData),
        );

        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc16Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc16(testData);
        const asyncCrc = await crcService.crc16Async(testData);
        expect(arraysEqual(syncCrc, asyncCrc)).toBe(true);
      });
    });
    describe('crc32', () => {
      it('should generate consistent CRC32 for the same data using Buffer', async () => {
        const crc = await crcService.crc32Async(testData);
        const isValid = await crcService.verifyCrc32Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC32 for different data using Buffer', async () => {
        const crc1 = await crcService.crc32Async(testData);
        const crc2 = await crcService.crc32Async(differentData);
        expect(arraysEqual(crc1, crc2)).toBe(false);
      });

      it('should generate the same CRC32 for the same data using Stream', async () => {
        const stream1 = uint8ArrayToStream(testData);
        const stream2 = uint8ArrayToStream(testData);
        const crc = await crcService.crc32Async(stream1);
        const isValid = await crcService.verifyCrc32Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyData = Buffer.alloc(0);
        const emptyStream = uint8ArrayToStream(emptyData);
        const bufferCrc = await crcService.crc32Async(emptyData);
        const streamCrc = await crcService.crc32Async(emptyStream);
        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should handle large data in chunks', async () => {
        const largeData = Buffer.alloc(100 * 1024); // 100KB
        largeData.fill(65); // 'A' character code

        const bufferCrc = crcService.crc32(largeData); //Sync calculation
        const streamCrc = await crcService.crc32Async(
          uint8ArrayToStream(largeData),
        );

        expect(arraysEqual(bufferCrc, streamCrc)).toBe(true);
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc32Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc32(testData);
        const asyncCrc = await crcService.crc32Async(testData);

        expect(arraysEqual(syncCrc, asyncCrc)).toBe(true);
      });
    });
  });
  describe('verify methods with number input', () => {
    it('should verify CRC8 with number input in async context', async () => {
      const crc = await crcService.crc8Async(testData);
      const numberValue = crc[0];
      expect(crcService.verifyCrc8(testData, numberValue)).toBe(true);
    });

    it('should verify CRC16 with number input in async context', async () => {
      const crc = await crcService.crc16Async(testData);
      const numberValue = (crc[0] << 8) | crc[1];
      expect(crcService.verifyCrc16(testData, numberValue)).toBe(true);
    });

    it('should verify CRC32 with number input in async context', async () => {
      const crc = await crcService.crc32Async(testData);
      const numberValue =
        (crc[0] << 24) | (crc[1] << 16) | (crc[2] << 8) | crc[3];
      expect(crcService.verifyCrc32(testData, numberValue)).toBe(true);
    });
  });

  describe('buffer size verification', () => {
    it('should produce correct buffer sizes for CRC8', async () => {
      const crc = await crcService.crc8Async(testData);
      expect(crc.length).toBe(1);
    });

    it('should produce correct buffer sizes for CRC16', async () => {
      const crc = await crcService.crc16Async(testData);
      expect(crc.length).toBe(2);
    });

    it('should produce correct buffer sizes for CRC32', async () => {
      const crc = await crcService.crc32Async(testData);
      expect(crc.length).toBe(4);
    });
  });
});
