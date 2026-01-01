/**
 * Integration Tests: Documented Usage Pattern
 *
 * Feature: fix-ecies-constructor-signature
 * Task: 4.1 Write integration test for documented usage pattern
 *
 * These tests verify that the exact code examples from the README compile
 * without errors and work correctly.
 *
 * Requirements: 4.1, 4.2, 4.3
 */

import {
  createRuntimeConfiguration,
  GuidV4Provider,
  ObjectIdProvider,
} from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../../src/services/ecies/service';

describe('Integration: Documented Usage Pattern (Node.js)', () => {
  describe('README Example: Basic Usage', () => {
    it('should work with createRuntimeConfiguration pattern', () => {
      // Although the Node.js README doesn't show this pattern explicitly,
      // it should work the same as the browser library
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      // This should compile without type assertions
      const ecies = new ECIESService(config);

      expect(ecies).toBeInstanceOf(ECIESService);
      expect(ecies.config).toBeDefined();
    });

    it('should work with ObjectIdProvider', () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const ecies = new ECIESService(config);

      expect(ecies).toBeInstanceOf(ECIESService);
      expect(ecies.config).toBeDefined();
    });
  });

  describe('README Example: Quick Start', () => {
    it('should compile and execute encryption/decryption', () => {
      // Configure to use 16-byte GUIDs
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const ecies = new ECIESService(config);

      // Generate keys
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPairBuffer(mnemonic);

      // Encrypt
      const message = Buffer.from('Hello, World!');
      const encrypted = ecies.encryptSimpleOrSingle(
        true,
        keyPair.publicKey,
        message,
      );

      // Decrypt
      const decrypted = ecies.decryptSimpleOrSingleWithHeader(
        true,
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted.toString()).toBe('Hello, World!');
    });
  });

  describe('No Type Assertions Required', () => {
    it('should not require "as any" or type assertions', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      // Before the fix, this would require: new ECIESService(config as any)
      // After the fix, this should work without type assertions
      const ecies = new ECIESService(config);

      expect(ecies).toBeInstanceOf(ECIESService);
    });

    it('should accept IConstants directly from createRuntimeConfiguration', () => {
      // The return type of createRuntimeConfiguration is IConstants
      // This should be accepted by ECIESService constructor
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      // TypeScript should accept this without errors
      const ecies = new ECIESService(config);

      expect(ecies).toBeInstanceOf(ECIESService);
      expect(ecies.config).toBeDefined();
    });
  });

  describe('Functional Verification', () => {
    it('should create a fully functional service from documented pattern', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const ecies = new ECIESService(config);

      // Verify all core functionality works
      const mnemonic = ecies.generateNewMnemonic();
      expect(mnemonic.value?.split(' ').length).toBe(24);

      const keyPair = ecies.mnemonicToSimpleKeyPairBuffer(mnemonic);
      expect(keyPair.privateKey).toBeInstanceOf(Buffer);
      expect(keyPair.publicKey).toBeInstanceOf(Buffer);

      const message = Buffer.from('Test message');
      const encrypted = ecies.encryptSimpleOrSingle(
        true,
        keyPair.publicKey,
        message,
      );

      const decrypted = ecies.decryptSimpleOrSingleWithHeader(
        true,
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted.toString()).toBe('Test message');
    });

    it('should correctly use ECIES config from IConstants', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const ecies = new ECIESService(config);

      // Verify ECIES config was correctly extracted
      expect(ecies.config.curveName).toBe(config.ECIES.CURVE_NAME);
      expect(ecies.config.symmetricAlgorithm).toBe(
        config.ECIES.SYMMETRIC.ALGORITHM,
      );
      expect(ecies.config.symmetricKeyBits).toBe(
        config.ECIES.SYMMETRIC.KEY_BITS,
      );
      expect(ecies.config.symmetricKeyMode).toBe(config.ECIES.SYMMETRIC.MODE);
      expect(ecies.config.primaryKeyDerivationPath).toBe(
        config.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      );
      expect(ecies.config.mnemonicStrength).toBe(
        config.ECIES.MNEMONIC_STRENGTH,
      );
    });
  });

  describe('Cross-Platform Pattern Consistency', () => {
    it('should use the same pattern as browser library', () => {
      // This test verifies that the Node.js library accepts the same
      // documented pattern as the browser library
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const ecies = new ECIESService(config);

      expect(ecies).toBeInstanceOf(ECIESService);
      expect(ecies.config).toBeDefined();
    });

    it('should work with both Buffer and Uint8Array patterns', () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const ecies = new ECIESService(config);

      const mnemonic = ecies.generateNewMnemonic();

      // Node.js library uses Buffer
      const keyPairBuffer = ecies.mnemonicToSimpleKeyPairBuffer(mnemonic);
      expect(keyPairBuffer.privateKey).toBeInstanceOf(Buffer);
      expect(keyPairBuffer.publicKey).toBeInstanceOf(Buffer);

      // But should also work with Uint8Array (cross-platform)
      const keyPairUint8 = ecies.mnemonicToSimpleKeyPair(mnemonic);
      expect(keyPairUint8.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPairUint8.publicKey).toBeInstanceOf(Uint8Array);
    });
  });
});
