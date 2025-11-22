# Node-ECIES Implementation Guide: Recipient ID Size in Header

## Overview

We have updated the `digitaldefiance-ecies-lib` (browser/common) to store the **Recipient ID Size** within the Multi-Recipient header. This allows the parser to determine the size of Recipient IDs dynamically without relying on a pre-configured value, enabling better interoperability and flexibility.

This guide outlines the steps to implement the equivalent functionality in `digitaldefiance-node-ecies-lib`.

## The Change

In the Multi-Recipient header, the **Data Length** field is 8 bytes (64 bits). Since the maximum supported data size is well below $2^{53}-1$ (JavaScript's safe integer limit), the most significant byte (MSB) of this 8-byte field is always 0 in legacy headers.

We now use this **Most Significant Byte (MSB)** to store the `RecipientIdSize`.

### Header Structure (Multi-Recipient)

| Field | Size | Description |
|Data Length| 8 bytes | **NEW:** MSB = Recipient ID Size, Lower 7 bytes = Data Length |
|Recipient Count| 2 bytes | Number of recipients ($N$) |
|Recipient IDs| $N \times Size$ | List of Recipient IDs (Size determined by MSB) |
|Encrypted Keys| $N \times 80$ | List of Encrypted Symmetric Keys |

## Implementation Steps

### 1. Update `EciesStringKey` Enum

Add the new error key for validation.

**File:** `src/enumerations/ecies-string-key.ts`

```typescript
export enum EciesStringKey {
  // ... existing keys
  Error_ECIESError_RecipientIdSizeTooLargeTemplate = 'Error_ECIESError_RecipientIdSizeTooLargeTemplate',
}
```

### 2. Update Translations

Add the English translation string.

**File:** `src/translations/en-US.ts`

```typescript
export const englishTranslations: Record<EciesStringKey, string | PluralString> = {
  // ... existing translations
  [EciesStringKey.Error_ECIESError_RecipientIdSizeTooLargeTemplate]: 'Recipient ID size {size} exceeds maximum of 255 bytes',
};
```

### 3. Update `EciesMultiRecipient.buildHeader`

Modify the `buildHeader` method to encode the `recipientIdSize` into the MSB of the data length field.

**File:** `src/services/ecies/multi-recipient.ts` (or equivalent)

```typescript
public buildHeader(data: IMultiEncryptedMessage): Buffer {
  // ... existing validation ...

  // NEW: Validate Recipient ID Size
  const recipientIdSize = this.eciesConsts.MULTIPLE.RECIPIENT_ID_SIZE;
  if (recipientIdSize > 255) {
    const engine = getEciesI18nEngine();
    throw new Error(engine.translate(EciesComponentId, EciesStringKey.Error_ECIESError_RecipientIdSizeTooLargeTemplate, { size: recipientIdSize }));
  }

  // NEW: Encode Size into MSB
  const dataLengthBigInt = BigInt(data.dataLength);
  const recipientIdSizeBigInt = BigInt(recipientIdSize);
  const combinedLength = (recipientIdSizeBigInt << 56n) | dataLengthBigInt;

  const dataLengthBuffer = Buffer.alloc(8);
  dataLengthBuffer.writeBigUInt64BE(combinedLength, 0);

  // ... rest of the method (recipient count, IDs, keys) ...
}
```

### 4. Update `EciesMultiRecipient.parseHeader`

Modify the `parseHeader` method to extract the `recipientIdSize` from the MSB and use it for parsing.

**File:** `src/services/ecies/multi-recipient.ts` (or equivalent)

```typescript
public parseHeader(data: Buffer): IMultiEncryptedParsedHeader {
  // ... existing checks ...

  let offset = 0;

  // NEW: Read Combined Length
  const combinedLength = data.readBigUInt64BE(offset);
  offset += 8;

  // NEW: Extract Components
  const storedRecipientIdSize = Number(combinedLength >> 56n);
  const dataLength = Number(combinedLength & 0x00FFFFFFFFFFFFFFn);

  // ... validate dataLength ...

  // NEW: Determine Recipient ID Size (Fallback for Legacy)
  const recipientIdSize = storedRecipientIdSize > 0 
    ? storedRecipientIdSize 
    : this.eciesConsts.MULTIPLE.RECIPIENT_ID_SIZE;

  // ... read recipient count ...

  // NEW: Read Recipient IDs using dynamic size
  const recipientIds: Buffer[] = [];
  for (let i = 0; i < recipientCount; i++) {
    recipientIds.push(
      data.subarray(offset, offset + recipientIdSize),
    );
    offset += recipientIdSize;
  }

  // ... read encrypted keys ...
}
```

## Testing

Ensure to add tests covering:

1. **Encoding:** Verify that `buildHeader` correctly sets the MSB.
2. **Decoding:** Verify that `parseHeader` correctly extracts the size and parses the IDs.
3. **Legacy Compatibility:** Verify that headers with MSB=0 (created by older versions) are still parsed correctly using the configured default ID size.
4. **Validation:** Verify that an ID size > 255 throws an error.
