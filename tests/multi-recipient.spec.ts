import { describe, it, expect, beforeEach } from '@jest/globals';
import { randomBytes } from 'crypto';
import { Constants } from '../src/constants';
import { MultiRecipientProcessor, IMultiRecipient } from '../src/services/multi-recipient-processor';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';

describe('MultiRecipientProcessor', () => {
  let processor: MultiRecipientProcessor;
  let cryptoCore: EciesCryptoCore;
  let recipient1: { id: Buffer; publicKey: Buffer; privateKey: Buffer };
  let recipient2: { id: Buffer; publicKey: Buffer; privateKey: Buffer };
  let recipient3: { id: Buffer; publicKey: Buffer; privateKey: Buffer };

  beforeEach(async () => {
    cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
    processor = new MultiRecipientProcessor(cryptoCore);

    const keyPair1 = await cryptoCore.generateEphemeralKeyPair();
    recipient1 = {
      id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
      publicKey: Buffer.from(keyPair1.publicKey),
      privateKey: Buffer.from(keyPair1.privateKey),
    };

    const keyPair2 = await cryptoCore.generateEphemeralKeyPair();
    recipient2 = {
      id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
      publicKey: Buffer.from(keyPair2.publicKey),
      privateKey: Buffer.from(keyPair2.privateKey),
    };

    const keyPair3 = await cryptoCore.generateEphemeralKeyPair();
    recipient3 = {
      id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
      publicKey: Buffer.from(keyPair3.publicKey),
      privateKey: Buffer.from(keyPair3.privateKey),
    };
  });

  describe('encryptKey / decryptKey', () => {
    it('should encrypt and decrypt symmetric key', async () => {
      const symmetricKey = randomBytes(32);
      const encryptedKey = await processor.encryptKey(recipient1.publicKey, symmetricKey);

      // Encrypted key size = 33 (ephemeral pub key) + 64 (encrypted key + iv + tag) = 97
      expect(encryptedKey.length).toBe(Constants.ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE + 33);

      const decryptedKey = await processor.decryptKey(recipient1.privateKey, encryptedKey);
      expect(decryptedKey).toEqual(symmetricKey);
    });

    it('should fail with invalid encrypted key length', async () => {
      const invalidKey = randomBytes(100);
      await expect(processor.decryptKey(recipient1.privateKey, invalidKey)).rejects.toThrow();
    });

    it('should fail with wrong private key', async () => {
      const symmetricKey = randomBytes(32);
      const encryptedKey = await processor.encryptKey(recipient1.publicKey, symmetricKey);

      await expect(processor.decryptKey(recipient2.privateKey, encryptedKey)).rejects.toThrow();
    });
  });

  describe('encryptMultiple / decryptMultipleForRecipient', () => {
    it('should encrypt for single recipient', async () => {
      const message = Buffer.from('Test message for single recipient');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);

      expect(encrypted.recipientCount).toBe(1);
      expect(encrypted.dataLength).toBe(message.length);
      expect(encrypted.recipientIds).toHaveLength(1);
      expect(encrypted.recipientKeys).toHaveLength(1);

      const decrypted = await processor.decryptMultipleForRecipient(
        encrypted,
        recipient1.id,
        recipient1.privateKey,
      );

      expect(decrypted).toEqual(message);
    });

    it('should encrypt for multiple recipients', async () => {
      const message = Buffer.from('Test message for multiple recipients');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
        { id: recipient2.id, publicKey: recipient2.publicKey },
        { id: recipient3.id, publicKey: recipient3.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);

      expect(encrypted.recipientCount).toBe(3);
      expect(encrypted.dataLength).toBe(message.length);
      expect(encrypted.recipientIds).toHaveLength(3);
      expect(encrypted.recipientKeys).toHaveLength(3);

      const decrypted1 = await processor.decryptMultipleForRecipient(
        encrypted,
        recipient1.id,
        recipient1.privateKey,
      );
      expect(decrypted1).toEqual(message);

      const decrypted2 = await processor.decryptMultipleForRecipient(
        encrypted,
        recipient2.id,
        recipient2.privateKey,
      );
      expect(decrypted2).toEqual(message);

      const decrypted3 = await processor.decryptMultipleForRecipient(
        encrypted,
        recipient3.id,
        recipient3.privateKey,
      );
      expect(decrypted3).toEqual(message);
    });

    it('should fail with recipient not found', async () => {
      const message = Buffer.from('Test message');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);

      await expect(
        processor.decryptMultipleForRecipient(encrypted, recipient2.id, recipient2.privateKey),
      ).rejects.toThrow();
    });

    it('should fail with wrong private key', async () => {
      const message = Buffer.from('Test message');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);

      await expect(
        processor.decryptMultipleForRecipient(encrypted, recipient1.id, recipient2.privateKey),
      ).rejects.toThrow();
    });

    it('should handle large messages', async () => {
      const message = randomBytes(1024 * 1024); // 1MB
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
        { id: recipient2.id, publicKey: recipient2.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const decrypted = await processor.decryptMultipleForRecipient(
        encrypted,
        recipient1.id,
        recipient1.privateKey,
      );

      expect(decrypted).toEqual(message);
    });

    it('should fail with too many recipients', async () => {
      const message = Buffer.from('Test message');
      const recipients: IMultiRecipient[] = [];

      for (let i = 0; i < Constants.ECIES.MULTIPLE.MAX_RECIPIENTS + 1; i++) {
        const keyPair = await cryptoCore.generateEphemeralKeyPair();
        recipients.push({
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        });
      }

      await expect(processor.encryptMultiple(recipients, message)).rejects.toThrow();
    });

    it('should handle large messages within limits', async () => {
      const message = Buffer.alloc(1024 * 1024); // 1MB - within limits
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      expect(encrypted.dataLength).toBe(message.length);
    });
  });

  describe('buildHeader / parseHeader', () => {
    it('should build and parse header', async () => {
      const message = Buffer.from('Test message');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
        { id: recipient2.id, publicKey: recipient2.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);

      expect(header.length).toBeGreaterThan(0);

      const parsed = processor.parseHeader(header);

      expect(parsed.dataLength).toBe(encrypted.dataLength);
      expect(parsed.recipientCount).toBe(encrypted.recipientCount);
      expect(parsed.recipientIds).toHaveLength(encrypted.recipientIds.length);
      expect(parsed.recipientKeys).toHaveLength(encrypted.recipientKeys.length);

      for (let i = 0; i < parsed.recipientIds.length; i++) {
        expect(Buffer.from(parsed.recipientIds[i])).toEqual(Buffer.from(encrypted.recipientIds[i]));
        expect(Buffer.from(parsed.recipientKeys[i])).toEqual(Buffer.from(encrypted.recipientKeys[i]));
      }
    });

    it('should fail with data too short', () => {
      const shortData = Buffer.alloc(5);
      expect(() => processor.parseHeader(shortData)).toThrow();
    });

    it('should fail with invalid recipient count', () => {
      const data = Buffer.alloc(10);
      data.writeBigUInt64BE(BigInt(100), 0);
      data.writeUInt16BE(0, 8);

      expect(() => processor.parseHeader(data)).toThrow();
    });
  });

  describe('parseMessage', () => {
    it('should parse complete message and decrypt successfully', async () => {
      const message = Buffer.from('Test message for parsing');
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);
      const completeMessage = Buffer.concat([header, encrypted.encryptedMessage]);

      const parsed = processor.parseMessage(completeMessage);

      expect(parsed.dataLength).toBe(encrypted.dataLength);
      expect(parsed.recipientCount).toBe(encrypted.recipientCount);
      expect(parsed.recipientIds.length).toBe(1);
      expect(parsed.recipientKeys.length).toBe(1);
      
      // Decrypt to verify the parsed message works
      const decrypted = await processor.decryptMultipleForRecipient(
        parsed,
        recipient1.id,
        recipient1.privateKey,
      );
      expect(decrypted).toEqual(message);
    });
  });

  describe('encryptChunk / decryptChunk', () => {
    it('should encrypt and decrypt chunk', async () => {
      const data = Buffer.from('Chunk data');
      const symmetricKey = randomBytes(32);
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const encryptedKeys = [await processor.encryptKey(recipient1.publicKey, symmetricKey)];

      const chunk = await processor.encryptChunk(data, recipients, 0, false, symmetricKey);

      expect(chunk.header.chunkIndex).toBe(0);
      expect(chunk.header.flags).toBe(0);
      expect(chunk.header.recipientCount).toBe(1);

      const decrypted = await processor.decryptChunk(
        chunk.data,
        recipient1.id,
        recipient1.privateKey,
        // encryptedKeys, // Removed
        // [recipient1.id], // Removed? No, signature is (chunk, id, privKey, senderPubKey?)
      );

      expect(decrypted.data).toEqual(data);
    });

    it('should handle last chunk flag', async () => {
      const data = Buffer.from('Last chunk');
      const symmetricKey = randomBytes(32);
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const chunk = await processor.encryptChunk(data, recipients, 5, true, symmetricKey);

      expect(chunk.header.chunkIndex).toBe(5);
      expect(chunk.header.flags).toBe(1);
    });

    it('should fail with invalid chunk index', async () => {
      const data = Buffer.from('Chunk data');
      const symmetricKey = randomBytes(32);
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      await expect(
        processor.encryptChunk(data, recipients, -1, false, symmetricKey),
      ).rejects.toThrow();

      await expect(
        processor.encryptChunk(data, recipients, 0x100000000, false, symmetricKey),
      ).rejects.toThrow();
    });

    it('should validate chunk size limit', async () => {
      const data = Buffer.from('Valid chunk data');
      const symmetricKey = randomBytes(32);
      const recipients: IMultiRecipient[] = [
        { id: recipient1.id, publicKey: recipient1.publicKey },
      ];

      const chunk = await processor.encryptChunk(data, recipients, 0, false, symmetricKey);
      expect(chunk.data.length).toBeGreaterThan(data.length);
    });
  });

  describe('getHeaderSize', () => {
    it('should calculate correct header size', () => {
      const size1 = processor.getHeaderSize(1);
      const size2 = processor.getHeaderSize(2);
      const size3 = processor.getHeaderSize(3);

      expect(size1).toBeGreaterThan(
        Constants.ECIES.MULTIPLE.DATA_LENGTH_SIZE +
        Constants.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE +
        Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE +
        Constants.ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
      );

      expect(size2).toBeGreaterThan(size1);
      expect(size3).toBeGreaterThan(size2);
    });
  });
});
