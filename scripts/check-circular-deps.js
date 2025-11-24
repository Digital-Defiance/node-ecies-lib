#!/usr/bin/env node

/**
 * Script to check for circular dependencies using madge
 * Exits with code 1 if circular dependencies are found, 0 otherwise
 */

const madge = require('madge');
const path = require('path');

async function checkCircularDependencies() {
  try {
    console.log('🔍 Checking for circular dependencies...\n');

    const result = await madge(path.join(__dirname, '../src/index.ts'), {
      fileExtensions: ['ts'],
      tsConfig: path.join(__dirname, '../tsconfig.json'),
      // Exclude node_modules and external packages
      excludeRegExp: [/node_modules/, /\.\.\/\.\.\/digitaldefiance-/],
    });

    const circular = result.circular();

    if (circular.length > 0) {
      console.error('❌ Circular dependencies detected:\n');
      circular.forEach((cycle, index) => {
        console.error(`  ${index + 1}. ${cycle.join(' → ')}`);
      });
      console.error(
        '\n💡 Please refactor the code to remove these circular dependencies.'
      );
      console.error(
        '   Circular dependencies can cause runtime errors and make code harder to maintain.\n'
      );
      process.exit(1);
    } else {
      console.log('✅ No circular dependencies found!\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error checking circular dependencies:', error.message);
    process.exit(1);
  }
}

checkCircularDependencies();
