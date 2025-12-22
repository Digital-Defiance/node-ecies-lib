/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CipherGCMTypes,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

import { Constants } from '../constants';
import {
  getEciesPluginI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../i18n';
import { IConstants } from '../interfaces/constants';

export class AESGCMService {
  private readonly algorithmName: string;
  private readonly mode: string;
  private readonly keyBits: number;
  private readonly ivSize: number;
  private readonly keyringAlgorithmConfiguration: CipherGCMTypes;

  constructor(constants: IConstants = Constants) {
    this.algorithmName = constants.KEYRING.ALGORITHM;
    this.mode = constants.KEYRING.MODE;
    this.keyBits = constants.KEYRING.KEY_BITS;
    this.ivSize = constants.WRAPPED_KEY.IV_SIZE;
    this.keyringAlgorithmConfiguration =
      constants.KEYRING_ALGORITHM_CONFIGURATION;
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
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_InvalidAESKeyLength,
        ),
      );
    }

    // Security fix 11: Data null/undefined check
    if (data === null || data === undefined) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_CannotEncryptEmptyData,
        ),
      );
    }

    // Security fix 12: Data size validation (max 2GB)
    if (data.length > 0x7fffffff) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
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
      const pluginEngine = getEciesPluginI18nEngine();

      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
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
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_InvalidAESKeyLength,
        ),
      );
    }

    // Security fix 10: IV length validation
    if (iv.length !== 16) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_InvalidIVLength,
        ),
      );
    }

    // Security fix 13: Decrypt input validation
    if (encryptedData === null || encryptedData === undefined) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_CannotDecryptEmptyData,
        ),
      );
    }

    if (encryptedData.length > 0x7fffffff) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new Error(
        pluginEngine.translate(
          NodeEciesComponentId,
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
}
