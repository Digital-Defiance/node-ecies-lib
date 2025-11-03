import {
  Constants as BaseConstants,
  GUID_SIZE,
  IConstants as IBaseConstants,
  IPBkdf2Consts,
  getRuntimeConfiguration,
  registerRuntimeConfiguration,
} from '@digitaldefiance/ecies-lib';
import { CipherGCMTypes } from 'crypto';
import { ObjectId } from 'mongodb';
import { IChecksumConsts } from './interfaces/checksum-consts';
import { IConstants } from './interfaces/constants';
import { IEncryptionConsts } from './interfaces/encryption-consts';
import { IKeyringConsts } from './interfaces/keyring-consts';
import { PbkdfProfiles } from './interfaces/pbkdf-profiles';
import { IWrappedKeyConsts } from './interfaces/wrapped-key-consts';
import { Pbkdf2ProfileEnum as NodePbkdf2ProfileEnum } from './enumerations/pbkdf2-profile';
import {
  getEciesPluginI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from './i18n';

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

export const NODE_DEFAULTS_OVERRIDES: NodeRuntimeOverrides = Object.freeze({
  PBKDF2: {
    ALGORITHM: 'sha256',
  },
});

let runtimeDefaults: NodeRuntimeConfiguration = registerRuntimeConfiguration(
  NODE_RUNTIME_CONFIGURATION_KEY,
  NODE_DEFAULTS_OVERRIDES,
);

export function getNodeRuntimeConfiguration(): NodeRuntimeConfiguration {
  return runtimeDefaults;
}

export function registerNodeRuntimeConfiguration(
  configOrOverrides?: NodeRuntimeOverrides | NodeRuntimeConfiguration,
  options?: Parameters<typeof registerRuntimeConfiguration>[2],
): NodeRuntimeConfiguration {
  runtimeDefaults = registerRuntimeConfiguration(
    NODE_RUNTIME_CONFIGURATION_KEY,
    configOrOverrides,
    options,
  );
  return runtimeDefaults;
}

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
    iterations: 500,
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
  RECIPIENT_ID_SIZE: GUID_SIZE,
} as const);

const objectIdLength = Buffer.from(new ObjectId().toHexString(), 'hex').length;
export const Constants: IConstants = Object.freeze({
  ...BaseConstants,
  /**
   * The length of a raw object ID (not the hex string representation)
   */
  OBJECT_ID_LENGTH: objectIdLength,
  /**
   * PBKDF2 constants
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
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: KEYRING_ALGORITHM_CONFIGURATION,
  PasswordRegex: runtimeDefaults.PasswordRegex,
  MnemonicRegex: runtimeDefaults.MnemonicRegex,
} as const);

if (
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8 ||
  CHECKSUM.SHA3_BUFFER_LENGTH !== CHECKSUM.SHA3_DEFAULT_HASH_BITS / 8
) {
  const pluginEngine = getEciesPluginI18nEngine();
  throw new Error(
    pluginEngine.translate(
      NodeEciesComponentId,
      NodeEciesStringKey.Error_InvalidChecksumConstants,
    ),
  );
}

if (objectIdLength !== 12) {
  console.warn(
    'ObjectID length may have changed, breaking encryption',
    objectIdLength,
  );
}
