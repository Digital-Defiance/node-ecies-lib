/**
 * AuthenticatedCipher interface for Node.js crypto.
 * Extends Node.js Cipher type with authentication tag support for AES-GCM operations,
 * providing methods for authenticated encryption with additional data (AEAD).
 */
import type { Cipher } from 'crypto';

/**
 * Extended Cipher type with auth tag support for AES-GCM
 */
export interface AuthenticatedCipher extends Cipher {
  getAuthTag(): Buffer;
  setAAD(buffer: Buffer, options?: { plaintextLength: number }): this;
  setAutoPadding(autoPadding?: boolean): this;
}
