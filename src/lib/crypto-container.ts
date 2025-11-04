import { ECIESService } from '../services/ecies';
import { Pbkdf2Service } from '../services/pbkdf2';
import { AESGCMService } from '../services/aes-gcm';
import { IConstants } from '../interfaces/constants';
import { Constants } from '../constants';

export enum CryptoServiceKey {
  ECIES = 'ecies',
  PBKDF2 = 'pbkdf2',
  AES_GCM = 'aes-gcm',
}

export class CryptoContainer {
  private services = new Map<CryptoServiceKey, unknown>();

  private constructor(config: IConstants) {
    this.services.set(CryptoServiceKey.ECIES, new ECIESService(undefined, config.ECIES));
    this.services.set(
      CryptoServiceKey.PBKDF2,
      new Pbkdf2Service(config.PBKDF2_PROFILES, config.ECIES, config.PBKDF2)
    );
    this.services.set(CryptoServiceKey.AES_GCM, new AESGCMService(config));
  }

  static create(config: IConstants = Constants): CryptoContainer {
    return new CryptoContainer(config);
  }

  get<T>(key: CryptoServiceKey): T {
    return this.services.get(key) as T;
  }
}
