import { webcrypto } from 'crypto';
import { toThrowType } from './matchers/error-matchers';
import { PluginI18nEngine, resetCoreI18nEngine } from '@digitaldefiance/i18n-lib';
import { resetEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { getNodeEciesI18nEngine, resetNodeEciesI18nEngine } from '../src/i18n/node-ecies-i18n-setup';

// Extend expect with custom matchers
expect.extend({ toThrowType });

// Re-export the matcher to ensure it's loaded
export { toThrowType };

// Reset and initialize i18n engines before each test
beforeEach(() => {
  PluginI18nEngine.resetAll();
  resetCoreI18nEngine();
  resetEciesI18nEngine();
  resetNodeEciesI18nEngine();
  getNodeEciesI18nEngine();
})

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
