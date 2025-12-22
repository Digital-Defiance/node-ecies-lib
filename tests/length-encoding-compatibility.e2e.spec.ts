import {
  arraysEqual,
  decodeLengthEncodedData as frontendDecodeLengthEncodedData,
  lengthEncodeData as frontendLengthEncodeData,
  stringToUint8Array,
} from '@digitaldefiance/ecies-lib';
import { randomBytes } from 'crypto';

import {
  decodeLengthEncodedData as backendDecodeLengthEncodedData,
  lengthEncodeData as backendLengthEncodeData,
} from '../src/utils';

describe('Length Encoding Compatibility', () => {
  const testData = [
    new Uint8Array([1, 2, 3]), // UInt8 length
    randomBytes(300) as Uint8Array, // UInt16 length
    randomBytes(70000) as Uint8Array, // UInt32 length
    stringToUint8Array('Hello World'),
    stringToUint8Array(''),
  ];

  describe('Frontend to Backend', () => {
    testData.forEach((data, index) => {
      it(`should encode/decode data ${index} (length: ${data.length})`, () => {
        const frontendEncoded = frontendLengthEncodeData(data);
        const backendBuffer = Buffer.from(frontendEncoded);
        const { data: backendDecoded } =
          backendDecodeLengthEncodedData(backendBuffer);
        const result = new Uint8Array(backendDecoded);

        expect(arraysEqual(data, result)).toBe(true);
      });
    });
  });

  describe('Backend to Frontend', () => {
    testData.forEach((data, index) => {
      it(`should encode/decode data ${index} (length: ${data.length})`, () => {
        const backendBuffer = Buffer.from(data);
        const backendEncoded = backendLengthEncodeData(backendBuffer);
        const frontendUint8Array = new Uint8Array(backendEncoded);
        const { data: frontendDecoded } =
          frontendDecodeLengthEncodedData(frontendUint8Array);

        expect(arraysEqual(data, frontendDecoded)).toBe(true);
      });
    });
  });

  describe('Round Trip Compatibility', () => {
    testData.forEach((data, index) => {
      it(`should maintain data integrity through frontend->backend->frontend ${index}`, () => {
        const frontendEncoded = frontendLengthEncodeData(data);
        const backendBuffer = Buffer.from(frontendEncoded);
        const { data: backendDecoded } =
          backendDecodeLengthEncodedData(backendBuffer);
        const backendReEncoded = backendLengthEncodeData(backendDecoded);
        const { data: frontendFinal } = frontendDecodeLengthEncodedData(
          new Uint8Array(backendReEncoded),
        );

        expect(arraysEqual(data, frontendFinal)).toBe(true);
      });

      it(`should maintain data integrity through backend->frontend->backend ${index}`, () => {
        const backendBuffer = Buffer.from(data);
        const backendEncoded = backendLengthEncodeData(backendBuffer);
        const { data: frontendDecoded } = frontendDecodeLengthEncodedData(
          new Uint8Array(backendEncoded),
        );
        const frontendReEncoded = frontendLengthEncodeData(frontendDecoded);
        const { data: backendFinal } = backendDecodeLengthEncodedData(
          Buffer.from(frontendReEncoded),
        );

        expect(arraysEqual(data, new Uint8Array(backendFinal))).toBe(true);
      });
    });
  });
});
