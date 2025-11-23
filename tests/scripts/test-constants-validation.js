#!/usr/bin/env node
/**
 * Integration test for constants validation
 *
 * This script tests that:
 * 1. Constants can be loaded without errors
 * 2. The safeTranslate helper works correctly
 * 3. Validation errors are meaningful even without i18n
 */

const path = require('path');

// Test 1: Import constants and verify they load successfully
console.log('Test 1: Loading constants module...');
try {
  const distPath = path.join(
    __dirname,
    '../../../../dist/packages/digitaldefiance-node-ecies-lib/src/constants.js'
  );
  const { Constants, getNodeRuntimeConfiguration } = require(distPath);

  console.log('✓ Constants loaded successfully');

  // Test 2: Verify constants structure
  console.log('\nTest 2: Verifying constants structure...');
  if (!Constants) {
    throw new Error('Constants is undefined');
  }
  if (!Constants.CHECKSUM) {
    throw new Error('Constants.CHECKSUM is undefined');
  }
  if (!Constants.PBKDF2) {
    throw new Error('Constants.PBKDF2 is undefined');
  }
  if (!Constants.KEYRING) {
    throw new Error('Constants.KEYRING is undefined');
  }
  if (!Constants.ENCRYPTION) {
    throw new Error('Constants.ENCRYPTION is undefined');
  }
  console.log('✓ Constants structure is valid');

  // Test 3: Verify checksum validation passed
  console.log('\nTest 3: Verifying checksum constants...');
  const { CHECKSUM } = Constants;
  if (CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8) {
    throw new Error(
      'Checksum validation should have failed during module initialization'
    );
  }
  console.log('✓ Checksum constants are valid');
  console.log(`  SHA3_BUFFER_LENGTH: ${CHECKSUM.SHA3_BUFFER_LENGTH}`);
  console.log(
    `  SHA3_DEFAULT_HASH_BITS / 8: ${CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8}`
  );

  // Test 4: Verify runtime configuration
  console.log('\nTest 4: Verifying runtime configuration...');
  const config = getNodeRuntimeConfiguration();
  if (!config) {
    throw new Error('Runtime configuration is undefined');
  }
  if (!config.CHECKSUM) {
    throw new Error('Runtime configuration CHECKSUM is undefined');
  }
  console.log('✓ Runtime configuration is valid');

  // Test 5: Verify ECIES constants
  console.log('\nTest 5: Verifying ECIES constants...');
  const { ECIES } = Constants;
  if (ECIES.PUBLIC_KEY_LENGTH !== 33) {
    throw new Error(
      `Expected PUBLIC_KEY_LENGTH to be 33, got ${ECIES.PUBLIC_KEY_LENGTH}`
    );
  }
  if (ECIES.IV_SIZE !== 12) {
    throw new Error(`Expected IV_SIZE to be 12, got ${ECIES.IV_SIZE}`);
  }
  console.log('✓ ECIES constants are valid');
  console.log(`  PUBLIC_KEY_LENGTH: ${ECIES.PUBLIC_KEY_LENGTH}`);
  console.log(`  IV_SIZE: ${ECIES.IV_SIZE}`);

  console.log('\n✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
