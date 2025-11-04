import {
  EciesEncryptionType,
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConfig,
  IECIESConstants,
  IConstants as IBaseConstants,
} from '@digitaldefiance/ecies-lib';
import { ECIESService } from './service';
import { getNodeRuntimeConfiguration } from '../../constants';

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
    constants: IBaseConstants = getNodeRuntimeConfiguration(),
  ): number {
    if (dataLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
      );
    }
    const eciesDefaults: IECIESConstants = constants.ECIES;
    const config: IECIESConfig = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };
    const eciesService: ECIESService = new ECIESService(
      config,
      eciesDefaults,
    );
    switch (encryptionMode) {
      case 'simple':
        // type (1) + public key (65) + IV (16) + auth tag (16) = 98
        return dataLength + eciesDefaults.SIMPLE.FIXED_OVERHEAD_SIZE;
      case 'single':
        // type (1) + public key (65) + IV (16) + auth tag (16) + data length (4) + crc16 (2) = 104
        return dataLength + eciesDefaults.SINGLE.FIXED_OVERHEAD_SIZE;
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
    constants: IBaseConstants = getNodeRuntimeConfiguration(),
  ): number {
    if (encryptedDataLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
      );
    }

    const { ECIES: eciesDefaults } = constants;
    const overhead = eciesDefaults.SINGLE.FIXED_OVERHEAD_SIZE;
    const actualPadding = padding !== undefined ? padding : 0;

    const decryptedLength = encryptedDataLength - overhead - actualPadding;
    if (decryptedLength < 0) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEncryptedDataLength,
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
