# node-ecies-lib v2.0 Architecture Plan

## Executive Summary

Upgrade `@digitaldefiance/node-ecies-lib` from v1.x to v2.0 following the patterns established in `@digitaldefiance/ecies-lib` v2.0:
- **i18n v2.0 integration** with simplified error handling
- **Structural refactoring** with builders/, core/, lib/ folders
- **Service container** for dependency injection
- **Fluent builders** for common workflows
- **Binary compatibility** maintained with v1.x and ecies-lib

## Current State Analysis

### Version Status
- **Current**: v2.0.0 (package.json shows 2.0.0 but architecture is v1.x)
- **Dependencies**: 
  - `@digitaldefiance/ecies-lib`: 2.0.0 ✅
  - `@digitaldefiance/i18n-lib`: 2.0.0 ✅

### Current Architecture Issues

1. **Dual i18n System**: Currently uses both:
   - `getEciesI18nEngine()` from ecies-lib (for EciesStringKey)
   - `getEciesPluginI18nEngine()` locally (for NodeEciesStringKey)
   - This creates confusion and potential conflicts

2. **Service Constructors**: Still require `engine` parameter:
   ```typescript
   // Current - v1.x pattern
   constructor(
     engine: PluginI18nEngine<TLanguage>,
     profiles?: Record<string, IPbkdf2Config>,
     eciesParams: IECIESConsts = Constants.ECIES,
     pbkdf2Params: IPBkdf2Consts = Constants.PBKDF2,
   )
   ```

3. **Binary Compatibility**: Must maintain compatibility with ecies-lib's binary format for:
   - Encrypted message structure
   - Multi-recipient encryption
   - File encryption
   - Cross-platform compatibility (Node.js ↔ Browser)

## Migration Goals

### Primary Goals
1. ✅ Remove engine parameters from all service constructors
2. ✅ Unify i18n architecture with ecies-lib v2.0 pattern
3. ✅ Maintain 100% binary compatibility with ecies-lib
4. ✅ Keep all tests passing (100%)
5. ✅ Preserve cross-platform compatibility

### Secondary Goals
- Simplify i18n setup and usage
- Reduce code complexity
- Improve developer experience
- Maintain performance (no degradation)

## Proposed Architecture

### Phase 0: Structural Refactoring (Foundation)

**Goal**: Reorganize codebase to match ecies-lib v2.0 structure

#### New Folder Structure:
```
src/
├── builders/           # NEW - Fluent builders
│   ├── ecies-builder.ts
│   ├── member-builder.ts
│   └── index.ts
├── core/              # NEW - Core types and errors
│   ├── errors/
│   │   └── crypto-error.ts
│   ├── types/
│   │   └── result.ts
│   └── index.ts
├── lib/               # NEW - Container and utilities
│   ├── crypto-container.ts
│   └── index.ts
├── enumerations/      # EXISTING - Keep all enums
├── errors/            # EXISTING - Keep existing errors
├── interfaces/        # EXISTING - Keep all interfaces
├── services/          # EXISTING - Keep all services
├── types/             # EXISTING - Keep utility types
└── [existing files]   # Keep all root-level files
```

#### Files to Create:

**builders/ecies-builder.ts**:
```typescript
export class ECIESBuilder {
  private config: Partial<IECIESConsts> = {};
  
  static create() { return new ECIESBuilder(); }
  withConfig(config: Partial<IECIESConsts>) {
    this.config = { ...this.config, ...config };
    return this;
  }
  build() {
    return new ECIESService({ ...Constants.ECIES, ...this.config });
  }
}
```

**builders/member-builder.ts**:
```typescript
export class MemberBuilder {
  private type?: MemberType;
  private name?: string;
  private email?: EmailString;
  
  static create() { return new MemberBuilder(); }
  withType(type: MemberType) { this.type = type; return this; }
  withName(name: string) { this.name = name; return this; }
  withEmail(email: string | EmailString) {
    this.email = typeof email === 'string' ? new EmailString(email) : email;
    return this;
  }
  build() {
    return Member.newMember(new ECIESService(), this.type!, this.name!, this.email!);
  }
}
```

**core/errors/crypto-error.ts**:
```typescript
export class CryptoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}
```

**core/types/result.ts**:
```typescript
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
```

**lib/crypto-container.ts**:
```typescript
export enum CryptoServiceKey {
  ECIES = 'ecies',
  PBKDF2 = 'pbkdf2',
  AES_GCM = 'aes-gcm',
}

export class CryptoContainer {
  private services = new Map<CryptoServiceKey, unknown>();
  
  private constructor(config: IConstants) {
    this.services.set(CryptoServiceKey.ECIES, new ECIESService(config.ECIES));
    this.services.set(CryptoServiceKey.PBKDF2, new Pbkdf2Service(config.PBKDF2_PROFILES, config.ECIES, config.PBKDF2));
    this.services.set(CryptoServiceKey.AES_GCM, new AESGCMService(config.ECIES));
  }
  
  static create(config = Constants) {
    return new CryptoContainer(config);
  }
  
  get<T>(key: CryptoServiceKey): T {
    return this.services.get(key) as T;
  }
}
```

### Phase 1: i18n Unification Strategy

**Decision**: Use a **hybrid approach** that leverages ecies-lib's engine while adding node-specific strings.

#### Option A: Single Unified Engine (RECOMMENDED)
```typescript
// src/i18n/node-ecies-i18n-setup.ts
import { getEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { PluginI18nEngine } from '@digitaldefiance/i18n-lib';

const DefaultInstanceKey = 'default';
let _nodeEciesI18nEngine: PluginI18nEngine<CoreLanguageCode> | null = null;

export function getNodeEciesI18nEngine(): PluginI18nEngine<CoreLanguageCode> {
  if (!_nodeEciesI18nEngine) {
    // Get the base ecies engine (already has 'default' key and components)
    const baseEngine = getEciesI18nEngine();
    
    // Register node-specific component
    const nodeComponent = createNodeEciesComponentRegistration();
    baseEngine.registerComponent(nodeComponent);
    
    _nodeEciesI18nEngine = baseEngine;
  }
  return _nodeEciesI18nEngine;
}

export function resetNodeEciesI18nEngine(): void {
  _nodeEciesI18nEngine = null;
  // Note: Don't remove 'default' instance - ecies-lib owns it
}
```

**Benefits**:
- Single source of truth for i18n
- Automatic access to all EciesStringKey translations
- Simpler architecture
- No instance key conflicts

**Tradeoffs**:
- Couples node-ecies-lib to ecies-lib's engine lifecycle
- Must coordinate resets in tests

#### Option B: Separate Engine with Shared Keys (Alternative)
Keep separate engines but ensure both use 'default' key and share component registrations.

**Not recommended** - adds complexity without benefits.

### Phase 2: Service Constructor Updates

#### Before (v1.x):
```typescript
export class Pbkdf2Service<TLanguage extends CoreLanguageCode> {
  protected readonly engine: PluginI18nEngine<TLanguage>;
  
  constructor(
    engine: PluginI18nEngine<TLanguage>,
    profiles?: Record<string, IPbkdf2Config>,
    eciesParams: IECIESConsts = Constants.ECIES,
    pbkdf2Params: IPBkdf2Consts = Constants.PBKDF2,
  ) {
    this.engine = engine;
    this.profiles = profiles ?? {};
    this.eciesConsts = eciesParams;
    this.pbkdf2Consts = pbkdf2Params;
  }
}
```

#### After (v2.0):
```typescript
export class Pbkdf2Service<TLanguage extends CoreLanguageCode> {
  protected readonly profiles: Record<string, IPbkdf2Config>;
  protected readonly eciesConsts: IECIESConsts;
  protected readonly pbkdf2Consts: IPBkdf2Consts;
  
  constructor(
    profiles: Record<string, IPbkdf2Config> = Constants.PBKDF2_PROFILES,
    eciesParams: IECIESConsts = Constants.ECIES,
    pbkdf2Params: IPBkdf2Consts = Constants.PBKDF2,
  ) {
    this.profiles = profiles;
    this.eciesConsts = eciesParams;
    this.pbkdf2Consts = pbkdf2Params;
  }
}
```

**Changes**:
- Remove `engine` parameter and field
- Move `profiles` to first parameter (was second)
- Errors will auto-retrieve engine via singleton

### Phase 3: Error Handling Updates

#### Current Pattern:
```typescript
throw new NodePbkdf2Error(
  getNodeEciesTranslation(NodeEciesStringKey.Error_Pbkdf2_InvalidSaltLength),
  Pbkdf2ErrorType.InvalidSaltLength,
);
```

#### v2.0 Pattern (if using PluginTypedError):
```typescript
// Option 1: Extend PluginTypedHandleableError
export class NodePbkdf2Error extends PluginTypedHandleableError<
  Pbkdf2ErrorType,
  CoreLanguageCode
> {
  constructor(
    type: Pbkdf2ErrorType,
    options?: ErrorOptions,
  ) {
    super(
      NodeEciesComponentId,
      type,
      getErrorStringKey(type),
      options,
    );
  }
}

// Usage
throw new NodePbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength);
```

**OR keep current pattern** - it's simpler and works fine.

**Recommendation**: Keep current error pattern for node-ecies-lib since it's simpler and doesn't require complex error type mapping.

### Phase 4: Binary Compatibility Verification

**Critical**: Must verify binary compatibility is maintained.

#### Test Strategy:
```typescript
// tests/cross-platform-compatibility.e2e.spec.ts
describe('Binary Compatibility v1.x → v2.0', () => {
  it('should decrypt v1.x encrypted data with v2.0', () => {
    // Use known v1.x encrypted data
    const v1EncryptedData = Buffer.from('...');
    
    // Decrypt with v2.0 service
    const service = new ECIESService();
    const decrypted = service.decrypt(privateKey, v1EncryptedData);
    
    expect(decrypted).toEqual(originalPlaintext);
  });
  
  it('should encrypt with v2.0 and decrypt with v1.x format', () => {
    // Encrypt with v2.0
    const service = new ECIESService();
    const encrypted = service.encrypt(publicKey, plaintext);
    
    // Verify format matches v1.x structure
    expect(encrypted[0]).toBe(0x04); // Uncompressed public key marker
    // ... verify all format bytes
  });
});
```

#### Binary Format Checklist:
- [ ] Single recipient encryption format unchanged
- [ ] Multi-recipient encryption format unchanged
- [ ] File encryption format unchanged
- [ ] Length encoding format unchanged
- [ ] Checksum format unchanged
- [ ] Public key format unchanged (0x04 prefix for uncompressed)

## Implementation Plan

### Step 0: Structural Refactoring (2 hours)

1. **Create new folders**:
   ```bash
   mkdir -p src/builders src/core/errors src/core/types src/lib
   ```

2. **Create builder files**:
   - `src/builders/ecies-builder.ts` - Fluent ECIES configuration
   - `src/builders/member-builder.ts` - Fluent Member creation
   - `src/builders/index.ts` - Export all builders

3. **Create core files**:
   - `src/core/errors/crypto-error.ts` - Unified error class
   - `src/core/types/result.ts` - Result type for safe operations
   - `src/core/index.ts` - Export core types

4. **Create lib files**:
   - `src/lib/crypto-container.ts` - Service container
   - `src/lib/index.ts` - Export lib utilities

5. **Update main index.ts**:
   ```typescript
   // V2 Architecture exports
   export * from './builders';
   export * from './core';
   export * from './lib';
   
   // Existing exports (backward compatibility)
   export * from './constants';
   export * from './errors';
   // ... all other exports
   ```

### Step 1: Create New i18n Setup (1 hour)
**File**: `src/i18n/node-ecies-i18n-setup.ts`

1. Create new file following Option A architecture
2. Export `getNodeEciesI18nEngine()` and `resetNodeEciesI18nEngine()`
3. Register NodeEciesComponent with base engine
4. Keep existing `ecies-i18n-factory.ts` for backward compatibility (deprecated)

### Step 2: Update Service Constructors (2 hours)
**Files**: 
- `src/services/pbkdf2.ts`
- `src/services/aes-gcm.ts`
- `src/services/ecies/*.ts` (if any accept engine)

**Changes**:
1. Remove `engine` parameter from constructors
2. Remove `this.engine` field
3. Update parameter order (profiles first)
4. Update all method calls that used `this.engine`

### Step 3: Update Test Setup (1 hour)
**File**: `tests/test-setup.ts`

```typescript
import { resetEciesI18nEngine } from '@digitaldefiance/ecies-lib';
import { resetCoreI18nEngine, PluginI18nEngine } from '@digitaldefiance/i18n-lib';
import { getNodeEciesI18nEngine, resetNodeEciesI18nEngine } from '../src/i18n/node-ecies-i18n-setup';

beforeEach(() => {
  // Reset all engines
  PluginI18nEngine.resetAll();
  resetCoreI18nEngine();
  resetEciesI18nEngine();
  resetNodeEciesI18nEngine();
  
  // Initialize for tests
  getNodeEciesI18nEngine();
});
```

### Step 4: Update All Tests (3 hours)
**Pattern for all test files**:

```typescript
// Before
beforeEach(() => {
  const engine = getEciesPluginI18nEngine();
  pbkdf2Service = new Pbkdf2Service(engine);
});

// After
beforeEach(() => {
  getNodeEciesI18nEngine(); // Just initialize
  pbkdf2Service = new Pbkdf2Service();
});
```

**Files to update** (~25 test files):
- `tests/pbkdf2.spec.ts`
- `tests/pbkdf2.e2e.spec.ts`
- `tests/aes-gcm.spec.ts`
- `tests/aes-gcm.e2e.spec.ts`
- All other test files that instantiate services

### Step 5: Update Index Exports (30 minutes)
**File**: `src/index.ts`

```typescript
// i18n exports
export { getNodeEciesI18nEngine, resetNodeEciesI18nEngine } from './i18n/node-ecies-i18n-setup';
export { NodeEciesStringKey, NodeEciesComponentId } from './i18n/ecies-i18n-factory';

// Deprecated (for backward compatibility)
export { 
  getEciesPluginI18nEngine, 
  resetEciesPluginI18nEngine 
} from './i18n/ecies-i18n-factory';
```

### Step 6: Binary Compatibility Testing (2 hours)

1. Run existing cross-platform tests
2. Add new v1.x → v2.0 compatibility tests
3. Verify all encryption/decryption formats unchanged
4. Test with ecies-lib v2.0 interoperability

### Step 7: Documentation Updates (1 hour)

**Files to update**:
- `README.md` - Add v2.0 migration section
- `docs/V2_MIGRATION_GUIDE.md` - Create detailed guide
- `CHANGELOG.md` - Document breaking changes

### Step 8: Final Verification (1 hour)

```bash
# Run full test suite
yarn test

# Check coverage
yarn test --coverage

# Verify build
yarn build

# Test cross-platform compatibility
yarn test tests/cross-platform-compatibility.e2e.spec.ts
```

## Breaking Changes

### Constructor Signatures Changed

#### Pbkdf2Service
```typescript
// v1.x
new Pbkdf2Service(engine, profiles?, eciesParams?, pbkdf2Params?)

// v2.0
new Pbkdf2Service(profiles?, eciesParams?, pbkdf2Params?)
```

#### AESGCMService (if applicable)
```typescript
// v1.x
new AESGCMService(engine, params?)

// v2.0
new AESGCMService(params?)
```

### Migration Path for Users

**Before (v1.x)**:
```typescript
import { getEciesPluginI18nEngine } from '@digitaldefiance/node-ecies-lib';

const engine = getEciesPluginI18nEngine();
const pbkdf2 = new Pbkdf2Service(engine);
```

**After (v2.0)**:
```typescript
import { getNodeEciesI18nEngine } from '@digitaldefiance/node-ecies-lib';

getNodeEciesI18nEngine(); // Initialize once at app startup
const pbkdf2 = new Pbkdf2Service();
```

## Non-Breaking Changes

### Binary Compatibility
- ✅ All encryption/decryption formats unchanged
- ✅ Cross-platform compatibility maintained
- ✅ Interoperability with ecies-lib v2.0 preserved

### API Compatibility
- ✅ All public methods unchanged
- ✅ All exports available (some deprecated)
- ✅ Constants unchanged

## Risk Assessment

### High Risk
- ❌ None identified

### Medium Risk
- ⚠️ **Test failures during migration**: Mitigated by incremental testing
- ⚠️ **Binary format changes**: Mitigated by comprehensive compatibility tests

### Low Risk
- ℹ️ **Performance regression**: Unlikely, v2.0 should be faster
- ℹ️ **Documentation gaps**: Mitigated by detailed migration guide

## Success Criteria

### Must Have
- [ ] All tests passing (100%)
- [ ] Binary compatibility verified
- [ ] Cross-platform tests passing
- [ ] No engine parameters in constructors
- [ ] Documentation updated

### Should Have
- [ ] Performance maintained or improved
- [ ] Code complexity reduced
- [ ] Migration guide complete
- [ ] Backward compatibility exports

### Nice to Have
- [ ] Improved error messages
- [ ] Better TypeScript types
- [ ] Enhanced examples

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 0. Structure | 2 hours | None |
| 1. i18n Setup | 1 hour | None |
| 2. Services | 2 hours | Phase 1 |
| 3. Test Setup | 1 hour | Phase 1 |
| 4. Tests | 3 hours | Phase 2, 3 |
| 5. Exports | 0.5 hours | Phase 2 |
| 6. Binary Tests | 2 hours | Phase 4 |
| 7. Documentation | 1 hour | Phase 6 |
| 8. Verification | 1 hour | Phase 7 |
| **Total** | **13.5 hours** | |

## Rollback Plan

If critical issues arise:

1. **Immediate**: Revert to v1.x branch
2. **Short-term**: Fix issues in v2.0-dev branch
3. **Long-term**: Release v2.0.1 with fixes

**Rollback triggers**:
- Binary compatibility broken
- >5% test failures
- Performance degradation >10%
- Critical security issue

## Next Steps

1. **Review this plan** with team
2. **Create feature branch**: `feature/v2.0-migration`
3. **Start with Phase 1**: i18n setup
4. **Incremental commits**: One phase per commit
5. **Continuous testing**: Run tests after each phase
6. **Final review**: Before merging to main

## Questions for Review

1. ✅ Should we use Option A (unified engine) or Option B (separate engines)?
   - **Recommendation**: Option A - simpler and more maintainable

2. ✅ Should we update error classes to use PluginTypedHandleableError?
   - **Recommendation**: No - keep current pattern, it's simpler

3. ✅ How should we handle backward compatibility exports?
   - **Recommendation**: Keep old exports as deprecated for one major version

4. ✅ Should we bump to v2.0.0 or v2.1.0?
   - **Recommendation**: Already at v2.0.0, keep it (architecture catch-up)

## References

- [I18N_V2_MIGRATION_GUIDE.md](../../digitaldefiance-ecies-lib/docs/I18N_V2_MIGRATION_GUIDE.md)
- [NODE_ECIES_MIGRATION_GUIDE.md](../../digitaldefiance-ecies-lib/docs/NODE_ECIES_MIGRATION_GUIDE.md)
- [ecies-lib v2.0 Implementation](../../digitaldefiance-ecies-lib/src/)
- [i18n-lib v2.0 Documentation](../../digitaldefiance-i18n-lib/README.md)

---

**Status**: 📋 DRAFT - Ready for Review  
**Author**: Amazon Q  
**Date**: 2025-01-XX  
**Version**: 1.0
