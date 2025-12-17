import { describe, expect, it } from '@jest/globals';
import { randomBytes } from 'crypto';

import { Constants } from '../src/constants';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService } from '../src/services/ecies/service';
import { MultiRecipientProcessor } from '../src/services/multi-recipient-processor';

describe('Cross-Platform Compatibility', () => {
  describe('Node ↔ Browser Key Format', () => {
    it('should generate keys in browser-compatible format', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      expect(keyPair.publicKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(keyPair.publicKey[0]);
      expect(keyPair.privateKey.length).toBe(32);
    });

    it('should normalize public keys consistently', () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });

      const rawKey = randomBytes(64);
      const prefixedKey = Buffer.concat([Buffer.from([0x04]), rawKey]);

      const normalized1 = cryptoCore.normalizePublicKey(
        Buffer.from(prefixedKey)
      );
      // const normalized2 = cryptoCore.normalizePublicKey(Buffer.from(prefixedKey));

      // expect(normalized1).toEqual(normalized2);
      expect(normalized1.length).toBe(65);
      expect(normalized1[0]).toBe(0x04);
    });
  });

  describe('Single-Recipient Encryption Compatibility', () => {
    it('should produce consistent encryption format', async () => {
      const ecies = new ECIESService({ curveName: 'secp256k1' });
      const message = Buffer.from('Test message');

      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message
      );

      expect(encrypted[0]).toBe(1); // Version 1
      expect(encrypted[1]).toBe(1); // CipherSuite 1
      expect(encrypted[2]).toBe(66); // Single encryption type (66)
      // Overhead reduced due to compressed keys (33 bytes vs 65 bytes)
      // Old overhead: ~106 bytes. New overhead: ~74 bytes.
      expect(encrypted.length).toBeGreaterThanOrEqual(message.length + 70);
    });

    it('should decrypt data encrypted with same format', async () => {
      const ecies = new ECIESService({ curveName: 'secp256k1' });
      const message = Buffer.from('Cross-platform test');

      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message
      );
      const decrypted = ecies.decryptSimpleOrSingleWithHeader(
        false,
        keyPair.privateKey,
        encrypted
      );

      expect(decrypted).toEqual(message);
    });

    it('should handle simple encryption format', async () => {
      const ecies = new ECIESService({ curveName: 'secp256k1' });
      const message = Buffer.from('Simple format test');

      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const encrypted = ecies.encryptSimpleOrSingle(
        true,
        keyPair.publicKey,
        message
      );
      const decrypted = ecies.decryptSimpleOrSingleWithHeader(
        true,
        keyPair.privateKey,
        encrypted
      );

      expect(decrypted).toEqual(message);
      expect(encrypted[0]).toBe(1); // Version 1
      expect(encrypted[1]).toBe(1); // CipherSuite 1
      expect(encrypted[2]).toBe(33); // Simple encryption type (33)
    });
  });

  describe('Multi-Recipient Encryption Compatibility', () => {
    it('should produce consistent multi-recipient format', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const message = Buffer.from('Multi-recipient test');
      const keyPair1 = await cryptoCore.generateEphemeralKeyPair();
      const keyPair2 = await cryptoCore.generateEphemeralKeyPair();

      const recipients = [
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair1.publicKey),
        },
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair2.publicKey),
        },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);

      expect(encrypted.recipientCount).toBe(2);
      expect(encrypted.recipientIds).toHaveLength(2);
      expect(encrypted.recipientKeys).toHaveLength(2);
      expect(encrypted.dataLength).toBe(message.length);
    });

    it('should build header in consistent format', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const message = Buffer.from('Header format test');
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      const recipients = [
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);

      // Offset: Version(1) + Suite(1) + Type(1) + PubKey(33) = 36
      const combinedLength = header.readBigUInt64BE(36);
      // Mask out the recipientIdSize (top 8 bits)
      const dataLength = Number(combinedLength & 0x00ffffffffffffffn);
      const recipientCount = header.readUInt16BE(44);

      expect(dataLength).toBe(message.length);
      expect(recipientCount).toBe(1);
    });

    it('should parse header consistently', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const message = Buffer.from('Parse test');
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      const recipients = [
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);
      const parsed = processor.parseHeader(header);

      expect(parsed.dataLength).toBe(encrypted.dataLength);
      expect(parsed.recipientCount).toBe(encrypted.recipientCount);
      expect(parsed.recipientIds[0]).toEqual(encrypted.recipientIds[0]);
      expect(parsed.recipientKeys[0]).toEqual(encrypted.recipientKeys[0]);
    });
  });

  describe('Streaming Chunk Format Compatibility', () => {
    it('should produce consistent chunk format', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const data = Buffer.from('Chunk data');
      const symmetricKey = randomBytes(32);
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      const recipients = [
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      const chunk = await processor.encryptChunk(
        data,
        recipients,
        0,
        false,
        symmetricKey
      );

      expect(chunk.header.chunkIndex).toBe(0);
      expect(chunk.header.flags).toBe(0);
      expect(chunk.header.recipientCount).toBe(1);
      expect(chunk.data.length).toBeGreaterThan(data.length);
    });

    it('should handle chunk encryption/decryption consistently', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const data = Buffer.from('Chunk round-trip test');
      const symmetricKey = randomBytes(32);
      const keyPair = await cryptoCore.generateEphemeralKeyPair();
      const recipientId = randomBytes(
        Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE
      );

      const recipients = [
        { id: recipientId, publicKey: Buffer.from(keyPair.publicKey) },
      ];

      const encryptedKey = await processor.encryptKey(
        Buffer.from(keyPair.publicKey),
        symmetricKey
      );

      const chunk = await processor.encryptChunk(
        data,
        recipients,
        0,
        false,
        symmetricKey
      );

      const decrypted = await processor.decryptChunk(
        chunk.data,
        recipientId,
        Buffer.from(keyPair.privateKey)
      );

      expect(decrypted.data).toEqual(data);
    });
  });

  describe('Binary Format Consistency', () => {
    it('should use consistent byte ordering (big-endian)', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const processor = new MultiRecipientProcessor(cryptoCore);

      const message = Buffer.from('Byte order test');
      const keyPair = await cryptoCore.generateEphemeralKeyPair();

      const recipients = [
        {
          id: randomBytes(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);

      // Offset: Version(1) + Suite(1) + Type(1) + PubKey(33) = 36
      const combinedLength = header.readBigUInt64BE(36);
      // Mask out the recipientIdSize (top 8 bits)
      const dataLength = Number(combinedLength & 0x00ffffffffffffffn);
      expect(dataLength).toBe(message.length);

      // Offset: 36 + 8 = 44
      const recipientCountBE = header.readUInt16BE(44);
      expect(recipientCountBE).toBe(1);
    });

    it('should maintain Buffer/Uint8Array compatibility', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      const uint8 = new Uint8Array([1, 2, 3, 4]);

      expect(Buffer.from(uint8)).toEqual(buffer);
      expect(new Uint8Array(buffer)).toEqual(uint8);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should throw consistent errors for invalid data', async () => {
      const ecies = new ECIESService({ curveName: 'secp256k1' });
      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);

      const emptyData = Buffer.alloc(0);
      expect(() =>
        ecies.encryptSimpleOrSingle(false, keyPair.publicKey, emptyData)
      ).toThrow();

      const invalidEncrypted = Buffer.alloc(10);
      expect(() =>
        ecies.decryptSimpleOrSingleWithHeader(
          false,
          keyPair.privateKey,
          invalidEncrypted
        )
      ).toThrow();
    });

    it('should validate key formats consistently', async () => {
      const ecies = new ECIESService({ curveName: 'secp256k1' });
      const message = Buffer.from('Test');

      const invalidPublicKey = Buffer.alloc(32);
      expect(() =>
        ecies.encryptSimpleOrSingle(false, invalidPublicKey, message)
      ).toThrow();

      const mnemonic = ecies.generateNewMnemonic();
      const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
      const encrypted = ecies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message
      );

      const invalidPrivateKey = Buffer.alloc(16);
      expect(() =>
        ecies.decryptSimpleOrSingleWithHeader(
          false,
          invalidPrivateKey,
          encrypted
        )
      ).toThrow();
    });
  });
});
