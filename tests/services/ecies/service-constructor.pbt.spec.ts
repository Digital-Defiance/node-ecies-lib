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
            const extractedConfig = {
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

  /**
   * Property 1 (idProvider): ECIESService Preserves Full IConstants
   * Feature: fix-idprovider-member-generation, Property 1: ECIESService Preserves Full IConstants
   * Validates: Requirements 1.1, 1.2, 1.4
   *
   * For any IConstants object passed to ECIESService constructor,
   * the service's constants property should return an equivalent IConstants
   * object with the same idProvider.
   */
  describe('Property 1 (idProvider): ECIESService Preserves Full IConstants', () => {
    it('should preserve full IConstants including idProvider', () => {
      fc.assert(
        fc.property(
          // Generate random IConstants with different idProviders
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
            createRuntimeConfiguration({}), // Default idProvider
          ),
          (constants) => {
            // Create service with IConstants
            const service = new ECIESService(constants);

            // Verify constants property returns equivalent IConstants
            expect(service.constants).toBeDefined();
            expect(service.constants.idProvider).toBe(constants.idProvider);
            expect(service.constants.idProvider.byteLength).toBe(
              constants.idProvider.byteLength,
            );
            expect(service.constants.MEMBER_ID_LENGTH).toBe(
              constants.MEMBER_ID_LENGTH,
            );

            // Verify all major IConstants fields are preserved
            expect(service.constants.ECIES).toBe(constants.ECIES);
            expect(service.constants.CHECKSUM).toBe(constants.CHECKSUM);
            expect(service.constants.PBKDF2).toBe(constants.PBKDF2);
            expect(service.constants.VOTING).toBe(constants.VOTING);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve idProvider across different configurations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(new GuidV4Provider(), new ObjectIdProvider()),
          (idProvider) => {
            const constants = createRuntimeConfiguration({ idProvider });
            const service = new ECIESService(constants);

            // Verify idProvider is preserved
            expect(service.constants.idProvider).toBe(idProvider);
            expect(service.constants.idProvider.byteLength).toBe(
              idProvider.byteLength,
            );

            // Verify idProvider can generate IDs
            const id = service.constants.idProvider.generate();
            expect(id).toBeInstanceOf(Uint8Array); // idProvider returns Uint8Array
            expect(id.length).toBe(idProvider.byteLength);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2 (idProvider): ECIESService Uses Default Constants When Given Partial Config
   * Feature: fix-idprovider-member-generation, Property 2: ECIESService Uses Default Constants When Given Partial Config
   * Validates: Requirements 1.3
   *
   * For any Partial<IECIESConfig> passed to ECIESService constructor,
   * the service's constants property should return the default Constants object.
   */
  describe('Property 2 (idProvider): ECIESService Uses Default Constants When Given Partial Config', () => {
    it('should use default Constants for Partial<IECIESConfig>', () => {
      fc.assert(
        fc.property(
          fc.record(
            {
              curveName: fc.constantFrom('secp256k1'),
              symmetricAlgorithm: fc.constantFrom('aes-256-gcm'),
              symmetricKeyBits: fc.constantFrom(256),
            },
            { requiredKeys: [] },
          ),
          (partialConfig) => {
            const service = new ECIESService(partialConfig);

            // Verify constants property returns default Constants
            // Note: We can't import Constants from node-ecies-lib, so we check properties
            expect(service.constants).toBeDefined();
            expect(service.constants.idProvider).toBeDefined();
            expect(service.constants.idProvider.byteLength).toBe(12); // Default ObjectIdProvider
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use default Constants when no config is provided', () => {
      const service = new ECIESService();

      // Verify constants property returns default Constants
      expect(service.constants).toBeDefined();
      expect(service.constants.idProvider).toBeDefined();
      expect(service.constants.idProvider.byteLength).toBe(12);
    });
  });

  /**
   * Property 3 (idProvider): ECIESService Maintains Backward Compatible Config Property
   * Feature: fix-idprovider-member-generation, Property 3: ECIESService Maintains Backward Compatible Config Property
   * Validates: Requirements 1.5, 6.2
   *
   * For any ECIESService instance, the config property should return an IECIESConfig
   * object with all expected ECIES configuration fields, regardless of whether the
   * service was constructed with IConstants or Partial<IECIESConfig>.
   */
  describe('Property 3 (idProvider): ECIESService Maintains Backward Compatible Config Property', () => {
    it('should return valid IECIESConfig for any construction method', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // IConstants
            fc.constant(
              createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            ),
            fc.constant(
              createRuntimeConfiguration({
                idProvider: new ObjectIdProvider(),
              }),
            ),
            // Partial<IECIESConfig>
            fc.record(
              {
                curveName: fc.constantFrom('secp256k1'),
                symmetricAlgorithm: fc.constantFrom('aes-256-gcm'),
              },
              { requiredKeys: [] },
            ),
            // No config
            fc.constant(undefined),
          ),
          (config) => {
            const service = new ECIESService(config);

            // Verify config property returns valid IECIESConfig
            expect(service.config).toBeDefined();
            expect(service.config.curveName).toBeDefined();
            expect(service.config.primaryKeyDerivationPath).toBeDefined();
            expect(service.config.mnemonicStrength).toBeDefined();
            expect(service.config.symmetricAlgorithm).toBeDefined();
            expect(service.config.symmetricKeyBits).toBeDefined();
            expect(service.config.symmetricKeyMode).toBeDefined();

            // Verify config doesn't include idProvider (it's in constants, not config)
            expect('idProvider' in service.config).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
