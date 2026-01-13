/**
 * Interface definitions for simple-keypair.
 */
import type { ISimplePublicKeyOnly } from './simple-public-key-only';

export interface ISimpleKeyPair extends ISimplePublicKeyOnly {
  publicKey: string;
  privateKey: Buffer;
}
