import {
  ECIES,
  EciesEncryptionType,
  EciesEncryptionTypeEnum,
  EciesEncryptionTypeMap,
  ECIESError,
  ECIESErrorTypeEnum,
  encryptionTypeEnumToType,
  encryptionTypeToString,
  ensureEciesEncryptionTypeEnum,
  IECIESConfig,
  UINT32_MAX,
  UINT64_SIZE,
} from '@digitaldefiance/ecies-lib';
import { CoreLanguage, PluginI18nEngine } from '@digitaldefiance/i18n-lib';
import {
  createCipheriv,
  createDecipheriv,
  createECDH,
  randomBytes,
} from 'crypto';
import { getEciesPluginI18nEngine } from '../../i18n/ecies-i18n-factory';
import { AuthenticatedCipher } from '../../interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../../interfaces/authenticated-decipher';
import { ISingleEncryptedParsedHeader } from '../../interfaces/single-encrypted-parsed-header';
import { EciesCryptoCore } from './crypto-core';

export class EciesSingleRecipientCore {
  protected readonly cryptoCore: EciesCryptoCore;
  protected readonly config: IECIESConfig;
  protected readonly engine: PluginI18nEngine<CoreLanguage>;

  constructor(config: IECIESConfig, engine?: PluginI18nEngine<CoreLanguage>) {
    this.config = config;
    this.cryptoCore = new EciesCryptoCore(config);
    this.engine = engine || getEciesPluginI18nEngine();
  }

  /**
   * Get the size of the header for a given encryption type
   * @param encryptionType The encryption type (single, simple, etc.)
   * @returns
   */
  public getHeaderSize(encryptionType: EciesEncryptionType): number {
    switch (encryptionType) {
      case 'simple':
        return this.cryptoCore.consts.SIMPLE.FIXED_OVERHEAD_SIZE;
      case 'single':
        return this.cryptoCore.consts.SINGLE.FIXED_OVERHEAD_SIZE;
      default:
        throw new ECIESError(
          ECIESErrorTypeEnum.InvalidEncryptionType,
          this.engine,
        );
    }
  }

  /**
   * Encrypt a message with a public key
   * @param encryptSimple Whether to simple encrypt (without crc, length)
   * @param receiverPublicKey The public key of the receiver
   * @param message The message to encrypt
   * @param preamble Optional preamble to prepend to the encrypted message
   * @param options Optional encryption options
   * @param options.recipientCount The number of recipients for multiple encryption mode
   * @returns The encrypted message
   */
  public encrypt(
    encryptSimple: boolean,
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Buffer {
    const encryptionType: EciesEncryptionType = encryptSimple
      ? 'simple'
      : 'single';
    const encryptionTypeBuffer = Buffer.alloc(1);
    encryptionTypeBuffer.writeUint8(
      EciesEncryptionTypeMap[
        encryptionType as keyof typeof EciesEncryptionTypeMap
      ] as number,
    );
    if (message.length > this.cryptoCore.consts.MAX_RAW_DATA_SIZE) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        this.engine,
        undefined,
        undefined,
        {
          error: 'Message length exceeds maximum allowed size',
          maxLength: String(UINT32_MAX),
          messageLength: String(message.length),
        },
      );
    }
    // Generate ephemeral ECDH key pair
    const ecdh = createECDH(this.config.curveName);
    ecdh.generateKeys();

    // Compute shared secret
    let sharedSecret: Buffer;
    try {
      // Make sure we normalize the receiver's public key
      const normalizedReceiverPublicKey =
        this.cryptoCore.normalizePublicKey(receiverPublicKey);

      // Ensure we're using the properly formatted public key (with 0x04 prefix)
      // Our debugging shows only the full format with prefix works correctly
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
            this.engine,
            undefined,
            undefined,
            {
              nodeError: error.code,
            },
          );
        }
        throw new ECIESError(
          ECIESErrorTypeEnum.SecretComputationFailed,
          this.engine,
          undefined,
          undefined,
          {
            error: error.message,
          },
        );
      }
      throw new ECIESError(
        ECIESErrorTypeEnum.SecretComputationFailed,
        this.engine,
      );
    }

    // Get the ephemeral public key and ensure it has the 0x04 prefix
    let ephemeralPublicKey = ecdh.getPublicKey();
    if (ephemeralPublicKey.length === this.cryptoCore.consts.RAW_PUBLIC_KEY_LENGTH) {
      ephemeralPublicKey = Buffer.concat([
        Buffer.from([this.cryptoCore.consts.PUBLIC_KEY_MAGIC]),
        ephemeralPublicKey,
      ]);
    }

    // Generate random IV
    const iv = randomBytes(this.cryptoCore.consts.IV_SIZE);

    // Get the key from the shared secret (always use first 32 bytes)
    const symKey = sharedSecret.subarray(0, this.cryptoCore.consts.SYMMETRIC.KEY_SIZE);

    // Create cipher with the derived symmetric key
    const cipher = createCipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv,
    ) as unknown as AuthenticatedCipher;

    // Ensure auto padding is enabled
    cipher.setAutoPadding(true);

    // Encrypt the message
    let encrypted = cipher.update(message);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get and explicitly set the authentication tag to max tag length for consistency
    const authTag = cipher.getAuthTag();

    // Add a length prefix to the encrypted data to ensure we can extract the exact number of bytes during decryption
    const lengthBuffer =
      encryptionType === 'simple' ? Buffer.alloc(0) : Buffer.alloc(UINT64_SIZE);
    if (encryptionType === 'single') {
      lengthBuffer.writeBigUInt64BE(BigInt(encrypted.length));
    }

    // Format: [optional preamble] | type (1) | ephemeralPublicKey (65) | iv (16) | authTag (16) | length (8) | encryptedData
    return Buffer.concat([
      preamble,
      encryptionTypeBuffer,
      ephemeralPublicKey,
      iv,
      authTag,
      lengthBuffer,
      encrypted,
    ]);
  }

  /**
   * Parse the header from encrypted data
   * @param encryptionType The type of encryption (single, simple, etc.) or undefined if not known
   * @param data The encrypted data
   * @param preambleSize The size of the preamble, if any
   * @param options Optional parsing options
   * @param options.dataLength The expected length of the data
   * @returns The parsed header components
   */
  public parseEncryptedMessage(
    encryptionType: EciesEncryptionTypeEnum | undefined,
    data: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): { header: ISingleEncryptedParsedHeader; data: Buffer; remainder: Buffer } {
    // read the encryption type from the first byte after the preamble
    const actualEncryptionTypeEnum = ensureEciesEncryptionTypeEnum(
      data.readUInt8(preambleSize),
    );
    // if a type is provided, ensure it matches the actual type
    if (
      encryptionType !== undefined &&
      actualEncryptionTypeEnum !== encryptionType
    ) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptionType,
        this.engine,
        undefined,
        undefined,
        {
          expected: encryptionTypeToString(encryptionType),
          actual: encryptionTypeToString(actualEncryptionTypeEnum),
        },
      );
    }

    if (actualEncryptionTypeEnum === EciesEncryptionTypeEnum.Multiple) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptionType,
        this.engine,
        undefined,
        undefined,
        {
          expected: 'single or simple',
          actual: encryptionTypeToString(actualEncryptionTypeEnum),
        },
      );
    }
    const includeLengthAndCrc =
      actualEncryptionTypeEnum === EciesEncryptionTypeEnum.Single;

    // check for impossible message
    if (
      data.length <
      (includeLengthAndCrc
        ? this.cryptoCore.consts.SINGLE.FIXED_OVERHEAD_SIZE
        : this.cryptoCore.consts.SIMPLE.FIXED_OVERHEAD_SIZE)
    ) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        this.engine,
        undefined,
        undefined,
        {
          required: String(this.cryptoCore.consts.SINGLE.FIXED_OVERHEAD_SIZE),
          actual: String(data.length),
        },
      );
    }

    let offset = 0;
    const preamble = data.subarray(0, preambleSize);
    offset += preambleSize;

    // skip the already-read encryption type
    offset += 1;

    // Extract components from the header
    const ephemeralPublicKey = data.subarray(
      offset,
      offset + this.cryptoCore.consts.PUBLIC_KEY_LENGTH,
    );
    offset += this.cryptoCore.consts.PUBLIC_KEY_LENGTH;

    // Make sure we normalize the ephemeral public key
    const normalizedKey =
      this.cryptoCore.normalizePublicKey(ephemeralPublicKey);

    const iv = data.subarray(offset, offset + this.cryptoCore.consts.IV_SIZE);
    offset += this.cryptoCore.consts.IV_SIZE;

    const authTag = data.subarray(offset, offset + this.cryptoCore.consts.AUTH_TAG_SIZE);
    offset += this.cryptoCore.consts.AUTH_TAG_SIZE;

    // Extract the length prefix (4 bytes) after the header components
    const dataLengthBuffer = includeLengthAndCrc
      ? data.subarray(offset, offset + this.cryptoCore.consts.SINGLE.DATA_LENGTH_SIZE)
      : Buffer.alloc(0);
    if (includeLengthAndCrc) {
      offset += this.cryptoCore.consts.SINGLE.DATA_LENGTH_SIZE;
    }

    const dataLength = includeLengthAndCrc
      ? Number(dataLengthBuffer.readBigUInt64BE(0))
      : options?.dataLength ?? -1;

    if (
      includeLengthAndCrc &&
      options?.dataLength !== undefined &&
      dataLength !== options.dataLength
    ) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        this.engine,
        undefined,
        undefined,
        {
          error: 'Encrypted data length mismatch',
          expected: String(dataLength),
          actual: String(options.dataLength),
        },
      );
    }

    // No CRC in Single encryption (AES-GCM provides authentication)

    const encryptedData =
      dataLength > 0
        ? data.subarray(offset, offset + dataLength)
        : data.subarray(offset);
    if (includeLengthAndCrc) {
      offset += dataLength;
    }

    if (includeLengthAndCrc && encryptedData.length !== dataLength) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        this.engine,
        undefined,
        undefined,
        {
          expected: String(dataLength),
          actual: String(encryptedData.length),
        },
      );
    }

    const remainder = includeLengthAndCrc
      ? data.subarray(offset)
      : Buffer.alloc(0);

    // No CRC validation needed (AES-GCM provides authentication)

    // Validate all header components have the correct lengths
    if (normalizedKey.length !== this.cryptoCore.consts.PUBLIC_KEY_LENGTH) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
        this.engine,
        undefined,
        undefined,
        {
          error:
            'Ephemeral public key has incorrect length after normalization',
          expected: String(this.cryptoCore.consts.PUBLIC_KEY_LENGTH),
          actual: String(normalizedKey.length),
        },
      );
    }

    if (iv.length !== this.cryptoCore.consts.IV_SIZE) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidIVLength,
        this.engine,
        undefined,
        undefined,
        {
          expected: String(this.cryptoCore.consts.IV_SIZE),
          actual: String(iv.length),
        },
      );
    }

    if (authTag.length !== this.cryptoCore.consts.AUTH_TAG_SIZE) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidAuthTagLength,
        this.engine,
        undefined,
        undefined,
        {
          expected: String(this.cryptoCore.consts.AUTH_TAG_SIZE),
          actual: String(authTag.length),
        },
      );
    }

    return {
      header: {
        encryptionType: actualEncryptionTypeEnum,
        ephemeralPublicKey: normalizedKey,
        iv,
        authTag,
        dataLength,
        headerSize: includeLengthAndCrc
          ? this.cryptoCore.consts.SINGLE.FIXED_OVERHEAD_SIZE
          : this.cryptoCore.consts.SINGLE.FIXED_OVERHEAD_SIZE,
      },
      data: encryptedData,
      remainder,
    };
  }

  /**
   * Decrypts data encrypted with ECIES using a header
   * This method maintains backward compatibility with the original implementation
   * by returning just the Buffer. For detailed information, use decryptSingleWithHeaderEx
   * @param encryptionType The type of encryption (single, simple, etc.)
   * @param privateKey The private key to decrypt the data
   * @param encryptedData The data to decrypt
   * @param preambleSize The size of the preamble, if any
   * @param options Optional decryption options
   * @param options.dataLength The expected length of the data
   * @returns The decrypted data buffer
   */
  public decryptWithHeader(
    encryptionType: EciesEncryptionTypeEnum | undefined,
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): Buffer {
    const readEncryptionType = encryptedData.readUInt8(
      preambleSize,
    ) as EciesEncryptionTypeEnum;
    const actualEncryptionTypeEnum =
      ensureEciesEncryptionTypeEnum(readEncryptionType);
    if (
      encryptionType !== undefined &&
      actualEncryptionTypeEnum !== encryptionType
    ) {
      const expectedType = encryptionTypeEnumToType(encryptionType);
      const actualEncryptionType = encryptionTypeEnumToType(
        actualEncryptionTypeEnum,
      );
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptionType,
        this.engine,
        undefined,
        undefined,
        {
          expected: expectedType,
          actual: actualEncryptionType,
        },
      );
    }
    try {
      // Call the extended version and return only the decrypted buffer for backward compatibility
      const result = this.decryptWithHeaderEx(
        actualEncryptionTypeEnum,
        privateKey,
        encryptedData,
        preambleSize,
        options,
      );
      return result.decrypted;
    } catch (error) {
      if (error instanceof ECIESError) {
        throw error;
      }
      throw new ECIESError(
        ECIESErrorTypeEnum.DecryptionFailed,
        this.engine,
        undefined,
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Extended version of decryptSingleWithHeader that provides more detailed information
   * @param encryptionType The type of encryption (single, simple, etc.)
   * @param privateKey The private key to decrypt the data
   * @param encryptedData The data to decrypt
   * @param preambleSize The size of the preamble, if any
   * @param options Optional decryption options
   * @param options.dataLength The expected length of the data
   * @returns The decrypted data and the number of bytes consumed from the input buffer
   */
  public decryptWithHeaderEx(
    encryptionType: EciesEncryptionTypeEnum | undefined,
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): { decrypted: Buffer; consumedBytes: number } {
    try {
      const { data, header } = this.parseEncryptedMessage(
        encryptionType,
        encryptedData,
        preambleSize,
        options,
      );

      // Normalize the public key (ensuring 0x04 prefix)
      const normalizedKey = this.cryptoCore.normalizePublicKey(
        header.ephemeralPublicKey,
      );

      // Decrypt using components with the normalized key
      const decrypted = this.decryptWithComponents(
        privateKey,
        normalizedKey,
        header.iv,
        header.authTag,
        data,
      );

      return {
        decrypted,
        consumedBytes: header.dataLength + header.headerSize,
      };
    } catch (error) {
      if (error instanceof ECIESError) {
        throw error;
      }
      throw new ECIESError(
        ECIESErrorTypeEnum.DecryptionFailed,
        this.engine,
        undefined,
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Decrypts data encrypted with ECIES using components
   * @param privateKey The private key to decrypt the data
   * @param ephemeralPublicKey The ephemeral public key used to encrypt the data
   * @param iv The initialization vector used to encrypt the data
   * @param authTag The authentication tag used to encrypt the data
   * @param encrypted The encrypted data
   * @returns The decrypted data
   */
  public decryptWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
  ): Buffer {
    try {
      // Ensure the ephemeral public key has the correct format
      const normalizedEphemeralKey =
        this.cryptoCore.normalizePublicKey(ephemeralPublicKey);

      // Set up ECDH with the private key
      const ecdh = createECDH(this.config.curveName);
      ecdh.setPrivateKey(privateKey);

      // Based on our ECDH test, we need to consistently use the full key with 0x04 prefix
      // Our debugging showed the raw keys without prefix always fail
      let sharedSecret: Buffer;
      try {
        sharedSecret = ecdh.computeSecret(normalizedEphemeralKey);
      } catch (err) {
        console.error('[ERROR][decrypt] Failed to compute shared secret:', err);
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
          this.engine,
          undefined,
          undefined,
          {
            originalError: err instanceof Error ? err.message : String(err),
            stage: 'shared_secret_computation',
          },
        );
      }

      // Get the key from the shared secret (always use first 32 bytes)
      const symKey = sharedSecret.subarray(0, this.cryptoCore.consts.SYMMETRIC.KEY_SIZE);

      // Create decipher with shared secret-derived key
      const decipher = createDecipheriv(
        this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
        symKey,
        iv,
      ) as unknown as AuthenticatedDecipher;

      // Validate the tag and IV
      if (authTag.length !== this.cryptoCore.consts.AUTH_TAG_SIZE) {
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
          this.engine,
          undefined,
          undefined,
          {
            expected: String(this.cryptoCore.consts.AUTH_TAG_SIZE),
            actual: String(authTag.length),
            stage: 'auth_tag_validation',
          },
        );
      }

      if (iv.length !== this.cryptoCore.consts.IV_SIZE) {
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
          this.engine,
          undefined,
          undefined,
          {
            expected: String(this.cryptoCore.consts.IV_SIZE),
            actual: String(iv.length),
            stage: 'iv_validation',
          },
        );
      }

      // Set the authentication tag for GCM mode
      decipher.setAuthTag(authTag);

      // Decrypt the data
      try {
        // Handle edge case where encrypted data might be empty or malformed
        if (encrypted.length === 0) {
          throw new Error('Encrypted data is empty');
        }

        const firstPart = decipher.update(encrypted);
        const finalPart = decipher.final();
        const result = Buffer.concat([firstPart, finalPart]);

        return result;
      } catch (err) {
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
          this.engine,
          undefined,
          undefined,
          {
            error: err instanceof Error ? err.message : String(err),
            stage: 'decipher_operation',
          },
        );
      }
    } catch (error) {
      if (error instanceof ECIESError) {
        throw error;
      }

      // Wrap non-EciesError in an EciesError
      throw new ECIESError(
        ECIESErrorTypeEnum.DecryptionFailed,
        this.engine,
        undefined,
        undefined,
        {
          error: error instanceof Error ? error.message : String(error),
          privateKeyLength: String(privateKey.length),
          ephemeralPublicKeyLength: String(ephemeralPublicKey.length),
          ivLength: String(iv.length),
          authTagLength: String(authTag.length),
          encryptedLength: String(encrypted.length),
        },
      );
    }
  }
}
