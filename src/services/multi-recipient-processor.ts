import { ECIESError, ECIESErrorTypeEnum, IECIESConstants } from '@digitaldefiance/ecies-lib';
import { Constants } from '../constants';
import { IMultiRecipientChunk, IMultiRecipientChunkHeader, getMultiRecipientConstants, IMultiRecipientConstants } from '../interfaces/multi-recipient-chunk';
import { AESGCMService } from './aes-gcm';
import { EciesCryptoCore } from './ecies/crypto-core';
import { EciesMultiRecipient } from './ecies/multi-recipient';
import { randomBytes, createECDH, createCipheriv, createDecipheriv } from 'crypto';
import { AuthenticatedCipher } from '../interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../interfaces/authenticated-decipher';
import { Member } from '../member';

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
  ephemeralPublicKey?: Buffer;
}

export class MultiRecipientProcessor {
  private readonly aesGcm: AESGCMService;
  private readonly cryptoCore: EciesCryptoCore;
  private readonly consts: IECIESConstants;
  private readonly eciesMultiRecipient: EciesMultiRecipient;
  private readonly constants: IMultiRecipientConstants;
  private readonly recipientIdSize: number;

  constructor(cryptoCore: EciesCryptoCore, consts: IECIESConstants = Constants.ECIES) {
    this.cryptoCore = cryptoCore;
    this.consts = consts;
    this.aesGcm = new AESGCMService();
    this.eciesMultiRecipient = new EciesMultiRecipient(cryptoCore);
    this.recipientIdSize = consts.MULTIPLE.RECIPIENT_ID_SIZE;
    this.constants = getMultiRecipientConstants(this.recipientIdSize);
  }

  /**
   * Encrypts a message for multiple recipients.
   * Wrapper around EciesMultiRecipient.encryptMultiple for backward compatibility.
   */
  public async encryptMultiple(
    recipients: IMultiRecipient[],
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Promise<IMultiEncryptedMessage> {
    // Convert IMultiRecipient to Member-like objects
    // EciesMultiRecipient expects Member[] which has id: Buffer and publicKey: Buffer
    // IMultiRecipient already matches this structure
    const members = recipients as unknown as Member[];

    const result = this.eciesMultiRecipient.encryptMultiple(members, message, preamble);
    
    return result;
  }

  /**
   * Builds the header for a message encrypted for multiple recipients.
   * Wrapper around EciesMultiRecipient.buildECIESMultipleRecipientHeader for backward compatibility.
   */
  public buildHeader(data: IMultiEncryptedMessage): Buffer {
    return this.eciesMultiRecipient.buildECIESMultipleRecipientHeader(data);
  }

  public async encryptChunk(
    data: Buffer,
    recipients: IMultiRecipient[],
    chunkIndex: number,
    isLast: boolean,
    symmetricKey: Buffer,
    senderPrivateKey?: Buffer,
  ): Promise<IMultiRecipientChunk> {
    if (chunkIndex < 0 || chunkIndex > 0xFFFFFFFF) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    // Sign-then-Encrypt
    let dataToEncrypt = data;
    if (senderPrivateKey) {
      const signature = this.cryptoCore.sign(senderPrivateKey, data);
      dataToEncrypt = Buffer.concat([signature, data]);
    }

    if (dataToEncrypt.length > this.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.FileSizeTooLarge);
    }

    // Generate ONE ephemeral key pair for all recipients
    const ecdh = createECDH(this.cryptoCore.config.curveName);
    ecdh.generateKeys();
    const ephemeralPrivateKey = ecdh.getPrivateKey();
    let ephemeralPublicKey = ecdh.getPublicKey(null, 'compressed');
    
    // Ensure public key has 0x04 prefix
    if (ephemeralPublicKey.length === this.cryptoCore.consts.RAW_PUBLIC_KEY_LENGTH) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([this.cryptoCore.consts.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    // Build recipient headers
    const recipientHeaders: Array<{ id: Buffer; keySize: number; encryptedKey: Buffer }> = [];
    for (const recipient of recipients) {
      // Use Recipient ID as AAD for key encryption
      const encryptedKey = this.eciesMultiRecipient.encryptKey(
        recipient.publicKey,
        symmetricKey,
        ephemeralPrivateKey,
        recipient.id
      );
      
      recipientHeaders.push({
        id: recipient.id,
        keySize: encryptedKey.length,
        encryptedKey,
      });
    }

    // Calculate encrypted size (Data + Tag)
    // AES-GCM tag is 16 bytes
    const encryptedSize = dataToEncrypt.length + 16;

    // Calculate total size
    let recipientHeadersSize = 0;
    for (const h of recipientHeaders) {
      recipientHeadersSize += this.recipientIdSize + this.constants.KEY_SIZE_BYTES + h.keySize;
    }

    const totalSize = this.constants.HEADER_SIZE + 
                     recipientHeadersSize + 
                     12 + // IV
                     encryptedSize;

    // Build chunk buffer
    const chunk = Buffer.alloc(totalSize);
    let offset = 0;

    // Write header
    chunk.writeUInt32BE(this.constants.MAGIC, offset);
    offset += 4;
    chunk.writeUInt16BE(this.constants.VERSION, offset);
    offset += 2;
    chunk.writeUInt16BE(recipients.length, offset);
    offset += 2;
    chunk.writeUInt32BE(chunkIndex, offset);
    offset += 4;
    chunk.writeUInt32BE(dataToEncrypt.length, offset); // Original Size
    offset += 4;
    chunk.writeUInt32BE(encryptedSize, offset);
    offset += 4;
    chunk.writeUInt8(isLast ? this.constants.FLAG_IS_LAST : 0, offset);
    offset += 1;

    // Write Ephemeral Public Key (33 bytes)
    ephemeralPublicKey.copy(chunk, offset);
    offset += 33;

    // Padding to HEADER_SIZE (64 bytes)
    offset = this.constants.HEADER_SIZE;

    // Write recipient headers
    for (const header of recipientHeaders) {
      header.id.copy(chunk, offset);
      offset += this.recipientIdSize;
      chunk.writeUInt16BE(header.keySize, offset);
      offset += this.constants.KEY_SIZE_BYTES;
      header.encryptedKey.copy(chunk, offset);
      offset += header.keySize;
    }

    // Extract the full header (including recipient headers) to use as AAD
    const headerBytes = chunk.subarray(0, offset);

    // Encrypt data with AES-256-GCM using Header as AAD
    const iv = randomBytes(this.consts.IV_SIZE);
    const cipher = createCipheriv(
      this.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    ) as unknown as AuthenticatedCipher;

    cipher.setAAD(headerBytes);

    const encrypted = cipher.update(dataToEncrypt);
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    // Write IV
    iv.copy(chunk, offset);
    offset += 12;

    // Write encrypted data
    encrypted.copy(chunk, offset);
    offset += encrypted.length;
    final.copy(chunk, offset); // Should be empty usually
    offset += final.length;

    // Write auth tag
    authTag.copy(chunk, offset);

    const header: IMultiRecipientChunkHeader = {
      chunkIndex,
      flags: isLast ? 1 : 0,
      recipientCount: recipients.length,
      magic: this.constants.MAGIC,
      version: this.constants.VERSION,
      originalSize: dataToEncrypt.length,
      encryptedSize,
    };

    return {
      header,
      data: chunk,
    };
  }

  public async decryptChunk(
    chunkData: Buffer,
    recipientId: Buffer,
    privateKey: Buffer,
    senderPublicKey?: Buffer,
  ): Promise<{ data: Buffer; header: IMultiRecipientChunkHeader }> {
    if (chunkData.length < this.constants.HEADER_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    let offset = 0;

    // Parse header
    const magic = chunkData.readUInt32BE(offset);
    offset += 4;
    if (magic !== this.constants.MAGIC) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength); // Invalid Magic
    }

    const version = chunkData.readUInt16BE(offset);
    offset += 2;
    if (version !== this.constants.VERSION) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidVersion);
    }

    const recipientCount = chunkData.readUInt16BE(offset);
    offset += 2;
    
    const chunkIndex = chunkData.readUInt32BE(offset);
    offset += 4;
    const originalSize = chunkData.readUInt32BE(offset);
    offset += 4;
    const encryptedSize = chunkData.readUInt32BE(offset);
    offset += 4;
    const flags = chunkData.readUInt8(offset);
    offset += 1;

    // Read Ephemeral Public Key (33 bytes)
    const ephemeralPublicKey = chunkData.subarray(offset, offset + 33);
    offset += 33;

    offset = this.constants.HEADER_SIZE;

    // Find recipient header and decrypt symmetric key
    let symmetricKey: Buffer | null = null;
    let tempOffset = offset;
    
    for (let i = 0; i < recipientCount; i++) {
      const id = chunkData.subarray(tempOffset, tempOffset + this.recipientIdSize);
      tempOffset += this.recipientIdSize;
      
      const keySize = chunkData.readUInt16BE(tempOffset);
      tempOffset += this.constants.KEY_SIZE_BYTES;
      
      const encryptedKey = chunkData.subarray(tempOffset, tempOffset + keySize);
      tempOffset += keySize;

      // Check if this is our recipient
      if (id.equals(recipientId)) {
        // Use Recipient ID as AAD for key decryption
        symmetricKey = this.eciesMultiRecipient.decryptKey(privateKey, encryptedKey, ephemeralPublicKey, id);
      }
    }

    if (!symmetricKey) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientNotFound);
    }
    
    // Update offset to after all recipient headers
    offset = tempOffset;

    // Extract header bytes for AAD
    const headerBytes = chunkData.subarray(0, offset);

    // Read IV
    const iv = chunkData.subarray(offset, offset + 12);
    offset += 12;

    // Read encrypted data (includes tag)
    const encryptedWithTag = chunkData.subarray(offset, offset + encryptedSize);
    offset += encryptedSize;

    // Extract tag from end of encrypted data
    const authTag = encryptedWithTag.subarray(encryptedWithTag.length - 16);
    const encrypted = encryptedWithTag.subarray(0, encryptedWithTag.length - 16);

    // Decrypt with AAD
    const decipher = createDecipheriv(
      this.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    ) as unknown as AuthenticatedDecipher;
    
    decipher.setAuthTag(authTag);
    decipher.setAAD(headerBytes);

    const decrypted = decipher.update(encrypted);
    const final = decipher.final();
    const decryptedMessage = Buffer.concat([decrypted, final]);

    // Verify signature if sender public key provided
    let finalData = decryptedMessage;
    if (senderPublicKey) {
      if (decryptedMessage.length < 64) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
      }
      const signature = decryptedMessage.subarray(0, 64);
      const message = decryptedMessage.subarray(64);
      
      const isValid = this.cryptoCore.verify(senderPublicKey, message, signature);
      if (!isValid) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
      }
      finalData = message;
    }

    return {
      data: finalData,
      header: {
        chunkIndex,
        flags,
        recipientCount,
        magic,
        version,
        originalSize,
        encryptedSize,
      },
    };
  }

  /**
   * Decrypts a message encrypted with multiple ECIE for a recipient.
   * Wrapper around EciesMultiRecipient.decryptMultipleECIEForRecipient for backward compatibility.
   */
  public async decryptMultipleForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipientId: Buffer,
    privateKey: Buffer,
    senderPublicKey?: Buffer,
  ): Promise<Buffer> {
    // Create a mock Member
    const member = {
      id: recipientId,
      privateKey: { value: privateKey }
    } as unknown as Member;

    return this.eciesMultiRecipient.decryptMultipleECIEForRecipient(
      encryptedData,
      member,
      senderPublicKey
    );
  }

  /**
   * Parses a multi-encrypted header.
   * Wrapper around EciesMultiRecipient.parseMultiEncryptedHeader for backward compatibility.
   */
  public parseHeader(data: Buffer): Omit<IMultiEncryptedMessage, 'encryptedMessage'> & { headerSize: number } {
    const result = this.eciesMultiRecipient.parseMultiEncryptedHeader(data);
    return result;
  }

  /**
   * Parses a multi-encrypted buffer into its components.
   * Wrapper around EciesMultiRecipient.parseMultiEncryptedBuffer for backward compatibility.
   */
  public parseMessage(data: Buffer): IMultiEncryptedMessage {
    const result = this.eciesMultiRecipient.parseMultiEncryptedBuffer(data);
    return result;
  }

  /**
   * Encrypts a symmetric key for a recipient.
   * Generates a new ephemeral key pair.
   * Returns [EphemeralPublicKey][EncryptedKey]
   */
  public async encryptKey(
    recipientPublicKey: Buffer,
    symmetricKey: Buffer,
  ): Promise<Buffer> {
    // Generate ephemeral key pair
    const ecdh = createECDH(this.cryptoCore.config.curveName);
    ecdh.generateKeys();
    const ephemeralPrivateKey = ecdh.getPrivateKey();
    let ephemeralPublicKey = ecdh.getPublicKey(null, 'compressed');

    // Ensure public key has 0x04 prefix
    if (ephemeralPublicKey.length === this.cryptoCore.consts.RAW_PUBLIC_KEY_LENGTH) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([this.cryptoCore.consts.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    const encryptedKey = this.eciesMultiRecipient.encryptKey(
      recipientPublicKey,
      symmetricKey,
      ephemeralPrivateKey,
      Buffer.alloc(0) // No AAD for simple key encryption? Or use recipient ID?
    );

    return Buffer.concat([ephemeralPublicKey, encryptedKey]);
  }

  /**
   * Decrypts a symmetric key.
   * Expects [EphemeralPublicKey][EncryptedKey]
   */
  public async decryptKey(
    privateKey: Buffer,
    encryptedData: Buffer,
  ): Promise<Buffer> {
    // Extract ephemeral public key
    const pubKeyLength = this.cryptoCore.consts.PUBLIC_KEY_LENGTH; // 33
    
    const ephemeralPublicKey = encryptedData.subarray(0, 33); 
    const encryptedKey = encryptedData.subarray(33);

    return this.eciesMultiRecipient.decryptKey(
      privateKey,
      encryptedKey,
      ephemeralPublicKey,
      Buffer.alloc(0)
    );
  }

  public getHeaderSize(recipientCount: number): number {
    return this.eciesMultiRecipient.getHeaderSize(recipientCount);
  }
}
