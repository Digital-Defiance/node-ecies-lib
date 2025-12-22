import {
  EciesEncryptionTypeEnum,
  IECIESConfig,
  SecureString,
} from '@digitaldefiance/ecies-lib';

import { getNodeRuntimeConfiguration } from '../src/constants';
import { ECIESService } from '../src/services/ecies/service';
import { EciesSingleRecipientCore } from '../src/services/ecies/single-recipient';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

describe('ECIES Fix Verification', () => {
  let config: IECIESConfig;
  let backendService: ECIESService;
  let testMnemonic: SecureString;

  beforeEach(() => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    config = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };

    backendService = new ECIESService(config);
    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  describe('Length Mismatch Fix', () => {
    it('should correctly parse encrypted data without length mismatch error', () => {
      const testPayload = Buffer.from(
        '0000019907e7a1018f62bc20fd86059d60ef5543f00429aac513207a84b58da3e78a902af2799ba631e24ebc46c8ed72d9ea56461e37ff53e23e66c2b55141f3c44f54a7e38ab55062554f4b2aabbba0adb1995b56997821dae3fb89771d2a06da87c73e7da7a9e601',
        'hex',
      );

      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);

      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        publicKey,
        testPayload,
      );
      expect(encrypted.length).toBeGreaterThan(testPayload.length);

      const backendSingle = new EciesSingleRecipientCore(config);
      const parsed = backendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        encrypted,
      );
      expect(parsed.header.dataLength).toBeGreaterThan(0);
      expect(parsed.data.length).toBeGreaterThan(0);
      expect(parsed.header.dataLength).toEqual(parsed.data.length);

      const decrypted = backendService.decryptSimpleOrSingleWithHeader(
        false,
        Buffer.from(wallet.getPrivateKey()),
        encrypted,
      );
      expect(decrypted).toEqual(testPayload);
    });

    it('should parse headers correctly for both modes', () => {
      const testMessage = Buffer.from('header parsing test');
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);

      const backendSingle = new EciesSingleRecipientCore(config);

      // Test simple mode parsing
      const simpleEncrypted = backendSingle.encrypt(
        true,
        publicKey,
        testMessage,
      );
      const simpleParsed = backendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Simple,
        simpleEncrypted,
      );

      expect(simpleParsed.header.dataLength).toEqual(-1); // Simple mode doesn't store length
      expect(simpleParsed.data.length).toBeGreaterThan(0);

      // Test single mode parsing
      const singleEncrypted = backendSingle.encrypt(
        false,
        publicKey,
        testMessage,
      );
      const singleParsed = backendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        singleEncrypted,
      );

      expect(singleParsed.header.dataLength).toEqual(singleParsed.data.length);
      expect(singleParsed.data.length).toBeGreaterThan(0);
    });
  });
});
