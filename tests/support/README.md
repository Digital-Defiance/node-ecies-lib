# Testing Support Infrastructure

This directory contains utilities for testing module dependencies and circular dependency detection.

## Files

### `circular-dependency-checker.ts`
Provides utilities for detecting circular dependencies using madge:
- `checkCircularDependencies()` - Analyzes the project for circular dependencies
- `formatCircularDependencies()` - Formats circular dependency chains for readable output
- `assertNoCircularDependencies()` - Throws an error if circular dependencies are found

### `module-tracker.ts`
Provides utilities for tracking module imports during tests:
- `trackModuleLoads()` - Tracks which modules are loaded during a test operation
- `clearModuleCache()` - Clears the module cache for specific patterns
- `ENUMERATION_FORBIDDEN_PATTERNS` - Patterns for modules that enumerations should not load
- `TRANSLATION_FORBIDDEN_PATTERNS` - Patterns for modules that translations should not load

## Usage

### Checking for Circular Dependencies

```typescript
import { checkCircularDependencies, formatCircularDependencies } from '../support/circular-dependency-checker';

const result = await checkCircularDependencies('src/index.ts');
if (result.hasCircular) {
  console.log(formatCircularDependencies(result.circular));
}
```

### Tracking Module Imports

```typescript
import { trackModuleLoads, ENUMERATION_FORBIDDEN_PATTERNS } from '../support/module-tracker';

const result = trackModuleLoads(() => {
  require('../enumerations/ecies-string-key');
}, ENUMERATION_FORBIDDEN_PATTERNS);

expect(result.forbiddenLoads).toHaveLength(0);
```

## NPM Scripts

The following scripts are available for circular dependency detection:

- `yarn check:circular` - Check for circular dependencies and display results
- `yarn check:circular:json` - Check for circular dependencies and output as JSON

## Property-Based Testing

The infrastructure supports property-based testing using `fast-check`. Tests should:
- Run a minimum of 100 iterations
- Tag each test with the property it validates
- Reference the design document property number
