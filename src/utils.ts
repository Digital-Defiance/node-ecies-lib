import {
  getLengthEncodingTypeForLength,
  getLengthEncodingTypeFromValue,
  getLengthForLengthType,
  LengthEncodingType,
} from '@digitaldefiance/ecies-lib';
import {
  getEciesPluginI18nEngine,
  getNodeEciesTranslation,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from './i18n/ecies-i18n-factory';

/**
 * Custom error class for length encoding errors
 */
class LengthEncodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LengthEncodingError';
  }
}

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
  const pluginEngine = getEciesPluginI18nEngine();
  if (buffer.length < 1) {
    throw new RangeError(
      pluginEngine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_BufferIsTooShort,
      ),
    );
  }
  const lengthType: LengthEncodingType = getLengthEncodingTypeFromValue(
    buffer.readUint8(0),
  );
  const lengthTypeSize: number = getLengthForLengthType(lengthType);

  if (buffer.length < 1 + lengthTypeSize) {
    throw new RangeError(
      pluginEngine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_BufferIsTooShortToReadFullLengthValue,
      ),
    );
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
        throw new RangeError(
          pluginEngine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_LengthExceedsMaximumSafeInteger,
          ),
        );
      }
      break;
    default:
      throw new LengthEncodingError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_LengthError_LengthIsInvalidType,
        ),
      );
  }

  const totalLength = 1 + lengthTypeSize + Number(length);
  if (totalLength > buffer.length) {
    throw new RangeError(
      pluginEngine.translate(
        NodeEciesComponentId,
        NodeEciesStringKey.Error_BufferIsTooShortForDeclaredDataLength,
      ),
    );
  }
  return {
    data: buffer.subarray(1 + lengthTypeSize, totalLength),
    totalLength,
  };
}
