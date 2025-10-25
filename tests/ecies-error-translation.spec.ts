import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ECIESError, ECIESErrorTypeEnum } from '@digitaldefiance/ecies-lib';
import { createEciesTranslationEngine } from '../src/i18n/ecies-i18n-factory';

describe('ECIESError Translation Integration', () => {
  describe('Error creation with translation engine', () => {
    it('should create ECIESError with translated message', () => {
      const engine = createEciesTranslationEngine();
      
      const error = new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        engine
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ECIESError);
      expect(error.message).toBeDefined();
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('should translate error messages in different languages', () => {
      const engine = createEciesTranslationEngine();
      
      const errorEn = new ECIESError(
        ECIESErrorTypeEnum.InvalidMnemonic,
        engine,
        undefined,
        LanguageCodes.EN_US
      );
      
      const errorFr = new ECIESError(
        ECIESErrorTypeEnum.InvalidMnemonic,
        engine,
        undefined,
        LanguageCodes.FR
      );
      
      expect(errorEn.message).toBeDefined();
      expect(errorFr.message).toBeDefined();
      expect(errorEn.message).not.toBe(errorFr.message);
    });

    it('should handle error with variables', () => {
      const engine = createEciesTranslationEngine();
      
      const error = new ECIESError(
        ECIESErrorTypeEnum.InvalidDataLength,
        engine,
        undefined,
        undefined,
        { expected: '100', actual: '50' }
      );
      
      expect(error.message).toBeDefined();
      expect(error.message.length).toBeGreaterThan(0);
    });

    it('should work without explicit engine (uses default)', () => {
      const error = new ECIESError(ECIESErrorTypeEnum.InvalidEncryptionType);
      
      expect(error).toBeInstanceOf(ECIESError);
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
        const engine = createEciesTranslationEngine();
        const error = new ECIESError(errorType, engine);
        
        expect(error).toBeInstanceOf(ECIESError);
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.name).toBe('ECIESError');
      });
    });
  });

  describe('Error message quality', () => {
    it('should not contain placeholder text', () => {
      const engine = createEciesTranslationEngine();
      const error = new ECIESError(ECIESErrorTypeEnum.InvalidMnemonic, engine);
      
      expect(error.message).not.toContain('[');
      expect(error.message).not.toContain(']');
      expect(error.message).not.toContain('undefined');
    });

    it('should be human-readable', () => {
      const engine = createEciesTranslationEngine();
      const error = new ECIESError(ECIESErrorTypeEnum.PrivateKeyNotLoaded, engine);
      
      expect(error.message).toMatch(/[a-zA-Z]/);
      expect(error.message.length).toBeGreaterThan(5);
    });

    it('should maintain error type information', () => {
      const engine = createEciesTranslationEngine();
      const errorType = ECIESErrorTypeEnum.TooManyRecipients;
      const error = new ECIESError(errorType, engine);
      
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
        const engine = createEciesTranslationEngine();
        const error = new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          engine,
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
      const engine = createEciesTranslationEngine();
      
      expect(() => {
        throw new ECIESError(ECIESErrorTypeEnum.InvalidMnemonic, engine);
      }).toThrow(ECIESError);
    });

    it('should preserve error details when caught', () => {
      const engine = createEciesTranslationEngine();
      const errorType = ECIESErrorTypeEnum.FileSizeTooLarge;
      
      try {
        throw new ECIESError(errorType, engine, undefined, undefined, {
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

  describe('Adapter robustness', () => {
    it('should handle undefined engine gracefully', () => {
      expect(() => {
        new ECIESError(ECIESErrorTypeEnum.InvalidOperation);
      }).not.toThrow();
    });

    it('should handle undefined variables', () => {
      const engine = createEciesTranslationEngine();
      
      expect(() => {
        new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          engine,
          undefined,
          undefined,
          undefined
        );
      }).not.toThrow();
    });

    it('should handle empty variables object', () => {
      const engine = createEciesTranslationEngine();
      
      expect(() => {
        new ECIESError(
          ECIESErrorTypeEnum.InvalidDataLength,
          engine,
          undefined,
          undefined,
          {}
        );
      }).not.toThrow();
    });
  });
});
