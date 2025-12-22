/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { createHash, hkdfSync } from 'crypto';

import {
  ECIESError,
  ECIESErrorTypeEnum,
  IECIESConfig,
  IECIESConstants,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { hdkey, Wallet } from '@ethereumjs/wallet';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';

import { Constants } from '../../constants';
import {
  getEciesPluginI18nEngine,
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../../i18n/ecies-i18n-factory';
import { ISimpleKeyPairBuffer } from '../../interfaces/simple-keypair-buffer';
import { IWalletSeed } from '../../interfaces/wallet-seed';

/**
 * Core encryption and decryption functions for ECIES
 * Includes coverage for simple and single modes, does not cover multiple mode which is in a separate module
 */
export class EciesCryptoCore {
  protected readonly _config: IECIESConfig;
  protected readonly _consts: IECIESConstants;
  public get config(): IECIESConfig {
    return this._config;
  }

  public get consts(): IECIESConstants {
    return this._consts;
  }

  constructor(
    config: IECIESConfig,
    eciesParams: IECIESConstants = Constants.ECIES,
  ) {
    this._config = config;
    this._consts = eciesParams;
  }

  /**
   * Validates and normalizes a public key for ECIES operations
   * @param publicKey The public key to normalize
   * @returns Properly formatted public key
   */
  public normalizePublicKey(publicKey: Buffer): Buffer {
    if (!publicKey) {
      const pluginEngine = getEciesPluginI18nEngine();
      throw new ECIESError(
        ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
        undefined,
        undefined,
        {
          error: pluginEngine.translate(
            NodeEciesComponentId,
            NodeEciesStringKey.Error_InvalidPublicKey,
          ),
        },
      );
    }

    const keyLength = publicKey.length;
    // console.log('[normalizePublicKey] Magic:', this._consts.PUBLIC_KEY_MAGIC);

    // Check for compressed key (33 bytes, starts with 0x02 or 0x03)
    if (keyLength === 33 && (publicKey[0] === 0x02 || publicKey[0] === 0x03)) {
      return publicKey;
    }

    // Check for uncompressed key (65 bytes, starts with 0x04)
    if (keyLength === 65 && publicKey[0] === 0x04) {
      return publicKey;
    }

    // Raw key without prefix (64 bytes) - add the 0x04 prefix
    if (keyLength === 64) {
      return Buffer.concat([Buffer.from([0x04]), publicKey]);
    }

    // Raw key without prefix (32 bytes) - add the 0x02 prefix (assuming even Y)
    // Note: This is ambiguous for compressed keys as we don't know Y parity.
    // But if we assume it's a raw X coordinate, we might default to 0x02?
    // Actually, RAW_PUBLIC_KEY_LENGTH is 32.
    if (keyLength === this._consts.RAW_PUBLIC_KEY_LENGTH) {
      // If we only have X, we can't fully reconstruct without knowing Y parity.
      // But maybe the intention of RAW_PUBLIC_KEY_LENGTH was for uncompressed without prefix (64 bytes)?
      // The constants say RAW_PUBLIC_KEY_LENGTH = 32.
      // So it expects X coordinate only.
      // We can try to prepend 0x02.
      return Buffer.concat([
        Buffer.from([this._consts.PUBLIC_KEY_MAGIC]),
        publicKey,
      ]);
    }

    const pluginEngine = getEciesPluginI18nEngine();
    // Invalid format
    throw new ECIESError(
      ECIESErrorTypeEnum.InvalidEphemeralPublicKey,
      undefined,
      undefined,
      {
        error: pluginEngine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_InvalidPublicKeyFormat,
        ),
        keyLength: String(keyLength),
        expectedLength64: String(this._consts.RAW_PUBLIC_KEY_LENGTH),
        expectedLength65: String(this._consts.PUBLIC_KEY_LENGTH),
        keyPrefix: keyLength > 0 ? String(publicKey[0]) : 'N/A',
        expectedPrefix: String(this._consts.PUBLIC_KEY_MAGIC),
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
      throw new ECIESError(ECIESErrorTypeEnum.InvalidMnemonic);
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
    const publicKey = this.getPublicKey(privateKey);

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
    // Security fix 2: Private key validation
    if (privateKey.every((byte) => byte === 0)) {
      throw new ECIESError(ECIESErrorTypeEnum.PrivateKeyNotLoaded);
    }
    const publicKey = secp256k1.getPublicKey(privateKey, true);
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
    // Security fix 1: Public key validation (check normalized key)
    const normalizedKey = this.normalizePublicKey(publicKey);
    const isAllZeros = normalizedKey.slice(1).every((byte) => byte === 0);
    if (isAllZeros) {
      throw new ECIESError(ECIESErrorTypeEnum.InvalidRecipientPublicKey);
    }

    const sharedSecret = secp256k1.getSharedSecret(
      privateKey,
      normalizedKey,
      true,
    );
    const secret = Buffer.from(sharedSecret.slice(1)); // Remove the 0x02/0x03 prefix

    // Security fix 3: Shared secret validation
    if (secret.every((byte) => byte === 0)) {
      throw new ECIESError(ECIESErrorTypeEnum.SecretComputationFailed);
    }

    return secret;
  }

  /**
   * Derive a symmetric key from a shared secret using HKDF
   * @param sharedSecret The shared secret (ECDH output)
   * @param salt Optional salt
   * @param info Optional context info
   * @param length Length of the output key (default 32 for AES-256)
   */
  public deriveSharedKey(
    sharedSecret: Buffer,
    salt: Buffer = Buffer.alloc(0),
    info: Buffer = Buffer.alloc(0),
    length: number = 32,
  ): Buffer {
    return Buffer.from(hkdfSync('sha256', sharedSecret, salt, info, length));
  }

  /**
   * Sign a message using ECDSA
   * @param privateKey The private key to sign with
   * @param message The message to sign
   */
  public sign(privateKey: Buffer, message: Buffer): Buffer {
    const hash = createHash('sha256').update(message).digest();
    const signature = secp256k1.sign(hash, privateKey);
    return Buffer.from(signature.toCompactRawBytes());
  }

  /**
   * Verify a signature using ECDSA
   * @param publicKey The public key to verify with
   * @param message The message that was signed
   * @param signature The signature to verify
   */
  public verify(
    publicKey: Buffer,
    message: Buffer,
    signature: Buffer,
  ): boolean {
    const hash = createHash('sha256').update(message).digest();
    try {
      return secp256k1.verify(signature, hash, publicKey);
    } catch {
      return false;
    }
  }
}
