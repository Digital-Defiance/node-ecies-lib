import { TranslationEngine } from '@digitaldefiance/i18n-lib';
import { EciesStringKey } from '@digitaldefiance/ecies-lib';
import {
  IPbkdf2Config,
  IPBkdf2Consts,
  Pbkdf2ErrorType,
} from '@digitaldefiance/ecies-lib';
import { pbkdf2 as pbkdf2Async, pbkdf2Sync, randomBytes } from 'crypto';
import { promisify } from 'util';
import { IConstants } from '../interfaces/constants';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { createEciesTranslationEngine, getNodeEciesTranslation, NodeEciesStringKey } from '../i18n/ecies-i18n-factory';
import { IPbkdf2Result } from '../interfaces/pbkdf2-result';
import { IECIESConsts } from '../interfaces/ecies-consts';
import { Constants, getNodeRuntimeConfiguration } from '../constants';

/**
 * Custom PBKDF2 error class that works with the plugin i18n system
 */
export class NodePbkdf2Error extends Error {
  constructor(message: string, public readonly type: Pbkdf2ErrorType) {
    super(message);
    this.name = 'NodePbkdf2Error';
  }
}

/**
 * Service for handling PBKDF2 (Password-Based Key Derivation Function 2) operations.
 * This service provides functionality for:
 * - Generating secure key derivation configurations
 * - Deriving cryptographic keys from passwords
 * - Managing salt and iteration parameters
 * - Both synchronous and asynchronous key derivation
 */
export class Pbkdf2Service {
  protected readonly engine: TranslationEngine<EciesStringKey>;
  protected readonly profiles: Record<string, IPbkdf2Config>;
  protected readonly eciesConsts: IECIESConsts;
  protected readonly pbkdf2Consts: IPBkdf2Consts;
  
  constructor(
    engine: TranslationEngine<EciesStringKey>,
    profiles?: Record<string, IPbkdf2Config>,
    eciesParams: IECIESConsts = Constants.ECIES,
    pbkdf2Params: IPBkdf2Consts = Constants.PBKDF2,
  ) {
    this.engine = engine;
    this.profiles = profiles ? { ...profiles } : {};
    const runtimeDefaults = getNodeRuntimeConfiguration();
    this.eciesConsts = eciesParams ?? runtimeDefaults.ECIES;
    this.pbkdf2Consts =
      pbkdf2Params ?? runtimeDefaults.PBKDF2;
  }

  /**
   * Register a new PBKDF2 profile
   * @param profileName The name of the profile
   * @param config The configuration for the profile
   */
  public registerProfile(profileName: string, config: IPbkdf2Config): void {
    this.profiles[profileName] = { ...config };
  }

  /**
   * Get all registered profile names
   * @returns Array of profile names
   */
  public getRegisteredProfiles(): string[] {
    return Object.keys(this.profiles);
  }

  /**
   * Check if a profile is registered
   * @param profileName The name of the profile to check
   * @returns True if the profile exists
   */
  public hasProfile(profileName: string): boolean {
    return profileName in this.profiles;
  }

  /**
   * Create a Pbkdf2Service instance from IConstants (for backward compatibility)
   * @param constants The constants object
   * @returns A new Pbkdf2Service instance
   */
  public static fromConstants(constants: IConstants): Pbkdf2Service {
    const engine = createEciesTranslationEngine();
    const runtimeDefaults = getNodeRuntimeConfiguration();
    return new Pbkdf2Service(
      engine,
      constants.PBKDF2_PROFILES,
      runtimeDefaults.ECIES,
      constants.PBKDF2,
    );
  }
  /**
   * Get a predefined configuration profile for common use cases
   * @param profile The name of the profile to use
   * @returns Configuration object for the specified profile
   */
  public getProfileConfig(
    profile: string,
  ): IPbkdf2Config {
    const profileConfig = this.profiles[profile];
    if (!profileConfig) {
      throw new NodePbkdf2Error(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength),
        Pbkdf2ErrorType.InvalidProfile,
      );
    }
    return {
      hashBytes: profileConfig.hashBytes,
      saltBytes: profileConfig.saltBytes,
      iterations: profileConfig.iterations,
      algorithm: profileConfig.algorithm,
    };
  }

  /**
   * Generate an options object for pbkdf2
   * @param iterations Optional number of iterations (defaults to Pbkdf2IterationsPerSecond)
   * @param saltBytes Optional salt size in bytes (defaults to PBKDF2.SALT_BYTES)
   * @param hashBytes Optional hash size in bytes (defaults to ECIES.SYMMETRIC.KEY_SIZE)
   * @param algorithm Optional hash algorithm (defaults to PBKDF2.ALGORITHM)
   * @returns Configuration object for PBKDF2
   */
  public getConfig(
    iterations?: number,
    saltBytes?: number,
    hashBytes?: number,
    algorithm?: string,
  ): IPbkdf2Config {
    // larger numbers mean better security, less
    return {
      // size of the generated hash
      hashBytes: hashBytes ?? this.eciesConsts.SYMMETRIC.KEY_SIZE,
      // larger salt means hashed passwords are more resistant to rainbow table, but
      // you get diminishing returns pretty fast
      saltBytes: saltBytes ?? this.pbkdf2Consts.SALT_BYTES,
      // more iterations means an attacker has to take longer to brute force an
      // individual password, so larger is better. however, larger also means longer
      // to hash the password. tune so that hashing the password takes about a
      // second
      iterations: iterations ?? this.pbkdf2Consts.ITERATIONS_PER_SECOND,
      // hash algorithm
      algorithm: algorithm ?? this.pbkdf2Consts.ALGORITHM,
    };
  }

  /**
   * Given a password, use pbkdf2 to generate an appropriately sized key for AES encryption
   * @param password The password to derive a key from
   * @param salt Optional salt (will be randomly generated if not provided)
   * @param iterations Optional number of iterations
   * @param saltBytes Optional salt size in bytes
   * @param keySize Optional key size in bytes
   * @param algorithm Optional hash algorithm
   * @returns Object containing the derived key, salt, and iteration count
   */
  public deriveKeyFromPassword(
    password: Buffer,
    salt?: Buffer,
    iterations?: number,
    saltBytes?: number,
    keySize?: number,
    algorithm?: string,
  ): IPbkdf2Result {
    const config = this.getConfig(
      iterations,
      saltBytes,
      keySize,
      algorithm,
    );
    const saltBytes_ = salt ?? randomBytes(config.saltBytes);

    if (saltBytes_.length !== config.saltBytes) {
      throw new NodePbkdf2Error(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength),
        Pbkdf2ErrorType.InvalidSaltLength,
      );
    }

    const hashBytes = pbkdf2Sync(
      password,
      saltBytes_,
      config.iterations,
      config.hashBytes,
      config.algorithm,
    );

    if (hashBytes.length !== config.hashBytes) {
      throw new NodePbkdf2Error(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength),
        Pbkdf2ErrorType.InvalidHashLength,
      );
    }

    return {
      salt: saltBytes_,
      hash: hashBytes,
      iterations: config.iterations,
    };
  }

  /**
   * Async version of deriveKeyFromPassword that uses libuv threadpool via crypto.pbkdf2
   * to avoid blocking the event loop during password verification.
   * @param password The password to derive a key from
   * @param salt Optional salt (will be randomly generated if not provided)
   * @param iterations Optional number of iterations
   * @param saltBytes Optional salt size in bytes
   * @param keySize Optional key size in bytes
   * @param algorithm Optional hash algorithm
   * @returns Promise resolving to object containing the derived key, salt, and iteration count
   */
  public async deriveKeyFromPasswordAsync(
    password: Buffer,
    salt?: Buffer,
    iterations?: number,
    saltBytes?: number,
    keySize?: number,
    algorithm?: string,
  ): Promise<IPbkdf2Result> {
    const config = this.getConfig(
      iterations,
      saltBytes,
      keySize,
      algorithm,
    );
    const saltBytes_ = salt ?? randomBytes(config.saltBytes);

    if (saltBytes_.length !== config.saltBytes) {
      throw new NodePbkdf2Error(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength),
        Pbkdf2ErrorType.InvalidSaltLength,
      );
    }

    const pbkdf2 = promisify(pbkdf2Async);
    const hashBytes = (await pbkdf2(
      password,
      saltBytes_,
      config.iterations,
      config.hashBytes,
      config.algorithm,
    )) as Buffer;

    if (hashBytes.length !== config.hashBytes) {
      throw new NodePbkdf2Error(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidHashLength),
        Pbkdf2ErrorType.InvalidHashLength,
      );
    }

    return {
      salt: saltBytes_,
      hash: hashBytes,
      iterations: config.iterations,
    };
  }

  /**
   * Derive a key using a predefined configuration profile
   * @param password The password to derive a key from
   * @param profile The configuration profile to use
   * @param salt Optional salt (will be randomly generated if not provided)
   * @returns Object containing the derived key, salt, and iteration count
   */
  public deriveKeyFromPasswordWithProfile(
    password: Buffer,
    profile: Pbkdf2ProfileEnum,
    salt?: Buffer,
  ): IPbkdf2Result {
    const config = this.getProfileConfig(profile);
    return this.deriveKeyFromPassword(
      password,
      salt,
      config.iterations,
      config.saltBytes,
      config.hashBytes,
      config.algorithm,
    );
  }

  /**
   * Async version of deriveKeyFromPasswordWithProfile
   * @param password The password to derive a key from
   * @param profile The configuration profile to use
   * @param salt Optional salt (will be randomly generated if not provided)
   * @returns Promise resolving to object containing the derived key, salt, and iteration count
   */
  public async deriveKeyFromPasswordWithProfileAsync(
    password: Buffer,
    profile: Pbkdf2ProfileEnum,
    salt?: Buffer,
  ): Promise<IPbkdf2Result> {
    const config = this.getProfileConfig(profile);
    return this.deriveKeyFromPasswordAsync(
      password,
      salt,
      config.iterations,
      config.saltBytes,
      config.hashBytes,
      config.algorithm,
    );
  }
}
