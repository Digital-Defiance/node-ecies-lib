/**
 * Member class for Node.js ECIES library.
 * Represents a cryptographic member with support for digital signatures, ECIES encryption/decryption,
 * streaming encryption for large files, and Paillier homomorphic encryption for voting systems.
 *
 * Provides Node.js-specific features including Buffer support, Node.js crypto primitives,
 * and integration with MongoDB ObjectIDs and other ID providers.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  EmailString,
  IIdProvider,
  IEncryptedChunk as IBaseEncryptedChunk,
  IMemberECIESService,
  IMemberStorageData,
  Member as BaseMember,
  MemberErrorType,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { Wallet } from '@ethereumjs/wallet';
import type { ObjectId } from 'mongodb';
import type { PrivateKey, PublicKey } from 'paillier-bigint';

import { getNodeRuntimeConfiguration } from './constants';
import {
  getLazyNodeEciesTranslation,
  NodeEciesStringKey,
} from './i18n/ecies-i18n-factory';
import { PlatformID } from './interfaces';
import { IMember } from './interfaces/member';
import { SignatureBuffer } from './node_ecies_types';
import { ECIESService } from './services/ecies/service';
import { EncryptionStream } from './services/encryption-stream';
import { toUint8Array } from './types/id-guards';
const Constants = getNodeRuntimeConfiguration();

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
export class Member<TID extends PlatformID = Buffer>
  extends BaseMember<TID>
  implements IMember<TID>
{
  private readonly _nodeEciesService: ECIESService<TID>;

  /**
   * Creates a new Member instance.
   *
   * @example Using with typed configuration:
   * ```typescript
   * import { createNodeObjectIdConfiguration, getEnhancedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';
   *
   * // Option 1: Use typed configuration
   * const config = createNodeObjectIdConfiguration();
   * const service = new ECIESService(config.constants);
   * const { member } = Member.newMember(service, MemberType.User, 'Alice', email);
   * // member.id is strongly typed as ObjectId
   *
   * // Option 2: Use enhanced provider for type-safe operations
   * const provider = getEnhancedNodeIdProvider<ObjectId>();
   * const typedId = provider.generateTyped(); // Returns ObjectId (strongly typed)
   * ```
   */
  constructor(
    // Add injected services as parameters
    eciesService: ECIESService<TID>,
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
    // Pass to base constructor — Node ECIESService structurally satisfies
    // IMemberECIESService<TID> which the base Member accepts.
    super(
      eciesService,
      type,
      name,
      email,
      publicKey, // Buffer is Uint8Array ✓
      privateKey,
      wallet,
      id,
      dateCreated,
      dateUpdated,
      creatorId,
    );
    // Store the Node-specific service for sync operations
    this._nodeEciesService = eciesService;
  }

  // --- Covariant overrides (Buffer return types) ---
  // These override the base class Uint8Array getters to return Buffer

  public override get idBytes(): Buffer {
    return Buffer.from(super.idBytes);
  }
  public override get creatorIdBytes(): Buffer {
    return Buffer.from(super.creatorIdBytes);
  }
  public override get publicKey(): Buffer {
    return Buffer.from(super.publicKey);
  }

  // Expose the service's idProvider for voting system compatibility
  public override get idProvider(): IIdProvider<TID> {
    return this._nodeEciesService.constants.idProvider as IIdProvider<TID>;
  }
  public get constants(): import('@digitaldefiance/ecies-lib').IECIESConstants {
    return Constants.ECIES;
  }

  // Helper methods for string conversion
  public getPublicKeyString(): string {
    return this.publicKey.toString('hex');
  }

  public getIdString(): string {
    const id = this.id;
    if (typeof id === 'string') {
      return id;
    } else if (Buffer.isBuffer(id)) {
      return id.toString('hex');
    } else if (id instanceof Types.ObjectId) {
      return id.toString();
    }
    // Fallback for Uint8Array
    return Buffer.from(id as Uint8Array).toString('hex');
  }

  // --- Node-specific overrides for methods that use Node ECIESService ---

  /**
   * Derive Paillier voting keys from this member's ECDH keys.
   * This bridges ECDSA/ECDH cryptography to homomorphic encryption for voting.
   * Uses Node.js-specific voting service implementation.
   *
   * @param options - Configuration options for key derivation
   * @throws Error if private key is not loaded or paillier-bigint is not installed
   */
  public override async deriveVotingKeys(
    options?: import('./services/voting.service').DeriveVotingKeysOptions,
  ): Promise<void> {
    if (!this.privateKey) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
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
      toUint8Array(this.privateKey.value),
      toUint8Array(this.publicKey),
      options,
    );

    // Load the derived keys
    this.loadVotingKeys(keyPair.publicKey, keyPair.privateKey);
  }

  public override loadWallet(mnemonic: SecureString): void {
    // Delegate to base class — it handles wallet validation, key derivation,
    // and storing _wallet/_privateKey (which are private in the base).
    // The base uses this._eciesService which is the node service cast to base type,
    // so walletAndSeedFromMnemonic and getPublicKey work correctly.
    try {
      super.loadWallet(mnemonic);
    } catch (err: unknown) {
      // Re-throw as NodeMemberError with i18n translations for consistency
      if (err instanceof Error && 'type' in err) {
        const memberErr = err as { type: MemberErrorType };
        throw new NodeMemberError(
          getLazyNodeEciesTranslation(
            memberErr.type === MemberErrorType.WalletAlreadyLoaded
              ? NodeEciesStringKey.Error_Member_WalletAlreadyLoaded
              : memberErr.type === MemberErrorType.InvalidMnemonic
                ? NodeEciesStringKey.Error_Member_InvalidMnemonic
                : NodeEciesStringKey.Error_Member_MissingPrivateKey,
          ),
          memberErr.type,
        );
      }
      throw err;
    }
  }

  public override sign(data: Buffer): SignatureBuffer {
    if (!this.privateKey) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    return this._nodeEciesService.signMessage(
      Buffer.from(this.privateKey.value),
      data,
    );
  }

  public override signData(data: Buffer): SignatureBuffer {
    if (!this.privateKey) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    return this._nodeEciesService.signMessage(
      Buffer.from(this.privateKey.value),
      data,
    );
  }

  public override verify(signature: SignatureBuffer, data: Buffer): boolean {
    return this._nodeEciesService.verifyMessage(
      this.publicKey,
      data,
      signature,
    );
  }

  public override verifySignature(
    data: Buffer,
    signature: Buffer,
    publicKey: Buffer,
  ): boolean {
    return this._nodeEciesService.verifyMessage(
      publicKey,
      data,
      signature as SignatureBuffer,
    );
  }

  public override encryptData(
    data: string | Buffer,
    recipientPublicKey?: Buffer,
  ): Buffer {
    // Validate input
    if (!data) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
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
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_EncryptionDataTooLarge,
        ),
        MemberErrorType.EncryptionDataTooLarge,
      );
    }

    // Create buffer from data
    const bufferData = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Use recipient public key or self public key
    const targetPublicKey = recipientPublicKey || this.publicKey;

    return this._nodeEciesService.encryptWithLength(
      targetPublicKey,
      bufferData,
    );
  }

  public override decryptData(encryptedData: Buffer): Buffer {
    if (!this.privateKey) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }
    // decryptSingleWithHeader now returns the Buffer directly
    return this._nodeEciesService.decryptWithLengthAndHeader(
      Buffer.from(this.privateKey.value),
      encryptedData,
    );
  }

  public override toJson(): string {
    const storage: IMemberStorageData = {
      id: this._nodeEciesService.constants.idProvider.serialize(
        toUint8Array(this.idBytes),
      ),
      type: this.type,
      name: this.name,
      email: this.email.toString(),
      publicKey: this.publicKey.toString('base64'),
      creatorId: this._nodeEciesService.constants.idProvider.serialize(
        toUint8Array(this.creatorIdBytes),
      ),
      dateCreated: this.dateCreated.toISOString(),
      dateUpdated: this.dateUpdated.toISOString(),
    };
    return JSON.stringify(storage);
  }

  public override dispose(): void {
    // Delegate to base class which handles zeroizing secret material
    super.dispose();
  }

  public override async *encryptDataStream(
    source: AsyncIterable<Buffer> | ReadableStream<Buffer>,
    options?: {
      recipientPublicKey?: Uint8Array;
      onProgress?: (progress: {
        bytesProcessed: number;
        chunksProcessed: number;
      }) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<IBaseEncryptedChunk, void, unknown> {
    const targetPublicKey = options?.recipientPublicKey
      ? Buffer.from(options.recipientPublicKey)
      : this.publicKey;
    const stream = new EncryptionStream<TID>(
      Constants,
      Constants.ECIES_CONFIG,
      this._nodeEciesService,
    );

    // Convert ReadableStream to AsyncIterable if needed
    const asyncSource: AsyncIterable<Buffer> =
      Symbol.asyncIterator in source
        ? (source as AsyncIterable<Buffer>)
        : (async function* () {
            const reader = (source as ReadableStream<Buffer>).getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield value;
              }
            } finally {
              reader.releaseLock();
            }
          })();

    for await (const chunk of stream.encryptStream(
      asyncSource,
      targetPublicKey,
      {
        onProgress: options?.onProgress,
        signal: options?.signal,
      },
    )) {
      yield chunk;
    }
  }

  public override async *decryptDataStream(
    source: AsyncIterable<Buffer> | ReadableStream<Buffer>,
    options?: {
      onProgress?: (progress: {
        bytesProcessed: number;
        chunksProcessed: number;
      }) => void;
      signal?: AbortSignal;
    },
  ): AsyncGenerator<Buffer, void, unknown> {
    if (!this.privateKey) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingPrivateKey,
        ),
        MemberErrorType.MissingPrivateKey,
      );
    }

    const stream = new EncryptionStream<TID>(
      Constants,
      Constants.ECIES_CONFIG,
      this._nodeEciesService,
    );

    // Convert ReadableStream to AsyncIterable if needed
    const asyncSource: AsyncIterable<Buffer> =
      Symbol.asyncIterator in source
        ? (source as AsyncIterable<Buffer>)
        : (async function* () {
            const reader = (source as ReadableStream<Buffer>).getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                yield value;
              }
            } finally {
              reader.releaseLock();
            }
          })();

    for await (const chunk of stream.decryptStream(
      asyncSource,
      Buffer.from(this.privateKey.value),
      {
        onProgress: options?.onProgress,
        signal: options?.signal,
      },
    )) {
      yield chunk;
    }
  }

  public static override fromJson<TID extends PlatformID = Buffer>(
    json: string,
    // Add injected services as parameters
    eciesService?: ECIESService<TID> | IMemberECIESService<TID>,
  ): Member<TID> {
    const nodeService =
      eciesService instanceof ECIESService
        ? eciesService
        : new ECIESService<TID>();
    const storage: IMemberStorageData = JSON.parse(json);
    const email = new EmailString(storage.email);

    // Deserialize IDs using the service's idProvider
    const idBytes = Buffer.from(
      nodeService.constants.idProvider.deserialize(storage.id),
    );
    const creatorIdBytes = Buffer.from(
      nodeService.constants.idProvider.deserialize(storage.creatorId),
    );

    // Optional validation: warn if ID length doesn't match configured idProvider
    const expectedLength = nodeService.constants.idProvider.byteLength;
    if (idBytes.length !== expectedLength) {
      console.warn(
        `Member ID length (${idBytes.length}) does not match configured idProvider length (${expectedLength}). ` +
          `This may indicate the Member was created with a different idProvider configuration.`,
      );
    }

    // Convert bytes to native types
    const id = nodeService.constants.idProvider.fromBytes(
      toUint8Array(idBytes),
    ) as TID;
    const creatorId = nodeService.constants.idProvider.fromBytes(
      toUint8Array(creatorIdBytes),
    ) as TID;

    // Pass injected services to constructor
    const dateCreated = new Date(storage.dateCreated);
    return new Member<TID>(
      nodeService,
      storage.type,
      storage.name,
      email,
      Buffer.from(storage.publicKey, 'base64'),
      undefined,
      undefined,
      id,
      dateCreated,
      new Date(storage.dateUpdated),
      creatorId,
    );
  }

  public static override fromMnemonic<TID extends PlatformID = Buffer>(
    mnemonic: SecureString,
    eciesService: ECIESService<TID> | IMemberECIESService<TID>,
    memberTypeOrEciesParams?:
      | MemberType
      | import('@digitaldefiance/ecies-lib').IECIESConstants,
    name = 'Test User',
    email = new EmailString('test@example.com'),
  ): Member<TID> {
    const nodeService =
      eciesService instanceof ECIESService
        ? eciesService
        : new ECIESService<TID>();
    const memberType =
      typeof memberTypeOrEciesParams === 'number'
        ? (memberTypeOrEciesParams as MemberType)
        : MemberType.User;
    const { wallet } = nodeService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKeyWithPrefix = nodeService.getPublicKey(
      Buffer.from(privateKey),
    );

    return new Member<TID>(
      nodeService,
      memberType,
      name,
      email,
      publicKeyWithPrefix,
      new SecureBuffer(privateKey),
      wallet,
    );
  }

  public static override newMember<TID extends PlatformID = Buffer>(
    // Add injected services as parameters
    eciesService: ECIESService<TID> | IMemberECIESService<TID>,
    // Original parameters
    type: MemberType,
    name: string,
    email: EmailString,
    forceMnemonic?: SecureString,
    createdBy?: TID | Uint8Array,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _eciesParams?: import('@digitaldefiance/ecies-lib').IECIESConstants,
  ): { member: Member<TID>; mnemonic: SecureString } {
    const nodeService =
      eciesService instanceof ECIESService
        ? eciesService
        : new ECIESService<TID>();
    // Validate inputs first
    if (!name || name.length == 0) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingMemberName,
        ),
        MemberErrorType.MissingMemberName,
      );
    }
    if (name.trim() != name) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidMemberNameWhitespace,
        ),
        MemberErrorType.InvalidMemberNameWhitespace,
      );
    }
    if (!email || email.toString().length == 0) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_MissingEmail,
        ),
        MemberErrorType.MissingEmail,
      );
    }
    if (email.toString().trim() != email.toString()) {
      throw new NodeMemberError(
        getLazyNodeEciesTranslation(
          NodeEciesStringKey.Error_Member_InvalidEmailWhitespace,
        ),
        MemberErrorType.InvalidEmailWhitespace,
      );
    }

    // Use injected services
    const mnemonic = forceMnemonic ?? nodeService.generateNewMnemonic();
    const { wallet } = nodeService.walletAndSeedFromMnemonic(mnemonic);

    // Get private key from wallet
    const privateKey = wallet.getPrivateKey();
    // Get compressed public key (33 bytes with 0x02 or 0x03 prefix)
    const publicKeyWithPrefix = nodeService.getPublicKey(
      Buffer.from(privateKey),
    );

    const dateCreated = new Date();
    return {
      // Create member without specifying ID - constructor handles generation
      member: new Member<TID>(
        nodeService,
        type,
        name,
        email,
        publicKeyWithPrefix,
        new SecureBuffer(privateKey),
        wallet,
        undefined,
        dateCreated,
        dateCreated,
        createdBy as TID | undefined,
      ),
      mnemonic,
    };
  }

  /**
   * Example method demonstrating how to create a Member with strongly-typed ID providers.
   * This shows the benefits of the new typed configuration system introduced in v4.10.7.
   *
   * @example
   * ```typescript
   * // ObjectId example with strong typing
   * const { member } = Member.newMemberWithTypedId(
   *   MemberType.User,
   *   'Alice',
   *   new EmailString('alice@example.com')
   * );
   * // member.id is strongly typed as ObjectId
   *
   * // GUID example with strong typing
   * const { member: guidMember } = Member.newMemberWithTypedId<string>(
   *   MemberType.User,
   *   'Bob',
   *   new EmailString('bob@example.com'),
   *   { idProvider: new GuidV4Provider() }
   * );
   * // guidMember.id is strongly typed as GUID object
   * ```
   */
  public static newMemberWithTypedId<TID extends PlatformID = ObjectId>(
    type: MemberType,
    name: string,
    email: EmailString,
    options?: {
      idProvider?: IIdProvider<TID>;
      forceMnemonic?: SecureString;
      createdBy?: TID;
    },
  ): { member: Member<TID>; mnemonic: SecureString; typedId: TID } {
    // Import the typed configuration functions dynamically to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    const typedConfig = require('./typed-configuration');

    // Create typed configuration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const config = options?.idProvider
      ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        typedConfig.createNodeTypedConfiguration({
          idProvider: options.idProvider,
        })
      : // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        typedConfig.createNodeObjectIdConfiguration();

    // Create service with typed configuration
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const service = new ECIESService<TID>(config.constants);

    // Create member using the standard method
    const result = Member.newMember<TID>(
      service,
      type,
      name,
      email,
      options?.forceMnemonic,
      options?.createdBy,
    );

    // Get enhanced provider for type-safe operations
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const enhancedProvider = typedConfig.getEnhancedNodeIdProvider();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const typedId = enhancedProvider.fromBytesTyped(
      new Uint8Array(result.member.idBytes),
    );

    return {
      member: result.member,
      mnemonic: result.mnemonic,
      typedId, // Strongly typed ID
    };
  }
}
