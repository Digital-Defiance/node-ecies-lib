/**
 * Property-Based Test: Cross-Platform Constructor Consistency
 *
 * Feature: fix-ecies-constructor-signature
 * Task: 4.2 Write property test for cross-platform consistency
 *
 * Property 3: Cross-Platform Consistency
 * Validates: Requirements 3.1, 3.2
 *
 * For any valid configuration object, passing it to ECIESService in the browser
 * library should have the same TypeScript behavior as passing it to ECIESService
 * in the Node.js library.
 */

import * as fc from 'fast-check';
import {
  createRuntimeConfiguration,
  GuidV4Provider,
  ObjectIdProvider,
  ECIESService as BrowserECIES,
  type IECIESConfig,
} from '@digitaldefiance/ecies-lib';
import { ECIESService as NodeECIES } from '../../src/services/ecies/service';

describe('Property-Based Test: Cross-Platform Constructor Consistency', () => {
  /**
   * Property 3: Cross-Platform Consistency
   *
   * For any valid configuration object, passing it to ECIESService in the browser
   * library should have the same TypeScript behavior as passing it to ECIESService
   * in the Node.js library.
   */
  describe('Property 3: Cross-Platform Consistency', () => {
    it('should accept IConstants in both browser and Node.js libraries', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
            { BcryptRounds: 10 },
            { BcryptRounds: 12 },
          ),
          (overrides) => {
            // Create IConstants using createRuntimeConfiguration
            const config = createRuntimeConfiguration(overrides);

            // Both libraries should accept IConstants without TypeScript errors
            const browserService = new BrowserECIES(config);
            const nodeService = new NodeECIES(config);

            // Both should be properly initialized
            expect(browserService).toBeInstanceOf(BrowserECIES);
            expect(nodeService).toBeInstanceOf(NodeECIES);

            // Both should extract the same ECIES config
            expect(browserService.config.curveName).toBe(
              config.ECIES.CURVE_NAME,
            );
            expect(nodeService.config.curveName).toBe(config.ECIES.CURVE_NAME);

            expect(browserService.config.symmetricAlgorithm).toBe(
              config.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
            );
            expect(nodeService.config.symmetricAlgorithm).toBe(
              config.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
            );

            expect(browserService.config.symmetricKeyBits).toBe(
              config.ECIES.SYMMETRIC.KEY_BITS,
            );
            expect(nodeService.config.symmetricKeyBits).toBe(
              config.ECIES.SYMMETRIC.KEY_BITS,
            );

            // Both should have identical config
            expect(browserService.config).toEqual(nodeService.config);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept Partial<IECIESConfig> in both libraries', () => {
      fc.assert(
        fc.property(
          fc.record(
            {
              curveName: fc.constantFrom('secp256k1', 'secp256k1'),
              symmetricAlgorithm: fc.constantFrom('aes-256-gcm', 'aes-256-gcm'),
              symmetricKeyBits: fc.constantFrom(256, 256),
            },
            { requiredKeys: [] },
          ),
          (partialConfig) => {
            // Both libraries should accept Partial<IECIESConfig>
            const browserService = new BrowserECIES(partialConfig);
            const nodeService = new NodeECIES(partialConfig);

            // Both should be properly initialized
            expect(browserService).toBeInstanceOf(BrowserECIES);
            expect(nodeService).toBeInstanceOf(NodeECIES);

            // Both should have the same config
            expect(browserService.config).toEqual(nodeService.config);

            // Verify partial config values were applied identically
            if (partialConfig.curveName) {
              expect(browserService.config.curveName).toBe(
                partialConfig.curveName,
              );
              expect(nodeService.config.curveName).toBe(
                partialConfig.curveName,
              );
            }
            if (partialConfig.symmetricAlgorithm) {
              expect(browserService.config.symmetricAlgorithm).toBe(
                partialConfig.symmetricAlgorithm,
              );
              expect(nodeService.config.symmetricAlgorithm).toBe(
                partialConfig.symmetricAlgorithm,
              );
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should accept no parameters in both libraries', () => {
      fc.assert(
        fc.property(fc.constant(undefined), () => {
          // Both libraries should accept no parameters
          const browserService = new BrowserECIES();
          const nodeService = new NodeECIES();

          // Both should be properly initialized
          expect(browserService).toBeInstanceOf(BrowserECIES);
          expect(nodeService).toBeInstanceOf(NodeECIES);

          // Both should have identical default config
          expect(browserService.config).toEqual(nodeService.config);
        }),
        { numRuns: 100 },
      );
    });

    it('should produce equivalent services from same IConstants', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
          ),
          (overrides) => {
            const config = createRuntimeConfiguration(overrides);

            const browserService = new BrowserECIES(config);
            const nodeService = new NodeECIES(config);

            // Both should generate mnemonics with same word count
            const browserMnemonic = browserService.generateNewMnemonic();
            const nodeMnemonic = nodeService.generateNewMnemonic();

            expect(browserMnemonic.value?.split(' ').length).toBe(24);
            expect(nodeMnemonic.value?.split(' ').length).toBe(24);

            // Both should produce key pairs with same structure
            const browserKeyPair =
              browserService.mnemonicToSimpleKeyPair(browserMnemonic);
            const nodeKeyPair =
              nodeService.mnemonicToSimpleKeyPair(nodeMnemonic);

            expect(browserKeyPair.privateKey).toBeInstanceOf(Uint8Array);
            expect(nodeKeyPair.privateKey).toBeInstanceOf(Uint8Array);
            expect(browserKeyPair.publicKey).toBeInstanceOf(Uint8Array);
            expect(nodeKeyPair.publicKey).toBeInstanceOf(Uint8Array);

            expect(browserKeyPair.privateKey.length).toBe(32);
            expect(nodeKeyPair.privateKey.length).toBe(32);
            expect(browserKeyPair.publicKey.length).toBe(33);
            expect(nodeKeyPair.publicKey.length).toBe(33);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle documented usage pattern identically', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(new GuidV4Provider(), new ObjectIdProvider()),
          (idProvider) => {
            // This is the documented pattern from README
            const config = createRuntimeConfiguration({ idProvider });

            // Both libraries should accept this pattern
            const browserService = new BrowserECIES(config);
            const nodeService = new NodeECIES(config);

            // Both should work identically
            expect(browserService).toBeInstanceOf(BrowserECIES);
            expect(nodeService).toBeInstanceOf(NodeECIES);
            expect(browserService.config).toEqual(nodeService.config);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should extract ECIES config identically from IConstants', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { idProvider: new GuidV4Provider() },
            { idProvider: new ObjectIdProvider() },
            {},
          ),
          (overrides) => {
            const constants = createRuntimeConfiguration(overrides);

            const browserService = new BrowserECIES(constants);
            const nodeService = new NodeECIES(constants);

            // Both should extract identical ECIES config
            const browserConfig: IECIESConfig = {
              curveName: browserService.config.curveName,
              primaryKeyDerivationPath:
                browserService.config.primaryKeyDerivationPath,
              mnemonicStrength: browserService.config.mnemonicStrength,
              symmetricAlgorithm: browserService.config.symmetricAlgorithm,
              symmetricKeyBits: browserService.config.symmetricKeyBits,
              symmetricKeyMode: browserService.config.symmetricKeyMode,
            };

            const nodeConfig: IECIESConfig = {
              curveName: nodeService.config.curveName,
              primaryKeyDerivationPath:
                nodeService.config.primaryKeyDerivationPath,
              mnemonicStrength: nodeService.config.mnemonicStrength,
              symmetricAlgorithm: nodeService.config.symmetricAlgorithm,
              symmetricKeyBits: nodeService.config.symmetricKeyBits,
              symmetricKeyMode: nodeService.config.symmetricKeyMode,
            };

            expect(browserConfig).toEqual(nodeConfig);
            expect(browserConfig).toEqual({
              curveName: constants.ECIES.CURVE_NAME,
              primaryKeyDerivationPath:
                constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
              mnemonicStrength: constants.ECIES.MNEMONIC_STRENGTH,
              symmetricAlgorithm:
                constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
              symmetricKeyBits: constants.ECIES.SYMMETRIC.KEY_BITS,
              symmetricKeyMode: constants.ECIES.SYMMETRIC.MODE,
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
