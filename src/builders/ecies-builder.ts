import { ECIESService } from '../services/ecies';
import { IECIESConstants } from '@digitaldefiance/ecies-lib';
import { Constants } from '../constants';

export class ECIESBuilder {
  private eciesParams: IECIESConstants = Constants.ECIES;

  static create(): ECIESBuilder {
    return new ECIESBuilder();
  }

  withConstants(params: IECIESConstants): this {
    this.eciesParams = params;
    return this;
  }

  build(): ECIESService {
    return new ECIESService(undefined, this.eciesParams);
  }
}
