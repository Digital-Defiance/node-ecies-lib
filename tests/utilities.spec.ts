import { ECIESError, ECIESErrorTypeEnum } from '@digitaldefiance/ecies-lib';
import { EciesUtilities } from '../src/services/ecies/utilities';

describe('EciesUtilities', () => {
  let utilities: EciesUtilities;

  beforeEach(() => {
    utilities = new EciesUtilities();
  });

  describe('computeEncryptedLengthFromDataLength', () => {
    it('should throw error for negative data length', () => {
      expect(() => utilities.computeEncryptedLengthFromDataLength(-1, 'simple')).toThrow(ECIESError);
      expect(() => utilities.computeEncryptedLengthFromDataLength(-1, 'simple')).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidDataLength })
      );
    });

    it('should throw error for invalid encryption type', () => {
      expect(() => utilities.computeEncryptedLengthFromDataLength(100, 'invalid' as any)).toThrow(ECIESError);
      expect(() => utilities.computeEncryptedLengthFromDataLength(100, 'invalid' as any)).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptionType })
      );
    });

    it('should compute length for simple encryption', () => {
      const result = utilities.computeEncryptedLengthFromDataLength(100, 'simple');
      expect(result).toBeGreaterThan(100);
    });

    it('should compute length for single encryption', () => {
      const result = utilities.computeEncryptedLengthFromDataLength(100, 'single');
      expect(result).toBeGreaterThan(100);
    });

    it('should compute length for multiple encryption', () => {
      const result = utilities.computeEncryptedLengthFromDataLength(100, 'multiple', 3);
      expect(result).toBeGreaterThan(100);
    });
  });

  describe('computeDecryptedLengthFromEncryptedDataLength', () => {
    it('should throw error for negative encrypted data length', () => {
      expect(() => utilities.computeDecryptedLengthFromEncryptedDataLength(-1)).toThrow(ECIESError);
      expect(() => utilities.computeDecryptedLengthFromEncryptedDataLength(-1)).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptedDataLength })
      );
    });

    it('should throw error when computed length is negative', () => {
      expect(() => utilities.computeDecryptedLengthFromEncryptedDataLength(10)).toThrow(ECIESError);
      expect(() => utilities.computeDecryptedLengthFromEncryptedDataLength(10)).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidEncryptedDataLength })
      );
    });

    it('should compute decrypted length with padding', () => {
      const result = utilities.computeDecryptedLengthFromEncryptedDataLength(200, 10);
      expect(result).toBeGreaterThan(0);
    });

    it('should compute decrypted length without padding', () => {
      const result = utilities.computeDecryptedLengthFromEncryptedDataLength(200);
      expect(result).toBeGreaterThan(0);
    });
  });
});
