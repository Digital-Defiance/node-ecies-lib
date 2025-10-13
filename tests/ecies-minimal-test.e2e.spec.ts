import { ECIESService as BackendECIESService } from '../src/services/ecies/service';
import {
  ECIESService as FrontendECIESService,
  IECIESConfig,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { getNodeRuntimeConfiguration } from '../src/constants';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

describe('ECIES Minimal Cross-Platform Test', () => {
  let config: IECIESConfig;
  let frontendService: FrontendECIESService;
  let backendService: BackendECIESService;
  let testMnemonic: SecureString;

  beforeAll(() => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    config = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };

    frontendService = new FrontendECIESService(config);
    backendService = new BackendECIESService(config);
    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  describe('Basic Compatibility', () => {
    it('should encrypt backend -> decrypt frontend', async () => {
      const testMessage = Buffer.from('Hello World');
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);
      const privateKey = Buffer.from(wallet.getPrivateKey());

      // Backend encrypts
      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        publicKey,
        testMessage,
      );
      expect(encrypted.length).toBeGreaterThan(testMessage.length);

      // Frontend decrypts
      const decrypted = await frontendService.decryptSimpleOrSingleWithHeader(
        false,
        new Uint8Array(privateKey),
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(testMessage);
    });

    it('should encrypt frontend -> decrypt backend', async () => {
      const testMessage = Buffer.from('Hello World');
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);
      const privateKey = Buffer.from(wallet.getPrivateKey());

      // Frontend encrypts
      const encrypted = await frontendService.encryptSimpleOrSingle(
        false,
        new Uint8Array(publicKey),
        new Uint8Array(testMessage),
      );
      expect(encrypted.length).toBeGreaterThan(testMessage.length);

      // Backend decrypts
      const decrypted = backendService.decryptSimpleOrSingleWithHeader(
        false,
        privateKey,
        Buffer.from(encrypted),
      );

      expect(decrypted).toEqual(testMessage);
    });
  });
});
