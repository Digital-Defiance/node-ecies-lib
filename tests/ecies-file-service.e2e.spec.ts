import {
  EmailString,
  ECIESService as FrontendECIESService,
  EciesFileService as FrontendFileService,
  Member as FrontendMember,
  IECIESConfig,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import * as fs from 'fs';
import { ObjectId } from 'mongodb';

import * as os from 'os';
import * as path from 'path';

import { Member as BackendMember } from '../src/member';
import { EciesFileService } from '../src/services/ecies/file';
import { ECIESService } from '../src/services/ecies/service';

describe('ECIES File Service E2E Tests', () => {
  let backendService: ECIESService;
  let frontendService: FrontendECIESService;
  let backendFileService: EciesFileService;
  let frontendFileService: FrontendFileService;
  let config: IECIESConfig;
  let tempDir: string;

  // Test keys
  let senderId: ObjectId;
  let senderDateCreated: Date;
  let senderMnemonic: SecureString;
  let senderFrontend: FrontendMember;
  let senderBackend: BackendMember;
  let senderWallet: Wallet;
  let receiverId: ObjectId;
  let receiverDateCreated: Date;
  let receiverMnemonic: SecureString;
  let receiverFrontend: FrontendMember;
  let receiverBackend: BackendMember;
  let receiverWallet: Wallet;
  let senderPrivateKey: Buffer;
  let senderPublicKey: Buffer;
  let receiverPrivateKey: Buffer;
  let receiverPublicKey: Buffer;

  beforeEach(() => {
    config = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 128,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };

    backendService = new ECIESService(config);

    senderId = new ObjectId();
    senderDateCreated = new Date();
    senderMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    const senderWalletAndSeed =
      backendService.walletAndSeedFromMnemonic(senderMnemonic);
    senderWallet = senderWalletAndSeed.wallet;
    senderPrivateKey = Buffer.from(senderWallet.getPrivateKey());
    senderPublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(senderWallet.getPublicKey()),
    ]);

    senderBackend = new BackendMember(
      backendService,
      MemberType.User,
      'Sender',
      new EmailString('sender@digitaldefiance.org'),
      senderPublicKey,
      new SecureBuffer(senderPrivateKey),
      senderWallet,
      senderId,
      senderDateCreated,
      senderDateCreated,
      senderId,
    );
    backendFileService = new EciesFileService(backendService, senderPrivateKey);

    frontendService = new FrontendECIESService(config);
    senderFrontend = new FrontendMember(
      frontendService,
      MemberType.User,
      'Sender',
      new EmailString('sender@digitaldefiance.org'),
      new Uint8Array(senderPublicKey),
      new SecureBuffer(senderPrivateKey),
      senderWallet,
      senderId, // ObjectId
      senderDateCreated,
      senderDateCreated,
      senderId, // ObjectId
    );
    frontendFileService = new FrontendFileService(
      frontendService,
      new Uint8Array(senderPrivateKey),
    );

    // Generate receiver keys
    receiverId = new ObjectId();
    receiverMnemonic = new SecureString(
      'legal winner thank year wave sausage worth useful legal winner thank yellow',
    );
    const receiverWalletAndSeed =
      backendService.walletAndSeedFromMnemonic(receiverMnemonic);
    receiverWallet = receiverWalletAndSeed.wallet;
    receiverPrivateKey = Buffer.from(receiverWallet.getPrivateKey());
    receiverPublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(receiverWallet.getPublicKey()),
    ]);
    receiverBackend = new BackendMember(
      backendService,
      MemberType.User,
      'Receiver',
      new EmailString('receiver@digitaldefiance.org'),
      receiverPublicKey,
      new SecureBuffer(receiverPrivateKey),
      receiverWallet,
      receiverId,
      receiverDateCreated,
      receiverDateCreated,
      receiverId,
    );
    receiverFrontend = new FrontendMember(
      frontendService,
      MemberType.User,
      'Receiver',
      new EmailString('receiver@digitaldefiance.org'),
      new Uint8Array(receiverPublicKey),
      new SecureBuffer(receiverPrivateKey),
      receiverWallet,
      receiverId, // ObjectId
      receiverDateCreated,
      receiverDateCreated,
      receiverId, // ObjectId
    );

    // Initialize file services
    backendFileService = new EciesFileService(backendService, senderPrivateKey);
    frontendFileService = new FrontendFileService(
      frontendService,
      new Uint8Array(receiverPrivateKey),
    );

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecies-e2e-test-'));
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Backend to Frontend Communication', () => {
    it('should encrypt file on backend and decrypt on frontend', async () => {
      const originalData = Buffer.from('Backend to Frontend test data');
      const inputPath = path.join(tempDir, 'backend-input.txt');

      // Backend: Create and encrypt file
      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Frontend: Decrypt the encrypted data
      const decrypted = await frontendFileService.decryptFile(
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(originalData);
    });

    it('should handle large files from backend to frontend', async () => {
      const chunkSize = 1024 * 1024;
      const originalData = Buffer.alloc(chunkSize * 2.5); // 2.5MB
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = i % 256;
      }

      const inputPath = path.join(tempDir, 'large-backend-input.bin');

      // Backend: Encrypt large file
      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Frontend: Decrypt large file
      const decrypted = await frontendFileService.decryptFile(
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(originalData);
    });

    it('should handle empty files from backend to frontend', async () => {
      const originalData = Buffer.alloc(0);
      const inputPath = path.join(tempDir, 'empty-backend-input.txt');

      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      const decrypted = await frontendFileService.decryptFile(
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(originalData);
    });
  });

  describe('Frontend to Backend Communication', () => {
    // Mock File class for frontend simulation
    class MockFile {
      constructor(
        private data: Uint8Array,
        public name: string,
        public size: number = data.length,
      ) {}

      slice(start: number, end?: number): MockFile {
        const slicedData = this.data.slice(start, end);
        return new MockFile(slicedData, this.name, slicedData.length);
      }

      async arrayBuffer(): Promise<ArrayBuffer> {
        return this.data.buffer.slice(
          this.data.byteOffset,
          this.data.byteOffset + this.data.byteLength,
        ) as ArrayBuffer;
      }
    }

    it('should encrypt file on frontend and decrypt on backend', async () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const file = new MockFile(
        originalData,
        'frontend-test.bin',
      ) as unknown as File;

      // Frontend: Encrypt file
      const encrypted = await frontendFileService.encryptFile(
        file,
        new Uint8Array(senderPublicKey),
      );

      // Backend: Decrypt the encrypted data
      const decrypted = backendFileService.decryptFile(Buffer.from(encrypted));

      expect(new Uint8Array(decrypted)).toEqual(originalData);
    });

    it('should handle large files from frontend to backend', async () => {
      const chunkSize = 1024 * 1024;
      const originalData = new Uint8Array(chunkSize * 1.5); // 1.5MB
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = (i * 3) % 256;
      }

      const file = new MockFile(
        originalData,
        'large-frontend.bin',
      ) as unknown as File;

      // Frontend: Encrypt large file
      const encrypted = await frontendFileService.encryptFile(
        file,
        new Uint8Array(senderPublicKey),
      );

      // Backend: Decrypt large file
      const decrypted = backendFileService.decryptFile(Buffer.from(encrypted));

      expect(new Uint8Array(decrypted)).toEqual(originalData);
    });

    it('should handle text files from frontend to backend', async () => {
      const originalText = 'Hello from frontend to backend!';
      const originalData = new Uint8Array(Buffer.from(originalText, 'utf8'));
      const file = new MockFile(
        originalData,
        'text-test.txt',
      ) as unknown as File;

      const encrypted = await frontendFileService.encryptFile(
        file,
        new Uint8Array(senderPublicKey),
      );
      const decrypted = backendFileService.decryptFile(Buffer.from(encrypted));

      expect(decrypted.toString('utf8')).toEqual(originalText);
    });
  });

  describe('Bidirectional Communication', () => {
    it('should support round-trip encryption/decryption', async () => {
      const originalData = Buffer.from(
        'Round-trip test data with special chars: àáâãäåæçèéêë',
      );
      const inputPath = path.join(tempDir, 'roundtrip-input.txt');

      // Step 1: Backend encrypts for receiver
      fs.writeFileSync(inputPath, originalData);
      const backendEncrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Step 2: Frontend (receiver) decrypts
      const frontendDecrypted = await frontendFileService.decryptFile(
        new Uint8Array(backendEncrypted),
      );

      // Step 3: Frontend re-encrypts for sender
      class RoundTripMockFile {
        constructor(
          private data: Uint8Array,
          public name: string,
          public size: number = data.length,
        ) {}

        slice(start: number, end?: number): RoundTripMockFile {
          const slicedData = this.data.slice(start, end);
          return new RoundTripMockFile(
            slicedData,
            this.name,
            slicedData.length,
          );
        }

        async arrayBuffer(): Promise<ArrayBuffer> {
          return this.data.buffer.slice(
            this.data.byteOffset,
            this.data.byteOffset + this.data.byteLength,
          ) as ArrayBuffer;
        }
      }

      const file = new RoundTripMockFile(
        frontendDecrypted,
        'roundtrip.txt',
      ) as unknown as File;
      const frontendEncrypted = await frontendFileService.encryptFile(
        file,
        new Uint8Array(senderPublicKey),
      );

      // Step 4: Backend (sender) decrypts final result
      const finalDecrypted = backendFileService.decryptFile(
        Buffer.from(frontendEncrypted),
      );

      expect(finalDecrypted).toEqual(originalData);
    });

    it('should maintain data integrity across multiple encryptions', async () => {
      const originalData = Buffer.alloc(1024);
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = Math.floor(Math.random() * 256);
      }

      const inputPath = path.join(tempDir, 'integrity-test.bin');
      fs.writeFileSync(inputPath, originalData);

      // Multiple round trips
      let currentData = originalData;
      const iterations = 3;

      for (let i = 0; i < iterations; i++) {
        // Backend encrypt
        const tempPath = path.join(tempDir, `temp-${i}.bin`);
        fs.writeFileSync(tempPath, currentData);
        const encrypted = backendFileService.encryptFileFromPath(
          tempPath,
          receiverPublicKey,
        );

        // Frontend decrypt
        const decrypted = await frontendFileService.decryptFile(
          new Uint8Array(encrypted),
        );
        currentData = Buffer.from(decrypted);

        // Clean up temp file
        fs.unlinkSync(tempPath);
      }

      expect(currentData).toEqual(originalData);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted data gracefully', async () => {
      const originalData = Buffer.from('Test data for corruption');
      const inputPath = path.join(tempDir, 'corruption-test.txt');

      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Corrupt the encrypted data
      const corrupted = new Uint8Array(encrypted);
      corrupted[50] = corrupted[50] ^ 0xff; // Flip bits

      await expect(
        frontendFileService.decryptFile(corrupted),
      ).rejects.toThrow();
    });

    it('should handle wrong private key gracefully', async () => {
      const originalData = Buffer.from('Wrong key test');
      const inputPath = path.join(tempDir, 'wrong-key-test.txt');

      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Try to decrypt with wrong private key
      const wrongKeyService = new FrontendFileService(
        frontendService,
        new Uint8Array(senderPrivateKey), // Wrong key
      );

      await expect(
        wrongKeyService.decryptFile(new Uint8Array(encrypted)),
      ).rejects.toThrow();
    });

    it('should handle truncated encrypted data', async () => {
      const originalData = Buffer.from('Truncation test data');
      const inputPath = path.join(tempDir, 'truncation-test.txt');

      fs.writeFileSync(inputPath, originalData);
      const encrypted = backendFileService.encryptFileFromPath(
        inputPath,
        receiverPublicKey,
      );

      // Truncate the encrypted data
      const truncated = new Uint8Array(
        encrypted.slice(0, encrypted.length / 2),
      );

      await expect(
        frontendFileService.decryptFile(truncated),
      ).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent file operations', async () => {
      const fileCount = 5;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < fileCount; i++) {
        const promise = (async () => {
          const data = Buffer.from(`Concurrent test file ${i}`);
          const inputPath = path.join(tempDir, `concurrent-${i}.txt`);

          fs.writeFileSync(inputPath, data);
          const encrypted = backendFileService.encryptFileFromPath(
            inputPath,
            receiverPublicKey,
          );
          const decrypted = await frontendFileService.decryptFile(
            new Uint8Array(encrypted),
          );

          expect(Buffer.from(decrypted)).toEqual(data);
        })();

        promises.push(promise);
      }

      await Promise.all(promises);
    });

    it('should maintain performance with varying file sizes', async () => {
      const fileSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
      const results: number[] = [];

      for (const size of fileSizes) {
        const data = Buffer.alloc(size);
        data.fill(42);

        const inputPath = path.join(tempDir, `perf-test-${size}.bin`);
        fs.writeFileSync(inputPath, data);

        const startTime = Date.now();
        const encrypted = backendFileService.encryptFileFromPath(
          inputPath,
          receiverPublicKey,
        );
        const decrypted = await frontendFileService.decryptFile(
          new Uint8Array(encrypted),
        );
        const endTime = Date.now();

        results.push(endTime - startTime);
        expect(Buffer.from(decrypted)).toEqual(data);
      }

      // Performance should scale reasonably (not exponentially)
      // This is a basic check - adjust thresholds as needed
      expect(results[results.length - 1]).toBeLessThan(results[0] * 100);
    }, 20000);
  });
});
