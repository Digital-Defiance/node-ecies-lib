import {
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConfig,
} from '@digitaldefiance/ecies-lib';

import { Constants } from '../src/constants';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { EciesSignature } from '../src/services/ecies/signature';

describe('EciesSignature', () => {
  let cryptoCore: EciesCryptoCore;
  let signature: EciesSignature;
  let config: IECIESConfig;

  beforeEach(() => {
    config = {
      curveName: Constants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: Constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: Constants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: Constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: Constants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: Constants.ECIES.SYMMETRIC.MODE,
    };
    cryptoCore = new EciesCryptoCore(config);
    signature = new EciesSignature(cryptoCore);
  });

  describe('verifyMessage', () => {
    it('should throw error for invalid signature length', () => {
      const publicKey = Buffer.alloc(65);
      const data = Buffer.from('test data');
      const invalidSignature = Buffer.alloc(32) as any; // Wrong length

      expect(() =>
        signature.verifyMessage(publicKey, data, invalidSignature),
      ).toThrow(ECIESError);
      expect(() =>
        signature.verifyMessage(publicKey, data, invalidSignature),
      ).toThrow(
        expect.objectContaining({ type: ECIESErrorTypeEnum.InvalidSignature }),
      );
    });

    it('should throw error for invalid public key', () => {
      const invalidPublicKey = Buffer.from('invalid');
      const data = Buffer.from('test data');
      const validSignature = Buffer.alloc(64) as any;

      expect(() =>
        signature.verifyMessage(invalidPublicKey, data, validSignature),
      ).toThrow(ECIESError);
      expect(() =>
        signature.verifyMessage(invalidPublicKey, data, validSignature),
      ).toThrow(
        expect.objectContaining({
          type: ECIESErrorTypeEnum.InvalidSenderPublicKey,
        }),
      );
    });
  });
});
