# Migration Guide: Strong Typing for ID Providers (v4.10.7)

This guide helps you migrate from the traditional ID provider usage to the new strongly-typed system introduced in v4.10.7.

## Overview

The new typed configuration system eliminates manual type casting and provides compile-time type safety for ID provider operations.

## Before (v4.10.6 and earlier)

```typescript
import { getNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';

const Constants = getNodeRuntimeConfiguration();
const id = Constants.idProvider.generate(); // Returns Uint8Array (no strong typing)
const obj = Constants.idProvider.fromBytes(bytes); // Returns unknown (requires casting)

// Manual casting required
const typedObj = obj as ObjectId;
```

## After (v4.10.7+)

### Option 1: Enhanced Provider (Drop-in Replacement)

```typescript
import { getEnhancedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';

const provider = getEnhancedNodeIdProvider<ObjectId>();
const id = provider.generateTyped(); // Returns ObjectId (strongly typed)
const obj = provider.fromBytesTyped(bytes); // Returns ObjectId (no casting needed)

// Original methods still work for backward compatibility
const rawBytes = provider.generate(); // Returns Uint8Array
```

### Option 2: Simple Typed Provider (Clean API)

```typescript
import { getTypedNodeIdProvider } from '@digitaldefiance/node-ecies-lib';

const provider = getTypedNodeIdProvider<ObjectId>();
const id = provider.generateTyped(); // Returns ObjectId
const bytes = provider.toBytesTyped(id); // Type-safe conversion
const restored = provider.fromBytesTyped(bytes); // Type-safe restoration
```

### Option 3: Complete Typed Configuration

```typescript
import { createNodeObjectIdConfiguration } from '@digitaldefiance/node-ecies-lib';

const config = createNodeObjectIdConfiguration();
const objectId = config.generateId(); // Returns ObjectId (strongly typed)
const bytes = config.idToBytes(objectId); // Convert to bytes
const restored = config.idFromBytes(bytes); // Convert back to ObjectId

// Access full Node.js runtime configuration
const constants = config.constants; // Complete IConstants with ObjectIdProvider
```

## Migration Examples

### ECIESService Integration

**Before:**
```typescript
import { ECIESService, getNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { ObjectIdProvider } from '@digitaldefiance/ecies-lib';

const config = getNodeRuntimeConfiguration();
const service = new ECIESService(config);
// service.idProvider returns IIdProvider with unknown types
```

**After:**
```typescript
import { ECIESService, createNodeObjectIdConfiguration } from '@digitaldefiance/node-ecies-lib';

const config = createNodeObjectIdConfiguration();
const service = new ECIESService(config.constants);
// service.idProvider is now strongly typed
```

### Member Creation

**Before:**
```typescript
import { Member, ECIESService } from '@digitaldefiance/node-ecies-lib';
import { MemberType, EmailString } from '@digitaldefiance/ecies-lib';

const service = new ECIESService();
const { member } = Member.newMember(service, MemberType.User, 'Alice', new EmailString('alice@example.com'));
// member.id type is not strongly typed
```

**After:**
```typescript
import { Member, ECIESService, createNodeObjectIdConfiguration } from '@digitaldefiance/node-ecies-lib';
import { MemberType, EmailString } from '@digitaldefiance/ecies-lib';

const config = createNodeObjectIdConfiguration();
const service = new ECIESService(config.constants);
const { member } = Member.newMember(service, MemberType.User, 'Alice', new EmailString('alice@example.com'));
// member.id is now strongly typed as ObjectId
```

### Custom ID Providers

**Before:**
```typescript
import { registerNodeRuntimeConfiguration, ECIESService } from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';

registerNodeRuntimeConfiguration({
  idProvider: new GuidV4Provider()
});
const service = new ECIESService();
// No strong typing for GUID operations
```

**After:**
```typescript
import { createNodeTypedConfiguration, ECIESService } from '@digitaldefiance/node-ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/ecies-lib';

const config = createNodeTypedConfiguration<string>({
  idProvider: new GuidV4Provider()
});
const service = new ECIESService(config.constants);
const guidId = config.generateId(); // Returns GUID object (strongly typed)
```

## Updated Core Services

The following core services have been updated to use the enhanced typed providers by default:

### EncryptionStream
```typescript
// Now uses getEnhancedNodeIdProvider<Buffer>() internally
const stream = new EncryptionStream(ecies);
```

### EciesMultiRecipient
```typescript
// Constructor now defaults to enhanced provider
const multiRecipient = new EciesMultiRecipient(cryptoCore);
// Or explicitly pass enhanced provider
const enhancedProvider = getEnhancedNodeIdProvider<Buffer>();
const multiRecipient = new EciesMultiRecipient(cryptoCore, enhancedProvider);
```

### MultiRecipientProcessor
```typescript
// Now uses enhanced provider by default
const processor = new MultiRecipientProcessor(cryptoCore);
```

## Benefits of Migration

1. **Type Safety**: Compile-time type checking eliminates runtime type errors
2. **Better IntelliSense**: IDEs provide better autocomplete and type hints
3. **Reduced Casting**: No more manual `as ObjectId` or `as string` casts
4. **Backward Compatibility**: Enhanced providers include original methods
5. **Cleaner Code**: Less boilerplate and more readable code

## Gradual Migration Strategy

You can migrate gradually:

1. **Phase 1**: Start using enhanced providers in new code
2. **Phase 2**: Update existing services to use typed configurations
3. **Phase 3**: Replace manual casting with typed methods
4. **Phase 4**: Update tests to use typed providers

## Breaking Changes

**None** - The new system is fully backward compatible. All existing code continues to work unchanged.

## Need Help?

- Check the [examples](./examples/typed-configuration-usage.ts) for comprehensive usage patterns
- Review the [test files](./typed-configuration.spec.ts) for detailed examples
- See the [README](../README.md) for complete API documentation

## Summary

The new typed configuration system provides:
- ✅ Strong compile-time type safety
- ✅ Better developer experience
- ✅ Reduced boilerplate code
- ✅ Full backward compatibility
- ✅ Enhanced IDE support

Migrate at your own pace - the old system continues to work while you adopt the new typed approach.