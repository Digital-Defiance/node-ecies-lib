import { webcrypto } from 'crypto';
import { toThrowType } from './matchers/error-matchers';

// Extend expect with custom matchers
expect.extend({ toThrowType });

// Re-export the matcher to ensure it's loaded
export { toThrowType };

// Note: I18n engine cleanup is not needed here because:
// 1. The ecies-lib package handles its own engine lifecycle
// 2. Resetting between tests would break translation functionality
// 3. The engines are designed to be long-lived singletons

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
