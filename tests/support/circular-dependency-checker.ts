/**
 * Circular dependency detection utilities using madge.
 */

import { resolve } from 'path';

import madge from 'madge';

export interface CircularDependencyResult {
  hasCircular: boolean;
  circular: string[][];
  moduleCount: number;
}

/**
 * Checks for circular dependencies in the project using madge.
 *
 * @param entryPoint - The entry point file to analyze (default: 'src/index.ts')
 * @param baseDir - The base directory for the project (default: current directory)
 * @returns Object containing circular dependency information
 */
export async function checkCircularDependencies(
  entryPoint: string = 'src/index.ts',
  baseDir: string = process.cwd(),
): Promise<CircularDependencyResult> {
  const fullPath = resolve(baseDir, entryPoint);

  const result = await madge(fullPath, {
    fileExtensions: ['ts', 'js'],
    tsConfig: resolve(baseDir, 'tsconfig.json'),
    detectiveOptions: {
      ts: {
        skipTypeImports: true,
      },
    },
  });

  const circular = result.circular();
  const moduleCount = result.obj() ? Object.keys(result.obj()).length : 0;

  return {
    hasCircular: circular.length > 0,
    circular,
    moduleCount,
  };
}

/**
 * Formats circular dependency chains for readable output.
 *
 * @param circular - Array of circular dependency chains
 * @returns Formatted string representation
 */
export function formatCircularDependencies(circular: string[][]): string {
  if (circular.length === 0) {
    return 'No circular dependencies found.';
  }

  const lines = [
    `Found ${circular.length} circular ${
      circular.length === 1 ? 'dependency' : 'dependencies'
    }:`,
  ];

  circular.forEach((chain, index) => {
    lines.push(`\n${index + 1}) ${chain.join(' > ')}`);
  });

  return lines.join('\n');
}

/**
 * Asserts that no circular dependencies exist.
 * Throws an error with details if any are found.
 *
 * @param entryPoint - The entry point file to analyze
 * @param baseDir - The base directory for the project
 */
export async function assertNoCircularDependencies(
  entryPoint: string = 'src/index.ts',
  baseDir: string = process.cwd(),
): Promise<void> {
  const result = await checkCircularDependencies(entryPoint, baseDir);

  if (result.hasCircular) {
    const formatted = formatCircularDependencies(result.circular);
    throw new Error(`Circular dependencies detected:\n${formatted}`);
  }
}
