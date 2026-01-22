/**
 * Constants interface for Node.js ECIES library.
 * Extends base ECIES constants with Node.js-specific additions including keyring configuration,
 * wrapped key constants, encryption constants, and Node crypto-specific PBKDF2 profiles.
 */
import type { CipherGCMTypes } from 'crypto';

import type { IConstants as IBaseConstants } from '@digitaldefiance/ecies-lib';

import type { IChecksumConsts } from './checksum-consts';
import type { IEncryptionConsts } from './encryption-consts';
import type { IKeyringConsts } from './keyring-consts';
import type { PbkdfProfiles } from './pbkdf-profiles';
import type { IWrappedKeyConsts } from './wrapped-key-consts';

/**
 * Node.js-specific constants interface.
 * Extends base ECIES constants with Node-specific additions.
 *
 * Inherited from IBaseConstants:
 * - idProvider: IIdProvider
 * - MEMBER_ID_LENGTH: number
 * - PBKDF2: IPBkdf2Consts (overridden with Node crypto implementation)
 * - PBKDF2_PROFILES: Pbkdf2Profiles (overridden with Node profiles)
 * - CHECKSUM: IChecksumConsts (overridden)
 * - ECIES: IECIESConstants
 * - And other base constants...
 */
export interface IConstants extends Omit<
  IBaseConstants,
  'PBKDF2_PROFILES' | 'CHECKSUM'
> {
  /**
   * PBKDF2 configuration profiles (Node.js-specific)
   * Overrides base profiles with Node crypto implementations
   */
  PBKDF2_PROFILES: PbkdfProfiles;
  /**
   * Checksum constants (Node.js-specific)
   * Overrides base checksum with Node crypto implementations
   */
  CHECKSUM: IChecksumConsts;
  /**
   * Wrapped Key constants used for the key wrapping service (Node.js-only)
   */
  WRAPPED_KEY: IWrappedKeyConsts;
  /**
   * Keyring constants used for key management (Node.js-only)
   */
  KEYRING: IKeyringConsts;
  /**
   * Encryption constants used for encrypted data (Node.js-only)
   */
  ENCRYPTION: IEncryptionConsts;
  /**
   * Algorithm configuration string for keyring operations (Node.js-only)
   */
  KEYRING_ALGORITHM_CONFIGURATION: CipherGCMTypes;

  ECIES_VERSION_SIZE: number;
  ECIES_CIPHER_SUITE_SIZE: number;
}
