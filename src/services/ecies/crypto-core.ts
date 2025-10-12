import {
  ECIES,
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConfig,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { hdkey, Wallet } from '@ethereumjs/wallet';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { getEciesPluginI18nEngine } from '../../i18n/ecies-i18n-factory';
import { ISimpleKeyPairBuffer } from '../../interfaces/simple-keypair-buffer';
import { IWalletSeed } from '../../interfaces/wallet-seed';

/**
 * Core encryption and decryption functions for ECIES
 * Includes coverage for simple and single modes, does not cover multiple mode which is in a separate module
 */
export class EciesCryptoCore {
  private readonly _config: IECIESConfig;
  public get config(): IECIESConfig {
    return this._config;
  }

  constructor(config: IECIESConfig) {
    this._config = config;
  }

  /**
   * Validates and normalizes a public key for ECIES operations
   * @param publicKey The public key to normalize
   * @returns Properly formatted public key
   */
  public normalizePublicKey(publicKey: Buffer): Buffer {
    if (!publicKey) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
        getEciesPluginI18nEngine(),
        undefined,
        undefined,
        {
          error: 'Received null or undefined public key',
        },
      );
    }

    const keyLength = publicKey.length;

    // Already in correct format (65 bytes with 0x04 prefix)
    if (
      keyLength === ECIES.PUBLIC_KEY_LENGTH &&
      publicKey[0] === ECIES.PUBLIC_KEY_MAGIC
    ) {
      return publicKey;
    }

    // Raw key without prefix (64 bytes) - add the 0x04 prefix
    if (keyLength === ECIES.RAW_PUBLIC_KEY_LENGTH) {
      return Buffer.concat([Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), publicKey]);
    }

    // Invalid format
    throw new ECIESError(
      ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
      getEciesPluginI18nEngine(),
      undefined,
      undefined,
      {
        error: 'Invalid public key format or length',
        keyLength: String(keyLength),
        expectedLength64: String(ECIES.RAW_PUBLIC_KEY_LENGTH),
        expectedLength65: String(ECIES.PUBLIC_KEY_LENGTH),
        keyPrefix: keyLength > 0 ? String(publicKey[0]) : 'N/A',
        expectedPrefix: String(ECIES.PUBLIC_KEY_MAGIC),
      },
    );
  }

  /**
   * Generate a new mnemonic
   * @returns {SecureString} The new mnemonic
   */
  public generateNewMnemonic(): SecureString {
    return new SecureString(generateMnemonic(this._config.mnemonicStrength));
  }

  /**
   * Generate a new wallet from a seed
   * @param seed {Buffer} The seed to generate the wallet from
   * @returns {Wallet} The new wallet
   */
  public walletFromSeed(seed: Buffer): Wallet {
    const hdWallet = hdkey.EthereumHDKey.fromMasterSeed(seed);
    return hdWallet
      .derivePath(this._config.primaryKeyDerivationPath)
      .getWallet();
  }

  /**
   * Generate a new wallet and seed from a mnemonic
   * @param mnemonic {SecureString} The mnemonic to generate the wallet and seed from
   * @returns {IWalletSeed} The new wallet and seed
   */
  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    if (!mnemonic.value || !validateMnemonic(mnemonic.value)) {
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidMnemonic,
        getEciesPluginI18nEngine(),
      );
    }

    const seed = mnemonicToSeedSync(mnemonic.value);
    const wallet = this.walletFromSeed(seed);

    return {
      seed: new SecureBuffer(seed),
      wallet,
    };
  }

  /**
   * Generate a new wallet and seed from a mnemonic
   * @param wallet {Wallet} The wallet to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public walletToSimpleKeyPairBuffer(wallet: Wallet): ISimpleKeyPairBuffer {
    const privateKey = Buffer.from(wallet.getPrivateKey());
    const buf04 = new Uint8Array(1);
    buf04[0] = ECIES.PUBLIC_KEY_MAGIC;
    const publicKey = Buffer.concat([buf04, wallet.getPublicKey()]);

    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Create a simple key pair from a seed
   * @param seed {Buffer} The seed to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    const wallet = this.walletFromSeed(seed);
    return this.walletToSimpleKeyPairBuffer(wallet);
  }

  /**
   * Create a simple key pair from a mnemonic
   * @param mnemonic {SecureString} The mnemonic to generate the key pair from
   * @returns {ISimpleKeyPairBuffer} The new key pair
   */
  public mnemonicToSimpleKeyPairBuffer(
    mnemonic: SecureString,
  ): ISimpleKeyPairBuffer {
    const { seed } = this.walletAndSeedFromMnemonic(mnemonic);
    return this.seedToSimpleKeyPairBuffer(Buffer.from(seed.value));
  }

  /**
   * Generate a random private key
   * @returns {Buffer} The new private key
   */
  public generatePrivateKey(): Buffer {
    return Buffer.from(secp256k1.utils.randomPrivateKey());
  }

  /**
   * Get public key from private key
   * @param privateKey {Buffer} The private key
   * @returns {Buffer} The public key
   */
  public getPublicKey(privateKey: Buffer): Buffer {
    const publicKey = secp256k1.getPublicKey(privateKey, false);
    return Buffer.from(publicKey);
  }

  /**
   * Generate ephemeral key pair for ECIES
   * @returns {Promise<ISimpleKeyPairBuffer>} The key pair
   */
  public async generateEphemeralKeyPair(): Promise<{
    privateKey: Buffer;
    publicKey: Buffer;
  }> {
    const privateKey = this.generatePrivateKey();
    const publicKey = this.getPublicKey(privateKey);
    return { privateKey, publicKey };
  }

  /**
   * Compute ECDH shared secret
   * @param privateKey {Buffer} The private key
   * @param publicKey {Buffer} The public key
   * @returns {Buffer} The shared secret
   */
  public computeSharedSecret(privateKey: Buffer, publicKey: Buffer): Buffer {
    const sharedSecret = secp256k1.getSharedSecret(privateKey, publicKey, true);
    return Buffer.from(sharedSecret.slice(1)); // Remove the 0x02/0x03 prefix
  }
}
