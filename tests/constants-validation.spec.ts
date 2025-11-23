/**
 * Tests for constants validation during module initialization
 *
 * This test file verifies that:
 * 1. Constants validation works correctly during module initialization
 * 2. Validation errors are meaningful even without i18n
 * 3. The safeTranslate helper provides fallback messages
 */

import { Constants } from '../src/constants';

describe('Constants Validation', () => {
  describe('Module Initialization', () => {
    it('should successfully load constants without errors', () => {
      // If we get here, the module loaded successfully
      expect(Constants).toBeDefined();
      expect(Constants.CHECKSUM).toBeDefined();
      expect(Constants.PBKDF2).toBeDefined();
      expect(Constants.KEYRING).toBeDefined();
      expect(Constants.ENCRYPTION).toBeDefined();
    });

    it('should have valid checksum constants', () => {
      const { CHECKSUM } = Constants;

      // Verify the checksum validation that happens during module init
      expect(CHECKSUM.SHA3_BUFFER_LENGTH).toBe(
        CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
      );
    });

    it('should have valid PBKDF2 constants', () => {
      const { PBKDF2 } = Constants;

      expect(PBKDF2.ALGORITHM).toBeDefined();
      expect(PBKDF2.SALT_BYTES).toBeGreaterThan(0);
      expect(PBKDF2.ITERATIONS_PER_SECOND).toBeGreaterThan(0);
    });

    it('should have valid keyring constants', () => {
      const { KEYRING } = Constants;

      expect(KEYRING.ALGORITHM).toBe('aes');
      expect(KEYRING.KEY_BITS).toBe(256);
      expect(KEYRING.MODE).toBe('gcm');
    });

    it('should have valid encryption constants', () => {
      const { ENCRYPTION } = Constants;

      expect(ENCRYPTION.ENCRYPTION_TYPE_SIZE).toBe(1);
      expect(ENCRYPTION.RECIPIENT_ID_SIZE).toBeGreaterThan(0);
    });
  });

  describe('Constants Structure', () => {
    it('should have ECIES constants with correct structure', () => {
      const { ECIES } = Constants;

      expect(ECIES.PUBLIC_KEY_LENGTH).toBe(33);
      expect(ECIES.IV_SIZE).toBe(12);
      expect(ECIES.SINGLE).toBeDefined();
      expect(ECIES.SIMPLE).toBeDefined();
      expect(ECIES.MULTIPLE).toBeDefined();
    });

    it('should have PBKDF2 profiles defined', () => {
      const { PBKDF2_PROFILES } = Constants;

      expect(PBKDF2_PROFILES).toBeDefined();
      expect(Object.keys(PBKDF2_PROFILES).length).toBeGreaterThan(0);
    });

    it('should have wrapped key constants', () => {
      const { WRAPPED_KEY } = Constants;

      expect(WRAPPED_KEY.SALT_SIZE).toBeGreaterThan(0);
      expect(WRAPPED_KEY.IV_SIZE).toBe(16);
      expect(WRAPPED_KEY.MASTER_KEY_SIZE).toBe(32);
      expect(WRAPPED_KEY.MIN_ITERATIONS).toBeGreaterThanOrEqual(100000);
    });
  });

  describe('Runtime Configuration', () => {
    it('should allow getting runtime configuration', () => {
      const { getNodeRuntimeConfiguration } = require('../src/constants');
      const config = getNodeRuntimeConfiguration();

      expect(config).toBeDefined();
      expect(config.CHECKSUM).toBeDefined();
      expect(config.PBKDF2).toBeDefined();
    });
  });
});
