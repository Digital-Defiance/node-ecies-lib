/**
 * Tests to verify the testing infrastructure is properly set up.
 */

import { describe, expect, it } from '@jest/globals';

import {
  checkCircularDependencies,
  formatCircularDependencies,
} from '../support/circular-dependency-checker';
import {
  clearModuleCache,
  ENUMERATION_FORBIDDEN_PATTERNS,
  trackModuleLoads,
} from '../support/module-tracker';

describe('Testing Infrastructure', () => {
  describe('Madge Integration', () => {
    it('should be able to analyze the project for circular dependencies', async () => {
      // Use the package directory as base, not the monorepo root
      const packageDir = require('path').resolve(__dirname, '../..');
      const result = await checkCircularDependencies(
        'src/index.ts',
        packageDir,
      );

      expect(result).toBeDefined();
      expect(typeof result.hasCircular).toBe('boolean');
      expect(Array.isArray(result.circular)).toBe(true);
      expect(typeof result.moduleCount).toBe('number');
      expect(result.moduleCount).toBeGreaterThan(0);
    }, 30000); // Increase timeout for madge analysis

    it('should format circular dependencies correctly', () => {
      const circular = [
        ['a.ts', 'b.ts', 'c.ts', 'a.ts'],
        ['x.ts', 'y.ts', 'x.ts'],
      ];

      const formatted = formatCircularDependencies(circular);

      expect(formatted).toContain('Found 2 circular dependencies');
      expect(formatted).toContain('a.ts > b.ts > c.ts > a.ts');
      expect(formatted).toContain('x.ts > y.ts > x.ts');
    });

    it('should handle no circular dependencies', () => {
      const formatted = formatCircularDependencies([]);
      expect(formatted).toBe('No circular dependencies found.');
    });
  });

  describe('Module Import Tracking', () => {
    it('should track module loads', () => {
      clearModuleCache([/test-module/]);

      const result = trackModuleLoads(() => {
        // Simulate loading a module
        require.cache['/fake/test-module.js'] = {} as any;
      }, [/test-module/]);

      expect(result.loadedModules).toBeDefined();
      expect(result.forbiddenLoads).toBeDefined();
      expect(Array.isArray(result.forbiddenLoads)).toBe(true);

      // Clean up
      delete require.cache['/fake/test-module.js'];
    });

    it('should detect forbidden patterns', () => {
      const testModules = [
        '/project/src/translations/en-US.ts',
        '/project/src/i18n-setup.ts',
        '/project/src/errors/ecies.ts',
        '/project/src/constants.ts',
      ];

      const forbiddenLoads = testModules.filter((mod) =>
        ENUMERATION_FORBIDDEN_PATTERNS.some((pattern) => pattern.test(mod)),
      );

      expect(forbiddenLoads.length).toBe(4);
      expect(forbiddenLoads).toContain('/project/src/translations/en-US.ts');
      expect(forbiddenLoads).toContain('/project/src/i18n-setup.ts');
      expect(forbiddenLoads).toContain('/project/src/errors/ecies.ts');
      expect(forbiddenLoads).toContain('/project/src/constants.ts');
    });

    it('should clear module cache', () => {
      // Get current cache keys before clearing
      const initialCacheKeys = Object.keys(require.cache);
      expect(initialCacheKeys.length).toBeGreaterThan(0);

      // Clear modules matching a pattern that shouldn't match anything
      clearModuleCache([/this-pattern-should-not-match-anything-xyz123/]);

      // Cache should still have the same keys since pattern didn't match
      const afterClearKeys = Object.keys(require.cache);
      expect(afterClearKeys.length).toBe(initialCacheKeys.length);

      // Test that clearModuleCache function exists and is callable
      expect(typeof clearModuleCache).toBe('function');

      // Verify the function accepts patterns parameter
      expect(() => clearModuleCache([])).not.toThrow();
      expect(() => clearModuleCache([/test/])).not.toThrow();
    });
  });

  describe('Fast-check Integration', () => {
    it('should have fast-check available', () => {
      const fc = require('fast-check');
      expect(fc).toBeDefined();
      expect(typeof fc.assert).toBe('function');
      expect(typeof fc.property).toBe('function');
    });
  });
});
