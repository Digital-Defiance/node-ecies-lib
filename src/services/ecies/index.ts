/**
 * Node.js ECIES service exports
 *
 * This module provides a Node.js implementation of the ECIES (Elliptic Curve Integrated Encryption Scheme)
 * service that uses Buffer instead of Uint8Array for binary data.
 *
 * Key features:
 * - Mnemonic generation and wallet derivation using bip39 and @ethereumjs/wallet
 * - ECDH key exchange using ethereum-cryptography/secp256k1
 * - AES-GCM encryption using Node.js crypto
 * - ECDSA signatures using ethereum-cryptography/secp256k1
 * - Single and simple recipient encryption modes
 * - Binary compatible with browser ecies-lib
 *
 * Usage:
 * ```typescript
 * import { ECIESService } from './services/ecies';
 *
 * const ecies = new ECIESService();
 * const mnemonic = ecies.generateNewMnemonic();
 * const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPairBuffer(mnemonic);
 *
 * const message = Buffer.from('Hello, World!');
 * const encrypted = await ecies.encryptWithLength(publicKey, message);
 * const decrypted = await ecies.decryptWithLengthAndHeader(privateKey, encrypted);
 * const encrypted = await ecies.encryptBasic(publicKey, message);
 * const decrypted = await ecies.decryptBasicWithHeader(privateKey, encrypted);
 * ```
 */

export * from './crypto-core';
export * from './file';
export * from './multi-recipient';
export * from './service';
export * from './signature';
export * from './single-recipient';
export * from './utilities';

// Main service export
export { ECIESService as default } from './service';
