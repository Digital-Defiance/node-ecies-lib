# Task: Mirror ecies-lib v3.7.2 Improvements in node-ecies-lib

## Context

The sibling package `@digitaldefiance/ecies-lib` has completed a major architectural upgrade (v3.7.2) that includes:

1. **ID Provider Architecture** - Replaced hardcoded 32-byte recipient IDs with pluggable providers
2. **i18n-lib 3.7.2 Integration** - Enhanced error handling with ICU MessageFormat
3. **Critical Bug Fixes** - Fixed 12 vs 32-byte recipient ID discrepancies
4. **Enterprise Architecture Improvements** - Invariant validation, configuration provenance, enhanced error context

This package (`@digitaldefiance/node-ecies-lib`) must mirror these exact changes to maintain:

- **Binary format compatibility** between ecies-lib and node-ecies-lib
- **API consistency** for consumers using both packages
- **Feature parity** across browser and Node.js environments

## Critical Requirements

### Binary Compatibility

- **MUST maintain binary format compatibility** between the two packages
- Both packages encrypt/decrypt data that must be fully interoperable
- Consumers select the appropriate ID provider (ObjectIdProvider, GuidV4Provider, etc.) on **both sides**
- No provider identifier is embedded in the encrypted data format
- Cross-platform encryption tests must verify: encrypt with ecies-lib → decrypt with node-ecies-lib (and vice versa)

### Dependency Strategy

- **Import shared code from ecies-lib** where possible:
  - `GuidV4` class and GUID functionality
  - All ID provider implementations (ObjectIdProvider, GuidV4Provider, UuidProvider, etc.)
  - Invariant interfaces and base classes
  - Error types and enumerations
- **Implement node-ecies-lib specific code** for:
  - Node.js crypto operations (vs browser crypto)
  - Node.js-specific services and utilities
  - File system operations unique to Node.js

### Architecture Alignment

- Mirror the same ID provider architecture from ecies-lib
- Keep APIs as similar as possible between the two packages
- Tests should follow similar patterns to ensure consistency
- Document any intentional differences (Node.js vs browser constraints)

## The Problem We're Solving

### Original 12 vs 32-Byte Discrepancy

In ecies-lib, we discovered a critical bug:

```typescript
// Documentation/Intent: 12-byte MongoDB ObjectIDs
const OBJECT_ID_LENGTH = 12;

// Actual Implementation: 32-byte hardcoded IDs
const MULTI_RECIPIENT_CONSTANTS.RECIPIENT_ID_SIZE = 32;

// Validation checked different constants!
if (ECIES.MULTIPLE.RECIPIENT_ID_SIZE !== config.OBJECT_ID_LENGTH) // 12 === 12 ✓
// But actual code used MULTI_RECIPIENT_CONSTANTS.RECIPIENT_ID_SIZE (32) ✗
```

**Impact:**

- System worked but wasted 20 bytes per recipient (62.5% overhead)
- Violated design intent (MongoDB ObjectId compatibility)
- Tests passed because they validated against different constants

**This same bug likely exists in node-ecies-lib and must be fixed.**

## Phase 1: Dependency Updates

### 1.1: Upgrade i18n-lib

**Current version:** Check `package.json`
**Target version:** `3.7.2` or later

```bash
yarn add @digitaldefiance/i18n-lib@^3.7.2
```

**What's new in i18n-lib 3.7.2:**

- ICU MessageFormat enhancements (number formatting, selectordinal, nested messages)
- Explicit exports for `createPluralString`, `createGenderedString`
- `PluralString` and `GenderedString` types exported
- 93%+ test coverage, 1,738 tests passing

### 1.2: Add ecies-lib Dependency

Add ecies-lib as a dependency to import shared code:

```bash
yarn add @digitaldefiance/ecies-lib@^3.7.2
```

**What to import from ecies-lib:**

- `GuidV4` class
- All ID providers: `ObjectIdProvider`, `GuidV4Provider`, `UuidProvider`, `Legacy32ByteProvider`, `CustomIdProvider`
- `IIdProvider` interface and `BaseIdProvider` base class
- `IInvariant` interface and `BaseInvariant` base class
- `IConfigurationProvenance` interface
- Error types: `IdProviderError`, `IdProviderErrorType`
- Shared utility functions

## Phase 2: ID Provider Integration (CRITICAL)

### 2.1: Import ID Providers from ecies-lib

```typescript
// src/constants.ts or appropriate file
import {
  IIdProvider,
  BaseIdProvider,
  ObjectIdProvider,
  GuidV4Provider,
  UuidProvider,
  Legacy32ByteProvider,
  CustomIdProvider,
} from '@digitaldefiance/ecies-lib';
```

### 2.2: Update IConstants Interface

```typescript
// src/interfaces/constants.ts
export interface IConstants {
  // ... existing fields ...
  
  /**
   * ID provider for recipient identification in multi-recipient encryption.
   * This determines the format and size of recipient IDs used throughout the system.
   * 
   * Default: ObjectIdProvider (12 bytes, MongoDB compatible)
   */
  idProvider: IIdProvider;

  /**
   * The length of user IDs in the system.
   * This is dynamically determined by the configured ID provider.
   * @deprecated Use idProvider.byteLength instead for direct access
   */
  MEMBER_ID_LENGTH: number;

  /**
   * The length of a raw object ID (not the hex string representation).
   * Standard MongoDB ObjectID is 12 bytes.
   * @deprecated Use idProvider.byteLength instead for direct access
   */
  OBJECT_ID_LENGTH: number;
  
  // ... rest of fields ...
}
```

### 2.3: Update Constants with Default ID Provider

```typescript
// src/constants.ts
import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';

/**
 * Default ID provider instance (singleton).
 * Uses MongoDB ObjectID format (12 bytes).
 */
const DEFAULT_ID_PROVIDER = new ObjectIdProvider();

export const Constants: IConstants = Object.freeze({
  // ... existing constants ...
  idProvider: DEFAULT_ID_PROVIDER,
  MEMBER_ID_LENGTH: DEFAULT_ID_PROVIDER.byteLength, // 12 bytes
  OBJECT_ID_LENGTH: 12,
  // ... rest of constants ...
});
```

### 2.4: Add Auto-Sync Logic

**CRITICAL:** Add this to `createRuntimeConfiguration()` function:

```typescript
// src/constants.ts
export function createRuntimeConfiguration(
  overrides?: DeepPartial<IConstants>,
  base: IConstants = Constants,
): IConstants {
  const merged = deepClone(base);
  applyOverrides(merged, overrides);
  
  // ⚠️ ADD THIS AUTO-SYNC LOGIC ⚠️
  // Auto-sync MEMBER_ID_LENGTH with idProvider.byteLength if provider changed
  if (merged.idProvider && merged.idProvider !== base.idProvider) {
    merged.MEMBER_ID_LENGTH = merged.idProvider.byteLength;
  }
  
  // Auto-sync ECIES.MULTIPLE.RECIPIENT_ID_SIZE with idProvider.byteLength if provider changed
  if (merged.idProvider && merged.idProvider !== base.idProvider) {
    merged.ECIES = {
      ...merged.ECIES,
      MULTIPLE: {
        ...merged.ECIES.MULTIPLE,
        RECIPIENT_ID_SIZE: merged.idProvider.byteLength,
      },
    };
  }
  // ⚠️ END AUTO-SYNC LOGIC ⚠️
  
  validateConstants(merged);
  return deepFreeze(merged);
}
```

**Why This Matters:** This prevents the 12 vs 32-byte discrepancy from recurring by automatically syncing all size-related constants when the ID provider changes.

### 2.5: Update Constants Validation

```typescript
// src/constants.ts
function validateConstants(config: IConstants): void {
  // ... existing validation ...
  
  // ⚠️ ADD ID PROVIDER VALIDATION ⚠️
  
  // Validate ID provider is present and valid
  if (!config.idProvider) {
    throw new Error('ID provider is required in constants configuration');
  }

  if (typeof config.idProvider.byteLength !== 'number' || 
      config.idProvider.byteLength < 1 || 
      config.idProvider.byteLength > 255) {
    throw new Error(
      `Invalid ID provider byteLength: ${config.idProvider.byteLength}. Must be between 1 and 255.`
    );
  }

  // Validate MEMBER_ID_LENGTH matches ID provider
  if (config.MEMBER_ID_LENGTH !== config.idProvider.byteLength) {
    throw new Error(
      `MEMBER_ID_LENGTH (${config.MEMBER_ID_LENGTH}) must match idProvider.byteLength (${config.idProvider.byteLength})`
    );
  }

  // Validate ECIES.MULTIPLE.RECIPIENT_ID_SIZE matches ID provider
  if (config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE !== config.idProvider.byteLength) {
    throw new ECIESError(
      ECIESErrorTypeEnum.InvalidECIESMultipleRecipientIdSize,
      // ... error options ...
    );
  }
  
  // ⚠️ END ID PROVIDER VALIDATION ⚠️
}
```

### 2.6: Make Multi-Recipient Constants Dynamic

**Find:** `multi-recipient-chunk.ts` or equivalent file

**Current (likely):**

```typescript
export const MULTI_RECIPIENT_CONSTANTS = {
  MAGIC: 0x4D524543,
  VERSION: 0x0001,
  HEADER_SIZE: 32,
  RECIPIENT_ID_SIZE: 32, // ← HARDCODED!
  KEY_SIZE_BYTES: 2,
  FLAG_IS_LAST: 0x01,
  FLAG_HAS_CHECKSUM: 0x02,
  MAX_RECIPIENTS: 65535,
} as const;
```

**Replace with:**

```typescript
export interface IMultiRecipientConstants {
  readonly MAGIC: number;
  readonly VERSION: number;
  readonly HEADER_SIZE: number;
  readonly RECIPIENT_ID_SIZE: number;
  readonly KEY_SIZE_BYTES: number;
  readonly FLAG_IS_LAST: number;
  readonly FLAG_HAS_CHECKSUM: number;
  readonly MAX_RECIPIENTS: number;
}

/**
 * Get multi-recipient constants for a specific recipient ID size.
 * This allows the format to adapt to different ID providers.
 */
export function getMultiRecipientConstants(
  recipientIdSize: number
): IMultiRecipientConstants {
  if (!Number.isInteger(recipientIdSize) || recipientIdSize < 1 || recipientIdSize > 255) {
    throw new Error(
      `Invalid recipientIdSize: ${recipientIdSize}. Must be an integer between 1 and 255.`
    );
  }

  return Object.freeze({
    MAGIC: 0x4D524543,
    VERSION: 0x0001,
    HEADER_SIZE: 32,
    RECIPIENT_ID_SIZE: recipientIdSize, // ← DYNAMIC!
    KEY_SIZE_BYTES: 2,
    FLAG_IS_LAST: 0x01,
    FLAG_HAS_CHECKSUM: 0x02,
    MAX_RECIPIENTS: 65535,
  });
}

/**
 * Default multi-recipient constants using ObjectID size (12 bytes).
 * @deprecated Use getMultiRecipientConstants(config.idProvider.byteLength) instead
 */
export const MULTI_RECIPIENT_CONSTANTS = getMultiRecipientConstants(12);
```

### 2.7: Update Multi-Recipient Services

**Find:** Multi-recipient processor/service files

**Update constructor to use dynamic ID size:**

```typescript
export class MultiRecipientProcessor {
  private readonly recipientIdSize: number;
  private readonly constants: IMultiRecipientConstants;

  constructor(
    private readonly ecies: ECIESService,
    private readonly config: IConstants = Constants
  ) {
    this.recipientIdSize = config.idProvider.byteLength;
    this.constants = getMultiRecipientConstants(this.recipientIdSize);
  }
  
  // Update all methods to use this.recipientIdSize instead of hardcoded 32
  // Update all references to use this.constants instead of MULTI_RECIPIENT_CONSTANTS
}
```

**Critical:** Search for all hardcoded `32` values related to recipient IDs and replace with `this.recipientIdSize` or `config.idProvider.byteLength`.

## Phase 3: Translation File Updates

### 3.1: Import PluralString and Helper Functions

Update all translation files (e.g., `src/i18n/translations/*.ts`):

```typescript
import { createPluralString, PluralString } from '@digitaldefiance/i18n-lib';

export const translations: Record<StringKey, string | PluralString> = {
  // Now supports both string and PluralString values
  
  // Example plural:
  SomeKey: createPluralString({
    zero: 'No items',
    one: '1 item',
    other: '{count} items',
  }),
  
  // Regular string:
  AnotherKey: 'Regular message',
};
```

### 3.2: Add New String Keys

Add to your string key enum (e.g., `src/enumerations/string-key.ts`):

```typescript
export enum StringKey {
  // ... existing keys ...
  
  // ID Provider Errors
  Error_IdProviderError_InvalidLength = 'Error_IdProviderError_InvalidLength',
  Error_IdProviderError_InputMustBeString = 'Error_IdProviderError_InputMustBeString',
  Error_IdProviderError_InvalidStringLength = 'Error_IdProviderError_InvalidStringLength',
  Error_IdProviderError_InvalidCharacters = 'Error_IdProviderError_InvalidCharacters',
  Error_IdProviderError_InvalidDeserializedId = 'Error_IdProviderError_InvalidDeserializedId',
  Error_IdProviderError_InvalidByteLengthParameter = 'Error_IdProviderError_InvalidByteLengthParameter',
  Error_IdProviderError_ParseFailed = 'Error_IdProviderError_ParseFailed',
  Error_IdProviderError_InvalidGuidBuffer = 'Error_IdProviderError_InvalidGuidBuffer',
  Error_IdProviderError_InvalidUuidFormat = 'Error_IdProviderError_InvalidUuidFormat',
  
  // Invariant Validation Errors
  Error_Invariant_ValidationFailedTemplate = 'Error_Invariant_ValidationFailedTemplate',
  Error_Invariant_UnknownInvariantTemplate = 'Error_Invariant_UnknownInvariantTemplate',
  Error_Invariant_ConfigurationValidationFailedMultipleTemplate = 'Error_Invariant_ConfigurationValidationFailedMultipleTemplate',
  
  // Stream errors with template support
  Error_Stream_InvalidRecipientIdLengthTemplate = 'Error_Stream_InvalidRecipientIdLengthTemplate',
}
```

### 3.3: Update Type Declarations

```typescript
// Update translation type to support PluralString
export const translations: Record<StringKey, string | PluralString> = {
  // Previously: Record<StringKey, string>
  // Now: Record<StringKey, string | PluralString>
};
```

## Phase 4: Invariant Validation System

### 4.1: Import Invariant Interfaces from ecies-lib

```typescript
// src/lib/invariant-validator.ts
import { IInvariant, BaseInvariant } from '@digitaldefiance/ecies-lib';
```

### 4.2: Create Recipient ID Consistency Invariant

```typescript
// src/lib/invariants/recipient-id-consistency.ts
import { BaseInvariant, IConstants } from '@digitaldefiance/ecies-lib';
import { getMultiRecipientConstants } from '../../interfaces/multi-recipient-chunk';

export class RecipientIdConsistencyInvariant extends BaseInvariant {
  constructor() {
    super(
      'RecipientIdConsistency',
      'Validates that all recipient ID size constants are consistent with the configured ID provider'
    );
  }

  check(config: IConstants): boolean {
    const mrConstants = getMultiRecipientConstants(config.idProvider.byteLength);
    
    return (
      config.MEMBER_ID_LENGTH === config.idProvider.byteLength &&
      config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE === config.idProvider.byteLength &&
      mrConstants.RECIPIENT_ID_SIZE === config.idProvider.byteLength
    );
  }

  errorMessage(config: IConstants): string {
    const mrConstants = getMultiRecipientConstants(config.idProvider.byteLength);
    
    return this.formatError(
      'MEMBER_ID_LENGTH',
      config.MEMBER_ID_LENGTH,
      'idProvider.byteLength',
      config.idProvider.byteLength
    ) + ` | ECIES.MULTIPLE.RECIPIENT_ID_SIZE=${config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE} | ` +
       `MULTI_RECIPIENT_CONSTANTS.RECIPIENT_ID_SIZE=${mrConstants.RECIPIENT_ID_SIZE}`;
  }
}
```

### 4.3: Create Invariant Validator

```typescript
// src/lib/invariant-validator.ts
import { IInvariant, IConstants } from '@digitaldefiance/ecies-lib';
import { RecipientIdConsistencyInvariant } from './invariants/recipient-id-consistency';

export class InvariantValidator {
  private static invariants: IInvariant[] = [
    new RecipientIdConsistencyInvariant(),
    // Add more invariants as needed
  ];

  static validateAll(config: IConstants): void {
    const failures: string[] = [];

    for (const invariant of this.invariants) {
      if (!invariant.check(config)) {
        failures.push(`${invariant.name}: ${invariant.errorMessage(config)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${failures.join('\n')}`
      );
    }
  }

  static register(invariant: IInvariant): void {
    this.invariants.push(invariant);
  }
}
```

### 4.4: Integrate Invariant Validation

```typescript
// src/constants.ts
import { InvariantValidator } from './lib/invariant-validator';

export function createRuntimeConfiguration(
  overrides?: DeepPartial<IConstants>,
  base: IConstants = Constants,
): IConstants {
  const merged = deepClone(base);
  applyOverrides(merged, overrides);
  
  // Auto-sync logic (from Phase 2.4)
  // ...
  
  // Validate individual properties
  validateConstants(merged);
  
  // ⚠️ ADD INVARIANT VALIDATION ⚠️
  // Validate all invariants (relationships between properties)
  InvariantValidator.validateAll(merged);
  
  return deepFreeze(merged);
}
```

## Phase 5: Configuration Provenance Tracking

### 5.1: Import Provenance Interface from ecies-lib

```typescript
// src/constants.ts
import { IConfigurationProvenance } from '@digitaldefiance/ecies-lib';
```

### 5.2: Add Provenance Tracking to Registry

```typescript
// src/constants.ts
const provenanceRegistry = new Map<ConfigurationKey, IConfigurationProvenance>();

// Initialize default provenance
provenanceRegistry.set(DEFAULT_CONFIGURATION_KEY, {
  baseConfigKey: 'none',
  overrides: {},
  timestamp: new Date(),
  source: 'default',
  checksum: calculateConfigChecksum(Constants),
  description: 'Built-in default configuration',
});
```

### 5.3: Update ConstantsRegistry

```typescript
export class ConstantsRegistry {
  // ... existing methods ...
  
  public static getProvenance(key: ConfigurationKey = DEFAULT_CONFIGURATION_KEY): IConfigurationProvenance | undefined {
    return provenanceRegistry.get(key);
  }

  public static register(
    key: ConfigurationKey,
    configOrOverrides?: DeepPartial<IConstants> | IConstants,
    options?: { baseKey?: ConfigurationKey; description?: string },
  ): IConstants {
    // ... existing registration logic ...
    
    // Track provenance
    const provenance: IConfigurationProvenance = {
      baseConfigKey: typeof baseKey === 'symbol' ? baseKey.toString() : baseKey,
      overrides: isFullConfig ? {} : (configOrOverrides ?? {}),
      timestamp: new Date(),
      source: isFullConfig ? 'custom' : 'runtime',
      checksum: calculateConfigChecksum(configuration),
      description: options?.description,
      creationStack: captureCreationStack(),
    };

    provenanceRegistry.set(key, provenance);
    return configuration;
  }
}
```

## Phase 6: Enhanced Error Context

### 6.1: Add Error Context Interface

```typescript
// src/errors/ecies.ts or appropriate file
export interface IErrorContext {
  operation: string;
  stackTrace: string;
  config?: Partial<{
    idProviderName: string;
    idProviderByteLength: number;
    memberIdLength: number;
    recipientIdSize: number;
  }>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

### 6.2: Enhance Error Classes

```typescript
export class ECIESError extends TypedHandleableError {
  public readonly context?: IErrorContext;

  constructor(
    type: ECIESErrorTypeEnum,
    options?: HandleableErrorOptions,
    language?: string,
    otherVars?: Record<string, string | number>,
    context?: Partial<IErrorContext>,
  ) {
    super(/* ... */);
    
    if (context) {
      this.context = {
        operation: context.operation ?? 'unknown',
        stackTrace: context.stackTrace ?? new Error().stack ?? 'stack unavailable',
        config: context.config,
        timestamp: context.timestamp ?? new Date(),
        metadata: context.metadata,
      };
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
    };
  }

  getDetailedReport(): string {
    // Format error with full context
  }
}
```

## Phase 7: Integration Tests (CRITICAL)

### 7.1: Create Recipient ID Consistency Tests

Create `tests/integration/recipient-id-consistency.spec.ts`:

```typescript
import { Constants, createRuntimeConfiguration } from '../../src/constants';
import {
  ObjectIdProvider,
  GuidV4Provider,
  Legacy32ByteProvider,
} from '@digitaldefiance/ecies-lib';
import { getMultiRecipientConstants } from '../../src/interfaces/multi-recipient-chunk';

describe('Recipient ID Consistency Integration Tests', () => {
  describe('Critical: All constants must align with ID provider', () => {
    it('should enforce ECIES.MULTIPLE.RECIPIENT_ID_SIZE matches idProvider.byteLength', () => {
      const config = Constants;

      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(
        config.idProvider.byteLength
      );
      expect(config.MEMBER_ID_LENGTH).toBe(config.idProvider.byteLength);
      expect(config.idProvider.byteLength).toBe(12); // Default is ObjectID
    });

    it('should enforce getMultiRecipientConstants matches idProvider', () => {
      const config = Constants;
      const mrConstants = getMultiRecipientConstants(
        config.idProvider.byteLength
      );

      expect(mrConstants.RECIPIENT_ID_SIZE).toBe(config.idProvider.byteLength);
      expect(mrConstants.RECIPIENT_ID_SIZE).toBe(
        config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE
      );
    });

    it('should fail validation if ECIES constant does not match ID provider', () => {
      expect(() => {
        createRuntimeConfiguration({
          ECIES: {
            MULTIPLE: {
              RECIPIENT_ID_SIZE: 999, // Wrong size!
            },
          },
        });
      }).toThrow('Invalid ECIES multiple recipient ID size');
    });

    it('should auto-sync MEMBER_ID_LENGTH when ID provider changes', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(), // 16 bytes
      });

      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);
      expect(config.idProvider.byteLength).toBe(16);
    });
  });

  describe('Integration: Multi-recipient encryption with ID providers', () => {
    // Add encryption/decryption tests with different providers
    // Test ObjectID (12 bytes), GUID (16 bytes)
  });

  describe('Regression: Prevent 12 vs 32 byte discrepancy', () => {
    it('should fail if MULTI_RECIPIENT_CONSTANTS does not match ECIES.MULTIPLE', () => {
      const config = Constants;
      const mrConstants = getMultiRecipientConstants(
        config.idProvider.byteLength
      );

      // These MUST match
      expect(mrConstants.RECIPIENT_ID_SIZE).toBe(
        config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE
      );
    });
  });
});
```

### 7.2: Create Cross-Platform Compatibility Tests

Create `tests/integration/cross-platform-binary-compatibility.spec.ts`:

```typescript
/**
 * CRITICAL: These tests verify binary compatibility between
 * @digitaldefiance/ecies-lib (browser) and @digitaldefiance/node-ecies-lib (Node.js)
 */
import { ObjectIdProvider, GuidV4Provider } from '@digitaldefiance/ecies-lib';

describe('Cross-Platform Binary Compatibility', () => {
  it('should encrypt with node-ecies and decrypt with ecies-lib (ObjectID)', async () => {
    // Test that data encrypted here can be decrypted by ecies-lib
  });

  it('should encrypt with ecies-lib and decrypt with node-ecies (ObjectID)', async () => {
    // Test that data encrypted by ecies-lib can be decrypted here
  });

  it('should encrypt with node-ecies and decrypt with ecies-lib (GUID)', async () => {
    // Same test with GuidV4Provider
  });

  // Test all provider combinations
});
```

### 7.3: Create Encrypted Message Structure Tests

Create `tests/integration/encrypted-message-structure.spec.ts`:

```typescript
describe('Encrypted Message Structure Validation', () => {
  it('should have different total lengths for ObjectID (12), GUID (16)', async () => {
    // Verify binary format changes based on ID provider
  });

  it('should calculate correct message structure for ObjectID provider', async () => {
    // Verify: Header(32) + RecipientID(12) + KeySize(2) + EncryptedKey(var) + IV(12) + Data + AuthTag(16)
  });

  it('should verify recipient IDs are embedded correctly in buffer', async () => {
    // Check binary layout
  });
});
```

## Phase 8: Update Tests to Use ID Providers

### 8.1: Search and Replace Hardcoded IDs

**Find all test files** with hardcoded recipient ID generation:

```typescript
// OLD:
const recipientId = crypto.randomBytes(32);

// NEW:
const config = Constants; // or specific config
const recipientId = config.idProvider.generate();
```

### 8.2: Update Test Expectations

```typescript
// OLD:
expect(recipientId.length).toBe(32);

// NEW:
const config = Constants;
expect(recipientId.length).toBe(config.idProvider.byteLength);
```

### 8.3: Add Provider-Specific Tests

Create `tests/lib/id-providers/` directory with tests for each provider (can import tests from ecies-lib or write similar ones).

## Phase 9: Documentation Updates

### 9.1: Update README.md

Add section on ID providers:

```markdown
## ID Provider System

This library supports multiple recipient ID formats:

- **ObjectIdProvider** (12 bytes) - MongoDB compatible, DEFAULT
- **GuidV4Provider** (16 bytes) - Standard GUID/UUID format
- **UuidProvider** (16 bytes) - UUID v4 with dashes
- **Legacy32ByteProvider** (32 bytes) - Backward compatibility

### Usage

\`\`\`typescript
import { createRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';

// Use GUID instead of ObjectID
const config = createRuntimeConfiguration({
  idProvider: new GuidV4Provider()
});

const encryptedData = await encrypt(data, config);
\`\`\`
```

### 9.2: Update CHANGELOG

Document all changes in a new version entry.

### 9.3: Create Migration Guide

Document how to upgrade from previous versions.

## Phase 10: Build and Validation

### 10.1: Build the Package

```bash
yarn build
```

Fix any TypeScript compilation errors.

### 10.2: Run All Tests

```bash
yarn test
```

**Target:** 100% test pass rate (like ecies-lib achieved: 1,215/1,215 tests passing)

### 10.3: Run Linting

```bash
yarn lint
```

Fix any linting errors.

### 10.4: Verify Cross-Platform Compatibility

Run integration tests that verify binary compatibility with ecies-lib:

```bash
yarn test tests/integration/cross-platform-binary-compatibility.spec.ts
```

## Success Criteria

- ✅ **Build Success**: Package builds without errors
- ✅ **100% Test Pass Rate**: All tests pass, no failures
- ✅ **ID Provider System**: All 4 providers working (ObjectId, GUID, UUID, Legacy32)
- ✅ **Binary Compatibility**: Cross-platform tests pass (encrypt with node-ecies, decrypt with ecies-lib and vice versa)
- ✅ **Variable-Length IDs**: No hard-coded 32-byte assumptions remain
- ✅ **Invariant Validation**: RecipientIdConsistency and other invariants work
- ✅ **Auto-Sync**: Changing ID provider automatically updates all related constants
- ✅ **API Consistency**: APIs match ecies-lib patterns where applicable
- ✅ **i18n Integration**: PluralString support, new error keys, template messages
- ✅ **Configuration Provenance**: Tracking works for debugging

## Priority Order

### CRITICAL - Do This First

1. **Phase 2: ID Provider Integration** - This is the foundational change
2. **Phase 7: Integration Tests** - Verify the architecture works
3. **Phase 10: Cross-Platform Compatibility** - Verify binary compatibility

### High Priority

4. **Phase 3: Translation Updates** - i18n improvements
5. **Phase 4: Invariant Validation** - Prevent configuration drift
6. **Phase 8: Update Existing Tests** - Ensure all tests use providers

### Medium Priority

7. **Phase 5: Configuration Provenance** - Debugging support
8. **Phase 6: Enhanced Error Context** - Better error messages
9. **Phase 9: Documentation** - User-facing updates

## Node.js vs Browser Differences to Consider

### Crypto APIs

- Node.js: `crypto.randomBytes()`, `crypto.createCipheriv()`
- Browser: `crypto.getRandomValues()`, `crypto.subtle.encrypt()`

### Buffer vs Uint8Array

- Node.js: Prefers `Buffer` (extends `Uint8Array`)
- Browser: Uses `Uint8Array`

**Strategy:** Use `Uint8Array` for compatibility, convert to `Buffer` only when needed for Node.js-specific APIs.

### File System

- Node.js: Has `fs` module for file operations
- Browser: No file system access

**Strategy:** Keep file-specific operations in node-ecies-lib, don't port to ecies-lib.

## Known Issues from ecies-lib to Watch For

### Issue 1: PBKDF2 Enum Values

Check if node-ecies-lib uses:

- `INTERACTIVE` → Should be `BROWSER_PASSWORD`
- `MODERATE` → Should be `HIGH_SECURITY`
- `SENSITIVE` → Should be `TEST_FAST`

### Issue 2: ECIES Constants Structure

Check if constants use:

- `ECIES.SYMMETRIC_KEY_SIZE` → Should be `ECIES.SYMMETRIC.KEY_SIZE`

### Issue 3: Configuration Symbol Handling

Ensure `baseConfigKey` handles both `symbol` and `string` types:

```typescript
baseConfigKey: typeof baseKey === 'symbol' ? baseKey.toString() : baseKey
```

### Issue 4: BigInt Serialization

If configuration uses BigInt values, ensure JSON.stringify uses replacer:

```typescript
const replacer = (key: string, value: any) => 
  (typeof value === 'bigint' ? value.toString() : value);
```

## Testing Strategy

### Unit Tests

- Test each ID provider individually
- Test invariant validation
- Test configuration provenance
- Test error context

### Integration Tests

- Test multi-recipient encryption with each provider
- Test configuration changes trigger auto-sync
- Test invariant violations throw errors
- **Test cross-platform binary compatibility** (CRITICAL)

### E2E Tests

- Test complete encryption/decryption workflows
- Test file encryption with different providers
- Test streaming encryption

### Performance Tests

- Verify no performance regression
- Test with large recipient counts (100+)
- Test with large data sizes (MB+)

## Timeline Estimate

- **Phase 1 (Dependencies):** 0.5 days
- **Phase 2 (ID Providers):** 2-3 days (CRITICAL)
- **Phase 3 (Translations):** 0.5 days
- **Phase 4 (Invariants):** 1 day
- **Phase 5 (Provenance):** 0.5 days
- **Phase 6 (Error Context):** 0.5 days
- **Phase 7 (Integration Tests):** 1-2 days (CRITICAL)
- **Phase 8 (Update Tests):** 1-2 days
- **Phase 9 (Documentation):** 1 day
- **Phase 10 (Build & Validation):** 1 day

**Total:** 9-12 days for complete implementation and testing

## Reference Implementation

Use `@digitaldefiance/ecies-lib` v3.7.2 as the reference implementation:

- Review commit history for ecies-lib
- Reference the `tmp.patch` file for exact changes
- Mirror the same patterns and structure
- Import shared code where possible
- Maintain binary compatibility

## Questions?

Review the following documentation in ecies-lib:

- `docs/ENTERPRISE_ARCHITECTURE_ASSESSMENT.md` - Architecture gaps and solutions
- `docs/ENTERPRISE_READINESS_CHECKLIST.md` - What's complete vs missing
- `docs/ID_PROVIDER_TESTING.md` - Test coverage details
- `tests/integration/recipient-id-consistency.spec.ts` - Integration test patterns
- `tests/integration/encrypted-message-structure.spec.ts` - Binary format validation

Binary compatibility is **non-negotiable**. Both packages must be able to encrypt/decrypt each other's messages when using the same ID provider.
