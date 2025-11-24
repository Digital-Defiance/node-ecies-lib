# @digitaldefiance/node-ecies-lib

[![npm version](https://badge.fury.io/js/%40digitaldefiance%2Fnode-ecies-lib.svg)](https://www.npmjs.com/package/@digitaldefiance/node-ecies-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-220%2B%20passing-brightgreen)](https://github.com/Digital-Defiance/ecies-lib)

A Node.js-specific implementation of the Digital Defiance ECIES (Elliptic Curve Integrated Encryption Scheme) library, providing secure encryption, decryption, and key management capabilities using Node.js crypto primitives. This package is designed to be binary compatible with similarly numbered releases of the browser-based `@digitaldefiance/ecies-lib`, enabling seamless cross-platform cryptographic operations.

Part of [Express Suite](https://github.com/Digital-Defiance/express-suite)

> Current Version: v4.1.0

This library implements a modern, enterprise-grade ECIES protocol (v4.0) featuring HKDF key derivation, AAD binding, and optimized multi-recipient encryption. It includes a pluggable ID provider system, memory-efficient streaming encryption, and comprehensive internationalization.

## Features

### 🛡️ Core Cryptography (Protocol v4.0)

- **Advanced ECIES**:
  - **HKDF-SHA256**: Cryptographically robust key derivation (RFC 5869).
  - **AAD Binding**: Strict binding of header metadata and recipient IDs to the encryption context to prevent tampering.
  - **Shared Ephemeral Key**: Optimized multi-recipient encryption using a single ephemeral key pair, reducing payload size.
  - **Compressed Keys**: Uses 33-byte compressed public keys for efficiency.
- **Algorithms**:
  - **Curve**: `secp256k1` for ECDH key exchange and ECDSA signatures.
  - **Symmetric**: `AES-256-GCM` for authenticated symmetric encryption.
  - **Hashing**: `SHA-256` and `SHA-512`.
- **Modes**:
  - **Simple**: Minimal overhead (no length prefix).
  - **Single**: Includes data length prefix.
  - **Multiple**: Efficient encryption for up to 65,535 recipients.

### 🆔 Identity & Management

- **Pluggable ID Providers**:
  - **Flexible IDs**: Support for `ObjectId` (12 bytes), `GUID`/`UUID` (16 bytes), or custom formats (1-255 bytes).
  - **Auto-Sync**: Configuration automatically adapts all cryptographic constants to the selected ID provider.
  - **Member System**: User abstraction with cryptographic operations, fully integrated with the configured ID provider.
- **Key Management**:
  - **BIP39**: Mnemonic phrase generation (12-24 words).
  - **HD Wallets**: BIP32/BIP44 hierarchical deterministic derivation.
  - **Secure Storage**: Memory-safe `SecureString` and `SecureBuffer` with XOR obfuscation and auto-zeroing.

### 🚀 Advanced Capabilities

- **Streaming Encryption**: Memory-efficient processing for large files (<10MB RAM usage for any file size).
- **Internationalization (i18n)**: Automatic error translation in 8 languages (en-US, en-GB, fr, es, de, zh-CN, ja, uk).
- **Runtime Configuration**: Injectable configuration profiles via `ConstantsRegistry` for dependency injection and testing.
- **Cross-Platform**: Fully compatible with similarly numbered releases of `@digitaldefiance/ecies-lib` (browser).

## Compatibility

**Important Note**: This library is **NOT** binary compatible with previous major versions (v1.x, v2.x, v3.x) due to the protocol upgrade to v4.0 (HKDF, AAD binding).

However, it is designed to be **strictly binary compatible** with the browser-based `@digitaldefiance/ecies-lib` of the **same version number**. This ensures that data encrypted in a Node.js environment (using this library) can be decrypted in a browser environment (using `ecies-lib`), and vice versa, provided both are running compatible versions (e.g., v4.x).

This cross-platform interoperability is verified through extensive E2E testing suites.

## Installation

```bash
npm install @digitaldefiance/node-ecies-lib
# or
yarn add @digitaldefiance/node-ecies-lib
```

### Requirements

**Node.js**: 18+ (Uses Node.js `crypto` module)

## Architecture & Protocol

### ECIES v4.0 Protocol Flow

The library implements a robust ECIES variant designed for security and efficiency.

1. **Key Derivation (HKDF)**:
   Shared secrets from ECDH are passed through **HKDF-SHA256** to derive the actual symmetric encryption keys. This ensures that the resulting keys have uniform distribution and are resistant to weak shared secrets.

   ```typescript
   SymmetricKey = HKDF(
     secret: ECDH(EphemeralPriv, RecipientPub),
     salt: empty,
     info: "ecies-v2-key-derivation"
   )
   ```

2. **Authenticated Encryption (AAD)**:
   All encryption operations use **AES-256-GCM** with Additional Authenticated Data (AAD).
   - **Key Encryption**: The Recipient's ID is bound to the encrypted key.
   - **Message Encryption**: The Message Header (containing version, algorithm, ephemeral key, etc.) is bound to the encrypted payload.
   This prevents "context manipulation" attacks where an attacker might try to swap recipient IDs or modify header metadata.

3. **Multi-Recipient Optimization**:
   Instead of generating a new ephemeral key pair for every recipient, the sender generates **one** ephemeral key pair for the message.
   - The ephemeral public key is stored once in the header.
   - A random "Message Key" is generated.
   - This Message Key is encrypted individually for each recipient using the shared secret derived from the single ephemeral key and the recipient's public key.

### ID Provider System

The library is agnostic to the format of unique identifiers. The `IdProvider` system drives the entire configuration:

- **ObjectIdProvider** (Default): 12-byte MongoDB-style IDs.
- **GuidV4Provider**: 16-byte raw GUIDs.
- **UuidProvider**: 16-byte UUIDs (string representation handles dashes).
- **CustomIdProvider**: Define your own size (1-255 bytes).

When you configure an ID provider, the library automatically:

- Updates `MEMBER_ID_LENGTH`.
- Updates `ECIES.MULTIPLE.RECIPIENT_ID_SIZE`.
- Validates that all internal constants are consistent.

## Quick Start

### 1. Basic Configuration & Usage

```typescript
import { 
  ECIESService, 
  registerNodeRuntimeConfiguration 
} from '@digitaldefiance/node-ecies-lib';
import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';

// 1. Configure (Optional - defaults to ObjectIdProvider)
registerNodeRuntimeConfiguration({
  idProvider: new ObjectIdProvider()
});

// 2. Initialize Service
const ecies = new ECIESService();

// 3. Generate Keys
const mnemonic = ecies.generateNewMnemonic();
const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

// 4. Encrypt & Decrypt
const message = Buffer.from('Hello, Secure World!');
const encrypted = ecies.encryptSimpleOrSingle(false, publicKey, message);
const decrypted = ecies.decryptSimpleOrSingleWithHeader(false, privateKey, encrypted);

console.log(decrypted.toString()); // "Hello, Secure World!"
```

### 2. Using Custom ID Providers (e.g., GUID)

```typescript
import { 
  registerNodeRuntimeConfiguration, 
  ECIESService 
} from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';

// Configure to use 16-byte GUIDs
const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider()
});

const ecies = new ECIESService();
const id = config.idProvider.generate(); // Returns 16-byte Uint8Array
```

### 3. Streaming Encryption (Large Files)

Encrypt gigabytes of data with minimal memory footprint (<10MB).

```typescript
import { ECIESService, EncryptionStream } from '@digitaldefiance/node-ecies-lib';
import { createReadStream } from 'fs';

const ecies = new ECIESService();
const stream = new EncryptionStream(ecies);

async function processFile(filePath: string, publicKey: Buffer) {
  const fileStream = createReadStream(filePath);
  const encryptedChunks: Buffer[] = [];
  
  // Encrypt
  for await (const chunk of stream.encryptStream(fileStream, publicKey)) {
    encryptedChunks.push(chunk.data);
    // In a real app, you'd write 'chunk.data' to disk or upload it immediately
  }
  
  return encryptedChunks;
}
```

### 4. Member System

The `Member` class provides a high-level user abstraction that integrates keys, IDs, and encryption.

```typescript
import { Member, MemberType } from '@digitaldefiance/node-ecies-lib';
import { EmailString } from '@digitaldefiance/ecies-lib';

const ecies = new ECIESService();

// Create a new member (ID generated automatically based on configured provider)
const { member, mnemonic } = Member.newMember(
  ecies,
  MemberType.User,
  'Alice',
  new EmailString('alice@example.com')
);

console.log(member.id); // Buffer (size depends on provider)

// Encrypt data for this member
const encrypted = member.encryptData('My Secrets');
```

## API Reference

### Core Services

- **`ECIESService`**: The main entry point for encryption/decryption operations.
- **`EciesCryptoCore`**: Low-level cryptographic primitives (keys, signatures, ECDH).
- **`EciesMultiRecipient`**: Specialized service for handling multi-recipient messages.
- **`EncryptionStream`**: Helper for chunked file encryption.
- **`Pbkdf2Service`**: Secure authentication using PBKDF2 and encrypted key bundles.

### Configuration & Registry

- **`Constants`**: The default, immutable configuration object.
- **`registerNodeRuntimeConfiguration(overrides)`**: Creates and registers a validated configuration object with your overrides.
- **`getNodeRuntimeConfiguration()`**: Retrieves the current runtime configuration.

### Secure Primitives

- **`SecureString` / `SecureBuffer`**:
  - Stores sensitive data in memory using XOR obfuscation.
  - `dispose()` method to explicitly zero out memory.
  - Prevents accidental leakage via `console.log` or serialization.

## Development

### Commands

```bash
yarn install         # Install dependencies
yarn build          # Compile TypeScript
yarn test           # Run all tests
yarn lint           # ESLint check
yarn format         # Fix all (prettier + lint)
```

## ChangeLog

### v4.4.0

- Improving dependency loops/constants/direcular dependency

### v4.2.5

**Type Safety Improvements**:
- Added comprehensive ID type guards and converters (`isBuffer`, `isUint8Array`, `toBuffer`, `toUint8Array`, `convertId`)
- Created `AuthenticatedCipher` and `AuthenticatedDecipher` interfaces for proper crypto type handling
- Removed unsafe type casts throughout the codebase, replacing with type-safe conversions
- Enhanced member ID serialization with proper type guards
- Added 30+ unit tests and property-based tests for type safety validation
- Improved TypeScript type inference and compile-time safety

### v4.2.7

- Minor bump. Fix tests

### v4.2.0

- Upgrade ecies

### v4.1.1

- Upgrade ecies

### v4.1.0

- **ID Provider Integration**: The `Member` model now fully utilizes the configured `IdProvider` for all ID operations, removing hard dependencies on specific ID formats.
- **Type Safety**: Enhanced type definitions for `Member` and `MemberBuilder` to support generic ID types (defaults to `Buffer`).

### v4.0.0 - ECIES Protocol v4.0

#### Major Protocol Upgrade (Breaking Change)

- **HKDF Key Derivation**: Replaced simple hashing with HKDF-SHA256.
- **AAD Binding**: Enforced binding of header and recipient IDs to encryption.
- **Shared Ephemeral Key**: Optimized multi-recipient encryption.
- **Compressed Keys**: Standardized on 33-byte compressed public keys.
- **IV/Key Sizes**: Optimized constants (12-byte IV, 60-byte encrypted key blocks).

### v3.7.0 - Pluggable ID Provider System

- **Flexible IDs**: Introduced `IdProvider` architecture.
- **Auto-Sync**: Configuration automatically adapts to ID size.
- **Invariant Validation**: Runtime checks for configuration consistency.

### Version 3.0.8

- Update ecies
- Update i18n

### Version 3.0.7

- Update ecies
- Update i18n

### Version 3.0.6

- Update ecies
- Update i18n

### Version 3.0.5

- Update ecies
- Update i18n

### Version 3.0.4

- Update ecies

### Version 3.0.3

- Update ecies

### Version 3.0.2

- Update test-utils

### Version 3.0.1

**Builder Improvements:**

- **ECIESBuilder**: Separated `serviceConfig` (IECIESConfig) from `eciesConsts` (IECIESConstants)
  - Added `withServiceConfig()` method for runtime configuration
  - Renamed internal property from `eciesParams` to `eciesConsts` for clarity
  - Improved constant merging with proper defaults
- **MemberBuilder**: Enhanced with new methods
  - Renamed `withECIES()` to `withEciesService()` for consistency
  - Added `generateMnemonic()` method for auto-generation
  - Added `withMnemonic()` method to provide custom mnemonics
  - Added `withCreatedBy()` method for tracking member creation

**Internationalization:**

- Added 13 new i18n string keys (3 builder errors, 10 streaming errors)
- Translations provided in 8 languages: EN-US, EN-GB, FR, ES, DE, JA, UK, ZH-CN
- Replaced all hardcoded error strings with i18n translations
- Fixed circular dependency in i18n imports

**Service Improvements:**

- Added `mnemonicToSimpleKeyPair()` alias method for backward compatibility
- Clarified `ECIESService.encryptMultiple()` signature (takes single Member, not array)
- Enhanced error handling in multi-recipient processor

**Test Improvements:**

- Fixed encryption type byte expectations (Simple=33, Single=66, Multiple=99)
- Fixed recipient ID sizes to use correct constant (12 bytes for ObjectID)
- Added comprehensive binary compatibility tests for streaming/chunking
- Updated service coverage tests to match actual API signatures
- All 459 tests passing

**Binary Compatibility:**

- ✅ 100% compatible with browser @digitaldefiance/ecies-lib
- ✅ Chunk header format verified (4-byte big-endian index + 1-byte flags)
- ✅ Multi-recipient header format verified (big-endian byte order)
- ✅ Buffer/Uint8Array interoperability confirmed

### Version 3.0.0 - Streaming Encryption & Security Hardening

**Major Features**:

- ✨ **Streaming Encryption**: Memory-efficient encryption for large files (<10MB RAM for any size)
- 🔐 **Multi-Recipient Streaming**: Encrypt once for up to 65,535 recipients with shared symmetric key
- 📊 **Progress Tracking**: Real-time throughput, ETA, and completion percentage
- 🔒 **Security Hardening**: 16 comprehensive security validations across all layers
- ✅ **Binary Compatible**: 100% compatible with browser @digitaldefiance/ecies-lib v2.2.0

**New APIs**:

**Member Streaming Methods**:

- `member.encryptDataStream(source, options?)` - Stream encryption with progress tracking
- `member.decryptDataStream(source, options?)` - Stream decryption with progress tracking

**EncryptionStream Service**:

- `encryptStream(source, publicKey, options?)` - Single-recipient streaming
- `encryptStreamMultiple(source, recipients, options?)` - Multi-recipient streaming
- `decryptStream(source, privateKey, options?)` - Single-recipient decryption
- `decryptStreamMultiple(source, recipientId, privateKey, options?)` - Multi-recipient decryption

**Security Enhancements (16 validations)**:

**Base ECIES Layer (8 fixes)**:

- Public key all-zeros validation
- Private key all-zeros validation
- Shared secret all-zeros validation
- Message size validation (max 2GB)
- Encrypted size bounds checking
- Minimum encrypted data size validation
- Component extraction validation
- Decrypted data validation

**AES-GCM Layer (5 fixes)**:

- Key length validation (16/24/32 bytes only)
- IV length validation (16 bytes)
- Null/undefined data rejection
- Data size validation (max 2GB)
- Comprehensive decrypt input validation

**Multi-Recipient Layer (3 fixes)**:

- Chunk index bounds checking (uint32 range)
- Data size validation (max 2GB)
- Safe accumulation with overflow detection

**New Services**:

- `EncryptionStream` - High-level streaming API
- `ChunkProcessor` - Single-recipient chunk processing
- `MultiRecipientProcessor` - Multi-recipient chunk processing
- `ProgressTracker` - Real-time progress tracking

**New Interfaces**:

- `IEncryptedChunk` - Encrypted chunk with metadata
- `IMultiRecipientChunk` - Multi-recipient chunk format
- `IStreamProgress` - Progress tracking information
- `IStreamConfig` - Stream configuration options

**Performance**:

- 99% memory reduction (1GB file: 1GB RAM → <10MB RAM)
- < 0.1% overhead from security validations
- Single-recipient: ~50-100 MB/s throughput
- Multi-recipient: ~40-80 MB/s throughput

**Binary Compatibility**:

- ✅ 100% compatible with @digitaldefiance/ecies-lib v2.2.0
- ✅ Cross-platform encrypt/decrypt verified
- ✅ All existing encryption formats unchanged

### Version 2.1.42

- Upgrade ecies

### Version 2.1.40

- Alignment with Express Suite packages
- All packages updated to v2.1.40 (i18n, ecies-lib, node-ecies-lib, suite-core-lib, node-express-suite, express-suite-react-components)
- Test utilities remain at v1.0.7
- `/testing` entry point exports test mocks (mockBackendMember)
- Requires `@faker-js/faker` as dev dependency for test utilities

### Version 2.1.33

- Expose config on one more endpoint

## Version 2.1.32

- Add config for i18n

## Version 2.1.30

- Alignment bump

## Version 2.1.27

- Bump ecies lib version

## Version 2.1.26

- Use new express-suite-test-utils

## Version 2.1.25

- Improve test coverage
- Fix i18n aliasing

## Version 2.1.17

- Add backend member mock

## Version 2.1.16

- Upgrade i18n

## Version 2.1.15

- Upgrade i18n/ecies

## Version 2.1.13

- Upgrade i18n

## Version 2.1.12

- export createNodeEciesComponentConfig()

### Version 2.1.10

- Convergence bump build

### Version 2.1.7

- Minor bump from ecies/i18n

### Version 2.1.6

- Minor version bump from i18n/ecies

### Version 2.1.5

- Minor version bump from i18n/ecies

### Version 2.1.4

- Minor version bump from i18n

### Version 2.1.1

- Minor upgrade to i18n/errors classes, deprecating PluginI18nEngine

### Version 2.0.3

- Minor version bump/upgrade i18n/ecies libs

### Version 2.0.2

- Minor version bump/upgrade i18n/ecies libs

### Version 2.0.0 (2024-11-04)

> **Major Architecture Refactor - 100% Binary Compatible**

This release modernizes the architecture following patterns from `@digitaldefiance/ecies-lib` and `@digitaldefiance/i18n-lib` v2.0 migrations, with focus on simplification and maintainability.

#### Breaking Changes

**Constructor Signatures Changed:**

- `ECIESService`: `(engine, config)` → `(config?, eciesParams?)`
- `Pbkdf2Service`: `(engine, profiles?, ...)` → `(profiles?, ...)`
- `EciesMultiRecipient`: `(core, engine)` → `(core)`
- `EciesSingleRecipientCore`: `(config, engine)` → `(config)`

**Removed Parameters:**

- All i18n engine parameters removed from constructors
- Engines now auto-initialized from singleton 'default' instance
- Errors retrieve engine automatically via `PluginTypedError`

#### New Features

**Builder Pattern** (`src/builders/`):

- `ECIESBuilder`: Fluent API for service construction with `.withConstants()`, `.build()`
- `MemberBuilder`: Fluent API for member creation with `.withType()`, `.withName()`, `.withEmail()`, `.build()`

**Service Container** (`src/lib/`):

- `CryptoContainer`: Dependency injection container
- Provides ECIES, PBKDF2, and AES-GCM services with shared constants
- Centralized service lifecycle management

**Core Types** (`src/core/`):

- `CryptoError`: Unified error class with `code`, `message`, `metadata` fields
- `Result<T, E>`: Safe operation results: `{ success: true; data: T } | { success: false; error: E }`

**Structural Improvements:**

- Organized into `builders/`, `core/`, `lib/` folders
- Clear separation of concerns
- Enhanced code organization following v2.0 patterns

#### Architecture Improvements

**i18n Integration:**

- Unified engine using singleton 'default' instance key
- `NodeEciesComponent` registered with base engine
- Automatic engine retrieval in error classes
- 100% reduction in engine parameter duplication

**Constructor Simplification:**

- Removed engine parameters from all service constructors
- Services use singleton pattern for i18n access
- Cleaner API surface with fewer required parameters
- Better developer experience

**Constants Handling:**

- ECIESService constructor handles undefined `eciesParams` with fallback to `Constants.ECIES`
- Proper constants injection through builder pattern
- Immutable configuration objects

#### Testing and Compatibility

**Test Results:**

- ✅ 220/220 tests passing (100% of non-legacy tests)
- ✅ 2 legacy i18n adapter tests skipped (deprecated)
- ✅ 20/22 test suites passing
- ✅ Test execution time: 385.946s

**Binary Compatibility - 100% Verified:**

- All encryption formats unchanged
- Cross-platform compatibility maintained
- Data encrypted with v1.x decrypts with v2.0
- Data encrypted with v2.0 decrypts with v1.x
- Compatible with browser `@digitaldefiance/ecies-lib`

**Compatibility Test Suites:**

- ✅ `cross-platform-compatibility.e2e.spec.ts` (6.517s) - 21 tests
- ✅ `ecies-bidirectional.e2e.spec.ts` - 8 tests
- ✅ `ecies-compatibility.e2e.spec.ts` (7.778s) - Full interop
- ✅ `length-encoding-compatibility.e2e.spec.ts` - Encoding tests
- ✅ `multi-recipient-ecies.e2e.spec.ts` - Multi-recipient

**Performance - No Regression:**

- Backend decryption: 31ms per 10 iterations
- Frontend decryption: 82ms per 10 iterations
- File operations (1MB): 16ms encrypt, 9ms decrypt
- File operations (100KB): 11ms encrypt, 7ms decrypt

#### Migration Impact

**Low Risk Migration:**

- Simple constructor signature changes
- No behavioral changes
- No data format changes
- Backward compatible at binary level
- Clear migration path with examples

**Estimated Migration Time:**

- Small projects: 15-30 minutes
- Medium projects: 1-2 hours
- Large projects: 2-4 hours

**Migration Steps:**

1. Update ECIESService instantiation (remove engine parameter)
2. Update Pbkdf2Service instantiation (remove engine parameter)
3. Update EciesMultiRecipient instantiation (remove engine parameter)
4. Update EciesSingleRecipientCore instantiation (remove engine parameter)
5. Run tests to verify

#### Files Changed

**New Files:**

- `src/builders/ecies-builder.ts`
- `src/builders/member-builder.ts`
- `src/core/errors/crypto-error.ts`
- `src/core/types/result.ts`
- `src/lib/crypto-container.ts`

**Modified Files:**

- `src/services/ecies/service.ts` - Constructor signature
- `src/services/pbkdf2.ts` - Constructor signature
- `src/services/ecies/multi-recipient.ts` - Constructor signature
- `src/services/ecies/single-recipient.ts` - Constructor signature
- `src/i18n/node-ecies-i18n-setup.ts` - Unified engine setup
- `src/index.ts` - Added v2.0 exports

**Test Files Updated:**

- `tests/multi-recipient.spec.ts`
- `tests/cross-platform-compatibility.e2e.spec.ts`
- `tests/file.spec.ts`
- `tests/member.spec.ts`
- `tests/ecies-bidirectional.e2e.spec.ts`
- `tests/test-setup.ts` - Engine lifecycle management

#### Acknowledgments

This refactor follows the successful v2.0 migration patterns established in:

- `@digitaldefiance/ecies-lib` v2.0
- `@digitaldefiance/i18n-lib` v2.0

Special thanks to the architecture improvements that enabled this clean migration path.

#### See Also

- [Migration Guide](#migration-impact) - Detailed upgrade instructions
- [v2.0 Architecture](#architecture-improvements) - New components and patterns
- [Binary Compatibility](#testing-and-compatibility) - Compatibility guarantees

### Version 1.3.27

- Upgrade i18n/ecies
- Version bump

### Version 1.3.20

- Version bump
- Some minor changes/fixes to a few services

### Version 1.3.18

- Add missing exports

### Version 1.3.17

- Update i18n/ecies packages

### Version 1.3.15

- Homogenize versions

### Version 1.1.24

- Update i18n/ecies

### Version 1.1.23

- Re-export with js

### Version 1.1.22

- Upgrade to es2022/nx monorepo

### Version 1.1.21

- Upgrade pbkdf2service to plugini18n

### Version 1.1.20

- Update i18n/ecies

### Version 1.1.19

- Update i18n/ecies

### Version 1.1.18

- Update ecies

### Version 1.1.17

- Update ecies/i18n

### Version 1.1.16

- Update ecies

### Version 1.1.15

- Update ecies

### Version 1.1.14

- Update ecies/i18n libs

### Version 1.1.13

- Update ecies lib

### Version 1.1.12

- CommonJS
- Update ecies/i18n libs

### Version 1.1.11

- Improve constants injection
- Update ecies lib

### Version 1.1.10

- Update ecies lib

### Version 1.1.9

- Updated ecies/i18n lib

### Version 1.1.8

- Updated ecies/i18n lib

### Version 1.1.7

- Updated ecies/i18n lib

### Version 1.1.6

- Updated ecies lib

### Version 1.1.5

- Updated readme and ecies lib dependency

### Version 1.1.4

- Added more translation strings to errors and bumped i18n/ecies libs.

### Version 1.1.3

- Added createTranslationAdapter utility in i18n-lib to bridge PluginI18nEngine and TranslationEngine interfaces.
- Fixed multiple TypeScript compilation errors and improved type safety.
- Added comprehensive tests with 100% pass rate.

### Version 1.1.1

- Fixed pbkdf2 service engine typing.

### Version 1.1.0

- Updated i18n and ecies lib versions.

### Version 1.0.13

- Bumped version of ecies lib.

### Version 1.0.12

- Bumped versions of i18n/ecies libs.

### Version 1.0.11

- Bumped versions of i18n/ecies libs.

### Version 1.0.10

- Bumped versions of i18n/ecies libs.

### Version 1.0.8

- Upgraded to ecies-lib 1.0.26 with runtime configuration system.
- Implemented runtime configuration system with node-specific defaults.
- Added PBKDF2 profile enum alignment and configuration overrides.

### Version 1.0.6

- Improved constants inheritance and froze objects.

### Version 1.0.5

- Used latest cleanup code from i18n library and updated dependencies.

### Version 1.0.4

- Added plugin-based internationalization architecture with `@digitaldefiance/i18n-lib`.

### Version 1.0.3

- Initial release.
