import { Constants } from '../src/constants';
import { CryptoContainer, CryptoServiceKey } from '../src/lib/crypto-container';
import { AESGCMService } from '../src/services/aes-gcm';
import { ECIESService } from '../src/services/ecies';
import { Pbkdf2Service } from '../src/services/pbkdf2';

describe('CryptoContainer', () => {
  it('should create container with default constants', () => {
    const container = CryptoContainer.create();
    expect(container).toBeInstanceOf(CryptoContainer);
  });

  it('should create container with custom constants', () => {
    const container = CryptoContainer.create(Constants);
    expect(container).toBeInstanceOf(CryptoContainer);
  });

  it('should get ECIES service', () => {
    const container = CryptoContainer.create();
    const service = container.get<ECIESService>(CryptoServiceKey.ECIES);
    expect(service).toBeInstanceOf(ECIESService);
  });

  it('should get PBKDF2 service', () => {
    const container = CryptoContainer.create();
    const service = container.get<Pbkdf2Service>(CryptoServiceKey.PBKDF2);
    expect(service).toBeInstanceOf(Pbkdf2Service);
  });

  it('should get AES-GCM service', () => {
    const container = CryptoContainer.create();
    const service = container.get<AESGCMService>(CryptoServiceKey.AES_GCM);
    expect(service).toBeInstanceOf(AESGCMService);
  });
});
