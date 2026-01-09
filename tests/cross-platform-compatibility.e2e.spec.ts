import { Constants } from '@digitaldefiance/ecies-lib';

import { BufferIdProvider } from '../src/lib/id-providers/buffer-provider';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService } from '../src/services/ecies/service';
import { EncryptionStream } from '../src/services/encryption-stream';
import { MultiRecipientProcessor } from '../src/services/multi-recipient-processor';

describe('Cross-Platform Compatibility', () => {
  let nodeEcies: ECIESService;
  let nodeStream: EncryptionStream;

  beforeEach(() => {
    nodeEcies = new ECIESService();
    nodeStream = new EncryptionStream(nodeEcies);
  });

  describe('basic encryption compatibility', () => {
    it('should encrypt in Node and decrypt in Node with same format as browser', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const message = Buffer.from('Cross-platform test message');
      const encrypted = nodeEcies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message,
      );
      const decrypted = nodeEcies.decryptSimpleOrSingleWithHeader(
        false,
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted).toEqual(message);
    });

    it('should produce same encryption format structure', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const message = Buffer.from('Test');
      const encrypted = nodeEcies.encryptSimpleOrSingle(
        false,
        keyPair.publicKey,
        message,
      );

      // Verify structure: version(1) + suite(1) + type(1) + pubkey(33) + iv(12) + tag(16) + length(8) + data
      expect(encrypted.length).toBeGreaterThan(1 + 1 + 1 + 33 + 12 + 16 + 8);
      expect(encrypted[0]).toBe(1); // Version 1
      expect(encrypted[1]).toBe(1); // CipherSuite 1
      expect(encrypted[2]).toBe(66); // Single encryption type (66)
    });
  });

  describe('streaming compatibility', () => {
    it('should produce chunks with binary-compatible header format', async () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const data = Buffer.from('Streaming test data');
      const source = (async function* () {
        yield data;
      })();

      const chunks: Buffer[] = [];
      for await (const chunk of nodeStream.encryptStream(
        source,
        keyPair.publicKey,
      )) {
        chunks.push(chunk.data);

        // Verify chunk structure matches browser format
        expect(chunk.index).toBeGreaterThanOrEqual(0);
        expect(chunk.isLast).toBeDefined();
        expect(chunk.data).toBeInstanceOf(Buffer);

        // Verify chunk header format: 4 bytes index (big-endian) + 1 byte flags
        const chunkIndex = chunk.data.readUInt32BE(0);
        const flags = chunk.data.readUInt8(4);
        expect(chunkIndex).toBe(chunk.index);
        expect(flags).toBe(chunk.isLast ? 1 : 0);

        // Verify encrypted data starts at byte 5
        expect(chunk.data.length).toBeGreaterThan(5);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should use big-endian byte order for chunk index', async () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const data = Buffer.from('Test');
      const source = (async function* () {
        for (let i = 0; i < 3; i++) {
          yield data;
        }
      })();

      let chunkNum = 0;
      for await (const chunk of nodeStream.encryptStream(
        source,
        keyPair.publicKey,
        { chunkSize: 1024 },
      )) {
        // Read as big-endian (network byte order)
        const indexBE = chunk.data.readUInt32BE(0);
        expect(indexBE).toBe(chunkNum);
        chunkNum++;
      }
    });

    it('should set isLast flag correctly in binary format', async () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const data = Buffer.from('Multi-chunk test data');
      const source = (async function* () {
        yield data;
      })();

      const chunks: Buffer[] = [];
      for await (const chunk of nodeStream.encryptStream(
        source,
        keyPair.publicKey,
        { chunkSize: 10 },
      )) {
        chunks.push(chunk.data);
      }

      // All chunks except last should have flag = 0
      for (let i = 0; i < chunks.length - 1; i++) {
        const flags = chunks[i].readUInt8(4);
        expect(flags).toBe(0);
      }

      // Last chunk should have flag = 1
      const lastFlags = chunks[chunks.length - 1].readUInt8(4);
      expect(lastFlags).toBe(1);
    });

    it('should maintain Buffer/Uint8Array compatibility', async () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const data = Buffer.from('Compatibility test');
      const source = (async function* () {
        yield data;
      })();

      for await (const chunk of nodeStream.encryptStream(
        source,
        keyPair.publicKey,
      )) {
        // Verify Buffer can be converted to Uint8Array (browser format)
        const uint8Array = new Uint8Array(chunk.data);
        expect(uint8Array.length).toBe(chunk.data.length);

        // Verify Uint8Array can be converted back to Buffer
        const backToBuffer = Buffer.from(uint8Array);
        expect(backToBuffer).toEqual(chunk.data);
      }
    });

    it('should decrypt chunks encrypted by Node', async () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const originalData = Buffer.from('Round-trip test');
      const encryptSource = (async function* () {
        yield originalData;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of nodeStream.encryptStream(
        encryptSource,
        keyPair.publicKey,
      )) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of nodeStream.decryptStream(
        decryptSource,
        keyPair.privateKey,
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result).toEqual(originalData);
    });
  });

  describe('key format compatibility', () => {
    it('should handle 33-byte compressed public keys', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      expect(keyPair.publicKey.length).toBe(33);
      expect([0x02, 0x03]).toContain(keyPair.publicKey[0]); // Compressed prefix
    });

    it('should handle 32-byte private keys', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();
      const keyPair = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      expect(keyPair.privateKey.length).toBe(32);
    });
  });

  describe('multi-recipient chunk compatibility', () => {
    it('should produce binary-compatible multi-recipient chunks', async () => {
      const mnemonic1 = nodeEcies.generateNewMnemonic();
      const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic1);
      const mnemonic2 = nodeEcies.generateNewMnemonic();
      const keyPair2 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic2);

      const recipients = [
        {
          id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE, 1),
          publicKey: keyPair1.publicKey,
        },
        {
          id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE, 2),
          publicKey: keyPair2.publicKey,
        },
      ];

      const data = Buffer.from('Multi-recipient test');
      const source = (async function* () {
        yield data;
      })();

      for await (const chunk of nodeStream.encryptStreamMultiple(
        source,
        recipients,
      )) {
        // Verify chunk data is Buffer/Uint8Array compatible
        expect(chunk.data).toBeInstanceOf(Buffer);
        expect(chunk.header).toBeDefined();
        expect(chunk.header.recipientCount).toBe(2);

        // Verify can convert to Uint8Array for browser
        const uint8 = new Uint8Array(chunk.data);
        expect(uint8.length).toBe(chunk.data.length);
      }
    });

    it('should use correct byte order for multi-recipient header', async () => {
      const cryptoCore = new EciesCryptoCore({ curveName: 'secp256k1' });
      const idProvider = new BufferIdProvider(
        Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE,
      );
      const processor = new MultiRecipientProcessor(cryptoCore, idProvider);

      const keyPair = await cryptoCore.generateEphemeralKeyPair();
      const recipients = [
        {
          id: Buffer.alloc(Constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE, 1),
          publicKey: Buffer.from(keyPair.publicKey),
        },
      ];

      const message = Buffer.from('Test message');
      const encrypted = await processor.encryptMultiple(recipients, message);
      const header = processor.buildHeader(encrypted);

      // Verify big-endian byte order
      // Offset: Version(1) + Suite(1) + Type(1) + PubKey(33) = 36
      const combinedLength = header.readBigUInt64BE(36);
      // Mask out the recipient ID size (top 8 bits)
      const dataLength = Number(combinedLength & 0x00ffffffffffffffn);
      expect(dataLength).toBe(message.length);

      // Offset: DataLength(8) + 36 = 44
      const recipientCount = header.readUInt16BE(44);
      expect(recipientCount).toBe(1);
    });
  });

  describe('mnemonic compatibility', () => {
    it('should generate valid BIP39 mnemonics', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();

      expect(mnemonic.value).toBeDefined();
      expect(mnemonic.value.split(' ').length).toBe(24); // Default 24 words
    });

    it('should derive same keys from same mnemonic', () => {
      const mnemonic = nodeEcies.generateNewMnemonic();

      const keyPair1 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);
      const keyPair2 = nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      expect(keyPair1.publicKey).toEqual(keyPair2.publicKey);
      expect(keyPair1.privateKey).toEqual(keyPair2.privateKey);
    });
  });
});
