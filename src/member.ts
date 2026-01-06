/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  EmailString,
  IMemberStorageData,
  MemberErrorType,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { Wallet } from '@ethereumjs/wallet';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import { Constants } from './constants';
import {
  getNodeEciesTranslation,
  NodeEciesStringKey,
} from './i18n/ecies-i18n-factory';
import { PlatformID } from './interfaces';
import { IEncryptedChunk } from './interfaces/encrypted-chunk';
import { IMember } from './interfaces/member';
import { IStreamProgress } from './interfaces/stream-progress';
import { ECIESService } from './services/ecies/service';
import { EncryptionStream } from './services/encryption-stream';
import { SignatureBuffer, toUint8Array } from './types';

/**
 * Custom error classes that work with the plugin i18n system
 */
export class NodeMemberError extends Error {
  constructor(
    message: string,
    public readonly type: MemberErrorType,
  ) {
    super(message);
    this.name = 'NodeMemberError';
  }
}

/**
 * A member of an ECIES interchange
 */
export class Member<TID extends PlatformID = Buffer> implements IMember<TID> {
  private readonly _eciesService: ECIESService;
  private readonly _id: TID;
  private readonly _idBytes: Buffer;
  private readonly _type: MemberType;
  private readonly _name: string;
  private readonly _email: EmailString;
  private readonly _publicKey: Buffer;
  private readonly _creatorId: TID;
  private readonly _dateCreated: Date;
  private readonly _dateUpdated: Date;
  private _privateKey?: SecureBuffer;
  private _wallet?: Wallet;

  // Optional voting keys for homomorphic encryption voting systems
  private _votingPublicKey?: PublicKey;
  private _votingPrivateKey?: PrivateKey;

  constructor(
    // Add injected services as parameters
    eciesService: ECIESService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    publicKey: Buffer,
    privateKey?: SecureBuffer,
    wallet?: Wallet,
    id?: TID,
    dateCreated?: Date,
    dateUpdated?: Date,
    creatorId?: TID,
  ) {
    // Assign injected services
    this._eciesService = eciesService;
    // Assign original parameters
    this._type = type;
    const __id = id ?? (Constants.idProvider.generate() as TID);
    this._id = __id;
    this._idBytes = Constants.idProvider.toBytes(__id) as Buffer;
    this._name = name;
    if (!this._name || this._name.length == 0) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
    }
    if (this._name.trim() != this._name) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace,
        ),
        MemberErrorType.InvalidMemberNameWhitespace,
      );
    }
    this._email = email;
    this._publicKey = publicKey;
    this._privateKey = privateKey;
    this._wallet = wallet;

    // don't create a new date object with nearly identical values to the existing one
    let _now: null | Date = null;
    const now = function () {
      if (!_now) {
        _now = new Date();
      }
      return _now;
    };
    this._dateCreated = dateCreated ?? now();
    this._dateUpdated = dateUpdated ?? now();
    this._creatorId = creatorId ?? this._id;
  }

  // Required getters
  public get id(): TID {
    return this._id;
  }
  public get idBytes(): Buffer {
    return this._idBytes;
  }
  public get creatorIdBytes(): Buffer {
    return Constants.idProvider.toBytes(this._creatorId) as Buffer;
  }
  public get type(): MemberType {
    return this._type;
  }
  public get name(): string {
    return this._name;
  }
  public get email(): EmailString {
    return this._email;
  }
  public get publicKey(): Buffer {
    return this._publicKey;
  }
  public get creatorId(): TID {
    return this._creatorId;
  }
  public get dateCreated(): Date {
    return this._dateCreated;
  }
  public get dateUpdated(): Date {
    return this._dateUpdated;
  }
  public get constants(): import('@digitaldefiance/ecies-lib').IECIESConstants {
    return Constants.ECIES;
  }

  // Helper methods for string conversion
  public getPublicKeyString(): string {
    return this._publicKey.toString('hex');
  }

  public getIdString(): string {
    if (typeof this._id === 'string') {
      return this._id;
    } else if (Buffer.isBuffer(this._id)) {
      return this._id.toString('hex');
    } else if (this._id instanceof Types.ObjectId) {
      return this._id.toString();
    }
    // Fallback for Uint8Array
    return Buffer.from(this._id as Uint8Array).toString('hex');
  }

  // Optional private data getters
  public get privateKey(): SecureBuffer | undefined {
    return this._privateKey;
  }
  public get wallet(): Wallet {
    if (!this._wallet) {
      throw new NodeMemberError(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Member_NoWallet),
        MemberErrorType.NoWallet,
      );
    }
    return this._wallet;
  }

  // State getters
  public get hasPrivateKey(): boolean {
    return this._privateKey !== undefined;
  }

  public get votingPublicKey(): PublicKey | undefined {
    return this._votingPublicKey;
  }

  public get votingPrivateKey(): PrivateKey | undefined {
    return this._votingPrivateKey;
  }

  public get hasVotingPrivateKey(): boolean {
    return this._votingPrivateKey !== undefined;
  }

  public loadVotingKeys(
    votingPublicKey: PublicKey,
    votingPrivateKey?: PrivateKey,
  ): void {
    this._votingPublicKey = votingPublicKey;
    if (votingPrivateKey) {
      this._votingPrivateKey = votingPrivateKey;
    }
  }

  public unloadVotingPrivateKey(): void {
    this._votingPrivateKey = undefined;
  }

  /**
   * Derive Paillier voting keys from this member's ECDH keys.
   * This bridges ECDSA/ECDH cryptography to homomorphic encryption for voting.
   *
   * @param options - Configuration options for key derivation
   * @throws Error if private key is not loaded or paillier-bigint is not installed
   */
  public async deriveVotingKeys(
    options?: import('./services/voting.service').DeriveVotingKeysOptions,
  ): Promise<void> {
    if (!this._privateKey) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }

    // Import deriveVotingKeysFromECDH from voting service
    const { deriveVotingKeysFromECDH } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./services/voting.service') as {
        deriveVotingKeysFromECDH: (
          ecdhPrivKey: Uint8Array,
          ecdhPubKey: Uint8Array,
          options?: unknown,
        ) => { publicKey: PublicKey; privateKey: PrivateKey };
      };

    // Derive keys using ECDH bridge
    const keyPair = deriveVotingKeysFromECDH(
      toUint8Array(this._privateKey.value),
      toUint8Array(this._publicKey),
      options,
    );

    // Load the derived keys
    this._votingPublicKey = keyPair.publicKey;
    this._votingPrivateKey = keyPair.privateKey;
  }

  public unloadPrivateKey(): void {
    // Do not dispose here; tests expect the same SecureBuffer instance to remain usable
    // when reloaded into another member in the same process.
    this._privateKey = undefined;
  }

  public unloadWallet(): void {
    this._wallet = undefined;
  }

  public unloadWalletAndPrivateKey(): void {
    this.unloadWallet();
    this.unloadPrivateKey();
  }

  public loadWallet(mnemonic: SecureString): void {
    if (this._wallet) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_WalletAlreadyLoaded,
        ),
        MemberErrorType.WalletAlreadyLoaded,
      );
    }
    const { wallet } = this._eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKeyWithPrefix = this._eciesService.getPublicKey(
      Buffer.from(privateKey),
    );

    if (
      publicKeyWithPrefix.toString('hex') !== this._publicKey.toString('hex')
    ) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidMnemonic,
        ),
        MemberErrorType.InvalidMnemonic,
      );
    }
    this._wallet = wallet;
    this._privateKey = new SecureBuffer(privateKey);
  }

  /**
   * Loads the private key and optionally the voting private key.
   *
   * @param privateKey The private key to load.
   * @param votingPrivateKey The voting private key to load.
   */
  public loadPrivateKey(privateKey: SecureBuffer): void {
    this._privateKey = privateKey;
  }

  public sign(data: Buffer): SignatureBuffer {
    if (!this._privateKey) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    return this._eciesService.signMessage(
      Buffer.from(this._privateKey.value),
      data,
    );
  }

  public signData(data: Buffer): SignatureBuffer {
    if (!this._privateKey) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    return this._eciesService.signMessage(
      Buffer.from(this._privateKey.value),
      data,
    );
  }

  public verify(signature: SignatureBuffer, data: Buffer): boolean {
    return this._eciesService.verifyMessage(this._publicKey, data, signature);
  }

  public verifySignature(
    data: Buffer,
    signature: Buffer,
    publicKey: Buffer,
  ): boolean {
    return this._eciesService.verifyMessage(
      publicKey,
      data,
      signature as SignatureBuffer,
    );
  }

  private static readonly MAX_ENCRYPTION_SIZE = 1024 * 1024 * 10; // 10MB limit
  private static readonly VALID_STRING_REGEX = /^[\x20-\x7E\n\r\t]*$/; // Printable ASCII + common whitespace

  public encryptData(
    data: string | Buffer,
    recipientPublicKey?: Buffer,
  ): Buffer {
    // Validate input
    if (!data) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingEncryptionData,
        ),
        MemberErrorType.MissingEncryptionData,
      );
    }

    // Check size limit
    const dataSize = Buffer.isBuffer(data)
      ? data.length
      : Buffer.byteLength(data);
    if (dataSize > Member.MAX_ENCRYPTION_SIZE) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_EncryptionDataTooLarge,
        ),
        MemberErrorType.EncryptionDataTooLarge,
      );
    }

    // Create buffer from data
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Use recipient public key or self public key
    const targetPublicKey = recipientPublicKey || this._publicKey;

    return this._eciesService.encryptSimpleOrSingle(
      false,
      targetPublicKey,
      bufferData,
    );
  }

  public decryptData(encryptedData: Buffer): Buffer {
    if (!this._privateKey) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    // decryptSingleWithHeader now returns the Buffer directly
    return this._eciesService.decryptSimpleOrSingleWithHeader(
      false,
      Buffer.from(this._privateKey.value),
      encryptedData,
    );
  }

  public toJson(): string {
    const storage: IMemberStorageData = {
      id: this._eciesService.constants.idProvider.serialize(
        toUint8Array(this._id as Buffer | Uint8Array | string),
      ),
      type: this._type,
      name: this._name,
      email: this._email.toString(),
      publicKey: this._publicKey.toString('base64'),
      creatorId: this._eciesService.constants.idProvider.serialize(
        toUint8Array(this._creatorId as Buffer | Uint8Array | string),
      ),
      dateCreated: this._dateCreated.toISOString(),
      dateUpdated: this._dateUpdated.toISOString(),
    };
    return JSON.stringify(storage);
  }

  public dispose(): void {
    // Ensure secret material is zeroized when disposing
    try {
      this._privateKey?.dispose();
    } finally {
      this.unloadWalletAndPrivateKey();
    }
  }

  public async *encryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      recipientPublicKey?: Buffer;
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<IEncryptedChunk, void, unknown> {
    const targetPublicKey = options?.recipientPublicKey || this._publicKey;
    const stream = new EncryptionStream(this._eciesService);

    for await (const chunk of stream.encryptStream(source, targetPublicKey, {
      onProgress: options?.onProgress,
      signal: options?.signal,
    })) {
      yield chunk;
    }
  }

  public async *decryptDataStream(
    source: AsyncIterable<Buffer>,
    options?: {
      onProgress?: (progress: IStreamProgress) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<Buffer, void, unknown> {
    if (!this._privateKey) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }

    const stream = new EncryptionStream(this._eciesService);

    for await (const chunk of stream.decryptStream(
      source,
      Buffer.from(this._privateKey.value),
      {
        onProgress: options?.onProgress,
        signal: options?.signal,
      },
    )) {
      yield chunk;
    }
  }

  public static fromJson<TID extends PlatformID = Buffer>(
    json: string,
    // Add injected services as parameters
    eciesService: ECIESService,
  ): Member<TID> {
    const storage: IMemberStorageData = JSON.parse(json);
    const email = new EmailString(storage.email);

    // Deserialize IDs using configured idProvider
    const id = Buffer.from(
      eciesService.constants.idProvider.deserialize(storage.id),
    );
    const creatorId = Buffer.from(
      eciesService.constants.idProvider.deserialize(storage.creatorId),
    );

    // Optional validation: warn if ID length doesn't match configured idProvider
    const expectedLength = eciesService.constants.idProvider.byteLength;
    if (id.length !== expectedLength) {
      console.warn(
        `Member ID length (${id.length}) does not match configured idProvider length (${expectedLength}). ` +
          `This may indicate the Member was created with a different idProvider configuration.`,
      );
    }

    // Pass injected services to constructor
    const dateCreated = new Date(storage.dateCreated);
    return new Member<TID>(
      eciesService,
      storage.type,
      storage.name,
      email,
      Buffer.from(storage.publicKey, 'base64'),
      undefined,
      undefined,
      id as TID,
      dateCreated,
      new Date(storage.dateUpdated),
      creatorId as TID,
    );
  }

  public static fromMnemonic<TID extends PlatformID = Buffer>(
    mnemonic: SecureString,
    eciesService: ECIESService,
    memberType = MemberType.User,
    name = 'Test User',
    email = new EmailString('test@example.com'),
  ): Member<TID> {
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKeyWithPrefix = eciesService.getPublicKey(
      Buffer.from(privateKey),
    );

    return new Member<TID>(
      eciesService,
      memberType,
      name,
      email,
      publicKeyWithPrefix,
      new SecureBuffer(privateKey),
      wallet,
    );
  }

  public static newMember<TID extends PlatformID = Buffer>(
    // Add injected services as parameters
    eciesService: ECIESService,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    forceMnemonic?: SecureString,
    createdBy?: Buffer,
  ): { member: Member<TID>; mnemonic: SecureString } {
    // Validate inputs first
    if (!name || name.length == 0) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
    }
    if (name.trim() != name) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace,
        ),
        MemberErrorType.InvalidMemberNameWhitespace,
      );
    }
    if (!email || email.toString().length == 0) {
      throw new NodeMemberError(
        getNodeEciesTranslation(NodeEciesStringKey.Error_Member_MissingEmail),
        MemberErrorType.MissingEmail,
      );
    }
    if (email.toString().trim() != email.toString()) {
      throw new NodeMemberError(
        getNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidEmailWhitespace,
        ),
        MemberErrorType.InvalidEmailWhitespace,
      );
    }

    // Use injected services
    const mnemonic = forceMnemonic ?? eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);

    // Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    // Get compressed public key (33 bytes with 0x02 or 0x03 prefix)
    const publicKeyWithPrefix = eciesService.getPublicKey(
      Buffer.from(privateKey),
    );

    // Use configured idProvider from service, with defensive fallback
    const idProvider =
      eciesService.constants?.idProvider ?? Constants.idProvider;
    const newId = Buffer.from(idProvider.generate());
    const dateCreated = new Date();
    return {
      // Pass injected services to constructor
      member: new Member<TID>(
        eciesService,
        type,
        name,
        email,
        publicKeyWithPrefix,
        new SecureBuffer(privateKey),
        wallet,
        newId as TID,
        dateCreated,
        dateCreated,
        (createdBy ?? newId) as TID,
      ),
      mnemonic,
    };
  }
}
