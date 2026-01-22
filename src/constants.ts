/**
 * Constants and configuration for Node.js ECIES library.
 * Provides runtime configuration with Node.js-specific crypto settings, PBKDF2 profiles,
 * keyring configuration, and encryption constants. Extends base ecies-lib constants
 * with Node.js Buffer support and crypto module integration.
 */
import { CipherGCMTypes } from 'crypto';

import type { IPBkdf2Consts } from '@digitaldefiance/ecies-lib';
import {
  ObjectIdProvider,
  registerRuntimeConfiguration,
  Constants as BaseConstants,
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
export type NodeRuntimeConfiguration = IConstants;

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

// Import base constants from ecies-lib

// Use base constants directly
export const CHECKSUM: IChecksumConsts = BaseConstants.CHECKSUM;

export const KEYRING: IKeyringConsts = Object.freeze({
  ALGORITHM: 'aes' as const,
  KEY_BITS: 256 as const,
  MODE: 'gcm' as const,
} as const);

export const PBKDF2: IPBkdf2Consts = {
  ...BaseConstants.PBKDF2,
  ALGORITHM: 'sha256' as const,
};

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
  ...BaseConstants,
  // Node-specific overrides and additions
  PBKDF2: PBKDF2,
  PBKDF2_PROFILES: PBKDF2_PROFILES,
  WRAPPED_KEY: WRAPPED_KEY,
  CHECKSUM: CHECKSUM,
  KEYRING: KEYRING,
  ENCRYPTION: ENCRYPTION,
  VOTING: VOTING,
  KEYRING_ALGORITHM_CONFIGURATION: KEYRING_ALGORITHM_CONFIGURATION,
  ECIES_VERSION_SIZE: 1,
  ECIES_CIPHER_SUITE_SIZE: 1,
  ECIES: {
    ...BaseConstants.ECIES,
    PUBLIC_KEY_LENGTH: 33,
    IV_SIZE: 12,
    WITH_LENGTH: {
      ...BaseConstants.ECIES.WITH_LENGTH,
      FIXED_OVERHEAD_SIZE: 72,
    },
    BASIC: {
      ...BaseConstants.ECIES.BASIC,
      FIXED_OVERHEAD_SIZE: 64,
    },
    MULTIPLE: {
      ...BaseConstants.ECIES.MULTIPLE,
      ENCRYPTED_KEY_SIZE: 60,
      MAX_DATA_SIZE: BaseConstants.ECIES.MULTIPLE.MAX_DATA_SIZE,
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

/**
 * Creates a node-specific runtime configuration with overrides.
 * Uses Constants as the base and applies node-specific defaults.
 */
export function createNodeRuntimeConfiguration(
  overrides?: NodeRuntimeOverrides,
): NodeRuntimeConfiguration {
  return registerRuntimeConfiguration<NodeRuntimeConfiguration>(
    Symbol('node-runtime-config'),
    { ...overrides },
    { baseKey: NODE_RUNTIME_CONFIGURATION_KEY },
  );
}

/**
 * Registers a node-specific runtime configuration.
 *
 * @overload When called with just overrides, generates a unique symbol key automatically.
 * @overload When called with a key and overrides, uses the provided key.
 */
export function registerNodeRuntimeConfiguration(
  overrides: NodeRuntimeOverrides,
): NodeRuntimeConfiguration;
export function registerNodeRuntimeConfiguration(
  key: symbol | string,
  overrides?: NodeRuntimeOverrides,
): NodeRuntimeConfiguration;
export function registerNodeRuntimeConfiguration(
  keyOrOverrides: symbol | string | NodeRuntimeOverrides,
  overrides?: NodeRuntimeOverrides,
): NodeRuntimeConfiguration {
  let result: NodeRuntimeConfiguration;

  // Check if first argument is overrides (an object that's not a symbol or string)
  if (
    typeof keyOrOverrides === 'object' &&
    keyOrOverrides !== null &&
    !(typeof keyOrOverrides === 'symbol')
  ) {
    // Called with just overrides - generate a unique key
    result = registerRuntimeConfiguration<NodeRuntimeConfiguration>(
      Symbol('node-runtime-config'),
      keyOrOverrides as NodeRuntimeOverrides,
      {
        baseKey: NODE_RUNTIME_CONFIGURATION_KEY,
      },
    );
  } else {
    // Called with key and optional overrides
    result = registerRuntimeConfiguration<NodeRuntimeConfiguration>(
      keyOrOverrides as symbol | string,
      overrides,
      {
        baseKey: NODE_RUNTIME_CONFIGURATION_KEY,
      },
    );
  }

  // Update the runtimeDefaults so that getNodeRuntimeConfiguration() returns
  // the most recently registered configuration
  runtimeDefaults = result;

  return result;
}

// Register the default node configuration in the registry
let runtimeDefaults = registerRuntimeConfiguration(
  NODE_RUNTIME_CONFIGURATION_KEY,
  Constants as IConstants,
);

export function ensureNodeRuntimeConfiguration(): void {
  if (!runtimeDefaults || !runtimeDefaults.idProvider) {
    runtimeDefaults = registerRuntimeConfiguration(
      NODE_RUNTIME_CONFIGURATION_KEY,
      Constants,
    );
  }
}

export function getNodeRuntimeConfiguration(): NodeRuntimeConfiguration {
  ensureNodeRuntimeConfiguration();
  return runtimeDefaults;
}

// Export utility functions
export { calculateConfigChecksum, captureCreationStack };
