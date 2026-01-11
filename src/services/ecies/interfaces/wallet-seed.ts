import { Wallet } from '@ethereumjs/wallet';

export interface IWalletSeed {
  wallet: Wallet;
  seed: Buffer;
}
