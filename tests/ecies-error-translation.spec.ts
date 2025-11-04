import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ECIESError, ECIESErrorTypeEnum } from '@digitaldefiance/ecies-lib';
import { getEciesPluginI18nEngine } from '../src/i18n/ecies-i18n-factory';

describe('ECIES Error Translation Integration', () => {
  describe('Error creation with v2.0 engine', () => {
    it('should create ECIESError with auto-initialized engine', () => {
      const error = new ECIESError(ECIESErrorTypeEnum.InvalidDataLength);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ECIESError);
      expect(error.message).toBeDefined();
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('should translate error messages in different languages', () => {
      const errorEn = new ECIESError(
        ECIESErrorTypeEnum.InvalidMnemonic,
        undefined,
        LanguageCodes.EN_US
      );
      const errorFr = new ECIESError(
        ECIESErrorTypeEnum.InvalidMnemonic,
        undefined,
        LanguageCodes.FR
      );
      expect(errorEn.message).toBeDefined();
      expect(errorFr.message).toBeDefined();
      expect(errorEn.message).not.toBe(errorFr.message);
    });

    it('should handle error with variables', () => {
      const error = new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        undefined,
        undefined,
        { expected: '100', actual: '50' }
      );
      expect(error.message).toBeDefined();
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  describe('Common error scenarios', () => {
    const errorTypes = [
      ECIESErrorTypeEnum.InvalidDataLength,
      ECIESErrorTypeEnum.InvalidEncryptionType,
      ECIESErrorTypeEnum.InvalidIVLength,
      ECIESErrorTypeEnum.InvalidAuthTagLength,
      ECIESErrorTypeEnum.InvalidHeaderLength,
      ECIESErrorTypeEnum.InvalidMnemonic,
      ECIESErrorTypeEnum.InvalidOperation,
      ECIESErrorTypeEnum.MessageLengthMismatch,
      ECIESErrorTypeEnum.InvalidEncryptedKeyLength,
      ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
      ECIESErrorTypeEnum.RecipientNotFound,
      ECIESErrorTypeEnum.InvalidSignature,
      ECIESErrorTypeEnum.TooManyRecipients,
      ECIESErrorTypeEnum.PrivateKeyNotLoaded,
      ECIESErrorTypeEnum.InvalidRecipientCount,
      ECIESErrorTypeEnum.FileSizeTooLarge,
      ECIESErrorTypeEnum.DecryptionFailed,
    ];

    errorTypes.forEach((errorType) => {
      it(`should create error for ${ECIESErrorTypeEnum[errorType]}`, () => {
        const error = new ECIESError(errorType);
        expect(error).toBeInstanceOf(ECIESError);
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.name).toBe('ECIESError');
      });
    });
  });

  describe('Error message quality', () => {
    it('should not contain placeholder text', () => {
      const error = new ECIESError(ECIESErrorTypeEnum.InvalidMnemonic);
      expect(error.message).not.toContain('undefined');
    });

    it('should be human-readable', () => {
      const error = new ECIESError(ECIESErrorTypeEnum.PrivateKeyNotLoaded);
      expect(error.message).toMatch(/[a-zA-Z]/);
      expect(error.message.length).toBeGreaterThan(5);
    });

    it('should maintain error type information', () => {
      const errorType = ECIESErrorTypeEnum.TooManyRecipients;
      const error = new ECIESError(errorType);
      expect(error.type).toBe(errorType);
    });
  });

  describe('Multilingual error messages', () => {
    const languages = [
      LanguageCodes.EN_US,
      LanguageCodes.FR,
      LanguageCodes.ES,
      LanguageCodes.ZH_CN,
      LanguageCodes.UK,
    ];

    languages.forEach((lang) => {
      it(`should create valid error message in ${lang}`, () => {
        const error = new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          undefined,
          lang
        );
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(typeof error.message).toBe('string');
      });
    });
  });

  describe('Error throwing and catching', () => {
    it('should be catchable as ECIESError', () => {
      expect(() => {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidMnemonic);
      }).toThrow(ECIESError);
    });

    it('should preserve error details when caught', () => {
      const errorType = ECIESErrorTypeEnum.FileSizeTooLarge;
      try {
        throw new ECIESError(errorType, undefined, undefined, {
          maxSize: '1000',
          actualSize: '2000',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ECIESError);
        if (error instanceof ECIESError) {
          expect(error.type).toBe(errorType);
          expect(error.message).toBeDefined();
        }
      }
    });
  });

  describe('v2.0 error robustness', () => {
    it('should auto-initialize engine', () => {
      expect(() => {
        new ECIESError(ECIESErrorTypeEnum.InvalidOperation);
      }).not.toThrow();
    });

    it('should handle undefined variables', () => {
      expect(() => {
        new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          undefined,
          undefined,
          undefined
        );
      }).not.toThrow();
    });

    it('should handle empty variables object', () => {
      expect(() => {
        new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          undefined,
          undefined,
          {}
        );
      }).not.toThrow();
    });
  });
});
