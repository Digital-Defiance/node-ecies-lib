import { webcrypto } from 'crypto';
import { toThrowType } from './matchers/error-matchers';

// Extend expect with custom matchers
expect.extend({ toThrowType });

// Re-export the matcher to ensure it's loaded
export { toThrowType };

// Plugin architecture handles instance management automatically
// No explicit cleanup needed for tests

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
