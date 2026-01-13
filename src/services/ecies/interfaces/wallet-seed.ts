/**
 * Interface definitions for wallet-seed.
 */
import { Wallet } from '@ethereumjs/wallet';

export interface IWalletSeed {
  wallet: Wallet;
  seed: Buffer;
}
