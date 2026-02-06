/**
 * Service implementation for service.
 */
import {
  EciesEncryptionType,
  EciesEncryptionTypeEnum,
  EciesStringKey,
  HexString,
  IConstants,
  IECIESConfig,
  IECIESConstants,
  IIdProvider,
  SecureString,
  TranslatableEciesError,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';

import { Constants, getNodeRuntimeConfiguration } from '../../constants';
import { getNodeEciesI18nEngine } from '../../i18n';
import type { IMember } from '../../interfaces/member';
import type { IMultiEncryptedMessage } from '../../interfaces/multi-encrypted-message';
import type { IMultiEncryptedParsedHeader } from '../../interfaces/multi-encrypted-parsed-header';
import type { PlatformID } from '../../interfaces/platform-id';
import type { ISimpleKeyPairBuffer } from '../../interfaces/simple-keypair-buffer';
import type { ISingleEncryptedParsedHeader } from '../../interfaces/single-encrypted-parsed-header';
import type { IWalletSeed } from '../../interfaces/wallet-seed';
import { SignatureBuffer, SignatureString } from '../../node_ecies_types';

import { EciesCryptoCore } from './crypto-core';
import { EciesMultiRecipient } from './multi-recipient';
import { EciesSignature } from './signature';
import { EciesSingleRecipientCore } from './single-recipient';
import { EciesUtilities } from './utilities';

/**
 * Node.js-compatible ECIES service that mirrors the browser-side functionality
 * Uses Node.js crypto APIs and Buffer types for server-side compatibility
 *
 * ## Enhanced Type Safety (v3.8+)
 *
 * The service now provides stronger type guarantees and validation:
 * - Generic TID parameter ensures type consistency between service and members
 * - Construction-time validation verifies idProvider compatibility
 * - Strongly typed `idProvider` getter returns `IIdProvider<TID>`
 * - Comprehensive validation of all idProvider methods
 *
 * @template TID - The ID type used by the configured idProvider (e.g., ObjectId, Buffer)
 *
 * @example
 * ```typescript
 * // ObjectId-based service with type safety
 * const service = new ECIESService<ObjectId>();
 * const member = Member.newMember(service, ...);
 * // member.id is typed as ObjectId
 *
 * // GUID-based service
 * const guidConfig = createNodeRuntimeConfiguration({ idProvider: new GuidV4Provider() });
 * const guidService = new ECIESService<Buffer>(guidConfig);
 * // guidService.idProvider is typed as IIdProvider<Buffer>
 * ```
 */
export class ECIESService<TID extends PlatformID = Buffer> {
  protected readonly _config: IECIESConfig;
  protected readonly _constants: IConstants;
  protected readonly cryptoCore: EciesCryptoCore;
  protected readonly signature: EciesSignature;
  protected readonly singleRecipient: EciesSingleRecipientCore;
  protected readonly multiRecipient: EciesMultiRecipient<TID>;
  protected readonly utilities: EciesUtilities;
  protected readonly eciesConsts: IECIESConstants;

  // Cache validation results to avoid redundant validation
  private static validatedProviders = new WeakSet<IIdProvider<unknown>>();

  constructor(
    config?: Partial<IECIESConfig> | IConstants,
    eciesParams: IECIESConstants = Constants.ECIES,
  ) {
    this.eciesConsts = eciesParams;

    // Type guard to check if config is IConstants
    const isFullConfig = this.isIConstants(config);

    // Store full IConstants or use default Constants
    if (isFullConfig) {
      this._constants = config;
    } else {
      this._constants = getNodeRuntimeConfiguration();
    }

    // Extract ECIES config from IConstants or use config directly
    const eciesConfig: Partial<IECIESConfig> = isFullConfig
      ? {
          curveName: config.ECIES.CURVE_NAME,
          primaryKeyDerivationPath: config.ECIES.PRIMARY_KEY_DERIVATION_PATH,
          mnemonicStrength: config.ECIES.MNEMONIC_STRENGTH,
          symmetricAlgorithm: config.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
          symmetricKeyBits: config.ECIES.SYMMETRIC.KEY_BITS,
          symmetricKeyMode: config.ECIES.SYMMETRIC.MODE,
        }
      : (config as Partial<IECIESConfig> | undefined) || {};

    this._config = {
      curveName: this.eciesConsts.CURVE_NAME,
      primaryKeyDerivationPath: this.eciesConsts.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: this.eciesConsts.MNEMONIC_STRENGTH,
      symmetricAlgorithm: this.eciesConsts.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: this.eciesConsts.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: this.eciesConsts.SYMMETRIC.MODE,
      ...eciesConfig,
    };

    // Initialize components
    this.cryptoCore = new EciesCryptoCore(this._config, this.eciesConsts);
    this.signature = new EciesSignature(this.cryptoCore);
    this.singleRecipient = new EciesSingleRecipientCore(this._config);
    this.multiRecipient = new EciesMultiRecipient(
      Constants,
      Constants.ECIES_CONFIG,
      this.eciesConsts,
      this._constants.idProvider as IIdProvider<TID>,
    );
    this.utilities = new EciesUtilities();

    // Validate idProvider configuration consistency
    this.validateIdProviderConfiguration();
  }

  /**
   * Validates that the idProvider configuration is consistent and will work correctly
   * with the expected TID type. This catches configuration errors early.
   * Uses caching to avoid redundant validation of the same idProvider instance.
   */
  private validateIdProviderConfiguration(): void {
    const idProvider = this._constants.idProvider;
    const memberIdLength = this._constants.idProvider.byteLength;

    // Ensure idProvider exists
    if (!idProvider) {
      throw new Error(
        'ID provider is required but not configured in service constants',
      );
    }

    // Check if this idProvider has already been validated
    if (
      ECIESService.validatedProviders.has(idProvider as IIdProvider<unknown>)
    ) {
      // Still need to check byte length compatibility for this specific service
      if (idProvider.byteLength !== memberIdLength) {
        const message =
          `ID provider byte length (${idProvider.byteLength}) does not match expected length (${memberIdLength}). This will cause runtime errors in Member creation. ` +
          `Consider updating your configuration to use an idProvider with ${memberIdLength}-byte IDs, or update the configuration to ${idProvider.byteLength}.`;
        throw new Error(message);
      }
      return; // Skip expensive validation
    }

    // Ensure idProvider byteLength matches expected length
    if (idProvider.byteLength !== memberIdLength) {
      const message =
        `ID provider byte length (${idProvider.byteLength}) does not match expected length (${memberIdLength}). This will cause runtime errors in Member creation. ` +
        `Consider updating your configuration to use an idProvider with ${memberIdLength}-byte IDs, or update the configuration to ${idProvider.byteLength}.`;
      throw new Error(message);
    }

    // Validate that idProvider has required methods
    const requiredMethods = [
      'generate',
      'serialize',
      'deserialize',
      'validate',
      'toBytes',
      'fromBytes',
    ];
    for (const method of requiredMethods) {
      if (
        typeof (idProvider as unknown as Record<string, unknown>)[method] !==
        'function'
      ) {
        throw new Error(`ID provider is missing required method: ${method}`);
      }
    }

    // Enhanced validation: Test that idProvider can generate and process IDs correctly
    try {
      const testId = idProvider.generate();
      if (testId.length !== idProvider.byteLength) {
        throw new Error(
          `Generated ID length (${testId.length}) does not match declared byteLength (${idProvider.byteLength})`,
        );
      }

      // Test validation method
      if (!idProvider.validate(testId)) {
        throw new Error('Generated ID failed validation check');
      }

      // Test round-trip serialization
      const serialized = idProvider.serialize(testId);
      if (typeof serialized !== 'string') {
        throw new Error('Serialization must return a string');
      }

      const deserialized = idProvider.deserialize(serialized);
      if (deserialized.length !== testId.length) {
        throw new Error(
          `Serialization round-trip failed: expected ${testId.length} bytes, got ${deserialized.length} bytes`,
        );
      }

      // Test byte conversion methods with proper type conversion
      // First convert the raw bytes to the native ID type
      const nativeId = idProvider.fromBytes(testId);
      const idAsBytes = idProvider.toBytes(nativeId);
      if (idAsBytes.length !== idProvider.byteLength) {
        throw new Error(
          `toBytes() returned incorrect length: expected ${idProvider.byteLength}, got ${idAsBytes.length}`,
        );
      }

      // Test round-trip conversion
      const idFromBytes = idProvider.fromBytes(idAsBytes);
      const backToBytes = idProvider.toBytes(idFromBytes);
      if (backToBytes.length !== idAsBytes.length) {
        throw new Error('Byte conversion round-trip failed');
      }

      // Enhanced: Test type consistency for TID
      // Verify that the native ID type can be used as TID
      const typedId = nativeId as TID;
      const reConvertedBytes = idProvider.toBytes(typedId);
      if (reConvertedBytes.length !== idProvider.byteLength) {
        throw new Error(
          `TID type conversion failed: expected ${idProvider.byteLength} bytes, got ${reConvertedBytes.length}`,
        );
      }

      // Mark this idProvider as validated to avoid redundant checks
      ECIESService.validatedProviders.add(idProvider as IIdProvider<unknown>);
    } catch (error) {
      const message =
        `ID provider validation failed: ${error instanceof Error ? error.message : String(error)}. ` +
        `Ensure your idProvider implementation correctly handles generate(), serialize(), deserialize(), validate(), toBytes(), and fromBytes() methods, ` +
        `and that the TID type parameter matches the idProvider's native type.`;
      throw new Error(message);
    }
  }

  /**
   * Robust type guard to check if config is IConstants
   */
  private isIConstants(
    config: Partial<IECIESConfig> | IConstants | undefined,
  ): config is IConstants {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check for required IConstants fields using type-safe property access
    const configRecord = config as Record<string, unknown>;

    const hasECIES =
      'ECIES' in configRecord && typeof configRecord['ECIES'] === 'object';

    const idProvider = configRecord['idProvider'];
    const hasIdProvider =
      'idProvider' in configRecord &&
      typeof idProvider === 'object' &&
      idProvider !== null &&
      typeof (idProvider as Record<string, unknown>)['generate'] ===
        'function' &&
      typeof (idProvider as Record<string, unknown>)['byteLength'] === 'number';

    return hasECIES && hasIdProvider;
  }

  public get core(): EciesCryptoCore {
    return this.cryptoCore;
  }

  public get config(): IECIESConfig {
    return this._config;
  }

  public get constants(): IConstants {
    return this._constants;
  }

  /**
   * Get the ID provider configured for this service with strong typing.
   * The returned provider is guaranteed to work with TID type.
   */
  public get idProvider(): IIdProvider<TID> {
    return this._constants.idProvider as IIdProvider<TID>;
  }

  public get curveName(): string {
    return this._config.curveName;
  }

  public generateNewMnemonic(): SecureString {
    return this.cryptoCore.generateNewMnemonic();
  }

  public walletAndSeedFromMnemonic(mnemonic: SecureString): IWalletSeed {
    return this.cryptoCore.walletAndSeedFromMnemonic(mnemonic);
  }

  public walletToSimpleKeyPairBuffer(wallet: Wallet): ISimpleKeyPairBuffer {
    return this.cryptoCore.walletToSimpleKeyPairBuffer(wallet);
  }

  public seedToSimpleKeyPairBuffer(seed: Buffer): ISimpleKeyPairBuffer {
    return this.cryptoCore.seedToSimpleKeyPairBuffer(seed);
  }

  public seedToSimpleKeyPair(seed: Buffer): ISimpleKeyPairBuffer {
    return this.seedToSimpleKeyPairBuffer(seed);
  }

  public mnemonicToSimpleKeyPairBuffer(
    mnemonic: SecureString,
  ): ISimpleKeyPairBuffer {
    return this.cryptoCore.mnemonicToSimpleKeyPairBuffer(mnemonic);
  }

  public mnemonicToSimpleKeyPair(mnemonic: SecureString): ISimpleKeyPairBuffer {
    return this.mnemonicToSimpleKeyPairBuffer(mnemonic);
  }

  public getPublicKey(privateKey: Buffer): Buffer {
    return this.cryptoCore.getPublicKey(privateKey);
  }

  public encryptBasic(
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Buffer {
    return this.singleRecipient.encrypt(
      EciesEncryptionTypeEnum.Basic,
      receiverPublicKey,
      message,
      preamble,
    );
  }

  public encryptWithLength(
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble: Buffer = Buffer.alloc(0),
  ): Buffer {
    return this.singleRecipient.encrypt(
      EciesEncryptionTypeEnum.WithLength,
      receiverPublicKey,
      message,
      preamble,
    );
  }

  /**
   * Generic encrypt method
   */
  public encrypt(
    encryptionType: EciesEncryptionTypeEnum,
    receiverPublicKey: Buffer,
    message: Buffer,
    preamble?: Buffer,
  ): Buffer {
    if (encryptionType === EciesEncryptionTypeEnum.Multiple) {
      throw new TranslatableEciesError(
        EciesStringKey.Error_ECIESError_MultipleEncryptionTypeNotSupportedInSingleRecipientMode,
      );
    }
    return this.singleRecipient.encrypt(
      encryptionType,
      receiverPublicKey,
      message,
      preamble,
    );
  }

  public parseSingleEncryptedHeader(
    encryptionType: EciesEncryptionTypeEnum,
    data: Buffer,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): ISingleEncryptedParsedHeader {
    const { header } = this.singleRecipient.parseEncryptedMessage(
      encryptionType,
      data,
      preambleSize,
      options,
    );
    return header;
  }

  public decryptBasicWithHeader(
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): Buffer {
    return this.singleRecipient.decryptWithHeader(
      EciesEncryptionTypeEnum.Basic,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptWithLengthAndHeader(
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): Buffer {
    return this.singleRecipient.decryptWithHeader(
      EciesEncryptionTypeEnum.WithLength,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptBasicWithHeaderEx(
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): { decrypted: Buffer; consumedBytes: number } {
    return this.singleRecipient.decryptWithHeaderEx(
      EciesEncryptionTypeEnum.Basic,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptWithLengthAndHeaderEx(
    privateKey: Buffer,
    encryptedData: Buffer,
    preambleSize: number = 0,
    options?: { dataLength?: number },
  ): { decrypted: Buffer; consumedBytes: number } {
    return this.singleRecipient.decryptWithHeaderEx(
      EciesEncryptionTypeEnum.WithLength,
      privateKey,
      encryptedData,
      preambleSize,
      options,
    );
  }

  public decryptWithComponents(
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
    return { decrypted, ciphertextLength: encrypted.length };
  }

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

  public async encryptMultiple(
    recipients: Array<IMember<TID>>,
    message: Buffer,
    preamble?: Buffer,
  ): Promise<IMultiEncryptedMessage<TID>> {
    return this.multiRecipient.encryptMultiple(recipients, message, preamble);
  }

  /**
   * Encrypt a symmetric key for a recipient using an ephemeral private key
   */
  public async encryptKey(
    receiverPublicKey: Buffer,
    messageSymmetricKey: Buffer,
    ephemeralPrivateKey: Buffer,
    aad?: Buffer,
  ): Promise<Buffer> {
    return this.multiRecipient.encryptKey(
      receiverPublicKey,
      messageSymmetricKey,
      ephemeralPrivateKey,
      aad,
    );
  }

  /**
   * Decrypt a symmetric key using an ephemeral public key
   */
  public async decryptKey(
    privateKey: Buffer,
    encryptedKey: Buffer,
    ephemeralPublicKey: Buffer,
    aad?: Buffer,
  ): Promise<Buffer> {
    return this.multiRecipient.decryptKey(
      privateKey,
      encryptedKey,
      ephemeralPublicKey,
      aad,
    );
  }

  public decryptMultipleECIEForRecipient(
    encryptedData: IMultiEncryptedMessage<TID>,
    recipient: IMember<TID>,
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
    data: IMultiEncryptedMessage<TID>,
  ): Buffer {
    return this.multiRecipient.buildECIESMultipleRecipientHeader(data);
  }

  public parseMultiEncryptedHeader(
    data: Buffer,
  ): IMultiEncryptedParsedHeader<TID> {
    return this.multiRecipient.parseMultiEncryptedHeader(data);
  }

  public parseMultiEncryptedBuffer(data: Buffer): IMultiEncryptedMessage<TID> {
    return this.multiRecipient.parseMultiEncryptedBuffer(data);
  }

  public computeEncryptedLengthFromDataLength(
    dataLength: number,
    encryptionMode: EciesEncryptionType,
    recipientCount?: number,
  ): number {
    if (dataLength < 0) {
      const engine = getNodeEciesI18nEngine();
      throw new Error(
        engine.translateStringKey(
          EciesStringKey.Error_Service_InvalidDataLength,
        ),
      );
    }

    switch (encryptionMode) {
      case 'basic':
        return dataLength + this.eciesConsts.BASIC.FIXED_OVERHEAD_SIZE;
      case 'withLength':
        return dataLength + this.eciesConsts.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      case 'multiple':
        // Basic calculation for multiple recipients
        return (
          dataLength +
          this.eciesConsts.MULTIPLE.FIXED_OVERHEAD_SIZE +
          (recipientCount ?? 1) * this.eciesConsts.MULTIPLE.ENCRYPTED_KEY_SIZE
        );
      default: {
        const engine = getNodeEciesI18nEngine();
        throw new Error(
          engine.translateStringKey(
            EciesStringKey.Error_Service_InvalidEncryptionType,
          ),
        );
      }
    }
  }

  public computeDecryptedLengthFromEncryptedDataLength(
    encryptedDataLength: number,
    padding?: number,
  ): number {
    if (encryptedDataLength < 0) {
      const engine = getNodeEciesI18nEngine();
      throw new Error(
        engine.translateStringKey(
          EciesStringKey.Error_Service_InvalidEncryptedDataLength,
        ),
      );
    }

    const overhead = this.eciesConsts.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
    const actualPadding = padding !== undefined ? padding : 0;
    const decryptedLength = encryptedDataLength - overhead - actualPadding;

    if (decryptedLength < 0) {
      const engine = getNodeEciesI18nEngine();
      throw new Error(
        engine.translateStringKey(
          EciesStringKey.Error_Service_ComputedDecryptedLengthNegative,
        ),
      );
    }

    return decryptedLength;
  }
}
