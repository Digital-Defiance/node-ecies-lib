/**
 * Interface definitions for keypair-buffer-with-un-encrypted-private-key.
 */
import type { ISimplePublicKeyOnlyBuffer } from './simple-public-key-only-buffer';

export interface IKeyPairBufferWithUnEncryptedPrivateKey extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}
