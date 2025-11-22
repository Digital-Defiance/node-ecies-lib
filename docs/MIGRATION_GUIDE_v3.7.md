# Migration Guide: node-ecies-lib v3.6.x → v3.7.x

## Overview

Version 3.7.0 introduces the same pluggable ID provider system from `@digitaldefiance/ecies-lib` to the Node.js implementation. This guide helps you migrate your Node.js code from v3.6.x to v3.7.x.

**Breaking Changes:**

- Recipient ID size is now determined by the configured ID provider
- Constants API has changed to support dynamic sizing  
- New invariant validation system enforces configuration consistency
- Node-specific constants now properly extend base ecies-lib constants

**Migration Effort:** Low to Medium
**Estimated Time:** 30 minutes - 2 hours depending on customization

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Breaking Changes](#breaking-changes)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [ID Provider Selection](#id-provider-selection)
5. [Node.js-Specific Considerations](#nodejs-specific-considerations)
6. [Testing Your Migration](#testing-your-migration)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Minimal Migration (No Code Changes)

If you're using default ObjectID-based encryption (12 bytes), **no code changes are required**. The default configuration maintains backward compatibility.

```typescript
// v3.6.x - Still works in v3.7.x!
import { MultiRecipient } from '@digitaldefiance/node-ecies-lib';

const encrypted = await MultiRecipient.encrypt(
  Buffer.from(data),
  recipientKeys
);
```

### If You Were Using Custom Recipient ID Sizes

If you customized `OBJECT_ID_LENGTH` or `RECIPIENT_ID_SIZE` constants:

```typescript
// v3.6.x - Old way (BREAKS in v3.7.x)
import { Constants } from '@digitaldefiance/node-ecies-lib';

// Direct constant modification no longer works
Constants.OBJECT_ID_LENGTH = 16; // ❌ Error: Cannot modify frozen constant

// v3.7.x - New way
import { 
  registerNodeRuntimeConfiguration, 
  GuidV4Provider 
} from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(), // ✅ Use ID provider
});
```

---

## Breaking Changes

### 1. OBJECT_ID_LENGTH Removed from Constants

**Before (v3.6.x):**

```typescript
import { Constants } from '@digitaldefiance/node-ecies-lib';

const buffer = Buffer.alloc(Constants.OBJECT_ID_LENGTH); // 12 bytes
```

**After (v3.7.x):**

```typescript
import { Constants } from '@digitaldefiance/node-ecies-lib';

// OBJECT_ID_LENGTH no longer exists
// Use idProvider.byteLength or ENCRYPTION.RECIPIENT_ID_SIZE
const buffer = Buffer.alloc(Constants.idProvider.byteLength);
// OR
const buffer = Buffer.alloc(Constants.ENCRYPTION.RECIPIENT_ID_SIZE);
```

### 2. Multi-Recipient Service Hardcoded Sizes

**Before (v3.6.x):**

```typescript
// In multi-recipient.ts (internal)
const recipientsBuffer = Buffer.alloc(
  data.recipientIds.length * 12 // Hardcoded size
);
```

**After (v3.7.x):**

```typescript
// Now uses dynamic sizing
const recipientsBuffer = Buffer.alloc(
  data.recipientIds.length * Constants.ENCRYPTION.RECIPIENT_ID_SIZE
);
```

### 3. Constants Inheritance

**Before (v3.6.x):**

```typescript
// node-ecies Constants had duplicate properties
export const Constants = {
  OBJECT_ID_LENGTH: 12,
  idProvider: ...,
  // ... other duplicates from ecies-lib
  PBKDF2: ..., // Node-specific
};
```

**After (v3.7.x):**

```typescript
// node-ecies Constants properly extends base
export const Constants: IConstants = Object.freeze({
  ...BaseConstants, // Inherited from ecies-lib
  PBKDF2: ..., // Only node-specific additions
  WRAPPED_KEY: ...,
  KEYRING: ...,
  ENCRYPTION: ...,
} as const);
```

### 4. Frozen ENCRYPTION Constant

The `ENCRYPTION` constant is now set at module initialization and is frozen:

```typescript
// v3.7.x - ENCRYPTION is frozen
const DEFAULT_ID_PROVIDER = new ObjectIdProvider();

export const ENCRYPTION: IEncryptionConsts = Object.freeze({
  ENCRYPTION_TYPE_SIZE: 1 as const,
  RECIPIENT_ID_SIZE: DEFAULT_ID_PROVIDER.byteLength, // Set at init
} as const);
```

**Important:** For runtime configurations, use `config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE` which is auto-synced by ecies-lib's createRuntimeConfiguration().

---

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
yarn add @digitaldefiance/node-ecies-lib@^3.7.0
# or
npm install @digitaldefiance/node-ecies-lib@^3.7.0
```

This will also update `@digitaldefiance/ecies-lib` to v3.7.0.

### Step 2: Identify Your Current Recipient ID Size

Determine what size you're currently using:

- **12 bytes** → Use `ObjectIdProvider` (default, MongoDB compatible)
- **16 bytes** → Use `GuidV4Provider` or `UuidProvider`
- **Custom** → Use `CustomIdProvider` with your custom size

### Step 3: Update Constants References

Find all uses of `Constants.OBJECT_ID_LENGTH`:

```typescript
// FIND THIS PATTERN:
Buffer.alloc(Constants.OBJECT_ID_LENGTH)
new Uint8Array(Constants.OBJECT_ID_LENGTH)
Constants.OBJECT_ID_LENGTH

// REPLACE WITH:
Buffer.alloc(Constants.idProvider.byteLength)
new Uint8Array(Constants.idProvider.byteLength)
Constants.ENCRYPTION.RECIPIENT_ID_SIZE
```

### Step 4: Update Configuration Code

Find all places where you create custom configurations:

```typescript
// FIND THIS PATTERN:
import { Constants } from '@digitaldefiance/node-ecies-lib';
Constants.OBJECT_ID_LENGTH = 32; // Trying to modify frozen constant

// REPLACE WITH:
import { 
  registerNodeRuntimeConfiguration, 
  Legacy32ByteProvider 
} from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new Legacy32ByteProvider(),
});
```

### Step 5: Update Recipient ID Generation

Find all places where you generate recipient IDs:

```typescript
// FIND THIS PATTERN:
const id = crypto.randomBytes(12);
const id = Buffer.alloc(12);

// REPLACE WITH:
const id = Constants.idProvider.generate();
// OR with custom config:
const id = config.idProvider.generate();

// Note: Returns Uint8Array, convert to Buffer if needed:
const bufferId = Buffer.from(id);
```

### Step 6: Update Multi-Recipient Operations

If you directly use multi-recipient services:

```typescript
// BEFORE:
import { MultiRecipient, Constants } from '@digitaldefiance/node-ecies-lib';

const headerSize = 
  1 + // encryption type
  12 + // recipient ID (hardcoded)
  Constants.ENCRYPTION.IV_SIZE;

// AFTER:
const headerSize = 
  1 + // encryption type
  Constants.ENCRYPTION.RECIPIENT_ID_SIZE + // dynamic
  Constants.ENCRYPTION.IV_SIZE;
```

### Step 7: Run Tests

```bash
yarn test
# or
npx nx test digitaldefiance-node-ecies-lib
```

Fix any failing tests by following the patterns above.

---

## ID Provider Selection

### ObjectIdProvider (Default - 12 bytes)

**Use When:**

- Using MongoDB ObjectIDs
- Need compact recipient IDs
- Default choice for Node.js applications

**Example:**

```typescript
import { ObjectIdProvider } from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new ObjectIdProvider(),
});

// Generate IDs:
const id = config.idProvider.generate(); // 12-byte Uint8Array
const bufferId = Buffer.from(id); // Convert to Buffer
```

### GuidV4Provider (16 bytes)

**Use When:**

- Need RFC 4122 compliant GUIDs
- Cross-platform compatibility with .NET/Windows
- Want standard GUID format

**Example:**

```typescript
import { GuidV4Provider } from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(),
});

// Works with both binary and string formats:
const id = config.idProvider.generate(); // 16-byte Uint8Array
const guidString = config.idProvider.serialize(id); // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
```

### UuidProvider (16 bytes)

**Use When:**

- Need UUIDv4 with dash separators
- Standard UUID format required
- Similar to GUID but with standard formatting

**Example:**

```typescript
import { UuidProvider } from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new UuidProvider(),
});
```

<!-- Legacy32ByteProvider (32 bytes) support has been removed. Migration to supported providers is required. -->

### CustomIdProvider (1-255 bytes)

**Use When:**

- Need custom ID format
- Specific size requirements
- Special ID generation logic

**Example:**

```typescript
import { CustomIdProvider } from '@digitaldefiance/node-ecies-lib';

const config = registerNodeRuntimeConfiguration({
  idProvider: new CustomIdProvider(24), // 24-byte IDs
});
```

---

## Node.js-Specific Considerations

### Buffer vs Uint8Array

ID providers return `Uint8Array` for browser compatibility. Convert to `Buffer` when needed:

```typescript
const id = config.idProvider.generate(); // Uint8Array

// Convert to Buffer:
const bufferId = Buffer.from(id);

// Or use directly (Buffer extends Uint8Array):
someFunction(id); // Works if function accepts Uint8Array
```

### Crypto Module

Node.js uses the native `crypto` module for random generation:

```typescript
import { randomBytes } from 'crypto';

class MyNodeProvider extends BaseIdProvider {
  generate(): Uint8Array {
    return new Uint8Array(randomBytes(this.byteLength));
  }
}
```

### File System Operations

When working with encrypted files:

```typescript
import { readFile, writeFile } from 'fs/promises';
import { MultiRecipient, Constants } from '@digitaldefiance/node-ecies-lib';

// Encrypt file
const data = await readFile('input.txt');
const encrypted = await MultiRecipient.encrypt(data, recipientKeys);
await writeFile('output.enc', encrypted);

// Decrypt file
const encryptedData = await readFile('output.enc');
const decrypted = await MultiRecipient.decrypt(encryptedData, privateKey);
await writeFile('decrypted.txt', decrypted);
```

### Stream Processing

For large files, use streaming:

```typescript
import { createReadStream, createWriteStream } from 'fs';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

const ecies = new ECIESService();

// Stream encryption
const readStream = createReadStream('large-file.bin');
const writeStream = createWriteStream('large-file.enc');

for await (const chunk of readStream) {
  const encrypted = await ecies.encrypt(chunk, publicKey);
  writeStream.write(encrypted);
}

writeStream.end();
```

### Cross-Platform Binary Compatibility

node-ecies-lib and ecies-lib produce **binary-compatible** encrypted data:

```typescript
// Encrypt in Node.js:
import { MultiRecipient } from '@digitaldefiance/node-ecies-lib';
const encrypted = await MultiRecipient.encrypt(data, keys);

// Decrypt in browser:
import { MultiRecipient } from '@digitaldefiance/ecies-lib';
const decrypted = await MultiRecipient.decrypt(encrypted, privateKey);

// Both directions work!
```

**Important:** Use the same ID provider on both sides:

```typescript
// Node.js
const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(),
});

// Browser
const config = createRuntimeConfiguration({
  idProvider: new GuidV4Provider(), // Must match!
});
```

---

## Testing Your Migration

### Unit Tests

Update your tests to use ID providers:

```typescript
import { ObjectIdProvider } from '@digitaldefiance/node-ecies-lib';

describe('Node ECIES Encryption', () => {
  const provider = new ObjectIdProvider();
  
  it('should encrypt with generated recipient IDs', async () => {
    const recipientId = provider.generate();
    expect(recipientId.length).toBe(provider.byteLength);
    
    const encrypted = await MultiRecipient.encrypt(
      Buffer.from('test data'),
      [{ recipientId, publicKey }]
    );
    expect(encrypted).toBeInstanceOf(Buffer);
  });
});
```

### Integration Tests

Test cross-provider compatibility:

```typescript
import { 
  ObjectIdProvider, 
  GuidV4Provider,
  registerNodeRuntimeConfiguration 
} from '@digitaldefiance/node-ecies-lib';

describe('Cross-Provider Node Tests', () => {
  it('should work with different ID providers', async () => {
    const config1 = registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
    
    const encrypted = await encrypt(data, publicKey, config1);
    
    const config2 = registerNodeRuntimeConfiguration({
      idProvider: new GuidV4Provider(),
    });
    
    // Decryption works regardless of provider
    const decrypted = await decrypt(encrypted, privateKey, config2);
    expect(decrypted).toEqual(data);
  });
});
```

### Cross-Platform Tests

Test Node.js ↔ Browser compatibility:

```typescript
describe('Node-Browser Compatibility', () => {
  it('should decrypt browser-encrypted data in Node.js', async () => {
    // Load data encrypted by browser ecies-lib
    const browserEncrypted = await loadBrowserEncryptedData();
    
    const config = registerNodeRuntimeConfiguration({
      idProvider: new GuidV4Provider(), // Match browser config
    });
    
    const decrypted = await MultiRecipient.decrypt(
      browserEncrypted,
      privateKey,
      config
    );
    
    expect(decrypted.toString()).toBe('test data');
  });
  
  it('should decrypt node-encrypted data in browser', async () => {
    const data = Buffer.from('test data');
    const encrypted = await MultiRecipient.encrypt(data, keys);
    
    // Send to browser for decryption
    // Browser should be able to decrypt this
    expect(encrypted).toBeInstanceOf(Buffer);
  });
});
```

### Regression Tests

If you have legacy data encrypted with unsupported 32-byte IDs, migration to a supported provider is required. Decryption of such data is no longer supported in v3.7.x.

---

## Troubleshooting

### Problem: "Cannot read property 'OBJECT_ID_LENGTH' of undefined"

**Cause:** `OBJECT_ID_LENGTH` removed from Constants.

**Solution:**

```typescript
// ❌ DON'T use removed constant
Buffer.alloc(Constants.OBJECT_ID_LENGTH)

// ✅ DO use idProvider or ENCRYPTION constant
Buffer.alloc(Constants.idProvider.byteLength)
Buffer.alloc(Constants.ENCRYPTION.RECIPIENT_ID_SIZE)
```

### Problem: "Configuration validation failed: RecipientIdConsistency"

**Cause:** Mismatch between ID provider size and other constants.

**Solution:**

```typescript
// ❌ DON'T manually set size constants
const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(),
  MEMBER_ID_LENGTH: 12, // Wrong!
});

// ✅ DO let auto-sync handle it
const config = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(), // All sizes auto-synced
});
```

### Problem: "TypeError: Cannot assign to read only property"

**Cause:** Trying to modify frozen ENCRYPTION constant.

**Solution:**

```typescript
// ❌ DON'T try to modify frozen constant
Constants.ENCRYPTION.RECIPIENT_ID_SIZE = 32;

// ✅ DO create runtime configuration
const config = registerNodeRuntimeConfiguration({
  idProvider: new Legacy32ByteProvider(),
});

// Use runtime config values
config.ECIES.MULTIPLE.RECIPIENT_ID_SIZE; // 32
```

### Problem: Type errors with Buffer vs Uint8Array

**Cause:** ID providers return Uint8Array, not Buffer.

**Solution:**

```typescript
// ❌ DON'T assume Buffer
const id: Buffer = provider.generate(); // Type error

// ✅ DO convert when needed
const id = provider.generate(); // Uint8Array
const bufferId = Buffer.from(id); // Convert to Buffer

// OR accept Uint8Array
function handleId(id: Uint8Array) { ... }
```

### Problem: "Invalid recipient ID length" in multi-recipient operations

**Cause:** Using hardcoded size that doesn't match ID provider.

**Solution:**

```typescript
// ❌ DON'T hardcode sizes
if (id.length !== 12) { ... }

// ✅ DO use provider's byteLength
if (id.length !== config.idProvider.byteLength) { ... }
```

### Problem: Cross-platform decryption fails

**Cause:** Different ID providers used on Node.js vs browser.

**Solution:**

```typescript
// Ensure both sides use same provider:

// Node.js
const nodeConfig = registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider(), // 16 bytes
});

// Browser
const browserConfig = createRuntimeConfiguration({
  idProvider: new GuidV4Provider(), // Must match!
});
```

---

## Advanced Topics

### Creating Node.js-Specific ID Providers

Leverage Node.js crypto for custom providers:

```typescript
import { randomBytes } from 'crypto';
import { BaseIdProvider } from '@digitaldefiance/node-ecies-lib';

class NodeCustomProvider extends BaseIdProvider {
  constructor() {
    super('NodeCustom', 20, 'Node.js 20-byte ID format');
  }
  
  generate(): Uint8Array {
    // Use Node.js crypto
    return new Uint8Array(randomBytes(20));
  }
  
  validate(id: Uint8Array): boolean {
    return id.length === 20;
  }
  
  serialize(id: Uint8Array): string {
    return Buffer.from(id).toString('hex');
  }
  
  deserialize(str: string): Uint8Array {
    return new Uint8Array(Buffer.from(str, 'hex'));
  }
}
```

### Performance Optimization

For high-throughput applications:

```typescript
import { ObjectIdProvider } from '@digitaldefiance/node-ecies-lib';

// Reuse provider instance
const provider = new ObjectIdProvider();

// Batch ID generation
const ids = Array.from({ length: 1000 }, () => provider.generate());

// Use Buffer pooling for large operations
const idPool = Buffer.allocUnsafe(provider.byteLength * 1000);
for (let i = 0; i < 1000; i++) {
  const id = provider.generate();
  Buffer.from(id).copy(idPool, i * provider.byteLength);
}
```

### Persistent Configuration

Store configuration in environment:

```typescript
// .env
ECIES_ID_PROVIDER=GuidV4Provider
ECIES_ID_SIZE=16

// config.ts
import { 
  ObjectIdProvider, 
  GuidV4Provider,
  UuidProvider
} from '@digitaldefiance/node-ecies-lib';

function getProviderFromEnv() {
  switch (process.env.ECIES_ID_PROVIDER) {
    case 'ObjectIdProvider':
      return new ObjectIdProvider();
    case 'GuidV4Provider':
      return new GuidV4Provider();
    case 'UuidProvider':
      return new UuidProvider();
    default:
      return new ObjectIdProvider(); // Default
  }
}

const config = registerNodeRuntimeConfiguration({
  idProvider: getProviderFromEnv(),
});
```

---

## Migration Checklist

- [ ] Updated `@digitaldefiance/node-ecies-lib` to v3.7.0+
- [ ] Identified current recipient ID size(s)
- [ ] Replaced `Constants.OBJECT_ID_LENGTH` references
- [ ] Updated recipient ID generation to use `idProvider.generate()`
- [ ] Updated recipient ID validation to use `idProvider.byteLength`
- [ ] Converted Uint8Array to Buffer where needed
- [ ] Updated tests to use ID providers
- [ ] All tests passing
- [ ] Tested backward compatibility with existing encrypted data
- [ ] Tested cross-platform compatibility (if using browser ecies-lib)
- [ ] Updated documentation/comments
- [ ] Deployed and verified in production

---

## Need Help?

- **Base Library Documentation:** See ecies-lib [MIGRATION_GUIDE_v3.7.md](../../digitaldefiance-ecies-lib/docs/MIGRATION_GUIDE_v3.7.md)
- **ID Provider Architecture:** See [ID_PROVIDER_ARCHITECTURE.md](../../digitaldefiance-ecies-lib/docs/ID_PROVIDER_ARCHITECTURE.md)
- **Examples:** Check Node.js examples in [examples/node/](../examples/node/)
- **Issues:** [GitHub Issues](https://github.com/digitaldefiance/node-ecies-lib/issues)

---

## Summary

v3.7.0 brings the same ID provider flexibility to Node.js while maintaining:

1. **Cross-Platform Binary Compatibility** - Node.js and browser implementations encrypt/decrypt each other's data
2. **Node.js-Specific Optimizations** - Native crypto module, Buffer support, streaming
3. **Constants Inheritance** - Properly extends ecies-lib base constants
4. **Invariant Validation** - Catches mismatches at configuration time
5. **Backward Compatible** - Default behavior unchanged

Most Node.js applications need minimal changes, and the new system prevents entire classes of bugs while enabling cross-platform encryption!
