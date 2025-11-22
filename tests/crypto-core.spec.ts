import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { getNodeRuntimeConfiguration } from '../src/constants';
import { ECIESError, ECIESErrorTypeEnum, IECIESConfig, SecureString } from '@digitaldefiance/ecies-lib';

describe('EciesCryptoCore', () => {
  let core: EciesCryptoCore;
  let config: IECIESConfig;

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
    core = new EciesCryptoCore(config);
  });

  describe('normalizePublicKey', () => {
    it('should throw on null/undefined public key', () => {
      expect(() => core.normalizePublicKey(null as any)).toThrow(ECIESError);
    });

    it('should accept 33-byte key with 0x02/0x03 prefix', () => {
      const validKey = Buffer.alloc(33);
      validKey[0] = 0x02;
      const normalized = core.normalizePublicKey(validKey);
      expect(normalized).toEqual(validKey);
    });

    it('should add 0x02 prefix to 32-byte raw key', () => {
      const rawKey = Buffer.alloc(32);
      const normalized = core.normalizePublicKey(rawKey);
      expect(normalized.length).toBe(33);
      expect(normalized[0]).toBe(0x02);
    });

    it('should throw on invalid key length', () => {
      const invalidKey = Buffer.alloc(31);
      expect(() => core.normalizePublicKey(invalidKey)).toThrow(ECIESError);
    });
  });

  describe('mnemonic operations', () => {
    it('should generate valid mnemonic', () => {
      const mnemonic = core.generateNewMnemonic();
      expect(mnemonic.value).toBeTruthy();
      expect(mnemonic.value.split(' ').length).toBeGreaterThan(0);
    });

    it('should throw on invalid mnemonic', () => {
      const invalid = new SecureString('invalid mnemonic phrase');
      expect(() => core.walletAndSeedFromMnemonic(invalid)).toThrow(ECIESError);
    });

    it('should throw on empty mnemonic', () => {
      const empty = new SecureString('');
      expect(() => core.walletAndSeedFromMnemonic(empty)).toThrow(ECIESError);
    });

    it('should convert mnemonic to key pair', () => {
      const mnemonic = core.generateNewMnemonic();
      const keyPair = core.mnemonicToSimpleKeyPairBuffer(mnemonic);
      expect(keyPair.privateKey.length).toBe(32);
      expect(keyPair.publicKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(keyPair.publicKey[0]);
    });
  });

  describe('key generation', () => {
    it('should generate private key', () => {
      const privateKey = core.generatePrivateKey();
      expect(privateKey.length).toBe(32);
    });

    it('should derive public key from private key', () => {
      const privateKey = core.generatePrivateKey();
      const publicKey = core.getPublicKey(privateKey);
      expect(publicKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(publicKey[0]);
    });

    it('should generate ephemeral key pair', async () => {
      const { privateKey, publicKey } = await core.generateEphemeralKeyPair();
      expect(privateKey.length).toBe(32);
      expect(publicKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(publicKey[0]);
    });
  });

  describe('ECDH operations', () => {
    it('should compute shared secret', () => {
      const privateKey1 = core.generatePrivateKey();
      const publicKey1 = core.getPublicKey(privateKey1);
      const privateKey2 = core.generatePrivateKey();
      const publicKey2 = core.getPublicKey(privateKey2);

      const secret1 = core.computeSharedSecret(privateKey1, publicKey2);
      const secret2 = core.computeSharedSecret(privateKey2, publicKey1);

      expect(secret1).toEqual(secret2);
      expect(secret1.length).toBe(32);
    });
  });

  describe('wallet operations', () => {
    it('should create wallet from seed', () => {
      const mnemonic = core.generateNewMnemonic();
      const { seed, wallet } = core.walletAndSeedFromMnemonic(mnemonic);
      const wallet2 = core.walletFromSeed(Buffer.from(seed.value));
      
      expect(wallet.getPrivateKey()).toEqual(wallet2.getPrivateKey());
      expect(wallet.getPublicKey()).toEqual(wallet2.getPublicKey());
    });

    it('should convert wallet to key pair', () => {
      const mnemonic = core.generateNewMnemonic();
      const { wallet } = core.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = core.walletToSimpleKeyPairBuffer(wallet);
      
      expect(keyPair.privateKey).toEqual(Buffer.from(wallet.getPrivateKey()));
      expect([0x02, 0x03]).toContain(keyPair.publicKey[0]);
    });

    it('should create key pair from seed', () => {
      const mnemonic = core.generateNewMnemonic();
      const { seed } = core.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = core.seedToSimpleKeyPairBuffer(Buffer.from(seed.value));
      
      expect(keyPair.privateKey.length).toBe(32);
      expect(keyPair.publicKey.length).toBe(33);
    });
  });
});
