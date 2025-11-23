/**
 * Property-based tests for circular dependency fixes
 * Feature: fix-ecies-circular-dependency
 */

import fc from 'fast-check';
import madge from 'madge';
import * as path from 'path';

describe('Circular Dependency - Property-Based Tests', () => {
  /**
   * Feature: fix-ecies-circular-dependency, Property 2: Enumeration modules have no runtime dependencies
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4
   */
  describe('Property 2: Enumeration modules have no runtime dependencies', () => {
    it('should import enumerations without triggering forbidden module loads', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'ecies-string-key',
            'ecies-error-type',
            'ecies-encryption-type',
            'ecies-version',
            'ecies-cipher-suite',
            'member-type',
            'pbkdf2-profile',
            'disposed-error-type',
            'guid-brand-type',
            'guid-error-type',
            'id-provider-error-type',
            'invalid-email-type',
            'length-encoding-type',
            'length-error-type',
            'member-error-type',
            'password-login-error-type',
            'pbkdf2-error-type',
            'secure-storage-error-type'
          ),
          (enumFileName) => {
            try {
              // Build the relative path to the enumeration file
              const enumPath = `../../digitaldefiance-ecies-lib/src/enumerations/${enumFileName}`;

              // Clear module cache to ensure fresh import
              const resolvedPath = require.resolve(enumPath);
              delete require.cache[resolvedPath];

              // Track which modules get loaded
              const loadedModules = new Set<string>();
              const Module = require('module');
              const originalRequire = Module.prototype.require;

              Module.prototype.require = function (id: string) {
                loadedModules.add(id);
                return originalRequire.apply(this, arguments);
              };

              // Import the enumeration
              require(enumPath);

              // Restore original require
              Module.prototype.require = originalRequire;

              // Verify no forbidden modules were loaded
              const forbiddenPatterns = [
                /translations\//,
                /i18n-setup/,
                /errors\//,
                /constants/,
              ];

              const forbiddenLoads = Array.from(loadedModules).filter((mod) =>
                forbiddenPatterns.some((pattern) => pattern.test(mod))
              );

              // Return true if no forbidden modules were loaded
              return forbiddenLoads.length === 0;
            } catch (error) {
              // If we can't load the module, that's a failure
              console.error(
                `Failed to load enumeration ${enumFileName}:`,
                error
              );
              return false;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-ecies-circular-dependency, Property 3: Translation objects use fully initialized enums
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  describe('Property 3: Translation objects use fully initialized enums', () => {
    it('should have all translation keys correspond to defined enum values', () => {
      // Import using relative paths
      const {
        EciesStringKey,
      } = require('../../digitaldefiance-ecies-lib/src/enumerations/ecies-string-key');
      const {
        englishTranslations,
      } = require('../../digitaldefiance-ecies-lib/src/translations/en-US');

      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(englishTranslations)),
          (translationKey) => {
            // The key should be a valid EciesStringKey enum value
            const enumValue =
              EciesStringKey[translationKey as keyof typeof EciesStringKey];

            // The enum value should be defined and not undefined
            if (enumValue === undefined) {
              return false;
            }

            // The translation value should be defined
            const translationValue =
              englishTranslations[
                translationKey as keyof typeof englishTranslations
              ];
            if (translationValue === undefined) {
              return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-ecies-circular-dependency, Property 4: Error messages are accessible without circular dependencies
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   */
  describe('Property 4: Error messages are accessible without circular dependencies', () => {
    it('should create errors and access messages without circular dependency issues', () => {
      const {
        ECIESError,
      } = require('../../digitaldefiance-ecies-lib/src/errors/ecies');
      const {
        ECIESErrorTypeEnum,
      } = require('../../digitaldefiance-ecies-lib/src/enumerations/ecies-error-type');

      // Get all numeric enum values
      const errorTypes = Object.values(ECIESErrorTypeEnum).filter(
        (v) => typeof v === 'string'
      ) as ECIESErrorTypeEnum[];

      fc.assert(
        fc.property(fc.constantFrom(...errorTypes), (errorType) => {
          try {
            // Should be able to create error
            const error = new ECIESError(errorType);

            // Should be able to access message
            const hasMessage =
              typeof error.message === 'string' && error.message.length > 0;

            // Should be able to access name
            const hasName = error.name === 'ECIESError';

            // Should be able to access type
            const hasType = error.type === errorType;

            return hasMessage && hasName && hasType;
          } catch (err) {
            // If error creation fails, that's a problem
            console.error(`Failed to create error for type ${errorType}:`, err);
            return false;
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: fix-ecies-circular-dependency, Property 6: Module dependency graph is acyclic
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
   */
  describe('Property 6: Module dependency graph is acyclic', () => {
    it('should have no circular dependencies in the module graph', async () => {
      const srcPath = path.resolve(
        __dirname,
        '../../digitaldefiance-ecies-lib/src/index.ts'
      );

      const result = await madge(srcPath, {
        fileExtensions: ['ts'],
        tsConfig: path.resolve(
          __dirname,
          '../../digitaldefiance-ecies-lib/tsconfig.json'
        ),
      });

      const circular = result.circular();

      // Filter to only include circular dependencies within the ecies-lib package
      // (exclude external dependencies like i18n-lib)
      const eciesLibCircular = circular.filter((cycle: string[]) =>
        cycle.some((file) => file.includes('digitaldefiance-ecies-lib/src'))
      );

      // Should have no circular dependencies within ecies-lib
      expect(eciesLibCircular).toHaveLength(0);

      // If there are any, log them for debugging
      if (eciesLibCircular.length > 0) {
        console.error(
          'Circular dependencies found in ecies-lib:',
          eciesLibCircular
        );
      }
    });
  });
});
