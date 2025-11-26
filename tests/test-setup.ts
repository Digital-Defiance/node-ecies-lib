import { resetEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { toThrowType } from '@digitaldefiance/express-suite-test-utils';
import { I18nEngine, resetCoreI18nEngine } from '@digitaldefiance/i18n-lib';
import { webcrypto } from 'crypto';
import { resetNodeEciesI18nEngine } from '../src/i18n/node-ecies-i18n-setup';

// Extend expect with custom matchers
expect.extend({ toThrowType });

jest.setTimeout(60000); // 60 second default timeout for node-ecies-lib tests

// Re-export the matcher to ensure it's loaded
export { toThrowType };

// Reset and initialize i18n engines before each test
beforeEach(() => {
  I18nEngine.resetAll();
  resetCoreI18nEngine();
  resetEciesI18nEngine();
  resetNodeEciesI18nEngine();
});

afterEach(() => {
  resetNodeEciesI18nEngine();
  resetEciesI18nEngine();
  resetCoreI18nEngine();
  I18nEngine.resetAll();
});

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}
