# Circular Dependency Detection

This document explains how circular dependency detection is configured and used in this project.

## What are Circular Dependencies?

Circular dependencies occur when module A imports from module B, which directly or indirectly imports from module A, creating a cycle. This can cause:

- Undefined values at runtime
- Difficult-to-debug errors
- Harder code maintenance
- Unpredictable module initialization order

## Checking for Circular Dependencies

### Local Development

You can check for circular dependencies locally using any of these commands:

```bash
# Basic check (shows circular dependencies if found)
yarn check:circular

# CI-friendly check (exits with code 1 if circular dependencies found)
yarn check:circular:ci

# JSON output (useful for programmatic processing)
yarn check:circular:json
```

### Continuous Integration

Circular dependency checking is automatically run in CI on every push and pull request. The CI workflow:

1. Checks out the code
2. Installs dependencies
3. Runs `yarn check:circular:ci`
4. Fails the build if circular dependencies are detected

The CI configuration is located at `.github/workflows/ci.yml`.

## How It Works

The circular dependency detection uses [madge](https://github.com/pahen/madge), a tool that:

1. Analyzes the module dependency graph
2. Detects cycles in the graph
3. Reports any circular dependencies found

The detection is configured to:

- Start from `src/index.ts` (the main entry point)
- Analyze TypeScript files (`.ts` extension)
- Use the project's `tsconfig.json` for module resolution
- Exclude `node_modules` and external packages

## Fixing Circular Dependencies

If circular dependencies are detected, here are common strategies to fix them:

### 1. Extract Shared Code

Move shared code that both modules need into a third module:

```typescript
// Before: A imports B, B imports A
// A.ts
import { funcB } from './B';

// B.ts
import { funcA } from './A';

// After: Extract shared code to C
// C.ts
export const sharedFunc = () => { /* ... */ };

// A.ts
import { sharedFunc } from './C';

// B.ts
import { sharedFunc } from './C';
```

### 2. Use Dependency Inversion

Instead of importing concrete implementations, use interfaces and dependency injection:

```typescript
// Before: Service imports Repository, Repository imports Service
// After: Both depend on interfaces
// interfaces.ts
export interface IRepository { /* ... */ }
export interface IService { /* ... */ }

// repository.ts
import { IService } from './interfaces';

// service.ts
import { IRepository } from './interfaces';
```

### 3. Lazy Loading

Defer imports until they're actually needed:

```typescript
// Before: Import at top level
import { heavyModule } from './heavy';

// After: Import when needed
async function useHeavyModule() {
  const { heavyModule } = await import('./heavy');
  // use heavyModule
}
```

### 4. Reorganize Module Hierarchy

Ensure modules follow a clear hierarchy where lower-level modules don't import from higher-level ones:

```
Level 1: Pure data types and enums (no imports)
Level 2: Utilities (import only from Level 1)
Level 3: Services (import from Levels 1-2)
Level 4: Controllers (import from Levels 1-3)
```

## Module Organization Guidelines

To prevent circular dependencies, follow these guidelines:

1. **Enumerations and Types**: Should have no imports except TypeScript types
2. **Utilities**: Should only import from enumerations and types
3. **Services**: Can import from utilities, enumerations, and types
4. **Higher-level modules**: Can import from lower-level modules

## Related Documentation

- [Module Dependency Architecture](./ARCHITECTURE.md)
- [Contributing Guidelines](../README.md#contributing)

## Tools

- **madge**: [https://github.com/pahen/madge](https://github.com/pahen/madge)
- **Script**: `scripts/check-circular-deps.js`
- **CI Workflow**: `.github/workflows/ci.yml`
