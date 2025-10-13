# @digitaldefiance/node-ecies-lib

A Node.js-specific implementation of the Digital Defiance ECIES (Elliptic Curve Integrated Encryption Scheme) library, providing secure encryption, decryption, and key management capabilities using Node.js crypto primitives.

## Features

- **ECIES Encryption/Decryption**: Secure elliptic curve integrated encryption scheme
- **Multi-recipient Encryption**: Encrypt data for multiple recipients simultaneously
- **PBKDF2 Key Derivation**: Password-based key derivation with configurable profiles
- **Digital Signatures**: Sign and verify data using elliptic curve cryptography

- ## 🚀 Plugin-Based I18n Architecture

Version 1.0.4+ includes full support for the new plugin-based internationalization architecture from `@digitaldefiance/i18n-lib`:

### Features

- **Component-Based Translations**: ECIES-specific strings organized in dedicated components
- **Multi-Language Support**: Built-in translations for English, French, Spanish, German, Chinese, Japanese, and Ukrainian
- **Type-Safe Translation Calls**: Full TypeScript support with compile-time validation
- **Automatic Fallback**: Intelligent fallback to default language for missing translations
- **Custom Engine Support**: Use your own plugin engine instance or let the library manage it automatically

### Advanced Usage

```typescript
import { 
  getEciesPluginI18nEngine, 
  getNodeEciesTranslation,
  NodeEciesStringKey 
} from '@digitaldefiance/node-ecies-lib';
import { CoreLanguage } from '@digitaldefiance/i18n-lib';

// Get the plugin engine instance
const engine = getEciesPluginI18nEngine();

// Use component-based translations
const errorMessage = getNodeEciesTranslation(
  NodeEciesStringKey.Error_LengthError_LengthIsInvalidType,
  {},
  CoreLanguage.Spanish
);

// Switch languages globally
engine.setLanguage(CoreLanguage.French);
```

### Member

Member management with wallet integration:

- **Cross-platform Compatibility**: Works seamlessly with the browser-based `@digitaldefiance/ecies-lib`

## Installation

```bash
npm install @digitaldefiance/node-ecies-lib
```

## Quick Start

### 🆕 Plugin-Based Architecture (Recommended)

```typescript
import { ECIESService, Member, MemberType, EmailString } from '@digitaldefiance/node-ecies-lib';

// Initialize the service - no need to pass i18n engine explicitly!
const eciesService = new ECIESService();

// Or with configuration
const eciesServiceWithConfig = new ECIESService({
  curveName: 'secp256k1',
  symmetricAlgorithm: 'aes-256-gcm'
});

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

// Rest of the usage remains the same...
```

## Core Components

### ECIESService

The main service class providing encryption, decryption, and key management:

```typescript
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

// 🆕 Plugin-based architecture - automatic i18n setup
const service = new ECIESService();

// Or with explicit plugin engine (advanced usage)
import { getEciesPluginI18nEngine } from '@digitaldefiance/node-ecies-lib';
const serviceWithExplicitEngine = new ECIESService(getEciesPluginI18nEngine());

// Generate mnemonic
const mnemonic = service.generateNewMnemonic();

// Single recipient encryption
const encrypted = service.encryptSimpleOrSingle(
  false, // use single mode (not simple)
  recipientPublicKey,
  Buffer.from('message')
);

// Multi-recipient encryption
const multiEncrypted = service.encryptMultiple(
  [member1, member2, member3],
  Buffer.from('message')
);
```

### Member Class

Represents a user with cryptographic capabilities:

```typescript
import { Member, MemberType, EmailString } from '@digitaldefiance/node-ecies-lib';

// Create from mnemonic
const member = Member.fromMnemonic(mnemonic, eciesService);

// Sign data
const signature = member.sign(Buffer.from('data to sign'));

// Verify signature
const isValid = member.verify(signature, Buffer.from('data to sign'));

// Encrypt for another member
const encrypted = member.encryptData('secret message', otherMember.publicKey);
```

### PBKDF2 Service

Password-based key derivation with multiple security profiles:

```typescript
import { Pbkdf2Service, Pbkdf2ProfileEnum } from '@digitaldefiance/node-ecies-lib';

// Use predefined profile
const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
  Buffer.from('password'),
  Pbkdf2ProfileEnum.USER_LOGIN
);

// Custom parameters
const customResult = Pbkdf2Service.deriveKeyFromPassword(
  Buffer.from('password'),
  salt,
  100000, // iterations
  32,     // salt bytes
  32,     // key bytes
  'sha256' // algorithm
);

// Async version
const asyncResult = await Pbkdf2Service.deriveKeyFromPasswordAsync(
  Buffer.from('password')
);
```

## PBKDF2 Profiles

The library includes several predefined PBKDF2 profiles for different use cases:

| Profile | Salt Size | Iterations | Algorithm | Hash Size | Use Case |
|---------|-----------|------------|-----------|-----------|----------|
| `USER_LOGIN` | 32 bytes | 1,304,000 | SHA-256 | 32 bytes | User authentication |
| `KEY_WRAPPING` | 32 bytes | 100,000 | SHA-256 | 32 bytes | Key encryption |
| `BACKUP_CODES` | 32 bytes | 1,304,000 | SHA-256 | 32 bytes | Backup codes |
| `HIGH_SECURITY` | 64 bytes | 2,000,000 | SHA-512 | 64 bytes | Sensitive operations |
| `TEST_FAST` | 16 bytes | 1,000 | SHA-256 | 32 bytes | Testing/development |

## Encryption Types

The library supports multiple encryption modes:

- **Simple**: Basic ECIES encryption for single recipients
- **Single**: Enhanced ECIES with additional metadata
- **Multiple**: Efficient encryption for multiple recipients

```typescript
// Single recipient
const singleEncrypted = service.encryptSimpleOrSingle(
  false, // single mode
  recipientPublicKey,
  message
);

// Multiple recipients
const multiEncrypted = service.encryptMultiple(
  [member1, member2, member3],
  message
);
```

## Cross-Platform Compatibility

This Node.js library is designed to work seamlessly with the browser-based `@digitaldefiance/ecies-lib`:

```typescript
// Data encrypted in browser can be decrypted in Node.js
const browserEncrypted = /* data from browser */;
const nodeDecrypted = nodeMember.decryptData(browserEncrypted);

// Data encrypted in Node.js can be decrypted in browser
const nodeEncrypted = nodeMember.encryptData('message');
// Send nodeEncrypted to browser for decryption
```


## Security Features

- **Secure Memory Management**: Uses `SecureBuffer` and `SecureString` for sensitive data
- **Key Zeroization**: Automatic cleanup of cryptographic material
- **Configurable Security Levels**: Multiple PBKDF2 profiles for different security requirements
- **Input Validation**: Comprehensive validation of all cryptographic inputs
- **Error Handling**: Detailed error types for debugging and security analysis

## 🛠️ Runtime Configuration Registry

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

All constants are immutable and accessible via the registry/config API. See `src/constants.ts` and `src/defaults.ts` for details.

## 🏛️ Architectural Conventions

- Centralized constants file
- Immutability via Object.freeze
- Registry/config pattern for runtime overrides
- Type-safe interfaces for all config objects

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

Key interfaces for type safety:

- `IPbkdf2Result`: Result of key derivation operations
- `IMultiEncryptedMessage`: Multi-recipient encrypted data structure
- `IMemberOperational`: Member interface with operational methods
- `IWalletSeed`: Wallet and seed information

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

- Unit tests for individual components
- Integration tests for cross-component functionality
- End-to-end tests for complete workflows
- Cross-platform compatibility tests

## Error Handling

The library provides detailed error types for different failure scenarios:

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

- **Async Operations**: Use async versions of PBKDF2 operations to avoid blocking the event loop
- **Memory Management**: Dispose of members and secure buffers when no longer needed
- **Profile Selection**: Choose appropriate PBKDF2 profiles based on security vs. performance requirements

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

- `@digitaldefiance/ecies-lib`: Browser-compatible ECIES library
- `@digitaldefiance/i18n-lib`: Internationalization support

## ChangeLog

### Version 1.0.8

- Sun Oct 12 2025 22:30:00 GMT-0700 (Pacific Daylight Time)
  - feat: upgrade to ecies-lib 1.0.26 with runtime configuration system
    - Bump version to 1.0.8
    - Update @digitaldefiance/ecies-lib dependency to 1.0.26
    - Implement runtime configuration system with node-specific defaults
    - Add PBKDF2 profile enum alignment and configuration overrides
    - Remove obsolete AES-GCM E2E test file
    - Update changelog for version 1.0.8

### Version 1.0.6

- Sun Oct 12 2025 16:47:00 GMT-0700 (Pacific Daylight Time)
  - Improved constants inheritance and froze objects

### Version 1.0.5

- Sat Oct 11 2025 21:34:00 GMT-0700 (Pacific Daylight Time)
  - Used latest cleanup code from i18n library and updated dependencies

### Version 1.0.4

- Sat Oct 11 2025 19:08:00 GMT-0700 (Pacific Daylight Time)
  - Added plugin-based internationalization architecture with `@digitaldefiance/i18n-lib`

### Version 1.0.3

- Fri Oct 03 2024 10:50:21 GMT-0700 (Pacific Daylight Time)
  - Initial release
