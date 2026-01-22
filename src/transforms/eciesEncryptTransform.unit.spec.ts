import { SecureString } from '@digitaldefiance/ecies-lib';
import {
  ECIESService,
  ISimpleKeyPairBuffer,
} from '@digitaldefiance/node-ecies-lib';
import { EciesEncryptTransform } from './eciesEncryptTransform';
import { randomBytes } from 'crypto';

describe('EciesEncryptTransform Unit Tests', () => {
  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as Console;

  const blockSize = 1024;
  let eciesService: ECIESService<Buffer>;
  let mnemonic: SecureString;
  let keypair: ISimpleKeyPairBuffer;

  beforeEach(() => {
    jest.clearAllMocks();
    eciesService = new ECIESService();
    mnemonic = eciesService.generateNewMnemonic();
    const kp = eciesService.mnemonicToSimpleKeyPairBuffer(mnemonic);
    keypair = kp;
  });

  it('should be instantiated with correct parameters', () => {
    const transform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(0);
      done();
    });

    transform.end();
  });

  it('should encrypt input data', (done) => {
    const transform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const inputBuffer = randomBytes(100);
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const encryptedData = Buffer.concat(chunks);

      // Verify the encrypted data can be decrypted
      const decryptedData = eciesService.decryptBasicWithHeader(
        keypair.privateKey,
        encryptedData,
      );
      expect(decryptedData).toEqual(inputBuffer);
      done();
    });

    transform.write(inputBuffer);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    const transform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
      mockLogger,
    );
    const inputBuffer = randomBytes(1000);
    const chunks: Buffer[] = [];

    // Split input into multiple chunks
    const inputChunks = [
      inputBuffer.subarray(0, 300),
      inputBuffer.subarray(300, 700),
      inputBuffer.subarray(700),
    ];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      // Each encrypted block should be decryptable
      expect(chunks.length).toBeGreaterThan(0);

      // Decrypt all blocks and concatenate
      const decryptedChunks = chunks.map((encryptedBlock) =>
        eciesService.decryptBasicWithHeader(keypair.privateKey, encryptedBlock),
      );
      const decryptedData = Buffer.concat(decryptedChunks);
      expect(decryptedData).toEqual(inputBuffer);
      done();
    });

    // Write chunks immediately without artificial delays
    inputChunks.forEach((chunk) => {
      transform.write(chunk);
    });
    transform.end();
  });

  it('should throw error with invalid public key', () => {
    // The transform should throw an error in the constructor when given an invalid public key
    const invalidKeyBuffer = randomBytes(32); // Wrong size for public key (should be 65 bytes)

    expect(() => {
      new EciesEncryptTransform(
        eciesService,
        blockSize,
        invalidKeyBuffer,
        mockLogger,
      );
    }).toThrow('Invalid public key length');
  });
});
