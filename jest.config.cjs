const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.base.json');

// Suppress TypeScript ESLint deprecation warnings
const originalWarn = process.emitWarning;
process.emitWarning = function(warning, type, code) {
  if (
    typeof warning === 'string' &&
    warning.includes('The \'argument\' property is deprecated on TSImportType nodes')
  ) {
    return;
  }
  originalWarn.call(process, warning, type, code);
};

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', 'ecies.spec.ts', 'safe-prime-benchmark.spec.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  setupFiles: ['<rootDir>/tests/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.ts'],
  // Run tests in-band to avoid BigInt serialization issues in Jest worker IPC
  // See: https://github.com/jestjs/jest/issues/11617
  maxWorkers: 1,
  detectOpenHandles: false,
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js|@noble|@scure|@ethereumjs|uuid))',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
          target: 'es2020',
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
    '^.+\\.(js|jsx|mjs)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'ecmascript',
          },
          target: 'es2020',
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@digitaldefiance/ecies-lib$':
      '<rootDir>/../digitaldefiance-ecies-lib/src/index.ts',
    '^@digitaldefiance/ecies-lib/voting$':
      '<rootDir>/../digitaldefiance-ecies-lib/src/lib/voting/index.ts',
    '^@digitaldefiance/ecies-lib/(.*)$':
      '<rootDir>/../digitaldefiance-ecies-lib/src/$1',
    ...pathsToModuleNameMapper(compilerOptions.paths, {
      prefix: '<rootDir>/../../',
    }),
  },
};
