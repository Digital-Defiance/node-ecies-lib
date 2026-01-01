/**
 * Property-Based Tests: ECIESService Constructor Signature
 *
 * Feature: fix-ecies-constructor-signature
 * These tests validate the constructor accepts both IConstants and Partial<IECIESConfig>
 */

import * as fc from 'fast-check';
import {
  createRuntimeConfiguration,
  GuidV4Provider,
  ObjectIdProvider,
} from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../../../src/services/ecies/service';
import type { IECIESConfig } from '@digitaldefiance/ecies-lib';

describe('Property-Based Tests: ECIESService Constructor', () => {
  /**
   * Property 1: IConstants Acceptance
   * Validates: Requirements 2.1
   *
   * For any valid IConstants object returned by createRuntimeConfiguration,
   * passing it to the ECIESService constructor should compile without TypeScript
   * errors and create a valid service instance.
   */
  describe('Property 1: IConstants Acceptance', () => {
    it('should accept any IConstants from createRuntimeConfiguration', () => {
      fc.assert(
        fc.property(
          // Generate random configurations with different ID providers
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
            { BcryptRounds: 10 },
            { BcryptRounds: 12 },
            { PasswordMinLength: 8 },
            { PasswordMinLength: 12 },
          ),
          (overrides) => {
            // Create IConstants using createRuntimeConfiguration
            const config = createRuntimeConfiguration(overrides);

            // Constructor should accept IConstants without errors
            const service = new ECIESService(config);

            // Verify service is properly initialized
            expect(service).toBeInstanceOf(ECIESService);
            expect(service.config).toBeDefined();
            expect(service.config.curveName).toBe(config.ECIES.CURVE_NAME);
            expect(service.config.symmetricAlgorithm).toBe(
              config.ECIES.SYMMETRIC.ALGORITHM,
            );
            expect(service.config.symmetricKeyBits).toBe(
              config.ECIES.SYMMETRIC.KEY_BITS,
            );
            expect(service.config.symmetricKeyMode).toBe(
              config.ECIES.SYMMETRIC.MODE,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Backward Compatibility
   * Validates: Requirements 5.1, 5.2
   *
   * For any existing code that passes Partial<IECIESConfig> to the constructor,
   * the code should continue to compile and execute identically after the signature change.
   */
  describe('Property 2: Backward Compatibility', () => {
    it('should accept any Partial<IECIESConfig> as before', () => {
      fc.assert(
        fc.property(
          // Generate random partial ECIES configs
          fc.record(
            {
              curveName: fc.constantFrom('secp256k1', 'secp256k1'),
              symmetricAlgorithm: fc.constantFrom('aes-256-gcm', 'aes-256-gcm'),
              symmetricKeyBits: fc.constantFrom(256, 256),
              symmetricKeyMode: fc.constantFrom('gcm', 'gcm'),
            },
            { requiredKeys: [] }, // All keys are optional
          ),
          (partialConfig) => {
            // Constructor should accept Partial<IECIESConfig> without errors
            const service = new ECIESService(partialConfig);

            // Verify service is properly initialized
            expect(service).toBeInstanceOf(ECIESService);
            expect(service.config).toBeDefined();

            // Verify partial config values were applied
            if (partialConfig.curveName) {
              expect(service.config.curveName).toBe(partialConfig.curveName);
            }
            if (partialConfig.symmetricAlgorithm) {
              expect(service.config.symmetricAlgorithm).toBe(
                partialConfig.symmetricAlgorithm,
              );
            }

            // Verify service functionality works
            const mnemonic = service.generateNewMnemonic();
            expect(mnemonic.value).toBeDefined();
            expect(mnemonic.value?.split(' ').length).toBe(24);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain identical behavior for existing usage patterns', () => {
      fc.assert(
        fc.property(
          fc.record(
            {
              curveName: fc.constant('secp256k1'),
              symmetricAlgorithm: fc.constant('aes-256-gcm'),
            },
            { requiredKeys: [] },
          ),
          (config) => {
            const service = new ECIESService(config);

            // Test that encryption/decryption works
            const mnemonic = service.generateNewMnemonic();
            const keyPair = service.mnemonicToSimpleKeyPairBuffer(mnemonic);
            const message = Buffer.from('Test message');

            const encrypted = service.encryptSimpleOrSingle(
              true,
              keyPair.publicKey,
              message,
            );

            const decrypted = service.decryptSimpleOrSingleWithHeader(
              true,
              keyPair.privateKey,
              encrypted,
            );

            expect(decrypted.toString()).toBe('Test message');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 4: Configuration Extraction
   * Validates: Requirements 2.1
   *
   * For any IConstants object with ECIES configuration, the constructor should
   * correctly extract and apply the ECIES-specific settings from the ECIES property.
   */
  describe('Property 4: Configuration Extraction', () => {
    it('should correctly extract ECIES config from any IConstants', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
            {},
          ),
          (overrides) => {
            const constants = createRuntimeConfiguration(overrides);

            const service = new ECIESService(constants);

            // Verify all ECIES config fields were correctly extracted
            expect(service.config.curveName).toBe(constants.ECIES.CURVE_NAME);
            expect(service.config.primaryKeyDerivationPath).toBe(
              constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
            );
            expect(service.config.mnemonicStrength).toBe(
              constants.ECIES.MNEMONIC_STRENGTH,
            );
            expect(service.config.symmetricAlgorithm).toBe(
              constants.ECIES.SYMMETRIC.ALGORITHM,
            );
            expect(service.config.symmetricKeyBits).toBe(
              constants.ECIES.SYMMETRIC.KEY_BITS,
            );
            expect(service.config.symmetricKeyMode).toBe(
              constants.ECIES.SYMMETRIC.MODE,
            );

            // Verify the extracted config produces a working service
            const mnemonic = service.generateNewMnemonic();
            expect(mnemonic.value).toBeDefined();

            const keyPair = service.mnemonicToSimpleKeyPairBuffer(mnemonic);
            expect(keyPair.privateKey).toBeInstanceOf(Buffer);
            expect(keyPair.publicKey).toBeInstanceOf(Buffer);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle IConstants with custom ECIES settings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
          ),
          (overrides) => {
            const constants = createRuntimeConfiguration(overrides);

            // Create service with IConstants
            const service = new ECIESService(constants);

            // Verify config matches the constants
            const extractedConfig: IECIESConfig = {
              curveName: constants.ECIES.CURVE_NAME,
              primaryKeyDerivationPath:
                constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
              mnemonicStrength: constants.ECIES.MNEMONIC_STRENGTH,
              symmetricAlgorithm: constants.ECIES.SYMMETRIC.ALGORITHM,
              symmetricKeyBits: constants.ECIES.SYMMETRIC.KEY_BITS,
              symmetricKeyMode: constants.ECIES.SYMMETRIC.MODE,
            };

            expect(service.config).toEqual(extractedConfig);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
