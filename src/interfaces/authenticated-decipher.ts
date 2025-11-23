import type { Decipher } from 'crypto';

/**
 * Extended Decipher type with auth tag support for AES-GCM
 */
export interface AuthenticatedDecipher extends Decipher {
  setAuthTag(tag: Buffer): void;
  setAAD(buffer: Buffer, options?: { plaintextLength: number }): this;
}
