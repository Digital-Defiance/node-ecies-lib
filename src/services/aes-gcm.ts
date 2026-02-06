/**
 * AES-GCM encryption service for Node.js.
 * Provides authenticated encryption using AES-GCM with configurable key sizes (128/192/256-bit),
 * initialization vector generation, and authentication tag handling for secure data encryption.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

import { I18nEngine } from '@digitaldefiance/i18n-lib';

import { Constants } from '../constants';
import { getNodeEciesI18nEngine, NodeEciesStringKey } from '../i18n';
import { IConstants } from '../interfaces/constants';

export class AESGCMService {
  public static readonly ALGORITHM_NAME = 'AES-GCM';
  private readonly configuration: IConstants;
  private readonly engine: I18nEngine;
  private readonly algorithmName: string;
  private readonly mode: string;
  private readonly keyBits: number;
  private readonly ivSize: number;
  private readonly keyringAlgorithmConfiguration: CipherGCMTypes;

  constructor(constants?: IConstants) {
    this.configuration = constants ?? Constants;
    this.engine = getNodeEciesI18nEngine();
    this.algorithmName = this.configuration.KEYRING.ALGORITHM;
    this.mode = this.configuration.KEYRING.MODE;
    this.keyBits = this.configuration.KEYRING.KEY_BITS;
    this.ivSize = this.configuration.WRAPPED_KEY.IV_SIZE;
    this.keyringAlgorithmConfiguration =
      this.configuration.KEYRING_ALGORITHM_CONFIGURATION;
  }

  public get ALGORITHM_NAME(): string {
    return this.algorithmName;
  }

  public get MODE(): string {
    return this.mode;
  }

  public get KEY_BITS(): number {
    return this.keyBits;
  }

  /**
   * Encrypt data using AES-GCM
   * @param data Data to encrypt
   * @param key Key to use for encryption (must be 16, 24 or 32 bytes for AES)
   * @param authTag Whether to return separate auth tag
   * @returns Encrypted data with IV and optional separate auth tag
   */
  public encrypt(
    data: Buffer,
    key: Buffer,
    authTag: boolean = false,
    aad?: Buffer,
  ): { encrypted: Buffer; iv: Buffer; tag?: Buffer } {
    // Security fix 9: Key length validation - must match algorithm requirements
    const requiredKeyLength = this.keyBits / 8;
    if (key.length !== requiredKeyLength) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_InvalidAESKeyLength,
        ),
      );
    }

    // Security fix 11: Data null/undefined check
    if (data === null || data === undefined) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_CannotEncryptEmptyData,
        ),
      );
    }

    // Security fix 12: Data size validation (max 2GB)
    if (data.length > 0x7fffffff) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_MessageTooLarge,
        ),
      );
    }

    const iv = randomBytes(this.ivSize);
    const cipher = createCipheriv(this.keyringAlgorithmConfiguration, key, iv);

    if (aad) {
      cipher.setAAD(aad);
    }

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();

    if (!authTag) {
      const encryptedWithTag = Buffer.concat([encrypted, tag]);
      return { encrypted: encryptedWithTag, iv: iv };
    }

    return {
      encrypted: encrypted,
      iv: iv,
      tag: tag,
    };
  }

  /**
   * Combine encrypted data and auth tag into a single Buffer
   * @param encryptedData The encrypted data
   * @param authTag The authentication tag
   * @returns The combined Buffer
   */
  public combineEncryptedDataAndTag(
    encryptedData: Buffer,
    authTag: Buffer,
  ): Buffer {
    return Buffer.concat([encryptedData, authTag]);
  }

  /**
   * Combine IV and encrypted data (with optional auth tag) into a single Buffer
   * @param iv The initialization vector
   * @param encryptedDataWithTag The encrypted data with auth tag already appended (if applicable)
   * @returns The combined Buffer
   */
  public combineIvAndEncryptedData(
    iv: Buffer,
    encryptedDataWithTag: Buffer,
  ): Buffer {
    return Buffer.concat([iv, encryptedDataWithTag]);
  }

  /**
   * Combine IV, encrypted data and auth tag into a single Buffer
   * @param iv The initialization vector
   * @param encryptedData The encrypted data
   * @param authTag The authentication tag
   * @returns The combined Buffer
   */
  public combineIvTagAndEncryptedData(
    iv: Buffer,
    encryptedData: Buffer,
    authTag: Buffer,
  ): Buffer {
    const encryptedWithTag = this.combineEncryptedDataAndTag(
      encryptedData,
      authTag,
    );
    return this.combineIvAndEncryptedData(iv, encryptedWithTag);
  }

  /**
   * Split combined encrypted data back into its components
   * @param combinedData The combined data containing IV, encrypted data, and optionally auth tag
   * @param hasAuthTag Whether the combined data includes an authentication tag
   * @returns Object containing the split components
   */
  public splitEncryptedData(
    combinedData: Buffer,
    hasAuthTag: boolean = true,
  ): { iv: Buffer; encryptedDataWithTag: Buffer } {
    const ivLength = this.ivSize;
    const minLength = ivLength + (hasAuthTag ? 16 : 0);

    if (combinedData.length < minLength) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_CombinedDataTooShort,
        ),
      );
    }

    const iv = combinedData.subarray(0, ivLength);
    const encryptedDataWithTag = combinedData.subarray(ivLength);

    return { iv, encryptedDataWithTag };
  }

  /**
   * Decrypt data using AES-GCM
   * @param iv The initialization vector
   * @param encryptedData Data to decrypt (with auth tag appended)
   * @param key Key to use for decryption (must be 16, 24 or 32 bytes for AES)
   * @param authTag Whether the encrypted data includes an authentication tag
   * @returns Decrypted data
   */
  public decrypt(
    iv: Buffer,
    encryptedData: Buffer,
    key: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _authTag: boolean = false,
    aad?: Buffer,
  ): Buffer {
    // Security fix 9: Key length validation - must match algorithm requirements
    const requiredKeyLength = this.keyBits / 8;
    if (key.length !== requiredKeyLength) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_InvalidAESKeyLength,
        ),
      );
    }

    // Security fix 10: IV length validation
    if (iv.length !== 16) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_InvalidIVLength,
        ),
      );
    }

    // Security fix 13: Decrypt input validation
    if (encryptedData === null || encryptedData === undefined) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_CannotDecryptEmptyData,
        ),
      );
    }

    if (encryptedData.length > 0x7fffffff) {
      throw new Error(
        this.engine.translateStringKey(
          NodeEciesStringKey.Error_MessageTooLarge,
        ),
      );
    }

    const decipher = createDecipheriv(
      this.keyringAlgorithmConfiguration,
      key,
      iv,
    );

    if (aad) {
      decipher.setAAD(aad);
    }

    const tagLength = 16;
    const tag = encryptedData.subarray(-tagLength);
    const ciphertext = encryptedData.subarray(0, -tagLength);

    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Encrypt the given data as JSON
   * @param data The data to encrypt
   * @param key The key to use for encryption
   * @returns Encrypted data as Buffer
   */
  public encryptJson<T>(data: T, key: Buffer): Buffer {
    const jsonString = JSON.stringify(data);
    const encodedData = Buffer.from(jsonString, 'utf8');
    const { iv, encrypted, tag } = this.encrypt(
      encodedData,
      key,
      true,
      undefined,
    );
    if (!tag) {
      throw new Error('Authentication tag missing after encryption');
    }
    return this.combineIvTagAndEncryptedData(iv, encrypted, tag);
  }

  /**
   * Decrypt the given buffer with AES and parse as JSON
   * @param encryptedData The encrypted data to decrypt
   * @param key The key to use for decryption
   * @returns Decrypted data parsed as type T
   */
  public decryptJson<T>(encryptedData: Buffer, key: Buffer): T {
    const iv = encryptedData.subarray(0, this.ivSize);
    const encryptedContent = encryptedData.subarray(this.ivSize);
    const decrypted = this.decrypt(iv, encryptedContent, key, true, undefined);
    return JSON.parse(decrypted.toString('utf8')) as T;
  }
}
