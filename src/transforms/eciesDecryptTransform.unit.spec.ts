import { ECIESError, SecureString } from '@digitaldefiance/ecies-lib';
import { randomBytes } from 'crypto';
import { EciesDecryptionTransform } from './eciesDecryptTransform';
import { ECIESService } from '../services';

describe('EciesDecryptionTransform Unit Tests', () => {
  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as Console;

  const blockSize = 1024;
  let eciesService: ECIESService<Buffer>;
  let mnemonic: SecureString;
  let keypair: {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eciesService = new ECIESService<Buffer>();
    mnemonic = eciesService.generateNewMnemonic();
    const kp = eciesService.mnemonicToSimpleKeyPair(mnemonic);
    keypair = kp;
  });

  it('should be instantiated with correct parameters', () => {
    const transform = new EciesDecryptionTransform(
      eciesService,
      Buffer.from(keypair.privateKey),
      blockSize,
      undefined,
      mockLogger,
    );
    expect(transform).toBeDefined();
  });

  it('should handle empty input', (done) => {
    const transform = new EciesDecryptionTransform(
      eciesService,
      Buffer.from(keypair.privateKey),
      blockSize,
      undefined,
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

  it('should decrypt input data', (done) => {
    const transform = new EciesDecryptionTransform(
      eciesService,
      Buffer.from(keypair.privateKey),
      blockSize,
      undefined,
      mockLogger,
    );
    const inputData = randomBytes(100);
    const encryptedData = eciesService.encryptSimpleOrSingle(
      true,
      Buffer.from(keypair.publicKey),
      inputData,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      expect(chunks.length).toBe(1);
      const decryptedData = Buffer.concat(chunks);
      expect(decryptedData).toEqual(inputData);
      done();
    });

    transform.write(encryptedData);
    transform.end();
  });

  it('should handle streaming input', (done) => {
    // Encrypt multiple blocks of data
    const inputData1 = randomBytes(500);
    const inputData2 = randomBytes(500);
    const encryptedBlock1 = eciesService.encryptSimpleOrSingle(
      true,
      Buffer.from(keypair.publicKey),
      inputData1,
    );
    const encryptedBlock2 = eciesService.encryptSimpleOrSingle(
      true,
      Buffer.from(keypair.publicKey),
      inputData2,
    );

    const encryptedBlockSize = encryptedBlock1.length;
    const transform = new EciesDecryptionTransform(
      eciesService,
      Buffer.from(keypair.privateKey),
      encryptedBlockSize,
      undefined,
      mockLogger,
    );
    const chunks: Buffer[] = [];

    transform.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    transform.on('end', () => {
      const decryptedData = Buffer.concat(chunks);
      const expectedData = Buffer.concat([inputData1, inputData2]);
      expect(decryptedData).toEqual(expectedData);
      done();
    });

    // Write complete encrypted blocks
    transform.write(encryptedBlock1);
    transform.write(encryptedBlock2);
    transform.end();
  });

  it('should throw error with invalid private key', (done) => {
    const invalidPrivateKey = randomBytes(32); // Wrong format for private key
    const inputData = randomBytes(100);
    const encryptedData = eciesService.encryptSimpleOrSingle(
      true,
      Buffer.from(keypair.publicKey),
      inputData,
    );
    const transform = new EciesDecryptionTransform(
      eciesService,
      invalidPrivateKey,
      encryptedData.length,
      undefined,
      mockLogger,
    );

    transform.on('error', (error: ECIESError) => {
      expect(error).toBeDefined();
      expect(error.type).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
      done();
    });

    transform.write(encryptedData);
    transform.end();
  });

  it('should throw error with corrupted encrypted data', (done) => {
    const transform = new EciesDecryptionTransform(
      eciesService,
      Buffer.from(keypair.privateKey),
      blockSize,
      undefined,
      mockLogger,
    );
    const corruptedData = randomBytes(200); // Random data that's not properly encrypted

    transform.on('error', (error) => {
      expect(error).toBeDefined();
      expect(error.message).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalled();
      done();
    });

    transform.write(corruptedData);
    transform.end();
  });
});
