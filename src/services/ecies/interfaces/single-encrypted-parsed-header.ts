import { EciesEncryptionTypeEnum } from '@digitaldefiance/ecies-lib';

export interface ISingleEncryptedParsedHeader {
  preamble?: Buffer;
  encryptionType: EciesEncryptionTypeEnum;
  ephemeralPublicKey: Buffer;
  iv: Buffer;
  authTag: Buffer;
  dataLength: number;
  headerSize: number;
}
