# @digitaldefiance/node-ecies-lib

A Node.js-specific implementation of the Digital Defiance ECIES (Elliptic Curve Integrated Encryption Scheme) library, providing secure encryption, decryption, and key management capabilities using Node.js crypto primitives. This package is designed to be binary compatible with the browser-based `@digitaldefiance/ecies-lib`, enabling seamless cross-platform cryptographic operations.

## Features

- **ECIES Encryption/Decryption**: Secure elliptic curve integrated encryption scheme using Node.js crypto primitives.
- **Multi-recipient Encryption**: Encrypt data for multiple recipients simultaneously with efficient handling.
- **PBKDF2 Key Derivation**: Password-based key derivation with multiple configurable security profiles.
- **Digital Signatures**: Sign and verify data using elliptic curve cryptography.
- **Secure Memory Management**: Uses `SecureBuffer` and `SecureString` for sensitive data to ensure zeroization and protection.
- **Runtime Configuration Registry**: Centralized, immutable constants with runtime override capabilities for advanced customization.
- **Plugin-Based Internationalization (i18n)**: Full support for multi-language translations with type-safe, plugin-based architecture.

## Binary Compatibility

This package is intended to be fully binary compatible with the browser-based `@digitaldefiance/ecies-lib`. This means:

- Data encrypted in the browser can be decrypted in Node.js and vice versa.
- Cryptographic primitives and data formats are consistent across environments.
- Enables cross-platform secure communication and data handling.

## Installation

```bash
npm install @digitaldefiance/node-ecies-lib
```

## Quick Start

### Plugin-Based Architecture (Recommended)

```typescript
import { ECIESService, Member, MemberType, EmailString } from '@digitaldefiance/node-ecies-lib';

// Initialize the ECIES service (automatic i18n setup)
const eciesService = new ECIESService();

// Create a new member
const { member, mnemonic } = Member.newMember(
  eciesService,
  MemberType.User,
  'Alice',
  new EmailString('alice@example.com')
);

// Encrypt data
const message = 'Hello, secure world!';
const encrypted = member.encryptData(message);

// Decrypt data
const decrypted = member.decryptData(encrypted);
console.log(decrypted.toString()); // "Hello, secure world!"
```

### Legacy API (Still Supported)

```typescript
import { ECIESService, Member, MemberType, EmailString, getEciesPluginI18nEngine } from '@digitaldefiance/node-ecies-lib';

// Initialize the service with explicit i18n engine
const eciesService = new ECIESService(getEciesPluginI18nEngine());

// Usage remains the same...
```

## Core Components

### ECIESService

The main service class providing encryption, decryption, key management, and mnemonic generation:

- Supports single and multi-recipient encryption modes.
- Provides signing and verification of data.
- Integrates with plugin-based i18n for error messages and logs.

Detailed API:
- `constructor(engine?: PluginI18nEngine)`: Initializes the service; if no engine is provided, an internal plugin-based i18n engine is used.
- `generateNewMnemonic(): SecureString`: Generates a new mnemonic phrase compliant with BIP39 for secure key generation.
- `walletAndSeedFromMnemonic(mnemonic: SecureString): { wallet: Wallet; seed: Buffer }`: Derives an Ethereum wallet instance and raw seed buffer from a mnemonic.
- `encryptSimpleOrSingle(simple: boolean, publicKey: Buffer, data: Buffer): Buffer`: Encrypts data in simple (headerless) or single-recipient (with header) ECIES mode.
- `encryptMultiple(members: Member[], data: Buffer): Buffer`: Encrypts the same payload for multiple recipients efficiently, producing a combined ciphertext.
- `decryptSimpleOrSingleWithHeader(simple: boolean, privateKey: Buffer, encryptedData: Buffer): Buffer`: Decrypts data encrypted by `encryptSimpleOrSingle` in either mode, returning the original plaintext.
- `signMessage(privateKey: Buffer, data: Buffer): SignatureBuffer`: Creates a deterministic signature over a message using the provided private key.
- `verifyMessage(publicKey: Buffer, data: Buffer, signature: SignatureBuffer): boolean`: Validates a signature against the original data and signer’s public key.
- `deriveKeyFromPassword(password: Buffer, salt: Buffer, iterations: number, saltBytes: number, hashBytes: number, algorithm: string): ChecksumBuffer`: Delegates to PBKDF2 service for synchronous key derivation.
- `deriveKeyFromPasswordAsync(password: Buffer, salt: Buffer, iterations: number, saltBytes: number, hashBytes: number, algorithm: string): Promise<ChecksumBuffer>`: Async version of key derivation to avoid blocking the event loop.

### Member Class

Represents a cryptographic member with capabilities to:

- Manage keys and wallets securely.
- Sign and verify data.
- Encrypt and decrypt data for self or other members.
- Serialize and deserialize member data to/from JSON.
- Create new members from mnemonics or generate new ones.

Core methods and behaviors:
- `new Member(...)`: Constructs with injected `ECIESService`, type, name, email, public key, and optional private key, wallet, IDs, and timestamps.
- `loadWallet(mnemonic: SecureString)`: Loads wallet and private key from mnemonic; verifies public key integrity.
- `loadPrivateKey(privateKey: SecureBuffer)`: Imports a raw private key into the member instance.
- `sign(data: Buffer): SignatureBuffer`: Signs arbitrary data buffer; throws if private key is missing.
- `verify(signature: SignatureBuffer, data: Buffer): boolean`: Verifies a signature against the member’s public key.
- `encryptData(data: string | Buffer, recipientPublicKey?: Buffer): Buffer`: Encrypts data for the specified public key or self.
- `decryptData(encryptedData: Buffer): Buffer`: Decrypts ciphertext using the member’s private key.
- `toJson(): string`: Serializes member operational data (IDs, keys, timestamps) into a JSON string.
- `dispose(): void`: Securely zeroizes and unloads private key and wallet from memory.
- Static factory methods:
  - `Member.fromJson(json: string, eciesService: ECIESService)`: Recreates a member from stored JSON.
  - `Member.fromMnemonic(mnemonic: SecureString, eciesService: ECIESService, memberType?, name?, email?)`: Builds a member directly from a mnemonic.
  - `Member.newMember(eciesService: ECIESService, type, name, email, forceMnemonic?, createdBy?)`: Generates a new random member with mnemonic and returns both.

### PBKDF2 Service

Provides password-based key derivation with multiple predefined profiles optimized for different security and performance needs:

| Profile       | Salt Size | Iterations | Algorithm | Hash Size | Use Case            |
|---------------|-----------|------------|-----------|-----------|---------------------|
| USER_LOGIN    | 32 bytes  | 1,304,000  | SHA-256   | 32 bytes  | User authentication |
| KEY_WRAPPING  | 32 bytes  | 100,000    | SHA-256   | 32 bytes  | Key encryption      |
| BACKUP_CODES  | 32 bytes  | 1,304,000  | SHA-256   | 32 bytes  | Backup codes        |
| HIGH_SECURITY | 64 bytes  | 2,000,000  | SHA-512   | 64 bytes  | Sensitive operations|
| TEST_FAST     | 16 bytes  | 500        | SHA-256   | 32 bytes  | Testing/development |

Detailed API:
- `deriveKeyFromPassword(password: Buffer, salt: Buffer, iterations: number, saltBytes: number, hashBytes: number, algorithm: string): ChecksumBuffer`: Synchronously derives a key using PBKDF2 with specified parameters.
- `deriveKeyFromPasswordAsync(password: Buffer, salt: Buffer, iterations: number, saltBytes: number, hashBytes: number, algorithm: string): Promise<ChecksumBuffer>`: Async implementation of PBKDF2 for non-blocking operation.
- `deriveKeyFromPasswordWithProfile(password: Buffer, profile: Pbkdf2ProfileEnum): ChecksumBuffer`: Convenience method to derive a key using a predefined profile.
- `deriveKeyFromPasswordWithProfileAsync(password: Buffer, profile: Pbkdf2ProfileEnum): Promise<ChecksumBuffer>`: Async version of profile-based derivation.
- `generateSalt(bytes: number = 32): Buffer`: Utility to generate cryptographically secure random salt of specified length.
- `getDefaultProfile(profile: Pbkdf2ProfileEnum): IPbkdf2Consts`: Retrieves constant parameters for a given profile.

## Encryption Types

Supports multiple encryption modes:

- **Simple**: Basic ECIES encryption for single recipients.
- **Single**: Enhanced ECIES with additional metadata.
- **Multiple**: Efficient encryption for multiple recipients.

## Cross-Platform Compatibility

Designed to work seamlessly with the browser-based `@digitaldefiance/ecies-lib`:

- Data encrypted in the browser can be decrypted in Node.js.
- Data encrypted in Node.js can be decrypted in the browser.

## Security Features

- Secure memory management with zeroization of sensitive data.
- Configurable security levels via PBKDF2 profiles.
- Comprehensive input validation and error handling.
- Detailed error types with plugin-based i18n support for localization.

## Runtime Configuration Registry

This package uses a runtime configuration registry for all constants and cryptographic parameters. You can override defaults at runtime for advanced use cases:

```typescript
import {
  getNodeRuntimeConfiguration,
  registerNodeRuntimeConfiguration,
  NODE_RUNTIME_CONFIGURATION_KEY,
} from '@digitaldefiance/node-ecies-lib';

// Get current config
const config = getNodeRuntimeConfiguration();

// Register a custom config
const customKey = Symbol('custom-node-ecies-config');
registerNodeRuntimeConfiguration(customKey, { PBKDF2: { ALGORITHM: 'sha512' } });
const customConfig = getNodeRuntimeConfiguration(customKey);
```

All constants are immutable and accessible via the registry/config API. See `src/constants.ts` for details.

## API Reference

### Constants

```typescript
import { Constants, PBKDF2, PBKDF2_PROFILES } from '@digitaldefiance/node-ecies-lib';

// Access configuration constants
const saltSize = Constants.PBKDF2.SALT_BYTES; // 32
const iterations = Constants.PBKDF2.ITERATIONS_PER_SECOND; // 1,304,000
const keyWrappingProfile = Constants.PBKDF2_PROFILES.KEY_WRAPPING;
```

### Interfaces

Key interfaces for type safety include:

- `IPbkdf2Result`: Result of key derivation operations.
- `IMultiEncryptedMessage`: Multi-recipient encrypted data structure.
- `IMemberOperational`: Member interface with operational methods.
- `IWalletSeed`: Wallet and seed information.

## Testing

The library includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- pbkdf2.spec.ts
npm test -- ecies-compatibility.e2e.spec.ts
```

Test categories:

- Unit tests for individual components.
- Integration tests for cross-component functionality.
- End-to-end tests for complete workflows.
- Cross-platform compatibility tests.

## Error Handling

Detailed error types for different failure scenarios with localization support:

```typescript
import { Pbkdf2Error, Pbkdf2ErrorType, MemberError, MemberErrorType } from '@digitaldefiance/node-ecies-lib';

try {
  const result = Pbkdf2Service.deriveKeyFromPassword(password, invalidSalt);
} catch (error) {
  if (error instanceof Pbkdf2Error) {
    if (error.type === Pbkdf2ErrorType.InvalidSaltLength) {
      console.log('Salt length is invalid');
    }
  }
}
```

## Performance Considerations

- Use async PBKDF2 operations to avoid blocking the event loop.
- Dispose of members and secure buffers when no longer needed.
- Select appropriate PBKDF2 profiles based on security vs. performance requirements.

```typescript
// Use async for better performance
const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(password);

// Dispose of resources
member.dispose();
secureString.dispose();
```

## License

MIT

## Contributing

Please read the contributing guidelines in the main repository.

## Related Packages

- `@digitaldefiance/ecies-lib`: Browser-compatible ECIES library.
- `@digitaldefiance/i18n-lib`: Internationalization support.

## ChangeLog

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
