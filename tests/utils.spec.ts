import { LengthEncodingType } from '@digitaldefiance/ecies-lib';

import { decodeLengthEncodedData, lengthEncodeData } from '../src/utils';

describe('utils', () => {
  describe('lengthEncodeData', () => {
    it('should encode UInt8 length', () => {
      const data = Buffer.from('test');
      const encoded = lengthEncodeData(data);
      expect(encoded[0]).toBe(LengthEncodingType.UInt8);
      expect(encoded[1]).toBe(4);
    });

    it('should encode UInt16 length', () => {
      const data = Buffer.alloc(300);
      const encoded = lengthEncodeData(data);
      expect(encoded[0]).toBe(LengthEncodingType.UInt16);
    });

    it('should encode UInt32 length', () => {
      const data = Buffer.alloc(70000);
      const encoded = lengthEncodeData(data);
      expect(encoded[0]).toBe(LengthEncodingType.UInt32);
    });

    it('should encode UInt64 length', () => {
      const data = Buffer.alloc(5000000000);
      const encoded = lengthEncodeData(data);
      expect(encoded[0]).toBe(LengthEncodingType.UInt64);
    });
  });

  describe('decodeLengthEncodedData', () => {
    it('should throw on empty buffer', () => {
      expect(() => decodeLengthEncodedData(Buffer.alloc(0))).toThrow(
        RangeError,
      );
    });

    it('should throw on buffer too short for length type', () => {
      const buffer = Buffer.from([LengthEncodingType.UInt16]);
      expect(() => decodeLengthEncodedData(buffer)).toThrow(RangeError);
    });

    it('should throw on buffer too short for declared data length', () => {
      const buffer = Buffer.from([LengthEncodingType.UInt8, 10, 1, 2]);
      expect(() => decodeLengthEncodedData(buffer)).toThrow(RangeError);
    });

    it('should throw on UInt64 exceeding MAX_SAFE_INTEGER', () => {
      const buffer = Buffer.alloc(10);
      buffer.writeUInt8(LengthEncodingType.UInt64, 0);
      buffer.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1), 1);
      expect(() => decodeLengthEncodedData(buffer)).toThrow(RangeError);
    });

    it('should decode UInt8 length', () => {
      const original = Buffer.from('test');
      const encoded = lengthEncodeData(original);
      const { data, totalLength } = decodeLengthEncodedData(encoded);
      expect(data.toString()).toBe('test');
      expect(totalLength).toBe(encoded.length);
    });

    it('should decode UInt16 length', () => {
      const original = Buffer.alloc(300);
      const encoded = lengthEncodeData(original);
      const { data, totalLength } = decodeLengthEncodedData(encoded);
      expect(data.length).toBe(300);
      expect(totalLength).toBe(encoded.length);
    });

    it('should decode UInt32 length', () => {
      const original = Buffer.alloc(70000);
      const encoded = lengthEncodeData(original);
      const { data, totalLength } = decodeLengthEncodedData(encoded);
      expect(data.length).toBe(70000);
      expect(totalLength).toBe(encoded.length);
    });
  });
});
