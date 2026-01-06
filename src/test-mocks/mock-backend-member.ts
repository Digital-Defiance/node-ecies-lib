import { randomBytes } from 'crypto';

import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import { faker } from '@faker-js/faker';

import { IMember } from '../interfaces';
import { SignatureBuffer } from '../types';

const createMockWallet = (): Wallet =>
  ({
    getPrivateKey: () =>
      Buffer.from(faker.string.hexadecimal({ length: 64 }), 'hex'),
    getPublicKey: () =>
      Buffer.from(faker.string.hexadecimal({ length: 128 }), 'hex'),
    getAddress: () =>
      Buffer.from(faker.string.hexadecimal({ length: 40 }), 'hex'),
    sign: () => Buffer.from(faker.string.hexadecimal({ length: 128 }), 'hex'),
  }) as unknown as Wallet;

export class MockBackendMember implements IMember<Buffer> {
  private _id: Buffer;
  private _type: MemberType;
  private _name: string;
  private _email: EmailString;
  private _publicKey: Buffer;
  private _creatorId: Buffer;
  private _dateCreated: Date;
  private _dateUpdated: Date;
  private _privateKey?: SecureBuffer;
  private _wallet?: Wallet;
  private _hasPrivateKey: boolean;

  constructor(
    data: Partial<{
      id: Buffer;
      type: MemberType;
      name: string;
      email: EmailString;
      publicKey: Buffer;
      privateKey: SecureBuffer;
      wallet: Wallet;
      creatorId: Buffer;
      dateCreated: Date;
      dateUpdated: Date;
      hasPrivateKey: boolean;
    }> = {},
  ) {
    this._id = data.id || randomBytes(12);
    this._type = data.type || faker.helpers.enumValue(MemberType);
    this._name = data.name || faker.person.fullName();
    this._email = data.email || new EmailString(faker.internet.email());
    this._publicKey =
      data.publicKey ||
      Buffer.from(faker.string.hexadecimal({ length: 130 }), 'hex');
    this._creatorId = data.creatorId || this._id;
    this._dateCreated = data.dateCreated || faker.date.past();
    this._dateUpdated =
      data.dateUpdated ||
      faker.date.between({ from: this._dateCreated, to: new Date() });
    this._privateKey = data.privateKey;
    this._wallet =
      data.wallet ||
      (data.hasPrivateKey !== false ? createMockWallet() : undefined);
    this._hasPrivateKey = data.hasPrivateKey ?? !!this._privateKey;
  }

  get id(): Buffer {
    return this._id;
  }
  get type(): MemberType {
    return this._type;
  }
  get name(): string {
    return this._name;
  }
  get email(): EmailString {
    return this._email;
  }
  get publicKey(): Buffer {
    return this._publicKey;
  }
  get creatorId(): Buffer {
    return this._creatorId;
  }
  get dateCreated(): Date {
    return this._dateCreated;
  }
  get dateUpdated(): Date {
    return this._dateUpdated;
  }
  get privateKey(): SecureBuffer | undefined {
    return this._privateKey;
  }
  get wallet(): Wallet {
    if (!this._wallet) {
      throw new Error('Wallet not loaded');
    }
    return this._wallet;
  }
  get hasPrivateKey(): boolean {
    return this._hasPrivateKey;
  }

  get idBytes(): Buffer {
    return this._id;
  }

  get constants(): import('@digitaldefiance/ecies-lib').IECIESConstants {
    return {} as import('@digitaldefiance/ecies-lib').IECIESConstants;
  }

  getPublicKeyString(): string {
    return this._publicKey.toString('hex');
  }

  getIdString(): string {
    return this._id.toString('hex');
  }

  unloadPrivateKey(): void {}

  unloadWallet(): void {}

  unloadWalletAndPrivateKey(): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadWallet(_mnemonic: SecureString): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadPrivateKey(_privateKey: SecureBuffer): void {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sign(_data: Buffer): SignatureBuffer {
    return Buffer.from(
      faker.string.hexadecimal({ length: 128 }),
      'hex',
    ) as SignatureBuffer;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verify(_signature: SignatureBuffer, _data: Buffer): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signData(_data: Buffer): SignatureBuffer {
    return Buffer.from(
      faker.string.hexadecimal({ length: 128 }),
      'hex',
    ) as SignatureBuffer;
  }

  verifySignature(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _data: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _signature: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _publicKey: Buffer,
  ): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encryptData(_data: string | Buffer, _recipientPublicKey?: Buffer): Buffer {
    return Buffer.from(faker.string.hexadecimal({ length: 256 }), 'hex');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decryptData(_encryptedData: Buffer): Buffer {
    return Buffer.from(faker.lorem.paragraph());
  }

  async *encryptDataStream(): AsyncGenerator<
    {
      data: Buffer;
      header: Record<string, unknown>;
      index: number;
      isLast: boolean;
    },
    void,
    unknown
  > {
    yield { data: Buffer.from('mock'), header: {}, index: 0, isLast: true };
  }

  async *decryptDataStream(): AsyncGenerator<Buffer, void, unknown> {
    yield Buffer.from('mock');
  }

  toJson(): string {
    return JSON.stringify({
      id: this._id.toString('hex'),
      type: this._type,
      name: this._name,
      email: this._email.toString(),
      publicKey: this._publicKey.toString('base64'),
      creatorId: this._creatorId.toString('hex'),
      dateCreated: this._dateCreated.toISOString(),
      dateUpdated: this._dateUpdated.toISOString(),
    });
  }

  dispose(): void {}

  static create(
    overrides: Partial<{
      id: Buffer;
      type: MemberType;
      name: string;
      email: EmailString;
      publicKey: Buffer;
      privateKey: SecureBuffer;
      wallet: Wallet;
      creatorId: Buffer;
      dateCreated: Date;
      dateUpdated: Date;
      hasPrivateKey: boolean;
    }> = {},
  ): MockBackendMember {
    return new MockBackendMember(overrides);
  }

  static createMultiple(count: number): MockBackendMember[] {
    return Array.from({ length: count }, () => this.create());
  }

  static createWithPrivateKey(): MockBackendMember {
    return new MockBackendMember({
      privateKey: new SecureBuffer(
        Buffer.from(faker.string.hexadecimal({ length: 64 }), 'hex'),
      ),
      hasPrivateKey: true,
    });
  }

  static createWithoutPrivateKey(): MockBackendMember {
    return new MockBackendMember({
      privateKey: undefined,
      hasPrivateKey: false,
    });
  }
}
