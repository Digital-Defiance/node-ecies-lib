import type { ec } from 'elliptic';

import type { IKeyPairBufferWithUnEncryptedPrivateKey } from './keypair-buffer-with-un-encrypted-private-key';

export interface ISigningKeyPrivateKeyInfo extends IKeyPairBufferWithUnEncryptedPrivateKey {
  keyPair: ec.KeyPair;
  publicKey: Buffer;
  privateKey: Buffer;
  seedHex: string;
  entropy: string;
  mnemonic: string;
}
