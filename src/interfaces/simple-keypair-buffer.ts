/**
 * Interface definitions for simple-keypair-buffer.
 */
import type { ISimplePublicKeyOnlyBuffer } from './simple-public-key-only-buffer';

export interface ISimpleKeyPairBuffer extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}
