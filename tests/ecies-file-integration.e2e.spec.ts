import { IECIESConfig, SecureString } from '@digitaldefiance/ecies-lib';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ECIESService } from '../src/services/ecies';
import { EciesFileService } from '../src/services/ecies/file';

describe('ECIES File Service Integration Tests', () => {
  let eciesService: ECIESService;
  let fileService: EciesFileService;
  let config: IECIESConfig;
  let tempDir: string;

  // Multiple user scenario
  let alicePrivateKey: Buffer;
  let alicePublicKey: Buffer;
  let bobPrivateKey: Buffer;
  let bobPublicKey: Buffer;
  let charliePrivateKey: Buffer;
  let charliePublicKey: Buffer;

  beforeEach(() => {
    config = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 128,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };

    eciesService = new ECIESService(config);

    // Generate Alice's keys
    const aliceMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    );
    const { wallet: aliceWallet } =
      eciesService.walletAndSeedFromMnemonic(aliceMnemonic);
    alicePrivateKey = Buffer.from(aliceWallet.getPrivateKey());
    alicePublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(aliceWallet.getPublicKey()),
    ]);

    // Generate Bob's keys
    const bobMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    );
    const { wallet: bobWallet } =
      eciesService.walletAndSeedFromMnemonic(bobMnemonic);
    bobPrivateKey = Buffer.from(bobWallet.getPrivateKey());
    bobPublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(bobWallet.getPublicKey()),
    ]);

    // Generate Charlie's keys
    const charlieMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
    );
    const { wallet: charlieWallet } =
      eciesService.walletAndSeedFromMnemonic(charlieMnemonic);
    charliePrivateKey = Buffer.from(charlieWallet.getPrivateKey());
    charliePublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(charlieWallet.getPublicKey()),
    ]);

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecies-integration-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Multi-User File Sharing Scenarios', () => {
    it('should allow Alice to encrypt a file for Bob', () => {
      const aliceFileService = new EciesFileService(
        eciesService,
        alicePrivateKey
      );
      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);

      const secretMessage = Buffer.from("Alice's secret message for Bob");
      const inputPath = path.join(tempDir, 'alice-to-bob.txt');
      const outputPath = path.join(tempDir, 'bob-received.txt');

      // Alice encrypts file for Bob
      fs.writeFileSync(inputPath, secretMessage);
      const encrypted = aliceFileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      // Bob decrypts the file
      bobFileService.decryptFileToPath(encrypted, outputPath);
      const decrypted = fs.readFileSync(outputPath);

      expect(decrypted).toEqual(secretMessage);
    });

    it("should prevent Charlie from decrypting Alice's message to Bob", () => {
      const aliceFileService = new EciesFileService(
        eciesService,
        alicePrivateKey
      );
      const charlieFileService = new EciesFileService(
        eciesService,
        charliePrivateKey
      );

      const secretMessage = Buffer.from('Private message from Alice to Bob');
      const inputPath = path.join(tempDir, 'alice-private.txt');

      fs.writeFileSync(inputPath, secretMessage);
      const encrypted = aliceFileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      // Charlie should not be able to decrypt
      expect(() => {
        charlieFileService.decryptFile(encrypted);
      }).toThrow();
    });

    it('should handle file sharing chain: Alice -> Bob -> Charlie', () => {
      const aliceFileService = new EciesFileService(
        eciesService,
        alicePrivateKey
      );
      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);
      const charlieFileService = new EciesFileService(
        eciesService,
        charliePrivateKey
      );

      const originalMessage = Buffer.from(
        'Chain message: Alice -> Bob -> Charlie'
      );
      const aliceInputPath = path.join(tempDir, 'chain-alice.txt');
      const bobTempPath = path.join(tempDir, 'chain-bob-temp.txt');
      const charlieOutputPath = path.join(tempDir, 'chain-charlie.txt');

      // Alice encrypts for Bob
      fs.writeFileSync(aliceInputPath, originalMessage);
      const aliceToBob = aliceFileService.encryptFileFromPath(
        aliceInputPath,
        bobPublicKey
      );

      // Bob decrypts and re-encrypts for Charlie
      const bobDecrypted = bobFileService.decryptFile(aliceToBob);
      fs.writeFileSync(bobTempPath, bobDecrypted);
      const bobToCharlie = bobFileService.encryptFileFromPath(
        bobTempPath,
        charliePublicKey
      );

      // Charlie decrypts final message
      charlieFileService.decryptFileToPath(bobToCharlie, charlieOutputPath);
      const finalMessage = fs.readFileSync(charlieOutputPath);

      expect(finalMessage).toEqual(originalMessage);
    });
  });

  describe('File Type Compatibility', () => {
    it('should handle text files with various encodings', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);

      const testCases = [
        { content: 'Simple ASCII text', encoding: 'ascii' as BufferEncoding },
        {
          content: 'UTF-8 with émojis: 🔒🔑💻',
          encoding: 'utf8' as BufferEncoding,
        },
        {
          content: 'Special chars: àáâãäåæçèéêë',
          encoding: 'utf8' as BufferEncoding,
        },
      ];

      testCases.forEach((testCase, index) => {
        const inputPath = path.join(tempDir, `text-${index}.txt`);
        const outputPath = path.join(tempDir, `text-output-${index}.txt`);

        fs.writeFileSync(inputPath, testCase.content, testCase.encoding);
        const encrypted = fileService.encryptFileFromPath(
          inputPath,
          bobPublicKey
        );

        const bobFileService = new EciesFileService(
          eciesService,
          bobPrivateKey
        );
        bobFileService.decryptFileToPath(encrypted, outputPath);

        const decrypted = fs.readFileSync(outputPath, testCase.encoding);
        expect(decrypted).toEqual(testCase.content);
      });
    });

    it('should handle binary files correctly', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);

      // Create a binary file with various byte values
      const binaryData = Buffer.alloc(1024);
      for (let i = 0; i < binaryData.length; i++) {
        binaryData[i] = i % 256;
      }

      const inputPath = path.join(tempDir, 'binary-test.bin');
      const outputPath = path.join(tempDir, 'binary-output.bin');

      fs.writeFileSync(inputPath, binaryData);
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);
      bobFileService.decryptFileToPath(encrypted, outputPath);

      const decrypted = fs.readFileSync(outputPath);
      expect(decrypted).toEqual(binaryData);
    });

    it('should handle JSON files', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);

      const jsonData = {
        name: 'Test Document',
        version: '1.0.0',
        encrypted: true,
        metadata: {
          created: new Date().toISOString(),
          author: 'Alice',
          recipients: ['Bob'],
        },
        content: 'This is encrypted JSON content',
      };

      const inputPath = path.join(tempDir, 'test.json');
      const outputPath = path.join(tempDir, 'decrypted.json');

      fs.writeFileSync(inputPath, JSON.stringify(jsonData, null, 2));
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);
      bobFileService.decryptFileToPath(encrypted, outputPath);

      const decryptedJson = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      expect(decryptedJson).toEqual(jsonData);
    });
  });

  describe('Large File Handling', () => {
    it('should handle files larger than chunk size', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);
      const chunkSize = 1024 * 1024; // 1MB

      // Create a 5MB file
      const largeData = Buffer.alloc(chunkSize * 5);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = (i * 7) % 256; // Some pattern
      }

      const inputPath = path.join(tempDir, 'large-file.bin');
      const outputPath = path.join(tempDir, 'large-output.bin');

      fs.writeFileSync(inputPath, largeData);
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);
      bobFileService.decryptFileToPath(encrypted, outputPath);

      const decrypted = fs.readFileSync(outputPath);
      expect(decrypted).toEqual(largeData);
    });

    it('should handle files with size exactly matching chunk boundaries', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);
      const chunkSize = 1024 * 1024; // 1MB

      const testSizes = [
        chunkSize, // Exactly 1 chunk
        chunkSize * 2, // Exactly 2 chunks
        chunkSize * 3, // Exactly 3 chunks
      ];

      testSizes.forEach((size, index) => {
        const data = Buffer.alloc(size);
        data.fill(index + 1); // Fill with different values

        const inputPath = path.join(tempDir, `boundary-${index}.bin`);
        const outputPath = path.join(tempDir, `boundary-output-${index}.bin`);

        fs.writeFileSync(inputPath, data);
        const encrypted = fileService.encryptFileFromPath(
          inputPath,
          bobPublicKey
        );

        const bobFileService = new EciesFileService(
          eciesService,
          bobPrivateKey
        );
        bobFileService.decryptFileToPath(encrypted, outputPath);

        const decrypted = fs.readFileSync(outputPath);
        expect(decrypted).toEqual(data);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial file corruption gracefully', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const fileService = new EciesFileService(eciesService, alicePrivateKey);

        const originalData = Buffer.from(
          'Data that will be partially corrupted'
        );
        const inputPath = path.join(tempDir, 'corruption-test.txt');

        fs.writeFileSync(inputPath, originalData);
        const encrypted = fileService.encryptFileFromPath(
          inputPath,
          bobPublicKey
        );

        // Corrupt a single byte in the middle
        encrypted[Math.floor(encrypted.length / 2)] =
          encrypted[Math.floor(encrypted.length / 2)] ^ 0xff;

        const bobFileService = new EciesFileService(
          eciesService,
          bobPrivateKey
        );

        expect(() => {
          bobFileService.decryptFile(encrypted);
        }).toThrow();
      });
    });

    it('should validate file integrity during decryption', () => {
      const fileService = new EciesFileService(eciesService, alicePrivateKey);

      const originalData = Buffer.from('Integrity test data');
      const inputPath = path.join(tempDir, 'integrity.txt');

      fs.writeFileSync(inputPath, originalData);
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        bobPublicKey
      );

      // Modify the authentication tag
      const authTagStart = 65 + 16; // After ephemeral key and IV
      encrypted[authTagStart] = encrypted[authTagStart] ^ 0x01;

      const bobFileService = new EciesFileService(eciesService, bobPrivateKey);

      expect(() => {
        bobFileService.decryptFile(encrypted);
      }).toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should maintain reasonable performance across different file sizes', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const fileService = new EciesFileService(eciesService, alicePrivateKey);
        const bobFileService = new EciesFileService(
          eciesService,
          bobPrivateKey
        );

        const fileSizes = [
          { size: 1024, name: '1KB' },
          { size: 10240, name: '10KB' },
          { size: 102400, name: '100KB' },
          { size: 1048576, name: '1MB' },
        ];

        const results: Array<{
          size: string;
          encryptTime: number;
          decryptTime: number;
        }> = [];

        fileSizes.forEach(({ size, name }) => {
          const data = Buffer.alloc(size);
          data.fill(42);

          const inputPath = path.join(tempDir, `perf-${name}.bin`);
          fs.writeFileSync(inputPath, data);

          // Measure encryption time
          const encryptStart = Date.now();
          const encrypted = fileService.encryptFileFromPath(
            inputPath,
            bobPublicKey
          );
          const encryptEnd = Date.now();

          // Measure decryption time
          const decryptStart = Date.now();
          const decrypted = bobFileService.decryptFile(encrypted);
          const decryptEnd = Date.now();

          results.push({
            size: name,
            encryptTime: encryptEnd - encryptStart,
            decryptTime: decryptEnd - decryptStart,
          });

          expect(decrypted).toEqual(data);
        });

        // Log performance results for analysis - this is expected output for performance tests
        console.log('Performance Results:', results);

        // Basic performance assertions
        results.forEach((result) => {
          expect(result.encryptTime).toBeLessThan(10000); // 10 seconds max
          expect(result.decryptTime).toBeLessThan(10000); // 10 seconds max
        });
      });
    });

    it('should handle concurrent file operations efficiently', async () => {
      const concurrentOperations = 10;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrentOperations; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          try {
            const fileService = new EciesFileService(
              eciesService,
              alicePrivateKey
            );
            const bobFileService = new EciesFileService(
              eciesService,
              bobPrivateKey
            );

            const data = Buffer.from(`Concurrent operation ${i}`);
            const inputPath = path.join(tempDir, `concurrent-${i}.txt`);

            fs.writeFileSync(inputPath, data);
            const encrypted = fileService.encryptFileFromPath(
              inputPath,
              bobPublicKey
            );
            const decrypted = bobFileService.decryptFile(encrypted);

            expect(decrypted).toEqual(data);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        promises.push(promise);
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete all operations within reasonable time
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });
  });
});
