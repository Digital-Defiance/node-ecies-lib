/**
 * Node-ECIES i18n Setup - v2.0 Architecture
 * Uses i18n-lib 2.0 patterns with runtime validation
 */

import type { ComponentConfig, EngineConfig } from '@digitaldefiance/i18n-lib';
import {
  I18nEngine,
  LanguageCodes,
  createCoreComponentRegistration,
  createDefaultLanguages,
} from '@digitaldefiance/i18n-lib';

export const EciesI18nEngineKey =
  'DigitalDefiance.NodeEcies.I18nEngine' as const;
export const EciesComponentId = 'node-ecies' as const;

/**
 * Create Node-ECIES component configuration
 * For now, just minimal English translations for errors
 */
export function createEciesComponentConfig(): ComponentConfig {
  return {
    id: EciesComponentId,
    strings: {
      [LanguageCodes.EN_US]: {
        // Voting errors
        PrivateKeyMustBeBuffer: 'Private key must be a Buffer',
        PublicKeyMustBeBuffer: 'Public key must be a Buffer',
        InvalidPublicKeyFormat: 'Invalid public key format',
        InvalidEcdhKeyPair: 'Invalid ECDH key pair',
        FailedToDeriveVotingKeys: 'Failed to derive voting keys',
        FailedToGeneratePrime: 'Failed to generate prime',
        IdenticalPrimes:
          'Generated identical primes - this should never happen',
        KeyPairValidationFailed: 'Key pair validation failed',
        KeyPairTooSmall: 'Key pair too small',
        ModularInverseDoesNotExist: 'Modular inverse does not exist',
        InvalidKeyPairPublicKeyNotIsolated:
          'Public key must be an IsolatedPublicKey',
        InvalidKeyPairPrivateKeyNotIsolated:
          'Private key must be an IsolatedPrivateKey',
        InvalidPublicKeyNotIsolated: 'Public key must be an IsolatedPublicKey',
        InvalidPublicKeyBufferTooShort: 'Public key buffer too short',
        InvalidPublicKeyBufferWrongMagic:
          'Public key buffer has wrong magic bytes',
        UnsupportedPublicKeyVersion: 'Unsupported public key version',
        InvalidPublicKeyBufferIncompleteN: 'Public key buffer incomplete (n)',
        InvalidPublicKeyBufferFailedToParseN:
          'Failed to parse n from public key buffer',
        InvalidPublicKeyIdMismatch: 'Public key ID mismatch',
        InvalidPrivateKeyBufferTooShort: 'Private key buffer too short',
        InvalidPrivateKeyBufferWrongMagic:
          'Private key buffer has wrong magic bytes',
        UnsupportedPrivateKeyVersion: 'Unsupported private key version',
        InvalidPrivateKeyBufferIncompleteLambda:
          'Private key buffer incomplete (lambda)',
        InvalidPrivateKeyBufferIncompleteMuLength:
          'Private key buffer incomplete (mu length)',
        InvalidPrivateKeyBufferIncompleteMu:
          'Private key buffer incomplete (mu)',
        InvalidPrivateKeyBufferFailedToParse:
          'Failed to parse private key buffer',
        InvalidPrivateKeyBufferFailedToCreate:
          'Failed to create private key from buffer',
        InstanceIdMismatch: 'Instance ID mismatch',
        InvalidCiphertextHmac: 'Invalid ciphertext HMAC',
        CiphertextNotFromThisInstance:
          'Ciphertext was not created by this key instance',
      },
      [LanguageCodes.EN_GB]: {
        // Just alias to EN_US for now
      },
    },
  };
}

/**
 * Create Node-ECIES i18n engine instance
 * Uses i18n 2.0 pattern with runtime validation
 * IMPORTANT: Uses 'default' as instance key so TypedHandleableError can find it
 */
function createInstance(config?: EngineConfig): I18nEngine {
  const engine = I18nEngine.registerIfNotExists(
    'default',
    createDefaultLanguages(),
    config,
  );

  // Register core component first (required for error messages)
  const coreReg = createCoreComponentRegistration();
  engine.registerIfNotExists({
    id: coreReg.component.id,
    strings: coreReg.strings as Record<string, Record<string, string>>,
  });

  // Register Node-ECIES component
  const eciesConfig = createEciesComponentConfig();
  const result = engine.registerIfNotExists({
    ...eciesConfig,
    aliases: ['VotingErrorType'],
  });

  // Warn about missing translations (non-blocking)
  if (!result.isValid && result.errors.length > 0) {
    console.warn(
      `Node-ECIES component has ${result.errors.length} errors`,
      result.errors.slice(0, 5), // Show first 5
    );
  }

  return engine;
}

// Create singleton instance
let _engineInstance: I18nEngine | undefined = undefined;

/**
 * Get or create the ECIES i18n engine instance
 */
export function getEciesI18nEngine(config?: EngineConfig): I18nEngine {
  if (!_engineInstance || !I18nEngine.hasInstance('default')) {
    _engineInstance = createInstance(config);
  }
  return _engineInstance;
}

/**
 * Proxy for backward compatibility
 */
export const eciesI18nEngine = new Proxy({} as I18nEngine, {
  get(target, prop) {
    return getEciesI18nEngine()[prop as keyof I18nEngine];
  },
});

/**
 * Manually destroy the engine instance (for testing)
 */
export function destroyEciesI18nEngine(): void {
  _engineInstance = undefined;
}
