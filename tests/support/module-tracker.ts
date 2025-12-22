/**
 * Module import tracking utilities for testing module independence
 * and circular dependency detection.
 */

export interface ModuleTrackingResult {
  loadedModules: Set<string>;
  forbiddenLoads: string[];
}

/**
 * Tracks which modules are loaded during a test operation.
 * Useful for verifying that importing certain modules doesn't
 * trigger unwanted dependencies.
 *
 * @param operation - The operation to track (e.g., importing a module)
 * @param forbiddenPatterns - Regex patterns for modules that should not be loaded
 * @returns Object containing loaded modules and any forbidden loads detected
 */
export function trackModuleLoads(
  operation: () => void,
  forbiddenPatterns: RegExp[] = [],
): ModuleTrackingResult {
  const loadedModules = new Set<string>();

  // Store original require.cache keys
  const originalCacheKeys = new Set(Object.keys(require.cache));

  // Execute the operation
  operation();

  // Find newly loaded modules
  const newCacheKeys = Object.keys(require.cache);
  for (const key of newCacheKeys) {
    if (!originalCacheKeys.has(key)) {
      loadedModules.add(key);
    }
  }

  // Check for forbidden loads
  const forbiddenLoads = Array.from(loadedModules).filter((mod) =>
    forbiddenPatterns.some((pattern) => pattern.test(mod)),
  );

  return {
    loadedModules,
    forbiddenLoads,
  };
}

/**
 * Clears the module cache for specific patterns.
 * Useful for ensuring clean test isolation.
 *
 * @param patterns - Regex patterns for modules to clear from cache
 */
export function clearModuleCache(patterns: RegExp[] = []): void {
  const keysToDelete: string[] = [];

  for (const key of Object.keys(require.cache)) {
    if (
      patterns.length === 0 ||
      patterns.some((pattern) => pattern.test(key))
    ) {
      keysToDelete.push(key);
    }
  }

  for (const key of keysToDelete) {
    delete require.cache[key];
  }
}

/**
 * Common forbidden patterns for enumeration module tests.
 * Enumerations should not load translations, i18n, errors, or constants.
 */
export const ENUMERATION_FORBIDDEN_PATTERNS = [
  /translations\//,
  /i18n-setup/,
  /i18n\/.*-i18n-setup/,
  /errors\//,
  /constants\.ts/,
  /constants\.js/,
];

/**
 * Common forbidden patterns for translation module tests.
 * Translations should only load enumerations, not i18n or errors.
 */
export const TRANSLATION_FORBIDDEN_PATTERNS = [
  /i18n-setup/,
  /i18n\/.*-i18n-setup/,
  /errors\//,
  /constants\.ts/,
  /constants\.js/,
];
