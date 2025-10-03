import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Constants } from '../constants';

export abstract class AESGCMService {
  public static readonly ALGORITHM_NAME = Constants.KEYRING.ALGORITHM;
  public static readonly MODE = Constants.KEYRING.MODE;
  public static readonly KEY_BITS = Constants.KEYRING.KEY_BITS;

  /**
   * Encrypt data using AES-GCM
   * @param data Data to encrypt
   * @param key Key to use for encryption (must be 16, 24 or 32 bytes for AES)
   * @param authTag Whether to return separate auth tag
   * @returns Encrypted data with IV and optional separate auth tag
   */
  public static encrypt(
    data: Buffer,
    key: Buffer,
    authTag: boolean = false,
  ): { encrypted: Buffer; iv: Buffer; tag?: Buffer } {
    const iv = randomBytes(Constants.WRAPPED_KEY.IV_SIZE);
    const cipher = createCipheriv(Constants.KEYRING_ALGORITHM_CONFIGURATION, key, iv);
    
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
  public static combineEncryptedDataAndTag(
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
  public static combineIvAndEncryptedData(
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
  public static combineIvTagAndEncryptedData(
    iv: Buffer,
    encryptedData: Buffer,
    authTag: Buffer,
  ): Buffer {
    const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
      encryptedData,
      authTag,
    );
    return AESGCMService.combineIvAndEncryptedData(iv, encryptedWithTag);
  }

  /**
   * Split combined encrypted data back into its components
   * @param combinedData The combined data containing IV, encrypted data, and optionally auth tag
   * @param hasAuthTag Whether the combined data includes an authentication tag
   * @returns Object containing the split components
   */
  public static splitEncryptedData(
    combinedData: Buffer,
    hasAuthTag: boolean = true,
  ): { iv: Buffer; encryptedDataWithTag: Buffer } {
    const ivLength = Constants.WRAPPED_KEY.IV_SIZE;
    const minLength = ivLength + (hasAuthTag ? 16 : 0);

    if (combinedData.length < minLength) {
      throw new Error(
        'Combined data is too short to contain required components',
      );
    }

    const iv = combinedData.slice(0, ivLength);
    const encryptedDataWithTag = combinedData.slice(ivLength);

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
  public static decrypt(
    iv: Buffer,
    encryptedData: Buffer,
    key: Buffer,
    authTag: boolean = false,
  ): Buffer {
    const decipher = createDecipheriv(Constants.KEYRING_ALGORITHM_CONFIGURATION, key, iv);
    
    const tagLength = 16;
    const tag = encryptedData.subarray(-tagLength);
    const ciphertext = encryptedData.subarray(0, -tagLength);
    
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}