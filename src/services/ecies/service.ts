import {
  EciesComponentId,
  EciesEncryptionType,
  EciesEncryptionTypeEnum,
  EciesStringKey,
  getEciesI18nEngine,
  HexString,
  IECIESConfig,
  IECIESConstants,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';

// Import all the modular components
import { Constants } from '../../constants';
import type { IMember } from '../../interfaces/member';
import type { IMultiEncryptedMessage } from '../../interfaces/multi-encrypted-message';
import type { IMultiEncryptedParsedHeader } from '../../interfaces/multi-encrypted-parsed-header';
import type { ISingleEncryptedParsedHeader } from '../../interfaces/single-encrypted-parsed-header';
import type { IWalletSeed } from '../../interfaces/wallet-seed';
import { SignatureBuffer, SignatureString } from '../../types';

import { EciesCryptoCore } from './crypto-core';
import { EciesMultiRecipient } from './multi-recipient';
import { EciesSignature } from './signature';
import { EciesSingleRecipientCore } from './single-recipient';
import { EciesUtilities } from './utilities';

/**
 * Unified ECIES service that integrates all the modular components
 */
export class ECIESService {
  protected readonly _config: IECIESConfig;
  protected readonly cryptoCore: EciesCryptoCore;
  protected readonly signature: EciesSignature;
  protected readonly singleRecipient: EciesSingleRecipientCore;
  protected readonly multiRecipient: EciesMultiRecipient;
  protected readonly utilities: EciesUtilities;

  constructor(
    config?: Partial<IECIESConfig>,
    eciesParams: IECIESConstants = Constants.ECIES,
  ) {
    const actualConfig = config || {};
    const eciesConsts = eciesParams || Constants.ECIES;

    this._config = {
      ...config,
      curveName: eciesConsts.CURVE_NAME,
      primaryKeyDerivationPath: eciesConsts.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesConsts.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesConsts.SYMMETRIC.ALGORITHM,
      symmetricKeyBits: eciesConsts.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesConsts.SYMMETRIC.MODE,
      ...actualConfig,
    };

    // Initialize all components
    this.cryptoCore = new EciesCryptoCore(this._config, eciesParams);
    this.signature = new EciesSignature(this.cryptoCore);
    this.singleRecipient = new EciesSingleRecipientCore(this._config);
    this.multiRecipient = new EciesMultiRecipient(this.cryptoCore);
    this.utilities = new EciesUtilities();
  }

  public get core(): EciesCryptoCore {
    return this.cryptoCore;
  }

  public get config(): IECIESConfig {
    return this._config;
  }

  /**
   * The name of the elliptic curve used for ECIES encryption/decryption
   */
  public get curveName(): string {
    return this._config.curveName;
  }

  // === Key Management Methods ===

  public generateNewMnemonic(): SecureString {
    return this.cryptoCore.generateNewMnemonic();
  }

  public walletFromSeed(seed: Buffer): Wallet {
    return this.cryptoCore.walletFromSeed(seed);
  }

  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    return this.cryptoCore.walletAndSeedFromMnemonic(mnemonic);
  }

  public walletToSimpleKeyPairBuffer(wallet: Wallet) {
    return this.cryptoCore.walletToSimpleKeyPairBuffer(wallet);
  }

  public seedToSimpleKeyPairBuffer(seed: Buffer) {
    return this.cryptoCore.seedToSimpleKeyPairBuffer(seed);
  }

  public mnemonicToSimpleKeyPairBuffer(mnemonic: SecureString) {
    return this.cryptoCore.mnemonicToSimpleKeyPairBuffer(mnemonic);
  }

  public mnemonicToSimpleKeyPair(mnemonic: SecureString) {
    return this.mnemonicToSimpleKeyPairBuffer(mnemonic);
  }

  /**
   * Get compressed public key from private key
   * @param privateKey The private key
   * @returns Compressed public key (33 bytes with prefix)
   */
  public getPublicKey(privateKey: Buffer): Buffer {
    return this.cryptoCore.getPublicKey(privateKey);
  }

  // === Core Encryption/Decryption Methods ===

  public encryptSimpleOrSingle(
    encryptSimple: boolean,
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Buffer {
    return this.singleRecipient.encrypt(
      encryptSimple,
      receiverPublicKey,
      message,
      preamble,
    );
  }

  public parseSingleEncryptedHeader(
    encryptionType: EciesEncryptionTypeEnum,
    data: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): ISingleEncryptedParsedHeader {
    const { header } = this.singleRecipient.parseEncryptedMessage(
      encryptionType,
      data,
      preambleSize,
      options,
    );
    return header;
  }

  public decryptSimpleOrSingleWithHeader(
    decryptSimple: boolean,
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): Buffer {
    return this.singleRecipient.decryptWithHeader(
      decryptSimple
        ? EciesEncryptionTypeEnum.Simple
        : EciesEncryptionTypeEnum.Single,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptSimpleOrSingleWithHeaderEx(
    encryptionType: EciesEncryptionTypeEnum,
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: {
      dataLength?: number;
    },
  ): { decrypted: Buffer; consumedBytes: number } {
    return this.singleRecipient.decryptWithHeaderEx(
      encryptionType,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptSingleWithComponents(
    privateKey: Buffer,
    ephemeralPublicKey: Buffer,
    iv: Buffer,
    authTag: Buffer,
    encrypted: Buffer,
    aad?: Buffer,
  ): { decrypted: Buffer; ciphertextLength?: number } {
    const decrypted = this.singleRecipient.decryptWithComponents(
      privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      encrypted,
      aad,
    );

    // Return an object with a 'decrypted' property for compatibility with existing code
    return { decrypted, ciphertextLength: encrypted.length };
  }

  // === Signature Methods ===

  public signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer {
    return this.signature.signMessage(privateKey, data);
  }

  public verifyMessage(
    publicKey: Buffer,
    data: Buffer,
    signature: SignatureBuffer,
  ): boolean {
    return this.signature.verifyMessage(publicKey, data, signature);
  }

  public signatureStringToSignatureBuffer(
    signatureString: HexString,
  ): SignatureBuffer {
    return this.signature.signatureStringToSignatureBuffer(signatureString);
  }

  public signatureBufferToSignatureString(
    signatureBuffer: SignatureBuffer,
  ): SignatureString {
    return this.signature.signatureBufferToSignatureString(signatureBuffer);
  }

  // === Multi-Recipient Methods ===
  public async encryptMultiple(
    recipients: Array<IMember>,
    message: Buffer,
    preamble?: Buffer,
  ): Promise<IMultiEncryptedMessage> {
    return this.multiRecipient.encryptMultiple(recipients, message, preamble);
  }

  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage,
    recipient: IMember,
  ): Buffer {
    return this.multiRecipient.decryptMultipleECIEForRecipient(
      encryptedData,
      recipient,
    );
  }

  public calculateECIESMultipleRecipientOverhead(
    recipientCount: number,
    includeMessageOverhead: boolean,
  ): number {
    return this.multiRecipient.calculateECIESMultipleRecipientOverhead(
      recipientCount,
      includeMessageOverhead,
    );
  }

  public buildECIESMultipleRecipientHeader(
    data: IMultiEncryptedMessage,
  ): Buffer {
    return this.multiRecipient.buildECIESMultipleRecipientHeader(data);
  }

  public parseMultiEncryptedHeader(data: Buffer): IMultiEncryptedParsedHeader {
    return this.multiRecipient.parseMultiEncryptedHeader(data);
  }

  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage {
    return this.multiRecipient.parseMultiEncryptedBuffer(data);
  }

  // === Utility Methods ===

  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    encryptionMode: EciesEncryptionType,
    recipientCount?: number,
  ): number {
    return this.utilities.computeEncryptedLengthFromDataLength(
      dataLength,
      encryptionMode,
      recipientCount,
    );
  }

  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    padding?: number,
  ): number {
    return this.utilities.computeDecryptedLengthFromEncryptedDataLength(
      encryptedDataLength,
      padding,
    );
  }

  public encrypt(
    encryptionType: EciesEncryptionType,
    recipient: IMember,
    message: Buffer,
    preamble?: Buffer,
  ): Buffer {
    if (encryptionType === 'multiple') {
      throw new Error(
        getEciesI18nEngine().translate(
          EciesComponentId,
          EciesStringKey.Error_ECIESError_MultipleEncryptionTypeNotSupportedInSingleRecipientMode,
        ),
      );
    }
    return this.singleRecipient.encrypt(
      encryptionType === 'simple',
      recipient.publicKey,
      message,
      preamble,
    );
  }
}
