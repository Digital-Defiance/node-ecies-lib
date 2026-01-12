import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { XorTransform } from './xorTransform';

describe('XorTransform', () => {
  const xorChunksManually = (chunks: Uint8Array[]): Uint8Array => {
    const xorResult = new Uint8Array(chunks[0].length);
    chunks.forEach((chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        xorResult[i] ^= chunk[i];
      }
    });
    return xorResult;
  };

  const simulateChunkProcessing = (
    xorTransform: XorTransform,
    chunks: Uint8Array[],
    callback: (result: Uint8Array) => void,
  ) => {
    chunks.forEach((chunk) =>
      xorTransform._transform(Buffer.from(chunk), 'utf8', () => {
        // do nothing
      }),
    );

    xorTransform.on('data', (result) => {
      callback(new Uint8Array(result));
    });

    xorTransform._flush(() => {
      // do nothing
    });
  };

  it('should apply XOR correctly for multiple chunks', (done) => {
    const xorTransform = new XorTransform(); // Create a new instance
    const chunks = [
      new Uint8Array([0x01, 0x02, 0x03]),
      new Uint8Array([0x04, 0x05, 0x06]),
      new Uint8Array([0x07, 0x08, 0x09]),
    ];
    const expectedXorResult = xorChunksManually(chunks);

    simulateChunkProcessing(xorTransform, chunks, (result) => {
      expect(arraysEqual(result, expectedXorResult)).toBe(true);
      done();
    });
  });

  it('should handle single chunk correctly', (done) => {
    const xorTransform = new XorTransform();
    const chunk = new Uint8Array([0x01, 0x02, 0x03]);
    simulateChunkProcessing(xorTransform, [chunk], (result) => {
      expect(arraysEqual(result, chunk)).toBe(true);
      done();
    });
  });

  it('should handle different chunk sizes consistently', (done) => {
    const chunks = [
      new Uint8Array([0x01, 0x02]),
      new Uint8Array([0x04, 0x05, 0x06]),
      new Uint8Array([0x07]),
    ];
    const expectedXorResult = xorChunksManually(chunks);
    const xorTransform = new XorTransform();
    simulateChunkProcessing(xorTransform, chunks, (result) => {
      expect(
        arraysEqual(
          result.subarray(0, expectedXorResult.length),
          expectedXorResult,
        ),
      ).toBe(true);
      done();
    });
  });
});
