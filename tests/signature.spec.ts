import { ECIESError, ECIESErrorTypeEnum } from '@digitaldefiance/ecies-lib';

import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { EciesSignature } from '../src/services/ecies/signature';

describe('EciesSignature', () => {
  let cryptoCore: EciesCryptoCore;
  let signature: EciesSignature;

  beforeEach(() => {
    cryptoCore = new EciesCryptoCore();
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
