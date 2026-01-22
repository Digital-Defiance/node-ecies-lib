# @digitaldefiance/node-ecies-lib

[![npm version](https://badge.fury.io/js/%40digitaldefiance%2Fnode-ecies-lib.svg)](https://www.npmjs.com/package/@digitaldefiance/node-ecies-lib)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-1100%2B%20passing-brightgreen)](https://github.com/Digital-Defiance/ecies-lib)

A Node.js-specific implementation of the Digital Defiance ECIES (Elliptic Curve Integrated Encryption Scheme) library, providing secure encryption, decryption, and key management capabilities using Node.js crypto primitives. This package is designed to be binary compatible with similarly numbered releases of the browser-based `@digitaldefiance/ecies-lib`, enabling seamless cross-platform cryptographic operations.

Part of [Express Suite](https://github.com/Digital-Defiance/express-suite)

> Current Version: v4.13.0

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
  - **Basic**: Minimal overhead (no length prefix).
  - **WithLength**: Includes data length prefix.
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

### 🗳️ Government-Grade Voting System

A comprehensive voting system built on homomorphic encryption with 17 voting methods and 1100+ test cases:

- **All 17 Methods Fully Implemented**: Plurality, Approval, Weighted, Borda Count, Score, Yes/No, Yes/No/Abstain, Supermajority, Ranked Choice (IRV), Two-Round, STAR, STV, Quadratic, Consensus, Consent-Based
- **Node.js Optimized**: Uses Buffer instead of Uint8Array for better Node.js performance
- **Extended PlatformID**: Supports Buffer and mongoose ObjectId in addition to base types
- **Core Security Features**:
  - Homomorphic encryption (Paillier cryptosystem) - votes remain encrypted until tally
  - Verifiable receipts with ECDSA signatures
  - Public bulletin board with Merkle tree integrity
  - Immutable audit log with cryptographic hash chain
  - Event logger with microsecond timestamps
  - Role separation (poll aggregator cannot decrypt votes)
  - Double-vote prevention
- **Government Requirements (EARS)**: Audit Log, Bulletin Board, Event Logger
- **Cross-Platform Compatible**: 100% binary compatible with browser implementation

See [Voting System Documentation](src/lib/voting/README.md) for complete details.

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
  registerNodeRuntimeConfiguration,
  AESGCMService
} from '@digitaldefiance/node-ecies-lib';
import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';

// 1. Configure (Optional - defaults to ObjectIdProvider)
registerNodeRuntimeConfiguration('my-app-config', {
  idProvider: new ObjectIdProvider()
});

// 2. Initialize Service
const ecies = new ECIESService();

// 3. Generate Keys
const mnemonic = ecies.generateNewMnemonic();
const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);

// 4. Encrypt & Decrypt
const message = Buffer.from('Hello, Secure World!');
const encrypted = ecies.encryptWithLength(publicKey, message);
const decrypted = ecies.decryptWithLengthAndHeader(privateKey, encrypted);

console.log(decrypted.toString()); // "Hello, Secure World!"
```

### 2. Strong Typing with ID Providers (New in v4.10.7)

The Node.js library now includes a comprehensive strong typing system for ID providers, eliminating the need for manual type casting and providing compile-time type safety.

#### The Problem (Before v4.10.7)

```typescript
const Constants = getNodeRuntimeConfiguration();
const id = Constants.idProvider.generate(); // Returns Uint8Array (no strong typing)
const obj = Constants.idProvider.fromBytes(bytes); // Returns unknown (requires casting)
```

#### The Solution (v4.10.7+)

**Enhanced Provider (Drop-in Replacement):**
```typescript
import { getEnhancedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';

const provider = getEnhancedNodeIdProvider<ObjectId>();
const id = provider.generateTyped(); // Returns ObjectId (strongly typed)
const obj = provider.fromBytesTyped(bytes); // Returns ObjectId (no casting needed)

// Original methods still work for backward compatibility
const rawBytes = provider.generate(); // Returns Uint8Array
```

**Simple Typed Provider (Clean API):**
```typescript
import { getTypedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';

const provider = getTypedNodeIdProvider<ObjectId>();
const id = provider.generateTyped(); // Returns ObjectId
const bytes = provider.toBytesTyped(id); // Type-safe conversion
const restored = provider.fromBytesTyped(bytes); // Type-safe restoration
```

**Complete Typed Configuration:**
```typescript
import { createNodeObjectIdConfiguration } from '@digitaldefiance/node-ecies-lib';

const config = createNodeObjectIdConfiguration();
const objectId = config.generateId(); // Returns ObjectId (strongly typed)
const bytes = config.idToBytes(objectId); // Convert to bytes
const restored = config.idFromBytes(bytes); // Convert back to ObjectId

// Access full Node.js runtime configuration
const constants = config.constants; // Complete IConstants with ObjectIdProvider
```

**Custom Provider Types:**
```typescript
import { 
  createNodeTypedConfiguration,
  GuidV4Provider,
  UuidProvider 
} from '@digitaldefiance/node-ecies-lib';

// GUID configuration
const guidConfig = createNodeTypedConfiguration<string>({
  idProvider: new GuidV4Provider()
});
const guidId = guidConfig.generateId(); // Returns GUID object (strongly typed)

// UUID configuration
const uuidConfig = createNodeTypedConfiguration<string>({
  idProvider: new UuidProvider()
});
const uuidId = uuidConfig.generateId(); // Returns UUID string (strongly typed)
```

**Integration with ECIESService:**
```typescript
import { ECIESService, createNodeObjectIdConfiguration } from '@digitaldefiance/node-ecies-lib';

const config = createNodeObjectIdConfiguration();
const service = new ECIESService(config.constants);

// Service uses the configured typed provider
console.log(service.idProvider.name); // "ObjectID"
console.log(service.idProvider.byteLength); // 12

// 7. AES-GCM Service (Instance-based)
const aesGcm = new AESGCMService(); // Now instance-based, not static
const key = crypto.getRandomValues(new Uint8Array(32));
const data = new TextEncoder().encode('Sensitive Data');

// Encrypt with authentication tag
const { encrypted: aesEncrypted, iv, tag } = await aesGcm.encrypt(data, key, true);

// Decrypt
const combined = aesGcm.combineEncryptedDataAndTag(aesEncrypted, tag!);
const aesDecrypted = await aesGcm.decrypt(iv, combined, key, true);

// 8. JSON Encryption (NEW!)
const userData = { name: 'Alice', email: 'alice@example.com', age: 30 };
const encryptedJson = await aesGcm.encryptJson(userData, key);
const decryptedJson = await aesGcm.decryptJson<typeof userData>(encryptedJson, key);
console.log(decryptedJson); // { name: 'Alice', email: 'alice@example.com', age: 30 }
```

### 3. Using Custom ID Providers (e.g., GUID)

```typescript
import { 
  registerNodeRuntimeConfiguration, 
  ECIESService 
} from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';

// Configure to use 16-byte GUIDs
const config = registerNodeRuntimeConfiguration('guid-config', {
  idProvider: new GuidV4Provider()
});

const ecies = new ECIESService();
const id = config.idProvider.generate(); // Returns 16-byte Uint8Array
```

**Note**: The `ECIESService` constructor accepts both `IConstants` (from `createRuntimeConfiguration` or `registerNodeRuntimeConfiguration`) and `Partial<IECIESConfig>` for backward compatibility:

```typescript
// Option 1: Pass IConstants directly (recommended)
const config = registerNodeRuntimeConfiguration('my-config', { idProvider: new GuidV4Provider() });
const ecies1 = new ECIESService(config);

// Option 2: Pass partial ECIES config (legacy)
const ecies2 = new ECIESService({ 
  curveName: 'secp256k1',
  symmetricAlgorithm: 'aes-256-gcm' 
});

// Option 3: Use defaults
const ecies3 = new ECIESService();
```

### 4. Streaming Encryption (Large Files)

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

### 5. Voting System (Node.js Optimized)

The Node.js voting system extends the browser implementation with Buffer support and mongoose integration:

```typescript
import { Member, MemberType } from '@digitaldefiance/node-ecies-lib';
import { EmailString } from '@digitaldefiance/ecies-lib';
import { 
  PollFactory, 
  VoteEncoder, 
  PollTallier, 
  VotingMethod 
} from '@digitaldefiance/node-ecies-lib';

const ecies = new ECIESService();

// Create authority with voting keys
const { member: authority, mnemonic } = Member.newMember(
  ecies,
  MemberType.System,
  'Election Authority',
  new EmailString('authority@example.com')
);
await authority.deriveVotingKeys();

// Create poll (returns Node.js Poll with Buffer support)
const poll = PollFactory.createPlurality(
  ['Alice', 'Bob', 'Charlie'],
  authority
);

// Create voter and cast vote
const { member: voter } = Member.newMember(
  ecies,
  MemberType.User,
  'Voter',
  new EmailString('voter@example.com')
);
await voter.deriveVotingKeys();

// Vote encoding uses Buffer internally
const encoder = new VoteEncoder(authority.votingPublicKey!);
const vote = encoder.encodePlurality(0, 3); // Vote for Alice
const receipt = poll.vote(voter, vote);

// Close and tally
poll.close();
const tallier = new PollTallier(
  authority,
  authority.votingPrivateKey!,
  authority.votingPublicKey!
);
const results = tallier.tally(poll);

console.log('Winner:', results.choices[results.winner!]);
console.log('Tallies:', results.tallies);
```

**Node.js Voting Features:**
- **All 17 Methods**: Complete implementation of all voting methods
- **Buffer Optimization**: Uses Node.js Buffer instead of Uint8Array for better performance
- **Mongoose Integration**: Extended PlatformID supports `Types.ObjectId`
- **Cross-Platform**: 100% binary compatible with browser voting system
- **File Persistence**: Can save/load encrypted votes to/from disk
- **Stream Processing**: Handle large voter datasets using Node.js streams

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

### 6. Member System

### Core Services

- **`ECIESService`**: The main entry point for encryption/decryption operations.
  - **Constructor**: `constructor(config?: Partial<IECIESConfig> | IConstants, eciesParams?: IECIESConstants)`
    - Accepts either `IConstants` (from `createRuntimeConfiguration`) or `Partial<IECIESConfig>` for backward compatibility
    - When `IConstants` is provided, ECIES configuration is automatically extracted
    - Optional `eciesParams` provides default values for any missing configuration
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

### Voting System

- **`Poll`**: Core poll with vote aggregation and receipt issuance (generic over PlatformID, defaults to Buffer).
- **`VotingPoll`**: High-level voting with encrypted receipts.
- **`PollTallier`**: Decrypts and tallies votes (holds private key, generic over PlatformID).
- **`VoteEncoder`**: Encrypts votes using Paillier homomorphic encryption (extends browser VoteEncoder with Buffer specialization).
- **`PollFactory`**: Convenient poll creation with method-specific configurations (extends browser PollFactory).
- **`VotingSecurityValidator`**: Security level validation and enforcement.
- **`ImmutableAuditLog`**: Hash-chained audit trail for compliance.
- **`PublicBulletinBoard`**: Append-only vote publication with Merkle tree.
- **`PollEventLogger`**: Event tracking with microsecond timestamps.
- **`VotingMethod`**: Enum with all 17 voting methods.
- **`SecurityLevel`**: Enum for security classifications (FullyHomomorphic, MultiRound, Insecure).
- **`EncryptedVote<TID extends PlatformID>`**: Encrypted vote structure with generic ID support (defaults to Buffer).
- **`PollResults<TID extends PlatformID>`**: Tally results with winner(s) and generic ID support (defaults to Buffer).
- **`VoteReceipt`**: Cryptographic vote receipt with signature verification.

## API Reference

## Development

### Commands

```bash
yarn install         # Install dependencies
yarn build          # Compile TypeScript
yarn test           # Run all tests
yarn lint           # ESLint check
yarn format         # Fix all (prettier + lint)
```

## Testing

### Testing Approach

The node-ecies-lib package uses comprehensive testing with 1100+ tests covering all Node.js-specific cryptographic operations, complete voting system functionality, and binary compatibility with the browser-based ecies-lib.

**Test Framework**: Jest with TypeScript support  
**Property-Based Testing**: fast-check for cryptographic properties  
**Coverage Target**: 90%+ for all cryptographic operations  
**Binary Compatibility**: Verified with @digitaldefiance/ecies-lib  
**Voting System**: Complete test coverage for all 17 voting methods

### Test Structure

```
tests/
  ├── unit/              # Unit tests for Node.js services
  ├── integration/       # Integration tests for protocol flows
  ├── e2e/               # End-to-end encryption/decryption tests
  ├── compatibility/     # Cross-platform compatibility with ecies-lib
  ├── streaming/         # Streaming encryption tests
  └── voting/            # Voting system tests (Node.js specific)
      ├── voting.spec.ts           # Core voting functionality
      ├── voting-stress.spec.ts    # Stress tests with large datasets
      ├── poll-core.spec.ts        # Poll core functionality
      ├── poll-audit.spec.ts       # Audit log integration
      ├── factory.spec.ts          # Poll factory methods
      ├── encoder.spec.ts          # Vote encoding for all methods
      ├── security.spec.ts         # Security validation
      ├── audit.spec.ts            # Immutable audit log
      ├── bulletin-board.spec.ts   # Public bulletin board
      ├── event-logger.spec.ts     # Event logging system
      └── cross-platform-encryption.pbt.spec.ts # Cross-platform voting compatibility
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- ecies-service.spec.ts

# Run compatibility tests
npm test -- cross-platform-compatibility.e2e.spec.ts

# Run in watch mode
npm test -- --watch
```

### Test Patterns

#### Testing Node.js Encryption

```typescript
import { ECIESService, registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';

describe('Node ECIES Encryption', () => {
  let ecies: ECIESService;

  beforeEach(() => {
    registerNodeRuntimeConfiguration('test-config', {
      idProvider: new ObjectIdProvider()
    });
    ecies = new ECIESService();
  });

  it('should encrypt and decrypt with Buffer', () => {
    const mnemonic = ecies.generateNewMnemonic();
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(mnemonic);
    
    const message = Buffer.from('Secret Message');
    const encrypted = ecies.encryptWithLength(publicKey, message);
    const decrypted = ecies.decryptWithLengthAndHeader(privateKey, encrypted);
    
    expect(decrypted.toString()).toBe('Secret Message');
  });
});
```

#### Testing Streaming Encryption

```typescript
import { ECIESService, EncryptionStream } from '@digitaldefiance/node-ecies-lib';
import { createReadStream } from 'fs';

describe('Streaming Encryption', () => {
  it('should encrypt large files efficiently', async () => {
    const ecies = new ECIESService();
    const stream = new EncryptionStream(ecies);
    
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(ecies.generateNewMnemonic());
    const fileStream = createReadStream('test-file.dat');
    
    const encryptedChunks: Buffer[] = [];
    for await (const chunk of stream.encryptStream(fileStream, publicKey)) {
      encryptedChunks.push(chunk.data);
    }
    
    expect(encryptedChunks.length).toBeGreaterThan(0);
  });
});
```

#### Testing Binary Compatibility

```typescript
import { ECIESService as NodeECIES } from '@digitaldefiance/node-ecies-lib';
import { ECIESService as BrowserECIES } from '@digitaldefiance/ecies-lib';

describe('Binary Compatibility', () => {
  it('should decrypt browser-encrypted data in Node.js', async () => {
    const browserEcies = new BrowserECIES();
    const nodeEcies = new NodeECIES();
    
    const mnemonic = browserEcies.generateNewMnemonic();
    const { privateKey, publicKey } = browserEcies.mnemonicToSimpleKeyPair(mnemonic);
    
    // Encrypt in browser
    const message = new TextEncoder().encode('Cross-platform message');
    const encrypted = await browserEcies.encryptWithLength(publicKey, message);
    
    // Decrypt in Node.js
    const decrypted = nodeEcies.decryptWithLengthAndHeader(
      Buffer.from(privateKey),
      Buffer.from(encrypted)
    );
    
    expect(decrypted.toString()).toBe('Cross-platform message');
  });
});
```

#### Property-Based Testing

```typescript
import * as fc from 'fast-check';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

describe('Cryptographic Properties', () => {
  it('should maintain encryption round-trip for any Buffer', () => {
    const ecies = new ECIESService();
    const { privateKey, publicKey } = ecies.mnemonicToSimpleKeyPair(ecies.generateNewMnemonic());
    
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        (data) => {
          const message = Buffer.from(data);
          const encrypted = ecies.encryptWithLength(publicKey, message);
          const decrypted = ecies.decryptWithLengthAndHeader(privateKey, encrypted);
          
          expect(decrypted.equals(message)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Testing Best Practices

1. **Configure runtime** before tests with `registerNodeRuntimeConfiguration()`
2. **Test Buffer operations** specific to Node.js
3. **Test streaming** for large file handling
4. **Verify binary compatibility** with browser ecies-lib
5. **Test all ID providers** (ObjectId, GUID, UUID, Custom)
6. **Test error conditions** like invalid keys and corrupted data

### Cross-Package Testing

Testing integration with other Express Suite packages:

```typescript
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { Member, MemberType, EmailString } from '@digitaldefiance/ecies-lib';

describe('Integration with suite-core-lib', () => {
  it('should work with Member abstraction', () => {
    const ecies = new ECIESService();
    const { member, mnemonic } = Member.newMember(
      ecies,
      MemberType.User,
      'Alice',
      new EmailString('alice@example.com')
    );
    
    const encrypted = member.encryptData('Secret');
    expect(encrypted).toBeDefined();
  });
});
```

## ChangeLog

### v4.13.0 - API Naming Improvements & Configuration Enhancements

**Breaking Changes:**

- **Encryption Mode Renaming**: 
  - `SIMPLE` → `BASIC` (constant)
  - `SINGLE` → `WITH_LENGTH` (constant)
  - `encryptSimpleOrSingle(isSimple, ...)` → `encryptBasic(...)` / `encryptWithLength(...)`
  - `decryptSimpleOrSingleWithHeader(isSimple, ...)` → `decryptBasicWithHeader(...)` / `decryptWithLengthAndHeader(...)`
  
- **registerNodeRuntimeConfiguration Signature Change**:
  - Now requires a key parameter: `registerNodeRuntimeConfiguration(key, overrides)`
  - Supports both `symbol` and `string` keys
  - Overloaded to support `registerNodeRuntimeConfiguration(overrides)` which auto-generates a symbol key
  
- **Removed Constants**:
  - `OBJECT_ID_LENGTH` removed - use `idProvider.byteLength` instead
  
- **GuidBuffer Class Renamed**:
  - `Guid` → `GuidBuffer` (Node.js Buffer-based implementation)
  - Added `VersionedGuidBuffer<V>` type for compile-time version tracking

**New Features:**

- **ECIES_CONFIG**: New configuration interface and constant inherited from ecies-lib
  
- **TranslatableNodeEciesError**: New error class with automatic i18n translation
  ```typescript
  throw new TranslatableNodeEciesError('INVALID_KEY', { keyLength: 32 });
  ```
  
- **getNodeEciesTranslation()**: New helper function for translating node-ecies strings

- **Enhanced Type System for GUIDs**:
  - `VersionedGuidBuffer<4>` for v4 UUIDs with compile-time version info
  - `__version` property attached to parsed/generated GUIDs

**Migration Guide:**
```typescript
// BEFORE (v4.12.x)
registerNodeRuntimeConfiguration({ idProvider: new GuidV4Provider() });
const encrypted = ecies.encryptSimpleOrSingle(false, publicKey, data);
const decrypted = ecies.decryptSimpleOrSingleWithHeader(false, privateKey, encrypted);

// AFTER (v4.13.0+)
registerNodeRuntimeConfiguration('my-app-config', { idProvider: new GuidV4Provider() });
const encrypted = ecies.encryptWithLength(publicKey, data);
const decrypted = ecies.decryptWithLengthAndHeader(privateKey, encrypted);
```

### v4.12.0 - AESGCMService Refactoring & JSON Encryption

**Breaking Changes:**
- **AESGCMService is now instance-based**: Changed from abstract static class to regular instance-based class
  - All methods are now instance methods instead of static methods
  - Constructor accepts optional `IConstants` parameter for configuration
  - Example: `const aesGcm = new AESGCMService(); aesGcm.encrypt(...)` instead of `AESGCMService.encrypt(...)`

**New Features:**
- **JSON Encryption Methods**: Added convenient methods for encrypting/decrypting JSON data
  - `encryptJson<T>(data: T, key: Uint8Array): Promise<Uint8Array>` - Encrypts any JSON-serializable data
  - `decryptJson<T>(encryptedData: Uint8Array, key: Uint8Array): Promise<T>` - Decrypts and parses JSON data
  - Automatically handles JSON serialization, encryption with auth tags, and IV management
  - Type-safe with TypeScript generics

**Architecture Improvements:**
- Added `configuration` and `engine` instance properties to AESGCMService
- Improved dependency injection support with optional constants parameter
- Enhanced error handling with i18n support
- Better alignment with browser/Node.js architectural patterns

**Migration Guide:**
```typescript
// BEFORE (v4.10.x and earlier)
import { AESGCMService } from '@digitaldefiance/node-ecies-lib';

const { encrypted, iv, tag } = await AESGCMService.encrypt(data, key, true);
const combined = AESGCMService.combineEncryptedDataAndTag(encrypted, tag);

// AFTER (v4.12.0+)
import { AESGCMService } from '@digitaldefiance/node-ecies-lib';

const aesGcm = new AESGCMService(); // Create instance
const { encrypted, iv, tag } = await aesGcm.encrypt(data, key, true);
const combined = aesGcm.combineEncryptedDataAndTag(encrypted, tag);

// NEW: JSON encryption
const userData = { name: 'Alice', email: 'alice@example.com' };
const encrypted = await aesGcm.encryptJson(userData, key);
const decrypted = await aesGcm.decryptJson<typeof userData>(encrypted, key);
```

**Testing:**
- Added 17 comprehensive tests for JSON encryption methods
- Added 3 e2e tests for real-world JSON scenarios
- All 1,100+ existing tests updated and passing

### v4.10.7 - Strong Typing for ID Providers

**Major Features:**
- **Strong Typing System**: Added comprehensive strong typing for Node.js ID provider operations
  - `getEnhancedNodeIdProvider<T>()`: Drop-in replacement with both original and typed methods
  - `getTypedNodeIdProvider<T>()`: Simple typed provider with minimal API surface
  - `createNodeTypedConfiguration<T>()`: Complete typed configuration wrapper
  - `createNodeObjectIdConfiguration()`: Pre-configured ObjectId setup
- **Type Safety Benefits**: Eliminates manual casting and provides compile-time type safety
  - `generateTyped()`: Returns strongly-typed IDs (ObjectId, string, etc.)
  - `fromBytesTyped()`: Type-safe byte conversion without casting
  - `toBytesTyped()`, `serializeTyped()`, `deserializeTyped()`: Complete typed API
- **Backward Compatibility**: Enhanced providers include original methods for seamless migration
- **Integration Ready**: Works seamlessly with ECIESService and Member system

**Usage Examples:**
```typescript
// Enhanced provider (drop-in replacement)
const provider = getEnhancedNodeIdProvider<ObjectId>();
const id = provider.generateTyped(); // Returns ObjectId (strongly typed)

// Complete typed configuration
const config = createNodeObjectIdConfiguration();
const objectId = config.generateId(); // Returns ObjectId
const bytes = config.idToBytes(objectId); // Type-safe conversion

// Custom provider types
const guidConfig = createNodeTypedConfiguration<string>({
  idProvider: new GuidV4Provider()
});
const guidId = guidConfig.generateId(); // Returns GUID object (strongly typed)
```

**Breaking Changes:** None - fully backward compatible

**Files Added:**
- `src/typed-configuration.ts` - Main implementation
- `src/typed-configuration.spec.ts` - Comprehensive tests
- `src/examples/typed-configuration-usage.ts` - Usage examples

### v4.10.6 - Voting System & PlatformID Integration

**Major Features:**
- **Complete Cryptographic Voting System**: Added comprehensive voting system with 17+ methods
  - All methods fully implemented: Plurality, Approval, Weighted, Borda, Score, Yes/No, Yes/No/Abstain, Supermajority, Ranked Choice (IRV), Two-Round, STAR, STV, Quadratic, Consensus, Consent-Based
  - Node.js optimized with Buffer instead of Uint8Array for better performance
  - Government-grade security: Immutable audit logs, public bulletin board, event logging
  - Role separation: Poll aggregators cannot decrypt votes until closure
- **Extended PlatformID Type System**: Enhanced ID provider system with Node.js-specific extensions
  - `PlatformID = BasePlatformID | Buffer | Types.ObjectId`
  - Seamless integration with mongoose and MongoDB applications
  - Generic interfaces: `EncryptedVote<TID extends PlatformID>`, `PollResults<TID extends PlatformID>`
- **Enhanced Member System**: Added voting key derivation and management
  - `deriveVotingKeys()`: Generate Paillier keypairs for homomorphic encryption
  - `votingPublicKey` and `votingPrivateKey` properties for voting operations
  - Full integration with voting system interfaces

**Node.js Voting System Components:**
- `Poll`: Core vote aggregation with receipt generation (extends browser Poll with Buffer support)
- `VotingPoll`: High-level voting with encrypted receipts
- `PollTallier`: Secure vote decryption and tallying (separate entity)
- `VoteEncoder`: Paillier homomorphic encryption for all voting methods (extends browser VoteEncoder)
- `PollFactory`: Convenient poll creation with method-specific configurations (extends browser PollFactory)
- `VotingSecurityValidator`: Security level validation and enforcement
- `ImmutableAuditLog`: Cryptographic hash chain for audit compliance
- `PublicBulletinBoard`: Transparent vote publication with Merkle tree integrity
- `PollEventLogger`: Comprehensive event tracking with microsecond timestamps

**Breaking Changes:**
- Voting interfaces now use generic `PlatformID` types with Buffer as default
- Member interface extended with voting key properties
- New voting system exports in main package

**Compatibility:**
- Fully backward compatible for existing ECIES operations
- New voting system is opt-in and doesn't affect existing functionality
- 100% binary compatible with `@digitaldefiance/ecies-lib` voting system
- Cross-platform vote encryption/decryption verified

### v4.8.2 - Voting System Foundation

**Features:**
- Initial voting system architecture
- Core voting method implementations
- Basic showcase application structure

### v4.8.1 - Voting System Initialization

**Features:**
- Foundation for cryptographic voting system
- Initial voting method definitions
- Enhanced Member system for voting key management

### v4.8.0 - Voting System Introduction

**Major Features:**
- **Initial Voting System**: Introduced cryptographic voting system architecture
- **Voting Method Enumerations**: Defined all 17+ voting methods with security classifications
- **Enhanced Member System**: Added voting key derivation capabilities
- **Showcase Application**: Started development of interactive voting demos

### v4.7.15 - Pre-Voting System Enhancements

**Improvements:**
- Enhanced core ECIES functionality
- Improved ID provider system
- Bug fixes and stability improvements
- Updated showcase components

### v4.7.14

**Bug Fix: idProvider Configuration Now Respected by Member.newMember()**

This release fixes a critical bug where `Member.newMember()` ignored the configured `idProvider` in `ECIESService` and always used the default `Constants.idProvider`.

**What Changed:**
- `ECIESService` now stores the full `IConstants` configuration (not just `IECIESConfig`)
- New `ECIESService.constants` getter provides access to the complete configuration including `idProvider`
- `Member.newMember()` now uses `eciesService.constants.idProvider.generate()` for ID generation
- `Member.toJson()` and `Member.fromJson()` now use the service's configured `idProvider` for serialization
- `Member.fromJson()` validates ID length and warns if it doesn't match the configured `idProvider`

**Before (Broken):**
```typescript
const config = registerNodeRuntimeConfiguration('guid-config', { idProvider: new GuidV4Provider() });
const service = new ECIESService(config);
const { member } = Member.newMember(service, MemberType.User, 'Alice', email);
console.log(member.id.length); // 12 (wrong - used default ObjectIdProvider)
```

**After (Fixed):**
```typescript
const config = registerNodeRuntimeConfiguration('guid-config', { idProvider: new GuidV4Provider() });
const service = new ECIESService(config);
const { member } = Member.newMember(service, MemberType.User, 'Alice', email);
console.log(member.id.length); // 16 (correct - uses configured GuidV4Provider)
```

**Backward Compatibility:**
- Existing code using default `idProvider` continues to work unchanged
- The `ECIESService.config` getter still returns `IECIESConfig` for backward compatibility
- `Member.fromJson()` warns but doesn't fail on ID length mismatch (for compatibility with existing serialized data)

### v4.4.2

- Update ecies lib
- Properly import from @digitaldefiance/mongoose-types

### v4.4.1

- Update ecies lib

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

## Summary

The Node.js implementation of `@digitaldefiance/node-ecies-lib` provides a **complete, production-ready cryptographic library** with comprehensive voting system support:

### ✅ Complete Implementation
- **All 17 Voting Methods**: Every voting method from Plurality to Consent-Based is fully implemented and tested
- **Node.js Optimized**: Uses Buffer instead of Uint8Array for optimal Node.js performance
- **Extended PlatformID**: Supports Buffer and mongoose ObjectId for seamless database integration
- **Cross-Platform**: 100% binary compatible with browser `@digitaldefiance/ecies-lib`

### ✅ Government-Grade Security
- **Homomorphic Encryption**: Paillier cryptosystem for privacy-preserving vote aggregation
- **Immutable Audit Log**: Cryptographic hash chain for complete audit trail
- **Public Bulletin Board**: Transparent, verifiable vote publication
- **Event Logging**: Microsecond-precision event tracking
- **Role Separation**: Poll aggregators cannot decrypt votes until closure

### ✅ Production Ready
- **1100+ Tests**: Comprehensive test coverage including all voting methods and cross-platform compatibility
- **Stress Tested**: Handles 1000+ voters and complex elimination scenarios
- **Attack Resistant**: Prevents double voting, vote manipulation, and unauthorized decryption
- **Node.js Native**: Optimized for Node.js crypto module and Buffer operations

The system is ready for production use in government elections, corporate governance, and any application requiring secure, verifiable voting with Node.js backend systems.

## License

MIT © Digital Defiance
