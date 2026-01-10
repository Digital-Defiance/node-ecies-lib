import { GuidBrandType, HexString } from '@digitaldefiance/ecies-lib';
import { Brand } from 'ts-brand';

import { IKeyPairBufferWithUnEncryptedPrivateKey } from './interfaces/keypair-buffer-with-un-encrypted-private-key';
import { ISigningKeyPrivateKeyInfo } from './interfaces/signing-key-private-key-info';
import { ISimpleKeyPairBuffer } from './interfaces/simple-keypair-buffer';
import { ISimplePublicKeyOnly } from './interfaces/simple-public-key-only';
import { ISimplePublicKeyOnlyBuffer } from './interfaces/simple-public-key-only-buffer';

export type KeyPairBufferWithUnEncryptedPrivateKey = Brand<
  IKeyPairBufferWithUnEncryptedPrivateKey,
  'KeyPairBufferWithUnEncryptedPrivateKey'
>;
export type SigningKeyPrivateKeyInfo = Brand<
  ISigningKeyPrivateKeyInfo,
  'SigningKeyPrivateKeyInfo'
>;
export type SimpleKeyPair = Brand<SimplePublicKeyOnly, 'SimpleKeyPair'>;
export type SimplePublicKeyOnly = Brand<
  ISimplePublicKeyOnly,
  'SimplePublicKeyOnly'
>;
export type SimpleKeyPairBuffer = Brand<
  ISimpleKeyPairBuffer,
  'SimpleKeyPairBuffer'
>;
export type SimplePublicKeyOnlyBuffer = Brand<
  ISimplePublicKeyOnlyBuffer,
  'SimplePublicKeyOnlyBuffer'
>;
export type SignatureString = Brand<HexString, 'SignatureString'>;
export type SignatureBuffer = Buffer & Brand<Buffer, 'SignatureBuffer'>;
export type ChecksumBuffer = Buffer &
  Brand<Buffer, 'Sha3Checksum', 'ChecksumBuffer'>;
export type ChecksumString = Brand<HexString, 'Sha3Checksum', 'ChecksumString'>;

/**
 * GUID stored as a raw buffer
 */
export type RawGuidPlatformBuffer = Buffer &
  Brand<Buffer, 'GuidV4', GuidBrandType.RawGuidPlatformBuffer>;

/**
 * Alias for RawGuidPlatformBuffer for backward compatibility
 */
export type RawGuidBuffer = RawGuidPlatformBuffer;

/**
 * Extended Buffer type for data
 */
export type DataBuffer = Buffer & {
  toBuffer(): Buffer;
  toHex(): string;
};

// Export ID type guards and converters
export * from './types/id-guards';
