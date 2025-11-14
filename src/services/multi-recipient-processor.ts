import { ECIESError, ECIESErrorTypeEnum, IECIESConstants, Constants } from '@digitaldefiance/ecies-lib';
import { IMultiRecipientChunk, IMultiRecipientChunkHeader } from '../interfaces/multi-recipient-chunk';
import { AESGCMService } from './aes-gcm';
import { EciesCryptoCore } from './ecies/crypto-core';
import { randomBytes } from 'crypto';

export interface IMultiRecipient {
  id: Buffer;
  publicKey: Buffer;
}

export interface IMultiEncryptedMessage {
  dataLength: number;
  recipientCount: number;
  recipientIds: Buffer[];
  recipientKeys: Buffer[];
  encryptedMessage: Buffer;
  headerSize: number;
}

export class MultiRecipientProcessor {
  private readonly aesGcm: AESGCMService;
  private readonly cryptoCore: EciesCryptoCore;
  private readonly consts: IECIESConstants;

  constructor(cryptoCore: EciesCryptoCore, consts: IECIESConstants = Constants.ECIES) {
    this.cryptoCore = cryptoCore;
    this.consts = consts;
    this.aesGcm = new AESGCMService();
  }

  public getHeaderSize(recipientCount: number): number {
    return (
      this.consts.MULTIPLE.DATA_LENGTH_SIZE +
      this.consts.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * this.consts.MULTIPLE.RECIPIENT_ID_SIZE +
      recipientCount * this.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
    );
  }

  public async encryptKey(
    receiverPublicKey: Buffer,
    messageSymmetricKey: Buffer,
  ): Promise<Buffer> {
    const ephemeralKeyPair = await this.cryptoCore.generateEphemeralKeyPair();
    const sharedSecret = await this.cryptoCore.computeSharedSecret(
      ephemeralKeyPair.privateKey,
      receiverPublicKey,
    );

    const symKey = sharedSecret.subarray(0, this.consts.SYMMETRIC.KEY_SIZE);
    const { encrypted, iv, tag } = this.aesGcm.encrypt(messageSymmetricKey, symKey, true);

    if (!tag) {
      throw new ECIESError(ECIESErrorTypeEnum.AuthenticationTagIsRequiredForKeyEncryption);
    }

    return Buffer.concat([
      Buffer.from(ephemeralKeyPair.publicKey),
      iv,
      tag,
      encrypted,
    ]);
  }

  public async decryptKey(
    privateKey: Buffer,
    encryptedKey: Buffer,
  ): Promise<Buffer> {
    if (encryptedKey.length !== this.consts.MULTIPLE.ENCRYPTED_KEY_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptedKeyLength);
    }

    const ephemeralPublicKey = encryptedKey.subarray(0, this.consts.PUBLIC_KEY_LENGTH);
    const iv = encryptedKey.subarray(
      this.consts.PUBLIC_KEY_LENGTH,
      this.consts.PUBLIC_KEY_LENGTH + this.consts.IV_SIZE,
    );
    const authTag = encryptedKey.subarray(
      this.consts.PUBLIC_KEY_LENGTH + this.consts.IV_SIZE,
      this.consts.PUBLIC_KEY_LENGTH + this.consts.IV_SIZE + this.consts.AUTH_TAG_SIZE,
    );
    const encrypted = encryptedKey.subarray(
      this.consts.PUBLIC_KEY_LENGTH + this.consts.IV_SIZE + this.consts.AUTH_TAG_SIZE,
    );

    const sharedSecret = await this.cryptoCore.computeSharedSecret(
      privateKey,
      ephemeralPublicKey,
    );
    const symKey = sharedSecret.subarray(0, this.consts.SYMMETRIC.KEY_SIZE);

    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    try {
      const decrypted = this.aesGcm.decrypt(iv, encryptedWithTag, symKey, true);
      if (decrypted.length !== this.consts.SYMMETRIC.KEY_SIZE) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
      }
      return decrypted;
    } catch (error) {
      if (error instanceof ECIESError) {
        throw error;
      }
      throw new ECIESError(ECIESErrorTypeEnum.FailedToDecryptKey, { cause: error instanceof Error ? error : undefined });
    }
  }

  public async encryptMultiple(
    recipients: IMultiRecipient[],
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Promise<IMultiEncryptedMessage> {
    if (recipients.length > this.consts.MULTIPLE.MAX_RECIPIENTS) {
      throw new ECIESError(ECIESErrorTypeEnum.TooManyRecipients);
    }

    if (message.length > this.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.MessageTooLarge);
    }

    const symmetricKey = randomBytes(this.consts.SYMMETRIC.KEY_SIZE);
    const { encrypted, iv, tag } = this.aesGcm.encrypt(message, symmetricKey, true);

    if (!tag) {
      throw new ECIESError(ECIESErrorTypeEnum.AuthenticationTagIsRequiredForMultiRecipientECIESEncryption);
    }

    const storedMessage = Buffer.concat([iv, tag, encrypted]);

    const recipientIds: Buffer[] = [];
    const recipientKeys: Buffer[] = [];

    for (const recipient of recipients) {
      const encryptedKey = await this.encryptKey(recipient.publicKey, symmetricKey);
      recipientIds.push(recipient.id);
      recipientKeys.push(encryptedKey);
    }

    const headerSize = this.getHeaderSize(recipients.length);

    return {
      dataLength: message.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage: storedMessage,
      headerSize,
    };
  }

  public async decryptMultipleForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipientId: Buffer,
    privateKey: Buffer,
    preambleSize: number = 0,
  ): Promise<Buffer> {
    const recipientIndex = encryptedData.recipientIds.findIndex((id) =>
      id.equals(recipientId),
    );

    if (recipientIndex === -1) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientNotFound);
    }

    const encryptedKey = encryptedData.recipientKeys[recipientIndex];
    const symmetricKey = await this.decryptKey(privateKey, encryptedKey);

    let offset = preambleSize;
    const iv = encryptedData.encryptedMessage.subarray(
      offset,
      offset + this.consts.IV_SIZE,
    );
    offset += this.consts.IV_SIZE;

    const authTag = encryptedData.encryptedMessage.subarray(
      offset,
      offset + this.consts.AUTH_TAG_SIZE,
    );
    offset += this.consts.AUTH_TAG_SIZE;

    const encrypted = encryptedData.encryptedMessage.subarray(offset);
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    const decrypted = this.aesGcm.decrypt(iv, encryptedWithTag, symmetricKey, true);

    if (decrypted.length !== encryptedData.dataLength) {
      throw new ECIESError(ECIESErrorTypeEnum.DecryptedDataLengthMismatch);
    }

    return decrypted;
  }

  public buildHeader(data: IMultiEncryptedMessage): Buffer {
    if (data.recipientIds.length !== data.recipientKeys.length) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientCountMismatch);
    }

    if (data.dataLength < 0 || data.dataLength > this.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    const dataLengthBuffer = Buffer.alloc(8);
    dataLengthBuffer.writeBigUInt64BE(BigInt(data.dataLength));

    const recipientCountBuffer = Buffer.alloc(2);
    recipientCountBuffer.writeUInt16BE(data.recipientIds.length);

    const recipientIdsBuffer = Buffer.concat(data.recipientIds);
    const encryptedKeysBuffer = Buffer.concat(data.recipientKeys);

    return Buffer.concat([
      dataLengthBuffer,
      recipientCountBuffer,
      recipientIdsBuffer,
      encryptedKeysBuffer,
    ]);
  }

  public parseHeader(data: Buffer): Omit<IMultiEncryptedMessage, 'encryptedMessage'> & { headerSize: number } {
    if (data.length < 10) {
      throw new ECIESError(ECIESErrorTypeEnum.DataTooShortForMultiRecipientHeader);
    }

    let offset = 0;
    const dataLength = Number(data.readBigUInt64BE(offset));
    offset += 8;

    if (dataLength <= 0 || dataLength > this.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    const recipientCount = data.readUInt16BE(offset);
    offset += 2;

    if (recipientCount <= 0 || recipientCount > this.consts.MULTIPLE.MAX_RECIPIENTS) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidRecipientCount);
    }

    const recipientIds: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(data.subarray(offset, offset + this.consts.MULTIPLE.RECIPIENT_ID_SIZE));
      offset += this.consts.MULTIPLE.RECIPIENT_ID_SIZE;
    }

    const recipientKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientKeys.push(data.subarray(offset, offset + this.consts.MULTIPLE.ENCRYPTED_KEY_SIZE));
      offset += this.consts.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }

    return {
      dataLength,
      recipientCount,
      recipientIds,
      recipientKeys,
      headerSize: offset,
    };
  }

  public parseMessage(data: Buffer): IMultiEncryptedMessage {
    const header = this.parseHeader(data);
    const encryptedMessage = data.subarray(header.headerSize);

    return {
      ...header,
      encryptedMessage,
    };
  }

  public async encryptChunk(
    data: Buffer,
    recipients: IMultiRecipient[],
    chunkIndex: number,
    isLast: boolean,
    symmetricKey: Buffer,
  ): Promise<IMultiRecipientChunk> {
    if (chunkIndex < 0 || chunkIndex > 0xFFFFFFFF) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    if (data.length > this.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.FileSizeTooLarge);
    }

    const { encrypted, iv, tag } = this.aesGcm.encrypt(data, symmetricKey, true);
    
    if (!tag) {
      throw new ECIESError(ECIESErrorTypeEnum.AuthenticationTagIsRequiredForMultiRecipientECIESEncryption);
    }

    const header: IMultiRecipientChunkHeader = {
      chunkIndex,
      flags: isLast ? 1 : 0,
      recipientCount: recipients.length,
    };

    return {
      header,
      data: Buffer.concat([iv, tag, encrypted]),
    };
  }

  public async decryptChunk(
    chunkData: Buffer,
    recipientId: Buffer,
    privateKey: Buffer,
    encryptedKeys?: Buffer[],
    recipientIds?: Buffer[],
  ): Promise<{ data: Buffer; header: IMultiRecipientChunkHeader }> {
    // If encryptedKeys and recipientIds not provided, parse from chunk
    if (!encryptedKeys || !recipientIds) {
      const parsed = this.parseMessage(chunkData);
      encryptedKeys = parsed.recipientKeys;
      recipientIds = parsed.recipientIds;
      chunkData = parsed.encryptedMessage;
    }

    const recipientIndex = recipientIds.findIndex((id) => id.equals(recipientId));

    if (recipientIndex === -1) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientNotFound);
    }

    const encryptedKey = encryptedKeys[recipientIndex];
    const symmetricKey = await this.decryptKey(privateKey, encryptedKey);

    let offset = 0;
    const iv = chunkData.subarray(offset, offset + this.consts.IV_SIZE);
    offset += this.consts.IV_SIZE;

    const authTag = chunkData.subarray(offset, offset + this.consts.AUTH_TAG_SIZE);
    offset += this.consts.AUTH_TAG_SIZE;

    const encrypted = chunkData.subarray(offset);
    const encryptedWithTag = Buffer.concat([encrypted, authTag]);

    const decrypted = this.aesGcm.decrypt(iv, encryptedWithTag, symmetricKey, true);
    
    return {
      data: decrypted,
      header: { chunkIndex: 0, flags: 0, recipientCount: recipientIds.length },
    };
  }
}
