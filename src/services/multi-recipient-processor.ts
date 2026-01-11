import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';

import {
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConstants,
  IIdProvider,
  SecureBuffer,
} from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../interfaces';
import { AuthenticatedCipher } from '../interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../interfaces/authenticated-decipher';
import type { IMember } from '../interfaces/member';
import {
  getMultiRecipientConstants,
  IMultiRecipientChunk,
  IMultiRecipientChunkHeader,
  IMultiRecipientConstants,
} from '../interfaces/multi-recipient-chunk';
import { getEnhancedNodeIdProvider } from '../typed-configuration';

import { AESGCMService } from './aes-gcm';
import { EciesCryptoCore } from './ecies/crypto-core';
import { EciesMultiRecipient } from './ecies/multi-recipient';

export interface IMultiRecipient<TID extends PlatformID = Buffer> {
  id: TID;
  publicKey: Buffer;
}

export interface IMultiEncryptedMessage<TID extends PlatformID = Buffer> {
  dataLength: number;
  recipientCount: number;
  recipientIds: TID[];
  recipientKeys: Buffer[];
  encryptedMessage: Buffer;
  headerSize: number;
  ephemeralPublicKey?: Buffer;
}

export class MultiRecipientProcessor<TID extends PlatformID = Buffer> {
  private readonly aesGcm: AESGCMService;
  private readonly cryptoCore: EciesCryptoCore;
  private readonly consts: IECIESConstants;
  private readonly eciesMultiRecipient: EciesMultiRecipient<TID>;
  private readonly constants: IMultiRecipientConstants;
  private readonly recipientIdSize: number;
  private readonly idProvider: IIdProvider<TID>;

  constructor(
    cryptoCoreOrService: EciesCryptoCore | { core?: EciesCryptoCore },
    idProvider?: IIdProvider<TID>,
    consts?: IECIESConstants,
    aesGcm?: AESGCMService,
    eciesMultiRecipient?: EciesMultiRecipient<TID>,
  ) {
    const core =
      (cryptoCoreOrService as { core?: EciesCryptoCore })?.core ??
      (cryptoCoreOrService as EciesCryptoCore);
    this.cryptoCore = core;
    this.consts = consts ?? core.consts;
    const resolvedIdProvider = idProvider ?? getEnhancedNodeIdProvider<TID>();
    this.idProvider = resolvedIdProvider;

    // Use injected dependencies or create defaults
    // Note: AESGCMService needs IConstants, but we only have IECIESConstants from core
    // We'll let it use the default getNodeRuntimeConfiguration()
    this.aesGcm = aesGcm ?? new AESGCMService();
    this.eciesMultiRecipient =
      eciesMultiRecipient ??
      new EciesMultiRecipient<TID>(core, resolvedIdProvider);
    this.recipientIdSize =
      this.consts?.MULTIPLE?.RECIPIENT_ID_SIZE ?? resolvedIdProvider.byteLength;
    this.constants = getMultiRecipientConstants(this.recipientIdSize);
  }

  /**
   * Encrypts a message for multiple recipients.
   * Wrapper around EciesMultiRecipient.encryptMultiple for backward compatibility.
   */
  public async encryptMultiple(
    recipients: IMultiRecipient<TID>[],
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Promise<IMultiEncryptedMessage<TID>> {
    // Convert IMultiRecipient to IMember-like objects
    // EciesMultiRecipient expects IMember[] which has id: Buffer and publicKey: Buffer
    // IMultiRecipient already matches this structure, so we can safely cast
    const members: IMember<TID>[] = recipients.map((r) => {
      const idBytes = Buffer.isBuffer(r.id)
        ? Buffer.from(r.id)
        : r.id instanceof Uint8Array
          ? Buffer.from(r.id)
          : this.idProvider.toBytes(r.id);

      return {
        id: r.id,
        publicKey: r.publicKey,
        idBytes,
      } as IMember<TID>;
    });

    const result = this.eciesMultiRecipient.encryptMultiple(
      members,
      message,
      preamble,
    );

    return result;
  }

  /**
   * Builds the header for a message encrypted for multiple recipients.
   * Wrapper around EciesMultiRecipient.buildECIESMultipleRecipientHeader for backward compatibility.
   */
  public buildHeader(data: IMultiEncryptedMessage<TID>): Buffer {
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
    if (chunkIndex < 0 || chunkIndex > 0xffffffff) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    // Sign-then-Encrypt
    let dataToEncrypt = data;
    if (senderPrivateKey) {
      const signature = this.cryptoCore.sign(senderPrivateKey, data);
      dataToEncrypt = Buffer.concat([signature, data]);
    }

    if (dataToEncrypt.length > this.cryptoCore.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.FileSizeTooLarge);
    }

    // Generate ONE ephemeral key pair for all recipients
    const ecdh = createECDH(this.cryptoCore.config.curveName);
    ecdh.generateKeys();
    const ephemeralPrivateKey = ecdh.getPrivateKey();
    let ephemeralPublicKey = ecdh.getPublicKey(null, 'compressed');

    // Ensure public key has 0x04 prefix
    if (
      ephemeralPublicKey.length === this.cryptoCore.consts.RAW_PUBLIC_KEY_LENGTH
    ) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([this.cryptoCore.consts.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    // Build recipient headers
    const recipientHeaders: Array<{
      id: Buffer;
      keySize: number;
      encryptedKey: Buffer;
    }> = [];
    for (const recipient of recipients) {
      // Use Recipient ID as AAD for key encryption
      const encryptedKey = this.eciesMultiRecipient.encryptKey(
        recipient.publicKey,
        symmetricKey,
        ephemeralPrivateKey,
        recipient.id,
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
      recipientHeadersSize +=
        this.recipientIdSize + this.constants.KEY_SIZE_BYTES + h.keySize;
    }

    const totalSize =
      this.constants.HEADER_SIZE +
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
    const iv = randomBytes(this.cryptoCore.consts.IV_SIZE);
    const cipher = createCipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    ) as AuthenticatedCipher;

    cipher.setAAD(headerBytes);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const encrypted = cipher.update(dataToEncrypt) as Buffer;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const final = cipher.final() as Buffer;
    const authTag = cipher.getAuthTag();

    // Write IV
    (iv as Buffer).copy(chunk, offset);
    offset += 12;

    // Write encrypted data
    (encrypted as Buffer).copy(chunk, offset);
    offset += (encrypted as Buffer).length;
    (final as Buffer).copy(chunk, offset); // Should be empty usually
    offset += (final as Buffer).length;

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
      const id = chunkData.subarray(
        tempOffset,
        tempOffset + this.recipientIdSize,
      );
      tempOffset += this.recipientIdSize;

      const keySize = chunkData.readUInt16BE(tempOffset);
      tempOffset += this.constants.KEY_SIZE_BYTES;

      const encryptedKey = chunkData.subarray(tempOffset, tempOffset + keySize);
      tempOffset += keySize;

      // Check if this is our recipient
      if (id.equals(recipientId)) {
        // Use Recipient ID as AAD for key decryption
        symmetricKey = this.eciesMultiRecipient.decryptKey(
          privateKey,
          encryptedKey,
          ephemeralPublicKey,
          id,
        );
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
    const encrypted = encryptedWithTag.subarray(
      0,
      encryptedWithTag.length - 16,
    );

    // Decrypt with AAD
    const decipher = createDecipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv,
    ) as AuthenticatedDecipher;

    decipher.setAuthTag(authTag);
    decipher.setAAD(headerBytes);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const decrypted = decipher.update(encrypted) as Buffer;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const final = decipher.final() as Buffer;
    const decryptedMessage = Buffer.concat([decrypted, final]);

    // Verify signature if sender public key provided
    let finalData = decryptedMessage;
    if (senderPublicKey) {
      if (decryptedMessage.length < 64) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
      }
      const signature = decryptedMessage.subarray(0, 64);
      const message = decryptedMessage.subarray(64);

      const isValid = this.cryptoCore.verify(
        senderPublicKey,
        message,
        signature,
      );
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
    encryptedData: IMultiEncryptedMessage<TID>,
    recipientId: TID,
    privateKey: Buffer,
    senderPublicKey?: Buffer,
  ): Promise<Buffer> {
    // Create a partial IMember with only the properties needed for decryption
    const member: Pick<IMember<TID>, 'id' | 'privateKey'> = {
      id: recipientId,
      privateKey: new SecureBuffer(privateKey),
    };

    return this.eciesMultiRecipient.decryptMultipleECIEForRecipient(
      encryptedData,
      member as IMember<TID>,
      senderPublicKey,
    );
  }

  /**
   * Parses a multi-encrypted header.
   * Wrapper around EciesMultiRecipient.parseMultiEncryptedHeader for backward compatibility.
   */
  public parseHeader(data: Buffer): Omit<
    IMultiEncryptedMessage<TID>,
    'encryptedMessage'
  > & {
    headerSize: number;
  } {
    const result = this.eciesMultiRecipient.parseMultiEncryptedHeader(data);
    return result;
  }

  /**
   * Parses a multi-encrypted buffer into its components.
   * Wrapper around EciesMultiRecipient.parseMultiEncryptedBuffer for backward compatibility.
   */
  public parseMessage(data: Buffer): IMultiEncryptedMessage<TID> {
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
    if (
      ephemeralPublicKey.length === this.cryptoCore.consts.RAW_PUBLIC_KEY_LENGTH
    ) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([this.cryptoCore.consts.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    const encryptedKey = this.eciesMultiRecipient.encryptKey(
      recipientPublicKey,
      symmetricKey,
      ephemeralPrivateKey,
      Buffer.alloc(0), // No AAD for simple key encryption? Or use recipient ID?
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
    // const pubKeyLength = this.cryptoCore.consts.PUBLIC_KEY_LENGTH; // 33

    const ephemeralPublicKey = encryptedData.subarray(0, 33);
    const encryptedKey = encryptedData.subarray(33);

    return this.eciesMultiRecipient.decryptKey(
      privateKey,
      encryptedKey,
      ephemeralPublicKey,
      Buffer.alloc(0),
    );
  }

  public getHeaderSize(recipientCount: number): number {
    return this.eciesMultiRecipient.getHeaderSize(recipientCount);
  }
}
