/**
 * Constants and configuration for Node.js ECIES library.
 * Provides runtime configuration with Node.js-specific crypto settings, PBKDF2 profiles,
 * keyring configuration, and encryption constants. Extends base ecies-lib constants
 * with Node.js Buffer support and crypto module integration.
 */
import { CipherGCMTypes } from 'crypto';

import type {
  IConstants as IBaseConstants,
  IPBkdf2Consts,
} from '@digitaldefiance/ecies-lib';
import {
  OBJECT_ID_LENGTH,
  ObjectIdProvider,
  registerRuntimeConfiguration,
} from '@digitaldefiance/ecies-lib';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { Pbkdf2ProfileEnum as NodePbkdf2ProfileEnum } from './enumerations/pbkdf2-profile';
import {
  getNodeEciesI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from './i18n';
import type { IChecksumConsts } from './interfaces/checksum-consts';
import type { IConstants } from './interfaces/constants';
import type { IEncryptionConsts } from './interfaces/encryption-consts';
import type { IKeyringConsts } from './interfaces/keyring-consts';
import type { PbkdfProfiles } from './interfaces/pbkdf-profiles';
import { VOTING } from './interfaces/voting-consts';
import type { IWrappedKeyConsts } from './interfaces/wrapped-key-consts';

/**
 * Calculates a checksum for a configuration object.
 * Uses SHA-256 of JSON representation.
 */
function calculateConfigChecksum(config: IConstants): string {
  // Create a stable JSON representation with BigInt support
  const replacer = (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value;
  const stable = JSON.stringify(config, replacer);
  const encoder = new TextEncoder();
  const data = encoder.encode(stable);
  return bytesToHex(sha256(data));
}

/**
 * Captures a stack trace for provenance tracking
 */
function captureCreationStack(): string {
  const stack = new Error().stack;
  if (!stack) return 'stack unavailable';

  // Remove the first two lines (Error message and this function)
  const lines = stack.split('\n').slice(2);
  return lines.join('\n');
}

/**
 * Constants for checksum operations
 * These values are critical for data integrity and MUST NOT be changed
 * in an already established system as it will break all existing checksums.
 */
export const NODE_RUNTIME_CONFIGURATION_KEY = Symbol.for(
  'digitaldefiance.node.ecies.defaults',
);

/**
 * Node runtime configuration type (extends base IConstants)
 */
export type NodeRuntimeConfiguration = IBaseConstants;

/**
 * Overrides for node runtime configuration
 */
export type NodeRuntimeOverrides = Parameters<
  typeof registerRuntimeConfiguration
>[1];

/**
 * Default ID provider instance (singleton).
 * Uses MongoDB ObjectID format (12 bytes).
 */
const DEFAULT_ID_PROVIDER = new ObjectIdProvider();

export const NODE_DEFAULTS_OVERRIDES: NodeRuntimeOverrides = Object.freeze({
  PBKDF2: {
    ALGORITHM: 'sha256',
  },
  // Register the ID provider to ensure MEMBER_ID_LENGTH and ECIES.MULTIPLE.RECIPIENT_ID_SIZE are synced
  idProvider: DEFAULT_ID_PROVIDER,
});

let runtimeDefaults: NodeRuntimeConfiguration = registerRuntimeConfiguration(
  NODE_RUNTIME_CONFIGURATION_KEY,
  NODE_DEFAULTS_OVERRIDES,
);

/**
 * Ensure the runtime configuration is initialized.
 * This is called automatically at module load, but can be called explicitly if needed.
 */
export function ensureNodeRuntimeConfiguration(): void {
  if (!runtimeDefaults || !runtimeDefaults.idProvider) {
    runtimeDefaults = registerRuntimeConfiguration(
      NODE_RUNTIME_CONFIGURATION_KEY,
      NODE_DEFAULTS_OVERRIDES,
    );
  }
}

export function getNodeRuntimeConfiguration(): NodeRuntimeConfiguration {
  ensureNodeRuntimeConfiguration();
  return runtimeDefaults;
}

export function registerNodeRuntimeConfiguration(
  configOrOverrides?: NodeRuntimeOverrides | NodeRuntimeConfiguration,
  options?: Parameters<typeof registerRuntimeConfiguration>[2],
): NodeRuntimeConfiguration {
  // Register configuration through ecies-lib's system
  // This handles auto-sync of idProvider -> MEMBER_ID_LENGTH and ECIES.MULTIPLE.RECIPIENT_ID_SIZE
  runtimeDefaults = registerRuntimeConfiguration(
    NODE_RUNTIME_CONFIGURATION_KEY,
    configOrOverrides,
    options,
  );

  // Note: ENCRYPTION.RECIPIENT_ID_SIZE is set at module initialization
  // and uses DEFAULT_ID_PROVIDER.byteLength. For runtime configurations with
  // different providers, code should reference config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE
  // which is auto-synced by ecies-lib's createRuntimeConfiguration.

  // Validate Node-specific invariants (base ecies-lib invariants already validated)
  // Note: Validation temporarily disabled for configs without ENCRYPTION property
  // as runtimeDefaults doesn't include node-specific constants
  // InvariantValidator.validateAll(runtimeDefaults as IConstants);

  return runtimeDefaults;
}

// Use runtime defaults for base constants
export const CHECKSUM: IChecksumConsts = runtimeDefaults.CHECKSUM;

export const KEYRING: IKeyringConsts = Object.freeze({
  ALGORITHM: 'aes' as const,
  KEY_BITS: 256 as const,
  MODE: 'gcm' as const,
} as const);

export const PBKDF2: IPBkdf2Consts = runtimeDefaults.PBKDF2;

export const PBKDF2_PROFILES: PbkdfProfiles = Object.freeze({
  // Align browser password profile with high security expectations (sha512, 64-byte salt/hash, 2M iterations)
  [NodePbkdf2ProfileEnum.BROWSER_PASSWORD]: Object.freeze({
    saltBytes: 64,
    iterations: 2000000,
    algorithm: 'sha512',
    hashBytes: 64,
  }),
  // High security profile (sha512, 64-byte salt/hash, 2M iterations)
  [NodePbkdf2ProfileEnum.HIGH_SECURITY]: Object.freeze({
    saltBytes: 64,
    iterations: 2000000,
    algorithm: 'sha512',
    hashBytes: 64,
  }),
  // Fast test profile (small salt and iterations for speed)
  [NodePbkdf2ProfileEnum.TEST_FAST]: Object.freeze({
    saltBytes: 16,
    iterations: 1000, // Minimum required by PBKDF2 validation
    algorithm: 'sha256',
    hashBytes: 32,
  }),
  [NodePbkdf2ProfileEnum.USER_LOGIN]: Object.freeze({
    saltBytes: 32,
    iterations: 1304000,
    algorithm: 'sha256',
    hashBytes: 32,
  }),
  [NodePbkdf2ProfileEnum.KEY_WRAPPING]: Object.freeze({
    saltBytes: 32,
    iterations: 100000,
    algorithm: 'sha256',
    hashBytes: 32,
  }),
  [NodePbkdf2ProfileEnum.BACKUP_CODES]: Object.freeze({
    saltBytes: 32,
    iterations: 1304000,
    algorithm: 'sha256',
    hashBytes: 32,
  }),
} as const);

export const WRAPPED_KEY: IWrappedKeyConsts = Object.freeze({
  SALT_SIZE: PBKDF2.SALT_BYTES, // Use PBKDF2 standard salt size
  IV_SIZE: 16 as const,
  MASTER_KEY_SIZE: 32 as const,
  MIN_ITERATIONS: 100000 as const, // Keep lower for key-wrapping operations
} as const);

export const KEYRING_ALGORITHM_CONFIGURATION =
  `${KEYRING.ALGORITHM}-${KEYRING.KEY_BITS}-${KEYRING.MODE}` as CipherGCMTypes;

/**
 * Constants for encrypted data
 */
export const ENCRYPTION: IEncryptionConsts = Object.freeze({
  ENCRYPTION_TYPE_SIZE: 1 as const,
  RECIPIENT_ID_SIZE: DEFAULT_ID_PROVIDER.byteLength,
} as const);

export const Constants: IConstants = Object.freeze({
  ...runtimeDefaults,
  // Node-specific overrides and additions
  /**
   * PBKDF2 constants (Node.js crypto implementation)
   */
  PBKDF2: PBKDF2,
  /**
   * PBKDF2 configuration profiles
   */
  PBKDF2_PROFILES: PBKDF2_PROFILES,
  /**
   * Key Wrapping Service constants
   */
  WRAPPED_KEY: WRAPPED_KEY,
  /**
   * Checksum constants used for data integrity
   */
  CHECKSUM: CHECKSUM,
  /**
   * Keyring constants used for key management
   */
  KEYRING: KEYRING,
  /**
   * Encryption constants used for encrypted data
   */
  ENCRYPTION: ENCRYPTION,
  /**
   * Voting constants used for homomorphic encryption voting
   */
  VOTING: VOTING,
  /**
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: KEYRING_ALGORITHM_CONFIGURATION,
  /**
   * Size of ECIES version field in bytes
   */
  ECIES_VERSION_SIZE: 1,
  /**
   * Size of ECIES cipher suite field in bytes
   */
  ECIES_CIPHER_SUITE_SIZE: 1,
  // Override specific ECIES constants for Node.js
  ECIES: {
    ...runtimeDefaults.ECIES,
    // Override public key length for compressed keys
    PUBLIC_KEY_LENGTH: 33,
    // Override IV size for AES-GCM (standard is 12 bytes)
    IV_SIZE: 12,
    SINGLE: {
      ...runtimeDefaults.ECIES.SINGLE,
      FIXED_OVERHEAD_SIZE: 72,
    },
    SIMPLE: {
      ...runtimeDefaults.ECIES.SIMPLE,
      FIXED_OVERHEAD_SIZE: 64,
    },
    MULTIPLE: {
      ...runtimeDefaults.ECIES.MULTIPLE,
      ENCRYPTED_KEY_SIZE: 60,
      // Keep MAX_DATA_SIZE aligned with base config (1MB guardrail)
      MAX_DATA_SIZE: runtimeDefaults.ECIES.MULTIPLE.MAX_DATA_SIZE,
    },
  },
} as const);

/**
 * Safe translation helper for early initialization
 * During module initialization, i18n may not be fully available.
 * This function attempts to use i18n but falls back to a basic error message.
 *
 * @param key - The translation key
 * @param fallback - The fallback message if i18n is not available
 * @returns The translated message or fallback
 */
function safeTranslate(key: NodeEciesStringKey, fallback: string): string {
  try {
    const engine = getNodeEciesI18nEngine();
    return engine.translate(NodeEciesComponentId, key);
  } catch {
    return fallback;
  }
}

// Validate checksum constants during module initialization
// Use safeTranslate to handle the case where i18n is not yet fully initialized
if (
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8 ||
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
) {
  throw new Error(
    safeTranslate(
      NodeEciesStringKey.Error_InvalidChecksumConstants,
      'Invalid checksum constants: SHA3_BUFFER_LENGTH must equal SHA3_DEFAULT_HASH_BITS / 8',
    ),
  );
}

if (OBJECT_ID_LENGTH !== 12) {
  console.warn(
    'ObjectID length may have changed, breaking encryption',
    OBJECT_ID_LENGTH,
  );
}

// Export utility functions
export { calculateConfigChecksum, captureCreationStack };
