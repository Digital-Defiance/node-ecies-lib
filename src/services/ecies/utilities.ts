import {
  Constants as AppConstants,
  ECIES,
  EciesEncryptionType,
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConfig,
} from '@digitaldefiance/ecies-lib';
import { getEciesPluginI18nEngine } from '../../i18n/ecies-i18n-factory';
import { ECIESService } from './service';

/**
 * Utility functions for ECIES operations
 */
export class EciesUtilities {
  /**
   * Computes the encrypted length from the data length.
   * @param dataLength - The length of the data.
   * @param encryptionMode - The encryption mode (simple, single, multiple).
   * @param recipientCount - The number of recipients for multiple encryption mode.
   * @returns The encrypted length details.
   */
  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    encryptionMode: EciesEncryptionType,
    recipientCount?: number,
  ): number {
    if (dataLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        getEciesPluginI18nEngine(),
      );
    }
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    const eciesService: ECIESService = new ECIESService(
      getEciesPluginI18nEngine(),
      config,
    );
    switch (encryptionMode) {
      case 'simple':
        // type (1) + public key (65) + IV (16) + auth tag (16) = 98
        return dataLength + ECIES.SIMPLE.FIXED_OVERHEAD_SIZE;
      case 'single':
        // type (1) + public key (65) + IV (16) + auth tag (16) + data length (4) + crc16 (2) = 104
        return dataLength + ECIES.SINGLE.FIXED_OVERHEAD_SIZE;
      case 'multiple':
        return (
          dataLength +
          eciesService.calculateECIESMultipleRecipientOverhead(
            recipientCount ?? 1,
            true,
          )
        );
      default:
        throw new ECIESError(
          ECIESErrorTypeEnum.InvalidEncryptionType,
          getEciesPluginI18nEngine(),
        );
    }
  }

  /**
   * Computes the decrypted length from the encrypted data length.
   * @param encryptedDataLength - The length of the encrypted data.
   * @param padding - Optional padding value.
   * @returns The decrypted length.
   */
  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    padding?: number,
  ): number {
    if (encryptedDataLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        getEciesPluginI18nEngine(),
      );
    }

    const overhead = ECIES.SINGLE.FIXED_OVERHEAD_SIZE;
    const actualPadding = padding !== undefined ? padding : 0;

    const decryptedLength = encryptedDataLength - overhead - actualPadding;
    if (decryptedLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
        getEciesPluginI18nEngine(),
        undefined,
        undefined,
        {
          encryptedDataLength: String(encryptedDataLength),
          overhead: String(overhead),
          padding: String(actualPadding),
          computedLength: String(decryptedLength),
        },
      );
    }

    return decryptedLength;
  }
}
