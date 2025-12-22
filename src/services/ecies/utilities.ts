import {
  EciesEncryptionType,
  ECIESError,
  ECIESErrorTypeEnum,
  IConstants as IBaseConstants,
  IECIESConstants,
} from '@digitaldefiance/ecies-lib';

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
   * @param constants - The constants to use for calculations.
   * @returns The encrypted length details.
   */
  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    encryptionMode: EciesEncryptionType,
    recipientCount?: number,
    constants: IBaseConstants = getNodeRuntimeConfiguration(),
  ): number {
    if (dataLength < 0) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
    }
    const eciesDefaults: IECIESConstants = constants.ECIES;

    switch (encryptionMode) {
      case 'simple':
        // type (1) + public key (65) + IV (16) + auth tag (16) = 98
        return dataLength + eciesDefaults.SIMPLE.FIXED_OVERHEAD_SIZE;
      case 'single':
        // type (1) + public key (65) + IV (16) + auth tag (16) + data length (4) + crc16 (2) = 104
        return dataLength + eciesDefaults.SINGLE.FIXED_OVERHEAD_SIZE;
      case 'multiple':
        // Calculate multiple recipient overhead without instantiating service
        return (
          dataLength +
          this.calculateMultipleRecipientOverhead(
            recipientCount ?? 1,
            true,
            eciesDefaults,
          )
        );
      default:
        throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptionType);
    }
  }

  /**
   * Calculates the overhead for multiple recipient encryption.
   * This is a pure calculation that doesn't require service instantiation.
   * Matches the logic in EciesMultiRecipient.calculateECIESMultipleRecipientOverhead.
   * @param recipientCount - The number of recipients.
   * @param includeMessageOverhead - Whether to include message overhead.
   * @param eciesConstants - The ECIES constants to use.
   * @returns The overhead in bytes.
   */
  private calculateMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
    eciesConstants: IECIESConstants,
  ): number {
    if (recipientCount < 1) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidRecipientCount);
    }

    // Calculate encrypted keys size (default assumption: all keys use Simple encryption type)
    const encryptedKeysSize =
      recipientCount * eciesConstants.MULTIPLE.ENCRYPTED_KEY_SIZE;

    // Base overhead calculation
    const baseOverhead =
      eciesConstants.VERSION_SIZE +
      eciesConstants.CIPHER_SUITE_SIZE +
      eciesConstants.ENCRYPTION_TYPE_SIZE +
      eciesConstants.MULTIPLE.DATA_LENGTH_SIZE +
      eciesConstants.MULTIPLE.RECIPIENT_COUNT_SIZE +
      recipientCount * eciesConstants.MULTIPLE.RECIPIENT_ID_SIZE + // recipient ids (dynamic based on ID provider)
      encryptedKeysSize; // actual encrypted keys size

    return includeMessageOverhead
      ? baseOverhead + eciesConstants.MULTIPLE.FIXED_OVERHEAD_SIZE
      : baseOverhead;
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
      throw new ECIESError(ECIESErrorTypeEnum.InvalidEncryptedDataLength);
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
