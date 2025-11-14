import { ECIESService } from '../services/ecies';
import { IECIESConstants, IECIESConfig } from '@digitaldefiance/ecies-lib';
import { Constants } from '../constants';

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
