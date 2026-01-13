/**
 * Fluent builder for ECIESService instances.
 * Provides a convenient way to configure and create ECIESService with custom settings.
 *
 * @example
 * ```typescript
 * const service = ECIESBuilder.create()
 *   .withServiceConfig({ enableCompression: true })
 *   .withConstants({ IV_SIZE: 16 })
 *   .build();
 * ```
 */
import { IECIESConfig, IECIESConstants } from '@digitaldefiance/ecies-lib';

import { Constants } from '../constants';
import { ECIESService } from '../services/ecies';

export class ECIESBuilder {
  private serviceConfig: Partial<IECIESConfig> = {};
  private eciesConsts: Partial<IECIESConstants> = {};

  static create(): ECIESBuilder {
    return new ECIESBuilder();
  }

  withServiceConfig(config: Partial<IECIESConfig>): this {
    this.serviceConfig = { ...this.serviceConfig, ...config };
    return this;
  }

  withConstants(constants: Partial<IECIESConstants>): this {
    this.eciesConsts = { ...this.eciesConsts, ...constants };
    return this;
  }

  build(): ECIESService {
    const finalConstants = { ...Constants.ECIES, ...this.eciesConsts };
    return new ECIESService(this.serviceConfig, finalConstants);
  }
}
