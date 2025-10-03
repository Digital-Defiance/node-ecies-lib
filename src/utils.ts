import {
  EciesStringKey,
  getEciesI18nEngine,
  getLengthEncodingTypeForLength,
  getLengthEncodingTypeFromValue,
  getLengthForLengthType,
  LengthEncodingType,
  TranslatableError,
} from '@digitaldefiance/ecies-lib';

/**
 * Encodes the length of the data in the buffer
 * @param buffer The buffer to encode
 * @returns The encoded buffer
 */
export function lengthEncodeData(buffer: Buffer): Buffer {
  const lengthType: LengthEncodingType = getLengthEncodingTypeForLength(
    buffer.length,
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);
  const result: Buffer = Buffer.alloc(1 + lengthTypeSize + buffer.length);
  result.writeUInt8(lengthType, 0);
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      result.writeUInt8(buffer.length, 1);
      break;
    case LengthEncodingType.UInt16:
      result.writeUInt16BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt32:
      result.writeUInt32BE(buffer.length, 1);
      break;
    case LengthEncodingType.UInt64:
      result.writeBigUInt64BE(BigInt(buffer.length), 1);
      break;
  }
  buffer.copy(result, 1 + lengthTypeSize);
  return result;
}

export function decodeLengthEncodedData(buffer: Buffer): {
  data: Buffer;
  totalLength: number;
} {
  if (buffer.length < 1) {
    throw new RangeError('Buffer is too short to read length type.');
  }
  const lengthType: LengthEncodingType = getLengthEncodingTypeFromValue(
    buffer.readUint8(0),
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);

  if (buffer.length < 1 + lengthTypeSize) {
    throw new RangeError('Buffer is too short to read the full length value.');
  }

  let length: number | BigInt;
  switch (lengthType) {
    case LengthEncodingType.UInt8:
      length = buffer.readUint8(1);
      break;
    case LengthEncodingType.UInt16:
      length = buffer.readUint16BE(1);
      break;
    case LengthEncodingType.UInt32:
      length = buffer.readUint32BE(1);
      break;
    case LengthEncodingType.UInt64:
      length = buffer.readBigUInt64BE(1);
      if (Number(length) > Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Length exceeds maximum safe integer value');
      }
      break;
    default:
      throw new TranslatableError(EciesStringKey.Error_LengthError_LengthIsInvalidType, getEciesI18nEngine());
  }

  const totalLength = 1 + lengthTypeSize + Number(length);
  if (totalLength > buffer.length) {
    throw new RangeError('Buffer is too short for declared data length');
  }
  return {
    data: buffer.subarray(1 + lengthTypeSize, totalLength),
    totalLength,
  };
}
