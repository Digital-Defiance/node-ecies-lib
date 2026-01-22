/**
 * @fileoverview Usage examples for Node.js ECIES typed configuration system
 *
 * This file demonstrates how to use the strongly-typed ID provider system
 * in Node.js applications for better type safety and developer experience.
 *
 * @version 4.10.7
 * @since 4.10.7
 */

import { GuidV4Provider, UuidProvider } from '@digitaldefiance/ecies-lib';
import type { ObjectId } from 'mongodb';

import {
  getEnhancedNodeIdProvider,
  getTypedNodeIdProvider,
  createNodeTypedConfiguration,
  createNodeObjectIdConfiguration,
} from '../typed-configuration';

/**
 * Example 1: Enhanced ID Provider (Drop-in Replacement)
 *
 * The enhanced provider includes both original and typed methods,
 * making it a perfect drop-in replacement for existing code.
 */
function enhancedProviderExample() {
  console.log('=== Enhanced Provider Example ===');

  // Get enhanced provider with strong typing
  const provider = getEnhancedNodeIdProvider<ObjectId>();

  // Original methods still work (backward compatibility)
  const rawBytes = provider.generate(); // Returns Uint8Array
  // const _unknownObj = provider.fromBytes(rawBytes); // Returns unknown (requires casting)

  // New typed methods provide type safety
  const typedId = provider.generateTyped(); // Returns ObjectId (strongly typed)
  const typedFromBytes = provider.fromBytesTyped(rawBytes); // Returns ObjectId (no casting needed)

  console.log('Provider name:', provider.name);
  console.log('Byte length:', provider.byteLength);
  console.log('Typed ID generated:', typedId);
  console.log('Round-trip successful:', typedFromBytes);
}

/**
 * Example 2: Simple Typed Provider (Minimal API)
 *
 * The typed provider only exposes strongly-typed methods,
 * providing a clean API surface for new code.
 */
function typedProviderExample() {
  console.log('=== Typed Provider Example ===');

  // Get simple typed provider
  const provider = getTypedNodeIdProvider<ObjectId>();

  // Only typed methods available
  const typedId = provider.generateTyped(); // Returns ObjectId
  const bytes = provider.toBytesTyped(typedId); // Convert to bytes
  const restored = provider.fromBytesTyped(bytes); // Convert back to ObjectId

  // Serialization methods
  const serialized = provider.serializeTyped(typedId);
  const deserialized = provider.deserializeTyped(serialized);

  console.log('Provider name:', provider.name);
  console.log('Byte length:', provider.byteLength);
  console.log('Original ID:', typedId);
  console.log('Restored ID:', restored);
  console.log('Serialized:', serialized);
  console.log('Deserialized:', deserialized);
}

/**
 * Example 3: Complete Typed Configuration
 *
 * The typed configuration provides access to the full Node.js runtime
 * configuration plus convenient typed ID helpers.
 */
function typedConfigurationExample() {
  console.log('=== Typed Configuration Example ===');

  // Create ObjectId configuration
  const config = createNodeObjectIdConfiguration();

  // Access full Node.js runtime configuration
  console.log('PBKDF2 algorithm:', config.constants.PBKDF2.ALGORITHM);
  console.log('Member ID length:', config.constants.MEMBER_ID_LENGTH);

  // Use convenient typed methods
  const objectId = config.generateId(); // Returns ObjectId
  const bytes = config.idToBytes(objectId);
  const restored = config.idFromBytes(bytes);

  console.log('Generated ObjectId:', objectId);
  console.log('Byte length:', bytes.length);
  console.log('Restored ObjectId:', restored);
}

/**
 * Example 4: Custom Provider Configuration
 *
 * Demonstrates how to use different ID providers with strong typing.
 */
function customProviderExample() {
  console.log('=== Custom Provider Example ===');

  // GUID configuration
  const guidConfig = createNodeTypedConfiguration<string>('guid-config', {
    idProvider: new GuidV4Provider(),
  });

  // UUID configuration
  const uuidConfig = createNodeTypedConfiguration<string>('uuid-config', {
    idProvider: new UuidProvider(),
  });

  // Generate typed IDs
  // const _guidId = guidConfig.generateId(); // Returns GUID object (strongly typed)
  // const _uuidId = uuidConfig.generateId(); // Returns UUID string (strongly typed)

  console.log('GUID provider name:', guidConfig.constants.idProvider.name);
  console.log('GUID byte length:', guidConfig.constants.idProvider.byteLength);
  console.log('UUID provider name:', uuidConfig.constants.idProvider.name);
  console.log('UUID byte length:', uuidConfig.constants.idProvider.byteLength);
}

/**
 * Example 5: Type Safety Demonstration
 *
 * Shows how the typed system prevents common type-related errors.
 */
function typeSafetyExample() {
  console.log('=== Type Safety Example ===');

  const objectIdConfig = createNodeObjectIdConfiguration();
  const guidConfig = createNodeTypedConfiguration<string>('guid-config', {
    idProvider: new GuidV4Provider(),
  });

  // Generate strongly-typed IDs
  const objectId = objectIdConfig.generateId(); // ObjectId type
  const guidId = guidConfig.generateId(); // GUID object type

  // Type-safe operations (no casting needed)
  const objectIdBytes = objectIdConfig.idToBytes(objectId);
  const guidBytes = guidConfig.idToBytes(guidId);

  // Restore with type safety
  const restoredObjectId = objectIdConfig.idFromBytes(objectIdBytes);
  const restoredGuid = guidConfig.idFromBytes(guidBytes);

  console.log('ObjectId bytes length:', objectIdBytes.length);
  console.log('GUID bytes length:', guidBytes.length);
  console.log('ObjectId restored:', restoredObjectId);
  console.log('GUID restored:', restoredGuid);
}

/**
 * Example 6: Integration with ECIESService
 *
 * Shows how to use typed configurations with the ECIES service.
 */
function eciesIntegrationExample() {
  console.log('=== ECIES Integration Example ===');

  // Import ECIESService (commented out to avoid circular dependencies in examples)
  // import { ECIESService } from '../services/ecies/service';

  // Create typed configuration
  const config = createNodeObjectIdConfiguration();

  // Use with ECIESService
  // const service = new ECIESService(config.constants);

  // The service will use the configured ID provider
  // console.log('Service ID provider:', service.idProvider.name);
  // console.log('Service ID byte length:', service.idProvider.byteLength);

  console.log('Configuration ready for ECIESService');
  console.log('ID provider:', config.constants.idProvider.name);
  console.log('Byte length:', config.constants.idProvider.byteLength);
}

/**
 * Run all examples
 */
function runAllExamples() {
  console.log('Node.js ECIES Typed Configuration Examples\n');

  enhancedProviderExample();
  console.log();

  typedProviderExample();
  console.log();

  typedConfigurationExample();
  console.log();

  customProviderExample();
  console.log();

  typeSafetyExample();
  console.log();

  eciesIntegrationExample();
  console.log();

  console.log('All examples completed successfully!');
}

// Export examples for testing and documentation
export {
  enhancedProviderExample,
  typedProviderExample,
  typedConfigurationExample,
  customProviderExample,
  typeSafetyExample,
  eciesIntegrationExample,
  runAllExamples,
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
