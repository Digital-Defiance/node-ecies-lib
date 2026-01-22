/**
 * Service implementation for single-recipient.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import {
  EciesCipherSuiteEnum,
  EciesEncryptionType,
  EciesEncryptionTypeEnum,
  EciesEncryptionTypeMap,
  ECIESError,
  ECIESErrorTypeEnum,
  EciesStringKey,
  EciesVersionEnum,
  encryptionTypeToString,
  ensureEciesEncryptionTypeEnum,
  IECIESConfig,
  TranslatableEciesError,
  UINT32_MAX,
  UINT64_SIZE,
} from '@digitaldefiance/ecies-lib';

import {
  getEciesPluginI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../../i18n/ecies-i18n-factory';
import { AuthenticatedCipher } from '../../interfaces/authenticated-cipher';
import { AuthenticatedDecipher } from '../../interfaces/authenticated-decipher';
import { ISingleEncryptedParsedHeader } from '../../interfaces/single-encrypted-parsed-header';

import { EciesCryptoCore } from './crypto-core';

export class EciesSingleRecipientCore {
  protected readonly cryptoCore: EciesCryptoCore;
  protected readonly config: IECIESConfig;

  constructor(config: IECIESConfig) {
    this.config = config;
    this.cryptoCore = new EciesCryptoCore(config);
  }

  /**
   * Get the size of the header for a given encryption type
   * @param encryptionType The encryption type (basic, withLength, etc.)
   * @returns
   */
  public getHeaderSize(encryptionType: EciesEncryptionType): number {
    switch (encryptionType) {
      case 'basic':
        return this.cryptoCore.consts.BASIC.FIXED_OVERHEAD_SIZE;
      case 'withLength':
        return this.cryptoCore.consts.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      default:
        throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptionType);
    }
  }

  /**
   * Encrypt a message with a public key
   * @param encryptionMode Encryption mode (without crc, length)
   * @param receiverPublicKey The public key of the receiver
   * @param message The message to encrypt
   * @param preamble Optional preamble to prepend to the encrypted message
   * @param options Optional encryption options
   * @param options.recipientCount The number of recipients for multiple encryption mode
   * @returns The encrypted message
   */
  public encrypt(
    encryptionMode: EciesEncryptionTypeEnum,
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Buffer {
    if (encryptionMode === EciesEncryptionTypeEnum.Multiple) {
      throw new TranslatableEciesError(
        EciesStringKey.Error_ECIESError_InvalidEncryptionType,
      );
    }
    // Security fix 4: Message size validation
    if (message.length === 0) {
      throw new ECIESError(ECIESErrorTypeEnum.CannotEncryptEmptyData);
    }
    if (message.length > 0x7fffffff) {
      throw new ECIESError(ECIESErrorTypeEnum.MessageTooLarge);
    }

    const encryptionType: EciesEncryptionType =
      encryptionMode === EciesEncryptionTypeEnum.Basic ? 'basic' : 'withLength';
    const encryptionTypeBuffer = Buffer.alloc(1);
    encryptionTypeBuffer.writeUint8(
      EciesEncryptionTypeMap[
        encryptionType as keyof typeof EciesEncryptionTypeMap
      ] as number,
    );

    const versionBuffer = Buffer.alloc(1);
    versionBuffer.writeUint8(EciesVersionEnum.V1);

    const cipherSuiteBuffer = Buffer.alloc(1);
    cipherSuiteBuffer.writeUint8(
      EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
    );

    if (message.length > this.cryptoCore.consts.MAX_RAW_DATA_SIZE) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        undefined,
        undefined,
        {
          error: pluginEngine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_MessageLengthExceedsMaximumAllowedSize,
          ),
          maxLength: String(UINT32_MAX),
          messageLength: String(message.length),
        },
      );
    }
    // Generate ephemeral ECDH key pair
    // Use cryptoCore to generate keys to ensure compatibility with computeSharedSecret
    const ephemeralPrivateKey = this.cryptoCore.generatePrivateKey();
    const ephemeralPublicKey =
      this.cryptoCore.getPublicKey(ephemeralPrivateKey);

    // Compute shared secret
    let sharedSecret: Buffer;
    try {
      // Make sure we normalize the receiver's public key
      const normalizedReceiverPublicKey =
        this.cryptoCore.normalizePublicKey(receiverPublicKey);

      // Use cryptoCore to compute shared secret (handles compressed keys better)
      sharedSecret = this.cryptoCore.computeSharedSecret(
        ephemeralPrivateKey,
        normalizedReceiverPublicKey,
      );
    } catch (error: unknown) {
      if (
        process.env.NODE_ENV !== 'test' &&
        !globalThis.process?.env?.JEST_WORKER_ID
      ) {
        console.error(
          '[ERROR][encrypt] Failed to compute shared secret:',
          error,
        );
      }
      if (error instanceof Error) {
        if (
          'code' in error &&
          (error as Error & { code: string }).code ===
            'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY'
        ) {
          throw new ECIESError(
            ECIESErrorTypeEnum.InvalidRecipientPublicKey,
            undefined,
            undefined,
            {
              nodeError: (error as Error & { code: string }).code,
            },
          );
        }
        throw new ECIESError(
          ECIESErrorTypeEnum.SecretComputationFailed,
          undefined,
          undefined,
          {
            error: error.message,
          },
        );
      }
      throw new ECIESError(ECIESErrorTypeEnum.SecretComputationFailed);
    }

    // Get the ephemeral public key and ensure it has the 0x04 prefix
    // ephemeralPublicKey is already set above and is compressed.

    // Generate random IV
    const iv = randomBytes(this.cryptoCore.consts.IV_SIZE);

    // Use HKDF to derive the key
    const symKey = this.cryptoCore.deriveSharedKey(
      sharedSecret,
      Buffer.alloc(0), // No salt
      Buffer.from('ecies-v2-key-derivation'), // Info
      this.cryptoCore.consts.SYMMETRIC.KEY_SIZE,
    );

    // Create cipher with the derived symmetric key
    const cipher = createCipheriv(
      this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symKey,
      iv,
    ) as AuthenticatedCipher;

    // Ensure auto padding is enabled
    cipher.setAutoPadding(true);

    // Construct AAD
    // AAD = Preamble + Version + CipherSuite + EncryptionType + EphemeralPublicKey
    // We don't include IV in AAD as it's already authenticated by GCM mechanism
    // We don't include Length in AAD because it's variable/optional and might complicate things?
    // Actually, let's include what we can.
    // For now, let's stick to the metadata that identifies the context.
    const aad = Buffer.concat([
      preamble,
      versionBuffer,
      cipherSuiteBuffer,
      encryptionTypeBuffer,
      ephemeralPublicKey,
    ]);
    cipher.setAAD(aad);

    // Encrypt the message
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    let encrypted = cipher.update(message) as Buffer;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    encrypted = Buffer.concat([encrypted, cipher.final() as Buffer]);

    // Get and explicitly set the authentication tag to max tag length for consistency
    const authTag = cipher.getAuthTag();

    // Add a length prefix to the encrypted data to ensure we can extract the exact number of bytes during decryption
    const lengthBuffer =
      encryptionType === 'basic' ? Buffer.alloc(0) : Buffer.alloc(UINT64_SIZE);
    if (encryptionType === 'withLength') {
      lengthBuffer.writeBigUInt64BE(BigInt((encrypted as Buffer).length));
    }

    // Security fix 5: Encrypted size validation
    const maxExpectedSize = message.length + 1024;
    if ((encrypted as Buffer).length > maxExpectedSize) {
      throw new ECIESError(ECIESErrorTypeEnum.EncryptedSizeExceedsExpected);
    }

    // Format: [optional preamble] | version (1) | cipherSuite (1) | type (1) | ephemeralPublicKey (65) | iv (16) | authTag (16) | length (8) | encryptedData
    return Buffer.concat([
      preamble,
      versionBuffer,
      cipherSuiteBuffer,
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
   * @param encryptionType The type of encryption (basic, withLength, etc.) or undefined if not known
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
    let offset = 0;
    const preamble = data.subarray(0, preambleSize);
    offset += preambleSize;

    // Read Version
    const version = data.readUInt8(offset);
    offset += this.cryptoCore.consts.VERSION_SIZE;
    if (version !== EciesVersionEnum.V1) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidVersion,
        undefined,
        undefined,
        { version: String(version) },
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
        { cipherSuite: String(cipherSuite) },
      );
    }

    // read the encryption type from the first byte after the preamble and version/suite
    const actualEncryptionTypeEnum = ensureEciesEncryptionTypeEnum(
      data.readUInt8(offset),
    );
    // if a type is provided, ensure it matches the actual type
    if (
      encryptionType !== undefined &&
      actualEncryptionTypeEnum !== encryptionType
    ) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptionType,
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
        undefined,
        undefined,
        {
          expected: 'basic or withLength',
          actual: encryptionTypeToString(actualEncryptionTypeEnum),
        },
      );
    }
    const includeLengthAndCrc =
      actualEncryptionTypeEnum === EciesEncryptionTypeEnum.WithLength;

    // Security fix 6: Minimum encrypted data size
    const minSize = includeLengthAndCrc
      ? this.cryptoCore.consts.WITH_LENGTH.FIXED_OVERHEAD_SIZE
      : this.cryptoCore.consts.BASIC.FIXED_OVERHEAD_SIZE;
    if (data.length < minSize) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptedDataLength);
    }

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

    const authTag = data.subarray(
      offset,
      offset + this.cryptoCore.consts.AUTH_TAG_SIZE,
    );
    offset += this.cryptoCore.consts.AUTH_TAG_SIZE;

    // Extract the length prefix (4 bytes) after the header components
    const dataLengthBuffer = includeLengthAndCrc
      ? data.subarray(
          offset,
          offset + this.cryptoCore.consts.WITH_LENGTH.DATA_LENGTH_SIZE,
        )
      : Buffer.alloc(0);
    if (includeLengthAndCrc) {
      offset += this.cryptoCore.consts.WITH_LENGTH.DATA_LENGTH_SIZE;
    }

    const dataLength = includeLengthAndCrc
      ? Number(dataLengthBuffer.readBigUInt64BE(0))
      : (options?.dataLength ?? -1);

    if (
      includeLengthAndCrc &&
      options?.dataLength !== undefined &&
      dataLength !== options.dataLength
    ) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        undefined,
        undefined,
        {
          error: pluginEngine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_EncryptedDataLengthMismatch,
          ),
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

    // Security fix 7: Component extraction validation
    if (normalizedKey.length !== this.cryptoCore.consts.PUBLIC_KEY_LENGTH) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
        undefined,
        undefined,
        {
          error: pluginEngine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_EphemeralPublicKeyLengthMismatch,
          ),
          expected: String(this.cryptoCore.consts.PUBLIC_KEY_LENGTH),
          actual: String(normalizedKey.length),
        },
      );
    }

    if (iv.length !== this.cryptoCore.consts.IV_SIZE) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidIVLength,
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
        preamble,
        encryptionType: actualEncryptionTypeEnum,
        ephemeralPublicKey: normalizedKey,
        iv,
        authTag,
        dataLength,
        headerSize: includeLengthAndCrc
          ? this.cryptoCore.consts.WITH_LENGTH.FIXED_OVERHEAD_SIZE
          : this.cryptoCore.consts.BASIC.FIXED_OVERHEAD_SIZE,
      },
      data: encryptedData,
      remainder,
    };
  }

  /**
   * Decrypts data encrypted with ECIES using a header
   * This method maintains backward compatibility with the original implementation
   * by returning just the Buffer. For detailed information, use decryptSingleWithHeaderEx
   * @param encryptionType The type of encryption (basic, withLength, etc.)
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
    try {
      // Call the extended version and return only the decrypted buffer for backward compatibility
      const result = this.decryptWithHeaderEx(
        encryptionType,
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
   * @param encryptionType The type of encryption (basic, withLength, etc.)
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

      // Construct AAD
      const versionBuffer = Buffer.alloc(1);
      versionBuffer.writeUint8(EciesVersionEnum.V1);

      const cipherSuiteBuffer = Buffer.alloc(1);
      cipherSuiteBuffer.writeUint8(
        EciesCipherSuiteEnum.Secp256k1_Aes256Gcm_Sha256,
      );

      const encryptionTypeBuffer = Buffer.alloc(1);
      encryptionTypeBuffer.writeUint8(header.encryptionType);

      const aad = Buffer.concat([
        header.preamble ?? Buffer.alloc(preambleSize),
        versionBuffer,
        cipherSuiteBuffer,
        encryptionTypeBuffer,
        normalizedKey,
      ]);

      // Decrypt using components with the normalized key
      const decrypted = this.decryptWithComponents(
        privateKey,
        normalizedKey,
        header.iv,
        header.authTag,
        data,
        aad,
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
    aad?: Buffer,
  ): Buffer {
    try {
      // Ensure the ephemeral public key has the correct format
      const normalizedEphemeralKey =
        this.cryptoCore.normalizePublicKey(ephemeralPublicKey);

      // Use cryptoCore to compute shared secret (handles compressed keys better)
      let sharedSecret: Buffer;
      try {
        sharedSecret = this.cryptoCore.computeSharedSecret(
          privateKey,
          normalizedEphemeralKey,
        );
      } catch (err) {
        if (
          process.env.NODE_ENV !== 'test' &&
          !globalThis.process?.env?.JEST_WORKER_ID
        ) {
          console.error(
            '[ERROR][decrypt] Failed to compute shared secret:',
            err,
          );
        }
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
          undefined,
          undefined,
          {
            originalError: err instanceof Error ? err.message : String(err),
            stage: 'shared_secret_computation',
          },
        );
      }

      // Use HKDF to derive the key
      const symKey = this.cryptoCore.deriveSharedKey(
        sharedSecret,
        Buffer.alloc(0), // No salt
        Buffer.from('ecies-v2-key-derivation'), // Info
        this.cryptoCore.consts.SYMMETRIC.KEY_SIZE,
      );

      // Create decipher with shared secret-derived key
      const decipher = createDecipheriv(
        this.cryptoCore.consts.SYMMETRIC_ALGORITHM_CONFIGURATION,
        symKey,
        iv,
      ) as AuthenticatedDecipher;

      // Validate the tag and IV
      if (authTag.length !== this.cryptoCore.consts.AUTH_TAG_SIZE) {
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
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

      if (aad) {
        decipher.setAAD(aad);
      }

      // Decrypt the data
      try {
        // Handle edge case where encrypted data might be empty or malformed
        const pluginEngine = getEciesPluginI18nEngine();
        if (encrypted.length === 0) {
          throw new Error(
            pluginEngine.translate(
              NodeEciesComponentId,
              NodeEciesStringKey.Error_EncryptedDataIsEmpty,
            ),
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const firstPart = decipher.update(encrypted) as Buffer;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const finalPart = decipher.final() as Buffer;
        const result = Buffer.concat([firstPart, finalPart]);

        // Security fix 8: Decrypted data validation
        if (result.length === 0) {
          throw new ECIESError(ECIESErrorTypeEnum.DecryptionFailed);
        }

        return result;
      } catch (err) {
        throw new ECIESError(
          ECIESErrorTypeEnum.DecryptionFailed,
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
