# Translation Adapter Documentation

## Overview

The `digitaldefiance-node-ecies-lib` package uses a translation adapter to bridge between the `PluginI18nEngine` system and the `TranslationEngine` interface expected by `ECIESError` classes.

## Problem Solved

The `ECIESError` class from `@digitaldefiance/ecies-lib` expects a `TranslationEngine<EciesStringKey>` with this signature:
```typescript
interface TranslationEngine<TStringKey> {
  translate: (key: TStringKey, vars?: Record<string, string | number>, lang?: any) => string;
  safeTranslate: (key: TStringKey, vars?: Record<string, string | number>, lang?: any) => string;
}
```

However, `PluginI18nEngine` has a different signature:
```typescript
translate<TStringKeys extends string>(
  componentId: string,
  stringKey: TStringKeys,
  variables?: Record<string, string | number>,
  language?: TLanguages
): string
```

## Solution

The adapter function `createEciesTranslationEngine()` wraps the base `ecies-lib`'s `getCompatibleEciesEngine()` which:
1. Provides all `EciesStringKey` translations from the base ECIES library
2. Implements the `TranslationEngine` interface (using `createTranslationAdapter` from `@digitaldefiance/i18n-lib`)
3. Handles variable substitution
4. Supports multiple languages (EN, FR, ES, ZH-CN, UK)

Note: The base `ecies-lib` uses the generic `createTranslationAdapter` utility from `@digitaldefiance/i18n-lib` v1.2.5+

## Usage

### In Service Classes

```typescript
import { createEciesTranslationEngine } from '../i18n/ecies-i18n-factory';
import { ECIESError, ECIESErrorTypeEnum } from '@digitaldefiance/ecies-lib';

class MyService {
  private readonly engine: TranslationEngine<EciesStringKey>;

  constructor(engine?: TranslationEngine<EciesStringKey>) {
    this.engine = engine || createEciesTranslationEngine();
  }

  someMethod() {
    throw new ECIESError(
      ECIESErrorTypeEnum.InvalidDataLength,
      this.engine
    );
  }
}
```

### With Variables

```typescript
throw new ECIESError(
  ECIESErrorTypeEnum.InvalidDataLength,
  engine,
  undefined,
  undefined,
  { expected: '100', actual: '50' }
);
```

### With Language

```typescript
throw new ECIESError(
  ECIESErrorTypeEnum.InvalidMnemonic,
  engine,
  undefined,
  LanguageCodes.FR  // French translation
);
```

## Type Safety

The adapter maintains full type safety:
- ✅ No use of `any` types (uses `CoreLanguageCode` for language parameter)
- ✅ Proper `TranslationEngine<EciesStringKey>` interface implementation
- ✅ Compatible with all `ECIESError` constructors

## Testing

Comprehensive test coverage includes:
- **36 tests** in `ecies-i18n-adapter.spec.ts` - Adapter functionality
- **34 tests** in `ecies-error-translation.spec.ts` - Integration with ECIESError

### Test Coverage

1. **Adapter Interface**: Verifies correct `translate` and `safeTranslate` methods
2. **Translation Quality**: Ensures no placeholder text, human-readable messages
3. **Multilingual Support**: Tests EN, FR, ES, ZH-CN, UK translations
4. **Variable Substitution**: Validates template variable replacement
5. **Error Integration**: Confirms ECIESError works correctly with adapter
6. **Robustness**: Handles undefined engines, variables, and invalid keys gracefully

## Files Modified

- `src/i18n/ecies-i18n-factory.ts` - Added `createEciesTranslationEngine()`
- `src/services/ecies/crypto-core.ts` - Updated to use adapter
- `src/services/ecies/multi-recipient.ts` - Updated engine type
- `src/services/ecies/service.ts` - Updated engine type
- `src/services/ecies/signature.ts` - Updated engine type
- `src/services/ecies/single-recipient.ts` - Updated engine type
- `src/services/ecies/utilities.ts` - Updated engine type
- `src/services/pbkdf2.ts` - Updated engine type

## Benefits

1. **Type Safety**: No `any` types, full TypeScript checking
2. **Maintainability**: Single adapter function, easy to update
3. **Compatibility**: Works with both base ECIES and node-ECIES libraries
4. **Testability**: Comprehensive test coverage ensures reliability
5. **Multilingual**: Supports 5+ languages out of the box

## Future Enhancements

- Add more language translations as needed
- Extend variable substitution capabilities
- Add context-aware translations (admin vs user)
