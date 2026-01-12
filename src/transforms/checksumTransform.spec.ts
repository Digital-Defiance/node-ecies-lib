import { sha3_512 } from 'js-sha3';
import { ChecksumTransform } from './checksumTransform';

describe('ChecksumTransform', () => {
  let checksumTransform: ChecksumTransform;
  const testData = new Uint8Array(62);
  // Fill with 'This is a test data buffer to validate checksum consistency.'
  const testString =
    'This is a test data buffer to validate checksum consistency.';
  for (let i = 0; i < testString.length; i++) {
    testData[i] = testString.charCodeAt(i);
  }
  const testBuffer = Buffer.from(testData);

  beforeEach(() => {
    checksumTransform = new ChecksumTransform();
  });

  const calculateChecksumDirectly = (data: Buffer): Buffer => {
    return Buffer.from(sha3_512.create().update(data).hex(), 'hex');
  };

  const simulateChunkProcessing = (
    checksumTransform: ChecksumTransform,
    chunks: Buffer[],
    callback: (checksum: Buffer) => void,
  ) => {
    chunks.forEach((chunk) =>
      checksumTransform._transform(chunk, 'utf8', () => {
        // do nothing
      }),
    );

    checksumTransform.on('checksum', (checksum) => {
      callback(Buffer.isBuffer(checksum) ? checksum : Buffer.from(checksum));
    });

    checksumTransform._flush(() => {
      // do nothing
    });
  };

  it('should produce the same checksum for multiple chunks as for the whole buffer', (done) => {
    const chunkSize = 10;
    const chunks: Buffer[] = [];
    for (let i = 0; i < testBuffer.length; i += chunkSize) {
      chunks.push(testBuffer.subarray(i, i + chunkSize));
    }

    const expectedChecksum = calculateChecksumDirectly(testBuffer);

    simulateChunkProcessing(checksumTransform, chunks, (checksum) => {
      expect(checksum).toEqual(expectedChecksum);
      done();
    });
  });

  it('should produce the same checksum for a single large chunk', (done) => {
    const expectedChecksum = calculateChecksumDirectly(testBuffer);

    simulateChunkProcessing(checksumTransform, [testBuffer], (checksum) => {
      expect(checksum).toEqual(expectedChecksum);
      done();
    });
  });

  it('should handle different chunk sizes consistently', (done) => {
    const chunkSizes = [5, 15, 25];
    const expectedChecksum = calculateChecksumDirectly(testBuffer);
    let index = 0;

    const processChunks = (size: number) => {
      const chunks: Buffer[] = [];
      for (let i = 0; i < testBuffer.length; i += size) {
        chunks.push(testBuffer.subarray(i, i + size));
      }

      const checksumTransform = new ChecksumTransform(); // Create a new instance for each size
      simulateChunkProcessing(checksumTransform, chunks, (checksum) => {
        expect(checksum).toEqual(expectedChecksum);

        index++;
        if (index < chunkSizes.length) {
          processChunks(chunkSizes[index]); // Process the next size
        } else {
          done(); // Finish the test when all sizes have been processed
        }
      });
    };

    processChunks(chunkSizes[index]); // Start processing with the first chunk size
  });
});
