/**
 * Property-Based Tests: Business Logic Circular Dependencies
 *
 * Feature: fix-business-logic-circular-dependencies
 * These tests verify that business logic modules (constants, interfaces, member, services)
 * don't have circular dependencies.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import madge from 'madge';
import * as path from 'path';

describe('Property-Based Test: Business Logic Independence', () => {
  /**
   * Property 1: Constants module has no runtime dependencies on Member or services
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  describe('Property 1: Constants Module Independence', () => {
    it('should not load forbidden modules when importing constants', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (iteration) => {
          // Clear module cache
          jest.resetModules();

          // Track module loads
          const loadedModules = new Set<string>();
          const Module = require('module');
          const originalRequire = Module.prototype.require;

          Module.prototype.require = function (id: string) {
            loadedModules.add(id);
            return originalRequire.apply(this, arguments);
          };

          try {
            // Import constants from ecies-lib (node-ecies-lib uses ecies-lib's constants)
            const { Constants } = require('@digitaldefiance/ecies-lib');

            // Verify constants loaded
            expect(Constants).toBeDefined();

            // Check for forbidden modules
            const forbiddenPatterns = [
              /\/member\.ts$/,
              /\/member\.js$/,
              /\/services\//,
            ];

            const forbiddenLoads = Array.from(loadedModules).filter((mod) =>
              forbiddenPatterns.some((pattern) => pattern.test(mod)),
            );

            expect(forbiddenLoads).toHaveLength(0);
          } finally {
            Module.prototype.require = originalRequire;
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Interfaces use only type imports
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
   */
  describe('Property 2: Interface Type-Only Imports', () => {
    const interfacesDir = path.join(__dirname, '../../src/interfaces');

    // Get all interface files if directory exists
    let interfaceFiles: string[] = [];
    if (fs.existsSync(interfacesDir)) {
      interfaceFiles = fs
        .readdirSync(interfacesDir)
        .filter((f) => f.endsWith('.ts') && f !== 'index.ts');
    }

    if (interfaceFiles.length > 0) {
      it('should use only type imports in all interface files', () => {
        fc.assert(
          fc.property(fc.constantFrom(...interfaceFiles), (filename) => {
            const filePath = path.join(interfacesDir, filename);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Find all import statements
            const importStatements =
              content.match(/import\s+.*from\s+['"].*['"]/g) || [];

            // Filter for project-relative imports
            const projectImports = importStatements.filter((stmt) =>
              /from\s+['"]\.[^'"]*['"]/.test(stmt),
            );

            // Check each is type-only
            const valueImports = projectImports.filter(
              (stmt) => !stmt.includes('import type'),
            );

            // Filter out allowed patterns
            const forbiddenValueImports = valueImports.filter((stmt) => {
              if (
                stmt.includes('@ethereumjs') ||
                stmt.includes('@noble') ||
                stmt.includes('@scure') ||
                stmt.includes('bson') ||
                stmt.includes('ts-brand') ||
                stmt.includes('@digitaldefiance/ecies-lib')
              ) {
                return false;
              }
              return true;
            });

            expect(forbiddenValueImports).toHaveLength(0);
          }),
          { numRuns: interfaceFiles.length },
        );
      });
    } else {
      it('should skip interface tests if no interface files exist', () => {
        // node-ecies-lib may not have its own interfaces directory
        expect(true).toBe(true);
      });
    }
  });

  /**
   * Property 6: Module dependency graph is acyclic
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  describe('Property 6: Module Dependency Graph', () => {
    it('should have no circular dependencies in the module graph', async () => {
      const srcPath = path.join(__dirname, '../../src/index.ts');
      const tsconfigPath = path.join(__dirname, '../../tsconfig.json');

      // Analyze dependency graph
      const result = await madge(srcPath, {
        fileExtensions: ['ts'],
        tsConfig: tsconfigPath,
      });

      const circular = result.circular();

      // Filter out cycles that are entirely in external dependencies (node_modules or other packages)
      const internalCircular = circular.filter((cycle) => {
        // A cycle is internal if at least one file is in our src directory
        return cycle.some((file) => {
          const normalizedPath = file.replace(/\\/g, '/');
          return (
            normalizedPath.includes('/src/') &&
            !normalizedPath.includes('node_modules') &&
            !normalizedPath.includes('digitaldefiance-i18n-lib') &&
            !normalizedPath.includes('digitaldefiance-ecies-lib') &&
            !normalizedPath.includes('digitaldefiance-mongoose-types')
          );
        });
      });

      // Log any circular dependencies in our code
      if (internalCircular.length > 0) {
        console.error('Circular dependencies found in node-ecies-lib:');
        internalCircular.forEach((cycle, index) => {
          console.error(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
        });
      }

      expect(internalCircular).toHaveLength(0);
    }, 30000); // Increase timeout for madge analysis

    it('should respect module boundary rules', async () => {
      const srcPath = path.join(__dirname, '../../src/index.ts');
      const tsconfigPath = path.join(__dirname, '../../tsconfig.json');

      const result = await madge(srcPath, {
        fileExtensions: ['ts'],
        tsConfig: tsconfigPath,
      });

      const dependencies = result.obj();

      // Rule: Services should not create circular dependencies
      const serviceFiles = Object.keys(dependencies).filter((file) =>
        file.includes('services/'),
      );

      for (const serviceFile of serviceFiles) {
        const serviceDeps = dependencies[serviceFile] || [];

        // Check for circular patterns
        for (const dep of serviceDeps) {
          const depDeps = dependencies[dep] || [];
          const hasCircular = depDeps.some((d) => d === serviceFile);

          if (hasCircular) {
            console.error(
              `Circular dependency found: ${serviceFile} <-> ${dep}`,
            );
          }
          expect(hasCircular).toBe(false);
        }
      }
    }, 30000); // Increase timeout for madge analysis

    it('should not have previously identified circular dependencies', async () => {
      const srcPath = path.join(__dirname, '../../src/index.ts');
      const tsconfigPath = path.join(__dirname, '../../tsconfig.json');

      const result = await madge(srcPath, {
        fileExtensions: ['ts'],
        tsConfig: tsconfigPath,
      });

      const circular = result.circular();

      // Previously identified problematic patterns
      const problematicPatterns = [
        // member -> services -> interfaces -> member
        (cycle: string[]) =>
          cycle.some((m) => m.includes('member')) &&
          cycle.some((m) => m.includes('services')) &&
          cycle.some((m) => m.includes('interfaces')),

        // service -> utilities -> service
        (cycle: string[]) =>
          cycle.some((m) => m.includes('services/ecies/service')) &&
          cycle.some((m) => m.includes('services/ecies/utilities')),
      ];

      const foundProblematicCycles = circular.filter((cycle) =>
        problematicPatterns.some((pattern) => pattern(cycle)),
      );

      if (foundProblematicCycles.length > 0) {
        console.error(
          'Previously identified circular dependencies still exist:',
        );
        foundProblematicCycles.forEach((cycle, index) => {
          console.error(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
        });
      }

      expect(foundProblematicCycles).toHaveLength(0);
    }, 30000); // Increase timeout for madge analysis
  });
});
