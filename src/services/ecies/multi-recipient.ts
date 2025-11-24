import {
  Constants as AppConstants,
  EciesCipherSuiteEnum,
  EciesEncryptionTypeEnum,
  ECIESError,
  ECIESErrorTypeEnum,
  EciesVersionEnum,
} from '@digitaldefiance/ecies-lib';
import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { AuthenticatedCipher } from '../../interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../../interfaces/authenticated-decipher';
import type { IMember } from '../../interfaces/member';
import { IMultiEncryptedMessage } from '../../interfaces/multi-encrypted-message';
import { IMultiEncryptedParsedHeader } from '../../interfaces/multi-encrypted-parsed-header';
import { EciesCryptoCore } from './crypto-core';
import { EciesSingleRecipientCore } from './single-recipient';

/**
 * Multiple recipient encryption/decryption functions for ECIES
 */
export class EciesMultiRecipient {
  protected readonly cryptoCore: EciesCryptoCore;
  protected readonly singleRecipientCore: EciesSingleRecipientCore;

  constructor(cryptoCore: EciesCryptoCore) {
    this.cryptoCore = cryptoCore;
    this.singleRecipientCore = new EciesSingleRecipientCore(cryptoCore.config);
  }

  /**
   * Get the size of the header for a given encryption type
   * @param recipientCount The number of recipients
   * @returns
   */
  public getHeaderSize(recipientCount: number): number {
    return (
      this.cryptoCore.consts.VERSION_SIZE +
      this.cryptoCore.consts.CIPHER_SUITE_SIZE +
      this.cryptoCore.consts.ENCRYPTION_TYPE_SIZE +
      this.cryptoCore.consts.PUBLIC_KEY_LENGTH + // Shared ephemeral public key
      this.cryptoCore.consts.MULTIPLE.DATA_LENGTH_SIZE +
      this.cryptoCore.consts.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE +
      recipientCount * this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
    );
  }

  /**
   * Encrypt a message symmetric key with a public key
   * @param receiverPublicKey The public key of the receiver
   * @param messageSymmetricKey The message to encrypt
   * @param ephemeralPrivateKey The ephemeral private key to use for encryption
   * @param aad Additional Authenticated Data (optional)
   * @returns The encrypted message
   */
  public encryptKey(
    receiverPublicKey: Buffer,
    messageSymmetricKey: Buffer,
    ephemeralPrivateKey: Buffer,
    aad?: Buffer
  ): Buffer {
    // Compute shared secret
    let sharedSecret: Buffer;
    try {
      // Make sure we normalize the receiver's public key
      const normalizedReceiverPublicKey =
        this.cryptoCore.normalizePublicKey(receiverPublicKey);

      // Create ECDH instance with the ephemeral private key
      const ecdh = createECDH(this.cryptoCore.config.curveName);
      ecdh.setPrivateKey(ephemeralPrivateKey);

      // Ensure we're using the properly formatted public key (with 0x04 prefix)
      sharedSecret = ecdh.computeSecret(normalizedReceiverPublicKey);
    } catch (error: unknown) {
      console.error('[ERROR][encrypt] Failed to compute shared secret:', error);
      if (error instanceof Error) {
        if (
          'code' in error &&
          error.code === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
        ) {
          throw new ECIESError(
            ECIESErrorTypeEnum.InvalidRecipientPublicKey,
            undefined,
            undefined,
            {
              nodeError: error.code,
            }
          );
        }
        throw new ECIESError(
          ECIESErrorTypeEnum.SecretComputationFailed,
          undefined,
          undefined,
          {
            error: error.message,
          }
        );
      }
      throw new ECIESError(ECIESErrorTypeEnum.SecretComputationFailed);
    }

    // Use HKDF to derive the key
    const symKey = this.cryptoCore.deriveSharedKey(
      sharedSecret,
      Buffer.alloc(0), // No salt
      Buffer.from('ecies-v2-key-derivation'), // Info
      this.cryptoCore.consts.SYMMETRIC.KEY_SIZE
    );

    const iv = randomBytes(this.cryptoCore.consts.IV_SIZE);

    // Create cipher with the derived symmetric key
    const cipher = createCipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv
    ) as AuthenticatedCipher;

    // Ensure auto padding is enabled
    cipher.setAutoPadding(true);

    // Set AAD if provided
    if (aad) {
      cipher.setAAD(aad);
    }

    // Encrypt the message
    let encrypted = cipher.update(messageSymmetricKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get and explicitly set the authentication tag to max tag length for consistency
    const authTag = cipher.getAuthTag();

    // Format: iv (16) | authTag (16) | encryptedData (32)
    // Note: Ephemeral public key is now in the main header, not per-recipient
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypts symmetric key encrypted with ECIES using a header
   * @param privateKey The private key to decrypt the data
   * @param encryptedKey The data to decrypt
   * @param ephemeralPublicKey The ephemeral public key from the header
   * @param aad Additional Authenticated Data (optional)
   * @returns The decrypted data buffer
   */
  public decryptKey(
    privateKey: Buffer,
    encryptedKey: Buffer,
    ephemeralPublicKey: Buffer,
    aad?: Buffer
  ): Buffer {
    if (
      encryptedKey.length !== this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
    ) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedKeyLength,
        undefined,
        undefined,
        {
          expected: String(this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE),
          actual: String(encryptedKey.length),
        }
      );
    }

    const iv = encryptedKey.subarray(0, this.cryptoCore.consts.IV_SIZE);
    const authTag = encryptedKey.subarray(
      this.cryptoCore.consts.IV_SIZE,
      this.cryptoCore.consts.IV_SIZE + this.cryptoCore.consts.AUTH_TAG_SIZE
    );
    const encrypted = encryptedKey.subarray(
      this.cryptoCore.consts.IV_SIZE + this.cryptoCore.consts.AUTH_TAG_SIZE
    );

    // Normalize the public key (ensuring 0x04 prefix)
    const normalizedKey =
      this.cryptoCore.normalizePublicKey(ephemeralPublicKey);

    // Compute shared secret
    const ecdh = createECDH(this.cryptoCore.config.curveName);
    ecdh.setPrivateKey(privateKey);
    const sharedSecret = ecdh.computeSecret(normalizedKey);

    // Use HKDF to derive the key
    const symKey = this.cryptoCore.deriveSharedKey(
      sharedSecret,
      Buffer.alloc(0), // No salt
      Buffer.from('ecies-v2-key-derivation'), // Info
      this.cryptoCore.consts.SYMMETRIC.KEY_SIZE
    );

    // Decrypt
    const decipher = createDecipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv
    ) as AuthenticatedDecipher;

    decipher.setAuthTag(authTag);
    if (aad) {
      decipher.setAAD(aad);
    }

    const decrypted = decipher.update(encrypted);
    const final = decipher.final();
    const decryptedMessage = Buffer.concat([decrypted, final]);

    if (decryptedMessage.length !== this.cryptoCore.consts.SYMMETRIC.KEY_SIZE) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        undefined,
        undefined,
        {
          expected: String(this.cryptoCore.consts.SYMMETRIC.KEY_SIZE),
          actual: String(decryptedMessage.length),
        }
      );
    }
    return decryptedMessage;
  }

  /**
   * Encrypts a message for multiple recipients.
   * @param recipients The recipients to encrypt the message for.
   * @param message The message to encrypt.
   * @param preamble Optional preamble to include in the encrypted message.
   * @param senderPrivateKey Optional sender private key for signing.
   * @returns The encrypted message.
   * @throws EciesError if the number of recipients is greater than 65535.
   */
  public encryptMultiple(
    recipients: IMember[],
    message: Buffer,
    preamble?: Buffer,
    senderPrivateKey?: Buffer
  ): IMultiEncryptedMessage {
    if (recipients.length > AppConstants.UINT16_MAX) {
      throw new ECIESError(ECIESErrorTypeEnum.TooManyRecipients);
    }

    // Sign-then-Encrypt: If sender key provided, sign the message and prepend signature
    let messageToEncrypt = message;
    if (senderPrivateKey) {
      const signature = this.cryptoCore.sign(senderPrivateKey, message);
      messageToEncrypt = Buffer.concat([signature, message]);
    }

    if (messageToEncrypt.length > this.cryptoCore.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(ECIESErrorTypeEnum.FileSizeTooLarge);
    }

    const messageTypeBuffer = Buffer.alloc(1);
    messageTypeBuffer.writeUint8(EciesEncryptionTypeEnum.Multiple as number);

    // Generate a random symmetric key
    const symmetricKey = randomBytes(this.cryptoCore.consts.SYMMETRIC.KEY_SIZE);

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

    const encryptionResults = recipients.map((member) => ({
      id: member.id,
      encryptedKey: this.encryptKey(
        member.publicKey,
        symmetricKey,
        ephemeralPrivateKey,
        member.id as Buffer // Use Recipient ID as AAD
      ),
    }));

    const recipientIds = encryptionResults.map(({ id }) => id as Buffer);
    const recipientKeys = encryptionResults.map(
      ({ encryptedKey }) => encryptedKey
    );

    // Calculate header size
    const headerSize = this.calculateECIESMultipleRecipientOverhead(
      recipients.length,
      false,
      recipientKeys
    );

    // Build the header to use as AAD for message encryption
    // We need to construct a temporary object to build the header
    const tempHeaderData: IMultiEncryptedMessage = {
      dataLength: messageToEncrypt.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage: Buffer.alloc(0), // Placeholder
      headerSize,
      ephemeralPublicKey,
    };

    const headerBytes = this.buildECIESMultipleRecipientHeader(tempHeaderData);

    // Encrypt the message with the symmetric key and Header as AAD
    const iv = randomBytes(this.cryptoCore.consts.IV_SIZE);
    const cipher = createCipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv
    ) as AuthenticatedCipher;

    cipher.setAAD(headerBytes);

    const encrypted = cipher.update(messageToEncrypt);
    const final = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptedMessage = Buffer.concat([encrypted, final]);

    const storedMessage = Buffer.concat([
      preamble ?? Buffer.alloc(0),
      iv,
      authTag,
      encryptedMessage,
    ]);

    // Verify the encrypted message size (just the encrypted content)
    if (encryptedMessage.length !== messageToEncrypt.length) {
      throw new ECIESError(ECIESErrorTypeEnum.MessageLengthMismatch);
    }

    return {
      dataLength: messageToEncrypt.length,
      recipientCount: recipients.length,
      recipientIds,
      recipientKeys,
      encryptedMessage: storedMessage,
      headerSize,
      ephemeralPublicKey,
    };
  }

  /**
   * Decrypts a message encrypted with multiple ECIE for a recipient.
   * @param encryptedData The encrypted data.
   * @param recipient The recipient.
   * @param senderPublicKey Optional sender public key for verification.
   * @returns The decrypted message.
   */
  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipient: IMember,
    senderPublicKey?: Buffer
  ): Buffer {
    if (recipient.privateKey === undefined) {
      throw new ECIESError(ECIESErrorTypeEnum.PrivateKeyNotLoaded);
    }

    // Find this recipient's encrypted key
    const recipientIndex: number = encryptedData.recipientIds.findIndex(
      (id: Buffer): boolean => id.equals(recipient.id as Buffer)
    );
    if (recipientIndex === -1) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientNotFound);
    }

    const encryptedKey = encryptedData.recipientKeys[recipientIndex];

    if (!encryptedData.ephemeralPublicKey) {
      throw new ECIESError(ECIESErrorTypeEnum.MissingEphemeralPublicKey);
    }

    // Decrypt the symmetric key using the detected encryption type
    const symmetricKey = this.decryptKey(
      Buffer.from(recipient.privateKey.value),
      encryptedKey,
      encryptedData.ephemeralPublicKey,
      recipient.id as Buffer // Use Recipient ID as AAD
    );

    // Rebuild header to use as AAD
    const headerBytes = this.buildECIESMultipleRecipientHeader(encryptedData);

    // Extract the IV and auth tag from the encrypted message
    const iv = encryptedData.encryptedMessage.subarray(
      0,
      this.cryptoCore.consts.IV_SIZE
    );
    const authTag = encryptedData.encryptedMessage.subarray(
      this.cryptoCore.consts.IV_SIZE,
      this.cryptoCore.consts.IV_SIZE + this.cryptoCore.consts.AUTH_TAG_SIZE
    );

    // Extract the encrypted content (no CRC, AES-GCM provides authentication)
    const encrypted = encryptedData.encryptedMessage.subarray(
      this.cryptoCore.consts.IV_SIZE + this.cryptoCore.consts.AUTH_TAG_SIZE
    );

    // Decrypt the content with the symmetric key
    const decipher = createDecipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKey,
      iv
    ) as AuthenticatedDecipher;

    decipher.setAuthTag(authTag);
    decipher.setAAD(headerBytes);

    const decrypted = decipher.update(encrypted);
    const final = decipher.final();
    const decryptedMessage = Buffer.concat([decrypted, final]);

    // The decrypted message should match the original data length
    if (decryptedMessage.length !== encryptedData.dataLength) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    // If sender public key is provided, verify signature
    if (senderPublicKey) {
      // Expect [Signature (64)][Message]
      if (decryptedMessage.length < 64) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
      }
      const signature = decryptedMessage.subarray(0, 64);
      const message = decryptedMessage.subarray(64);

      const isValid = this.cryptoCore.verify(
        senderPublicKey,
        message,
        signature
      );
      if (!isValid) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidSignature);
      }

      return message;
    }

    return decryptedMessage;
  }

  /**
   * Calculate the overhead for a message encrypted for multiple recipients
   * @param recipientCount number of recipients
   * @param includeMessageOverhead whether to include the overhead for the encrypted message
   * @param encryptedKeys optional array of encrypted keys to calculate actual size
   * @returns the overhead size in bytes
   */
  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
    encryptedKeys?: Buffer[]
  ): number {
    if (recipientCount < 1) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidRecipientCount);
    }

    // Calculate encrypted keys size
    let encryptedKeysSize: number;
    if (encryptedKeys) {
      encryptedKeysSize = encryptedKeys.reduce(
        (total, key) => total + key.length,
        0
      );
    } else {
      // Default assumption: all keys use Simple encryption type (more efficient)
      encryptedKeysSize =
        recipientCount * this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }

    const baseOverhead =
      this.cryptoCore.consts.VERSION_SIZE +
      this.cryptoCore.consts.CIPHER_SUITE_SIZE +
      this.cryptoCore.consts.ENCRYPTION_TYPE_SIZE +
      this.cryptoCore.consts.MULTIPLE.DATA_LENGTH_SIZE +
      this.cryptoCore.consts.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE + // recipient ids (dynamic based on ID provider)
      encryptedKeysSize; // actual encrypted keys size

    return includeMessageOverhead
      ? baseOverhead + this.cryptoCore.consts.MULTIPLE.FIXED_OVERHEAD_SIZE
      : baseOverhead;
  }

  /**
   * Builds the header for a message encrypted for multiple recipients
   * @param data The encrypted message data including recipients and encrypted keys
   * @returns The header buffer for the message
   * @throws EciesError if the number of recipients is greater than the maximum allowed
   * @throws EciesError if the number of encrypted keys does not match the number of recipients
   */
  public buildECIESMultipleRecipientHeader(
    data: IMultiEncryptedMessage
  ): Buffer {
    if (
      data.recipientIds.length > this.cryptoCore.consts.MULTIPLE.MAX_RECIPIENTS
    ) {
      throw new ECIESError(ECIESErrorTypeEnum.TooManyRecipients);
    } else if (data.recipientIds.length !== data.recipientKeys.length) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientKeyCountMismatch);
    } else if (
      data.dataLength < 0 ||
      data.dataLength > this.cryptoCore.consts.MAX_RAW_DATA_SIZE
    ) {
      throw new ECIESError(ECIESErrorTypeEnum.FileSizeTooLarge);
    }

    if (!data.ephemeralPublicKey) {
      throw new ECIESError(ECIESErrorTypeEnum.MissingEphemeralPublicKey);
    }

    // Create version buffer
    const versionBuffer = Buffer.alloc(this.cryptoCore.consts.VERSION_SIZE);
    versionBuffer.writeUInt8(EciesVersionEnum.V1);

    // Create cipher suite buffer
    const cipherSuiteBuffer = Buffer.alloc(
      this.cryptoCore.consts.CIPHER_SUITE_SIZE
    );
    cipherSuiteBuffer.writeUInt8(
      EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256
    );

    // Create encryption type buffer
    const encryptionTypeBuffer = Buffer.alloc(
      this.cryptoCore.consts.ENCRYPTION_TYPE_SIZE
    );
    encryptionTypeBuffer.writeUInt8(EciesEncryptionTypeEnum.Multiple as number);

    // Create data length buffer
    // We use the most significant byte (MSB) to store the recipient ID size
    const recipientIdSize = this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE;
    if (recipientIdSize > 255) {
      throw new ECIESError(ECIESErrorTypeEnum.RecipientIdSizeTooLarge);
    }

    const dataLengthBigInt = BigInt(data.dataLength);
    const recipientIdSizeBigInt = BigInt(recipientIdSize);
    const combinedLength = (recipientIdSizeBigInt << 56n) | dataLengthBigInt;

    const dataLengthBuffer = Buffer.alloc(
      this.cryptoCore.consts.MULTIPLE.DATA_LENGTH_SIZE
    );
    dataLengthBuffer.writeBigUInt64BE(combinedLength);

    // Create recipient count buffer
    const recipientCountBuffer = Buffer.alloc(
      this.cryptoCore.consts.MULTIPLE.RECIPIENT_COUNT_SIZE
    );
    recipientCountBuffer.writeUInt16BE(data.recipientIds.length);

    // Create recipients buffer
    const recipientsBuffer = Buffer.alloc(
      data.recipientIds.length *
        this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE
    );
    data.recipientIds.forEach((recipientId: Buffer, index: number) => {
      recipientsBuffer.set(
        recipientId,
        index * this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE
      );
    });

    // Validate encrypted key lengths based on their encryption type
    data.recipientKeys.forEach((encryptedKey: Buffer) => {
      if (encryptedKey.length === 0) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptedKeyLength);
      }

      if (
        encryptedKey.length !==
        this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
      ) {
        throw new ECIESError(
          ECIESErrorTypeEnum.InvalidEncryptedKeyLength,
          undefined,
          undefined,
          {
            expected: String(
              this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
            ),
            actual: String(encryptedKey.length),
          }
        );
      }
    });

    // Create encrypted keys buffer with variable-length keys
    const encryptedKeysBuffer = Buffer.concat(data.recipientKeys);

    // Combine all buffers to form the header
    return Buffer.concat([
      versionBuffer,
      cipherSuiteBuffer,
      encryptionTypeBuffer,
      data.ephemeralPublicKey,
      dataLengthBuffer,
      recipientCountBuffer,
      recipientsBuffer,
      encryptedKeysBuffer,
    ]);
  }

  /**
   * Parses a multi-encrypted header.
   * @param data - The data to parse.
   * @returns The parsed header.
   */
  public parseMultiEncryptedHeader(data: Buffer): IMultiEncryptedParsedHeader {
    // Ensure there's enough data to read headers
    // minimum: 1 (ver) + 1 (suite) + 1 (type) + 33 (pubkey) + 8 (len) + 2 (count) = 46
    if (data.length < 46) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    let offset = 0;

    // Read Version
    const version = data.readUInt8(offset);
    offset += this.cryptoCore.consts.VERSION_SIZE;
    if (version !== EciesVersionEnum.V1) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidVersion,
        undefined,
        undefined,
        { version: String(version) }
      );
    }

    // Read CipherSuite
    const cipherSuite = data.readUInt8(offset);
    offset += this.cryptoCore.consts.CIPHER_SUITE_SIZE;
    if (cipherSuite !== EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidCipherSuite,
        undefined,
        undefined,
        { cipherSuite: String(cipherSuite) }
      );
    }

    // Read Encryption Type
    const encryptionType = data.readUInt8(offset);
    offset += this.cryptoCore.consts.ENCRYPTION_TYPE_SIZE;
    if (encryptionType !== EciesEncryptionTypeEnum.Multiple) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptionType,
        undefined,
        undefined,
        { encryptionType: encryptionType.toString(16) }
      );
    }

    // Read Ephemeral Public Key
    const ephemeralPublicKey = data.subarray(
      offset,
      offset + this.cryptoCore.consts.PUBLIC_KEY_LENGTH
    );
    offset += this.cryptoCore.consts.PUBLIC_KEY_LENGTH;

    // Read data length and recipient ID size
    const combinedLength = data.readBigUInt64BE(offset);
    offset += this.cryptoCore.consts.MULTIPLE.DATA_LENGTH_SIZE; // 8 bytes

    // Extract recipient ID size from MSB (top 8 bits)
    const storedRecipientIdSize = Number(combinedLength >> 56n);

    // Extract data length from lower 56 bits
    const dataLength = Number(combinedLength & 0x00ffffffffffffffn);

    if (
      dataLength <= 0 ||
      dataLength > this.cryptoCore.consts.MAX_RAW_DATA_SIZE
    ) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    // Use stored recipient ID size if available (non-legacy), otherwise fallback to config
    const recipientIdSize =
      storedRecipientIdSize > 0
        ? storedRecipientIdSize
        : this.cryptoCore.consts.MULTIPLE.RECIPIENT_ID_SIZE;

    // Read recipient count
    const recipientCount = data.readUInt16BE(offset);
    if (
      recipientCount <= 0 ||
      recipientCount > this.cryptoCore.consts.MULTIPLE.MAX_RECIPIENTS
    ) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidRecipientCount);
    }
    offset += this.cryptoCore.consts.MULTIPLE.RECIPIENT_COUNT_SIZE; // 2 bytes

    // Ensure there's enough data for all recipients
    // Note: We can't use calculateECIESMultipleRecipientOverhead here easily because it assumes fixed ID size
    // But we can calculate manually
    const remainingHeaderSize =
      recipientCount * recipientIdSize +
      recipientCount * this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE;

    if (data.length < offset + remainingHeaderSize) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }

    // Read recipient IDs
    const recipientIds: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      recipientIds.push(data.subarray(offset, offset + recipientIdSize));
      offset += recipientIdSize;
    }

    // Read encrypted keys with variable lengths based on encryption type
    const recipientKeys: Buffer[] = [];
    for (let i = 0; i < recipientCount; i++) {
      if (offset >= data.length) {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
      }

      if (
        offset + this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE >
        data.length
      ) {
        throw new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          undefined,
          undefined,
          {
            required: String(
              this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
            ),
            available: String(data.length - offset),
          }
        );
      }

      recipientKeys.push(
        data.subarray(
          offset,
          offset + this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE
        )
      );
      offset += this.cryptoCore.consts.MULTIPLE.ENCRYPTED_KEY_SIZE;
    }

    return {
      dataLength,
      recipientCount,
      recipientIds,
      recipientKeys,
      headerSize: offset,
      ephemeralPublicKey,
    };
  }

  /**
   * Parses a multi-encrypted buffer into its components.
   * @param data - The multi-encrypted buffer to parse.
   * @returns The parsed multi-encrypted buffer.
   */
  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage {
    const header = this.parseMultiEncryptedHeader(data);
    const encryptedMessage = data.subarray(header.headerSize);

    return {
      ...header,
      encryptedMessage,
    };
  }
}
