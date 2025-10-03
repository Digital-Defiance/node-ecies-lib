// Polyfill for @ethereumjs/util constants
import { webcrypto } from 'crypto';

// @ts-ignore
global.crypto = webcrypto;

// Make jest available globally
import { jest } from '@jest/globals';
// @ts-ignore
global.jest = jest;

// Mock BigInt constants that @ethereumjs/util expects
const mockConstants = {
  n: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'),
  p: BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f')
};

// Ensure the constants are available globally
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.SECP256K1_ORDER = mockConstants.n;
  // @ts-ignore
  global.SECP256K1_PRIME = mockConstants.p;
}

// Suppress secp256k1 import warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('Failed to import secp256k1')) {
    return;
  }
  originalWarn.apply(console, args);
};