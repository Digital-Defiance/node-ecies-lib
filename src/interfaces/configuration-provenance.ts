import type { IConstants } from './constants';
import type { PlatformID } from './platform-id';

/**
 * Deep partial type utility
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Provenance information for a configuration.
 * Tracks who created it, when, and what modifications were made.
 */
export interface IConfigurationProvenance<TID extends PlatformID = Buffer> {
  /**
   * The base configuration key this was derived from
   */
  readonly baseConfigKey: string;

  /**
   * Overrides applied to the base configuration
   */
  readonly overrides: DeepPartial<IConstants>;

  /**
   * When this configuration was created
   */
  readonly timestamp: Date;

  /**
   * Source of the configuration
   * - 'default': The built-in Constants
   * - 'runtime': Created via createRuntimeConfiguration
   * - 'custom': User-provided full configuration
   */
  readonly source: 'default' | 'runtime' | 'custom';

  /**
   * SHA-256 checksum of the final configuration
   * Useful for verifying configuration hasn't been tampered with
   */
  readonly checksum: string;

  /**
   * Optional description or notes about this configuration
   */
  readonly description?: string;

  /**
   * Stack trace showing where the configuration was created
   * Useful for debugging unexpected configurations
   */
  readonly creationStack?: string;
}