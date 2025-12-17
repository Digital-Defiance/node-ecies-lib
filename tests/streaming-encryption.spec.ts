import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';

import { Constants } from '../src/constants';
import { Member } from '../src/member';
import { ECIESService } from '../src/services/ecies/service';
import { EncryptionStream } from '../src/services/encryption-stream';

describe('Streaming Encryption', () => {
  let ecies: ECIESService;
  let stream: EncryptionStream;
  let publicKey: Buffer;
  let privateKey: Buffer;

  beforeEach(() => {
    ecies = new ECIESService();
    stream = new EncryptionStream(ecies);
    const mnemonic = ecies.generateNewMnemonic();
    const keyPair = ecies.mnemonicToSimpleKeyPair(mnemonic);
    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  describe('basic streaming', () => {
    it('should encrypt and decrypt small data', async () => {
      const data = Buffer.from('Hello, World!');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey)) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBeGreaterThan(0);

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of stream.decryptStream(
        decryptSource,
        privateKey
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result.toString()).toBe('Hello, World!');
    });

    it('should handle multiple chunks', async () => {
      const chunk1 = Buffer.from('Hello, ');
      const chunk2 = Buffer.from('World!');

      const source = (async function* () {
        yield chunk1;
        yield chunk2;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize: 1024,
      })) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of stream.decryptStream(
        decryptSource,
        privateKey
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result.toString()).toBe('Hello, World!');
    });

    it('should handle large data', async () => {
      const largeData = Buffer.alloc(1024 * 1024); // 1MB
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const source = (async function* () {
        yield largeData;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize: 64 * 1024,
      })) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBeGreaterThan(1);

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of stream.decryptStream(
        decryptSource,
        privateKey
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result).toEqual(largeData);
    });
  });

  describe('Member streaming', () => {
    it('should encrypt and decrypt via member', async () => {
      const { member } = Member.newMember(
        ecies,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com')
      );

      const data = Buffer.from('Secret message');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of member.encryptDataStream(source)) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of member.decryptDataStream(decryptSource)) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result.toString()).toBe('Secret message');
    });

    it('should support progress callbacks', async () => {
      const { member } = Member.newMember(
        ecies,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com')
      );

      const data = Buffer.alloc(128 * 1024); // 128KB
      const source = (async function* () {
        yield data;
      })();

      let progressCalled = false;
      const encrypted: Buffer[] = [];

      for await (const chunk of member.encryptDataStream(source, {
        onProgress: (progress) => {
          progressCalled = true;
          expect(progress.processedBytes).toBeGreaterThan(0);
          expect(progress.throughputBytesPerSec).toBeGreaterThanOrEqual(0);
        },
      })) {
        encrypted.push(chunk.data);
      }

      expect(progressCalled).toBe(true);
    });
  });

  describe('multi-recipient streaming', () => {
    it('should encrypt for multiple recipients', async () => {
      const mnemonic1 = ecies.generateNewMnemonic();
      const keyPair1 = ecies.mnemonicToSimpleKeyPair(mnemonic1);

      const mnemonic2 = ecies.generateNewMnemonic();
      const keyPair2 = ecies.mnemonicToSimpleKeyPair(mnemonic2);

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

      const data = Buffer.from('Multi-recipient message');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStreamMultiple(
        source,
        recipients
      )) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBeGreaterThan(0);
    });
  });

  describe('cancellation', () => {
    it('should support cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      const data = Buffer.alloc(1024 * 1024); // 1MB

      const source = (async function* () {
        for (let i = 0; i < 10; i++) {
          yield data;
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      })();

      setTimeout(() => controller.abort(), 10);

      await expect(async () => {
        for await (const _chunk of stream.encryptStream(source, publicKey, {
          signal: controller.signal,
        })) {
          // Should be cancelled
        }
      }).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty stream', async () => {
      const source = (async function* () {
        // Empty generator
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey)) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBe(0);
    });

    it('should handle single byte chunks', async () => {
      const data = Buffer.from('ABC');
      const source = (async function* () {
        for (const byte of data) {
          yield Buffer.from([byte]);
        }
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize: 1024,
      })) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of stream.decryptStream(
        decryptSource,
        privateKey
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result.toString()).toBe('ABC');
    });

    it('should handle exact chunk size boundaries', async () => {
      const chunkSize = 64 * 1024;
      const data = Buffer.alloc(chunkSize * 3); // Exactly 3 chunks

      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize,
      })) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBe(3);
    });

    it('should handle binary data with all byte values', async () => {
      const data = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        data[i] = i;
      }

      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey)) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const decrypted: Buffer[] = [];
      for await (const chunk of stream.decryptStream(
        decryptSource,
        privateKey
      )) {
        decrypted.push(chunk);
      }

      const result = Buffer.concat(decrypted);
      expect(result).toEqual(data);
    });

    it('should handle very small chunk sizes', async () => {
      const data = Buffer.from('Test data');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize: 1,
      })) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBeGreaterThan(1);
    });

    it('should handle very large chunk sizes', async () => {
      const data = Buffer.from('Test data');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey, {
        chunkSize: 10 * 1024 * 1024,
      })) {
        encrypted.push(chunk.data);
      }

      expect(encrypted.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle invalid public key', async () => {
      const data = Buffer.from('Test');
      const source = (async function* () {
        yield data;
      })();

      const invalidKey = Buffer.alloc(32);

      await expect(async () => {
        for await (const _chunk of stream.encryptStream(source, invalidKey)) {
          // Should throw
        }
      }).rejects.toThrow();
    });

    it('should handle invalid private key during decryption', async () => {
      const data = Buffer.from('Test');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey)) {
        encrypted.push(chunk.data);
      }

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      const invalidKey = Buffer.alloc(32);

      await expect(async () => {
        for await (const _chunk of stream.decryptStream(
          decryptSource,
          invalidKey
        )) {
          // Should throw
        }
      }).rejects.toThrow();
    });

    it('should handle corrupted encrypted data', async () => {
      const data = Buffer.from('Test');
      const source = (async function* () {
        yield data;
      })();

      const encrypted: Buffer[] = [];
      for await (const chunk of stream.encryptStream(source, publicKey)) {
        encrypted.push(chunk.data);
      }

      // Corrupt the data
      encrypted[0][10] ^= 0xff;

      const decryptSource = (async function* () {
        for (const chunk of encrypted) {
          yield chunk;
        }
      })();

      await expect(async () => {
        for await (const _chunk of stream.decryptStream(
          decryptSource,
          privateKey
        )) {
          // Should throw
        }
      }).rejects.toThrow();
    });
  });
});
