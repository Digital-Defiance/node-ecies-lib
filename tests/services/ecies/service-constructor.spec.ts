/**
 * Unit Tests: ECIESService Constructor Signature
 *
 * Feature: fix-ecies-constructor-signature
 * These tests validate the constructor accepts both IConstants and Partial<IECIESConfig>
 */

import {
  createRuntimeConfiguration,
  IConstants,
  GuidV4Provider,
  ObjectIdProvider,
} from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../../../src/services/ecies/service';
import type { IECIESConfig } from '@digitaldefiance/ecies-lib';

describe('Unit Tests: ECIESService Constructor', () => {
  describe('IConstants Acceptance', () => {
    it('should accept IConstants without TypeScript errors', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      // This should compile without errors
      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
    });

    it('should accept IConstants with ObjectIdProvider', () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
    });

    it('should accept IConstants with custom overrides', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
        BcryptRounds: 12,
      });

      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
    });
  });

  describe('Partial<IECIESConfig> Acceptance', () => {
    it('should accept Partial<IECIESConfig> without TypeScript errors', () => {
      const config: Partial<IECIESConfig> = {
        curveName: 'secp256k1',
        symmetricAlgorithm: 'aes-256-gcm',
      };

      // This should compile without errors (backward compatibility)
      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
      expect(service.config.curveName).toBe('secp256k1');
      expect(service.config.symmetricAlgorithm).toBe('aes-256-gcm');
    });

    it('should accept empty Partial<IECIESConfig>', () => {
      const config: Partial<IECIESConfig> = {};

      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
    });

    it('should accept Partial<IECIESConfig> with only some fields', () => {
      const config: Partial<IECIESConfig> = {
        symmetricKeyBits: 256,
      };

      const service = new ECIESService(config);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config.symmetricKeyBits).toBe(256);
    });
  });

  describe('No Parameters', () => {
    it('should accept no parameters and use defaults', () => {
      const service = new ECIESService();

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
      expect(service.config.curveName).toBeDefined();
      expect(service.config.symmetricAlgorithm).toBeDefined();
    });
  });

  describe('ECIES Config Extraction from IConstants', () => {
    it('should extract ECIES config from IConstants correctly', () => {
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

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
    });

    it('should extract config and create working service', () => {
      const constants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const service = new ECIESService(constants);

      // Verify the service is functional
      const mnemonic = service.generateNewMnemonic();
      expect(mnemonic.value).toBeDefined();
      expect(mnemonic.value?.split(' ').length).toBe(24);

      const keyPair = service.mnemonicToSimpleKeyPairBuffer(mnemonic);
      expect(keyPair.privateKey).toBeInstanceOf(Buffer);
      expect(keyPair.publicKey).toBeInstanceOf(Buffer);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing usage patterns with Partial<IECIESConfig>', () => {
      const config: Partial<IECIESConfig> = {
        curveName: 'secp256k1',
        symmetricAlgorithm: 'aes-256-gcm',
      };

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
    });

    it('should work with no config parameter (existing pattern)', () => {
      const service = new ECIESService();

      const mnemonic = service.generateNewMnemonic();
      const keyPair = service.mnemonicToSimpleKeyPairBuffer(mnemonic);

      expect(keyPair.privateKey).toBeInstanceOf(Buffer);
      expect(keyPair.publicKey).toBeInstanceOf(Buffer);
    });

    it('should work with second parameter (eciesParams)', () => {
      const service = new ECIESService(undefined);

      expect(service).toBeInstanceOf(ECIESService);
      expect(service.config).toBeDefined();
    });
  });

  describe('Type Guard Behavior', () => {
    it('should distinguish IConstants from Partial<IECIESConfig>', () => {
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const partialConfig: Partial<IECIESConfig> = {
        curveName: 'secp256k1',
      };

      const service1 = new ECIESService(constants);
      const service2 = new ECIESService(partialConfig);

      // Both should work but extract config differently
      expect(service1.config.curveName).toBe(constants.ECIES.CURVE_NAME);
      expect(service2.config.curveName).toBe('secp256k1');
    });

    it('should handle IConstants with all ECIES properties', () => {
      const constants: IConstants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const service = new ECIESService(constants);

      // Verify all properties are correctly extracted
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
    });
  });
});
