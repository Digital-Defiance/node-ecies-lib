# CI Setup for Circular Dependency Detection

This document describes the CI infrastructure that has been set up to detect circular dependencies.

## Components

### 1. Madge Dependency

**Location**: `package.json` (devDependencies)

```json
{
  "devDependencies": {
    "madge": "^8.0.0"
  }
}
```

Madge is a tool that analyzes module dependencies and detects circular references.

### 2. NPM Scripts

**Location**: `package.json` (scripts)

Three scripts have been added:

- `check:circular`: Basic check that displays circular dependencies
- `check:circular:json`: Outputs results in JSON format
- `check:circular:ci`: CI-friendly check that exits with code 1 on failure

```json
{
  "scripts": {
    "check:circular": "madge --circular --extensions ts src/index.ts",
    "check:circular:json": "madge --circular --extensions ts --json src/index.ts",
    "check:circular:ci": "node scripts/check-circular-deps.js"
  }
}
```

### 3. Check Script

**Location**: `scripts/check-circular-deps.js`

A Node.js script that:
- Uses madge to analyze the dependency graph
- Excludes node_modules and external packages
- Provides clear, formatted output
- Exits with appropriate exit codes for CI

### 4. Nx Target

**Location**: `project.json`

An Nx target for running circular dependency checks:

```json
{
  "targets": {
    "check-circular": {
      "executor": "nx:run-commands",
      "options": {
        "command": "madge --circular --extensions ts src/index.ts",
        "cwd": "packages/digitaldefiance-node-ecies-lib"
      }
    }
  }
}
```

### 5. GitHub Actions Workflow

**Location**: `.github/workflows/ci.yml`

A complete CI workflow that:
- Runs on push and pull requests to main/develop branches
- Checks for circular dependencies first
- Runs tests only if circular dependency check passes
- Builds the project only if tests pass

The workflow has three jobs:
1. **circular-dependency-check**: Runs the circular dependency check
2. **test**: Runs tests and linting (depends on circular-dependency-check)
3. **build**: Builds the project (depends on test)

### 6. Documentation

**Location**: `docs/CIRCULAR_DEPENDENCIES.md`

Comprehensive documentation covering:
- What circular dependencies are
- How to check for them locally
- How CI checking works
- Strategies for fixing circular dependencies
- Module organization guidelines

## Usage

### Local Development

```bash
# Check for circular dependencies
yarn check:circular

# CI-friendly check (exits with code 1 if found)
yarn check:circular:ci

# Get JSON output
yarn check:circular:json
```

### CI Pipeline

The CI pipeline automatically runs on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

The pipeline will fail if circular dependencies are detected, preventing them from being merged.

## Exit Codes

The `check:circular:ci` script uses the following exit codes:

- **0**: No circular dependencies found (success)
- **1**: Circular dependencies detected or error occurred (failure)

## Configuration

The circular dependency check is configured to:
- Start analysis from `src/index.ts`
- Analyze TypeScript files (`.ts` extension)
- Use `tsconfig.json` for module resolution
- Exclude `node_modules` and external packages (e.g., `@digitaldefiance/*`)

## Benefits

1. **Early Detection**: Catches circular dependencies before they're merged
2. **Automated**: No manual checking required
3. **Clear Feedback**: Provides detailed information about detected cycles
4. **Prevents Regressions**: Ensures circular dependencies don't get reintroduced

## Related Files

- `package.json`: NPM scripts and madge dependency
- `project.json`: Nx target configuration
- `scripts/check-circular-deps.js`: Check script
- `.github/workflows/ci.yml`: GitHub Actions workflow
- `docs/CIRCULAR_DEPENDENCIES.md`: User documentation
