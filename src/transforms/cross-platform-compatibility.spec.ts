/**
 * Cross-Platform Binary Compatibility Tests for Transforms
 *
 * Validates that node-ecies-lib transforms produce identical binary output
 * to ecies-lib transforms for the same input data.
 */
import { sha3_512 } from 'js-sha3';
import { ChecksumTransform as NodeChecksumTransform } from './checksumTransform';
import { XorTransform as NodeXorTransform } from './xorTransform';
import {
  ChecksumTransform as BrowserChecksumTransform,
  XorTransform as BrowserXorTransform,
} from '@digitaldefiance/ecies-lib';

describe('Cross-Platform Transform Binary Compatibility', () => {
  const testData = Buffer.from('This is test data');
  const testData2 = Buffer.from('Second test data!');

  describe('ChecksumTransform Binary Compatibility', () => {
    it('should produce identical checksums for Node and Browser implementations', (done) => {
      const testChunk = Buffer.from('Test checksum data');
      const nodeTransform = new NodeChecksumTransform();
      let nodeChecksum: Buffer;

      nodeTransform.on('checksum', (checksum) => {
        nodeChecksum = Buffer.from(checksum);
      });

      nodeTransform._transform(testChunk, 'utf8', () => {});
      nodeTransform._flush(() => {
        // Browser implementation
        const browserTransform = new BrowserChecksumTransform((checksum) => {
          const browserChecksum = Buffer.from(checksum);
          expect(nodeChecksum).toEqual(browserChecksum);
          done();
        });

        browserTransform.transform(new Uint8Array(testChunk), {
          enqueue: () => {},
        } as any);
        browserTransform.flush();
      });
    });

    it('should produce identical checksums for chunked data', (done) => {
      const fullData = Buffer.from('Test checksum data for chunking');
      const chunks = [
        fullData.subarray(0, 10),
        fullData.subarray(10, 20),
        fullData.subarray(20),
      ];
      const nodeTransform = new NodeChecksumTransform();
      let nodeChecksum: Buffer;

      nodeTransform.on('checksum', (checksum) => {
        nodeChecksum = Buffer.from(checksum);
      });

      chunks.forEach((chunk) =>
        nodeTransform._transform(chunk, 'utf8', () => {}),
      );
      nodeTransform._flush(() => {
        // Browser implementation with same chunks
        const browserTransform = new BrowserChecksumTransform((checksum) => {
          const browserChecksum = Buffer.from(checksum);
          expect(nodeChecksum).toEqual(browserChecksum);
          done();
        });

        chunks.forEach((chunk) => {
          browserTransform.transform(new Uint8Array(chunk), {
            enqueue: () => {},
          } as any);
        });
        browserTransform.flush();
      });
    });
  });

  describe('XorTransform Binary Compatibility', () => {
    it('should produce identical XOR results for Node and Browser implementations', (done) => {
      // Use separate buffers for Node and Browser to avoid mutation issues
      const nodeChunk1 = Buffer.from('This is test data');
      const nodeChunk2 = Buffer.from('Second test data!');
      const browserChunk1 = Buffer.from('This is test data');
      const browserChunk2 = Buffer.from('Second test data!');

      const nodeTransform = new NodeXorTransform();

      nodeTransform.on('data', (nodeResult: Buffer) => {
        // Browser implementation
        const browserTransform = new BrowserXorTransform();

        browserTransform.transform(new Uint8Array(browserChunk1), {
          enqueue: () => {},
        } as any);

        browserTransform.transform(new Uint8Array(browserChunk2), {
          enqueue: () => {},
        } as any);

        browserTransform.flush({
          enqueue: (browserResult: Uint8Array) => {
            expect(nodeResult).toEqual(Buffer.from(browserResult));
            done();
          },
        } as any);
      });

      nodeTransform._transform(nodeChunk1, 'utf8', () => {});
      nodeTransform._transform(nodeChunk2, 'utf8', () => {});
      nodeTransform._flush(() => {});
    });

    it('should handle multiple chunks identically', (done) => {
      const nodeChunks = [
        Buffer.from([0x01, 0x02, 0x03, 0x04]),
        Buffer.from([0x05, 0x06, 0x07, 0x08]),
        Buffer.from([0x09, 0x0a, 0x0b, 0x0c]),
      ];
      const browserChunks = [
        Buffer.from([0x01, 0x02, 0x03, 0x04]),
        Buffer.from([0x05, 0x06, 0x07, 0x08]),
        Buffer.from([0x09, 0x0a, 0x0b, 0x0c]),
      ];
      const nodeTransform = new NodeXorTransform();

      nodeTransform.on('data', (nodeResult: Buffer) => {
        // Browser implementation
        const browserTransform = new BrowserXorTransform();

        browserChunks.forEach((chunk) => {
          browserTransform.transform(new Uint8Array(chunk), {
            enqueue: () => {},
          } as any);
        });

        browserTransform.flush({
          enqueue: (browserResult: Uint8Array) => {
            expect(nodeResult).toEqual(Buffer.from(browserResult));
            done();
          },
        } as any);
      });

      nodeChunks.forEach((chunk) =>
        nodeTransform._transform(chunk, 'utf8', () => {}),
      );
      nodeTransform._flush(() => {});
    });
  });

  describe('Data Format Compatibility', () => {
    it('should handle Buffer to Uint8Array conversion correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const uint8 = new Uint8Array(buffer);
      expect(uint8.length).toBe(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        expect(uint8[i]).toBe(buffer[i]);
      }
    });

    it('should preserve binary data through conversions', () => {
      const original = Buffer.from('Binary data: \x00\x01\xFF');
      const uint8 = new Uint8Array(original);
      const converted = Buffer.from(uint8);
      expect(converted).toEqual(original);
    });
  });

  describe('ECIES Cross-Platform Encryption', () => {
    const { ECIESService: NodeECIES } = require('../services/ecies');
    const {
      ECIESService: BrowserECIES,
    } = require('@digitaldefiance/ecies-lib');

    it('should decrypt Node-encrypted data in Browser', async () => {
      const nodeEcies = new NodeECIES();
      const mnemonic = nodeEcies.generateNewMnemonic();
      const { privateKey, publicKey } =
        nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const plaintext = Buffer.from('Secret message from Node');
      const encrypted = await nodeEcies.encryptSimpleOrSingle(
        false,
        publicKey,
        plaintext,
      );

      // Decrypt with Browser
      const browserEcies = new BrowserECIES();
      const decrypted = await browserEcies.decryptSimpleOrSingleWithHeader(
        false,
        new Uint8Array(privateKey),
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(plaintext);
    });

    it('should decrypt Browser-encrypted data in Node', async () => {
      const browserEcies = new BrowserECIES();
      const mnemonic = browserEcies.generateNewMnemonic();
      const { privateKey, publicKey } =
        browserEcies.mnemonicToSimpleKeyPair(mnemonic);

      const plaintext = new Uint8Array(
        Buffer.from('Secret message from Browser'),
      );
      const encrypted = await browserEcies.encryptSimpleOrSingle(
        false,
        publicKey,
        plaintext,
      );

      // Decrypt with Node
      const nodeEcies = new NodeECIES();
      const decrypted = await nodeEcies.decryptSimpleOrSingleWithHeader(
        false,
        Buffer.from(privateKey),
        Buffer.from(encrypted),
      );

      expect(decrypted).toEqual(Buffer.from(plaintext));
    });

    it('should handle large data cross-platform', async () => {
      const nodeEcies = new NodeECIES();
      const mnemonic = nodeEcies.generateNewMnemonic();
      const { privateKey, publicKey } =
        nodeEcies.mnemonicToSimpleKeyPair(mnemonic);

      const plaintext = Buffer.alloc(1024 * 10); // 10KB
      for (let i = 0; i < plaintext.length; i++) {
        plaintext[i] = i % 256;
      }

      // Node encrypt -> Browser decrypt
      const encrypted = await nodeEcies.encryptSimpleOrSingle(
        false,
        publicKey,
        plaintext,
      );
      const browserEcies = new BrowserECIES();
      const decrypted = await browserEcies.decryptSimpleOrSingleWithHeader(
        false,
        new Uint8Array(privateKey),
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(plaintext);
    });
  });
});
