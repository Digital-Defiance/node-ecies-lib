import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import { ECIES } from '@digitaldefiance/ecies-lib';
import { createECDH, randomBytes } from 'crypto';
import { EciesDecryptionTransform } from './eciesDecryptTransform';
import { EciesEncryptTransform } from './eciesEncryptTransform';

describe('EciesEncryptTransform Integration Tests', () => {
  const blockSize = 1024;
  let eciesService: ECIESService<Buffer>;
  let keypair: { privateKey: Buffer; publicKey: Buffer };

  beforeEach(() => {
    eciesService = new ECIESService<Buffer>();
    // Create real ECDH keys for actual encryption/decryption
    const ecdh = createECDH(eciesService.curveName);
    ecdh.generateKeys();
    // Get raw keys
    keypair = {
      privateKey: ecdh.getPrivateKey(),
      publicKey: ecdh.getPublicKey(), // Use raw public key directly
    };
  });

  const testEncryptionDecryption = (
    inputData: Buffer,
    done: jest.DoneCallback,
  ) => {
    const encryptTransform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
    );
    let encryptedData = Buffer.alloc(0);
    const decryptTransform = new EciesDecryptionTransform(
      eciesService,
      keypair.privateKey,
      blockSize,
    );
    let decryptedData = Buffer.alloc(0);

    encryptTransform.on('data', (chunk: Buffer) => {
      encryptedData = Buffer.concat([encryptedData, chunk]);
    });

    encryptTransform.on('error', (error: Error) => {
      done(error);
    });

    decryptTransform.on('data', (chunk: Buffer) => {
      decryptedData = Buffer.concat([decryptedData, chunk]);
    });

    decryptTransform.on('error', (error) => {
      done(error);
    });

    decryptTransform.on('end', () => {
      try {
        expect(decryptedData).toEqual(inputData);
        done();
      } catch (error) {
        done(error);
      }
    });

    encryptTransform.pipe(decryptTransform);
    encryptTransform.write(inputData);
    encryptTransform.end();
  };

  it('encrypts and decrypts data that is less than the chunk size', (done) => {
    const inputData = new Uint8Array(10);
    inputData.fill(115); // 's' character code
    const inputBuffer = Buffer.from(inputData);
    testEncryptionDecryption(inputBuffer, done);
  });

  it('encrypts and decrypts data that is exactly the chunk size', (done) => {
    const size = (blockSize as number) - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
    const inputData = new Uint8Array(size);
    inputData.fill(97); // 'a' character code
    const inputBuffer = Buffer.from(inputData);
    testEncryptionDecryption(inputBuffer, done);
  });

  it('encrypts and decrypts data that spans multiple chunks', (done) => {
    const size =
      ((blockSize as number) - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE) * 2 + 10;
    const inputData = new Uint8Array(size);
    inputData.fill(97); // 'a' character code
    const inputBuffer = Buffer.from(inputData);
    testEncryptionDecryption(inputBuffer, done);
  });

  it('handles empty input correctly', (done) => {
    const encryptTransform = new EciesEncryptTransform(
      eciesService,
      blockSize,
      keypair.publicKey,
    );
    let encryptedData = Buffer.alloc(0);

    encryptTransform.on('data', (chunk: Buffer) => {
      encryptedData = Buffer.concat([encryptedData, chunk]);
    });

    // Handle encryption completion
    encryptTransform.on('end', () => {
      expect(encryptedData.length).toBe(0);

      const decryptTransform = new EciesDecryptionTransform(
        eciesService,
        keypair.privateKey,
        blockSize,
      );
      let decryptedData = Buffer.alloc(0);

      decryptTransform.on('data', (chunk: Buffer) => {
        decryptedData = Buffer.concat([decryptedData, chunk]);
      });

      // Handle decryption completion
      decryptTransform.on('end', () => {
        try {
          expect(decryptedData.length).toBe(0);
          done();
        } catch (error) {
          done(error);
        }
      });

      decryptTransform.write(encryptedData);
      decryptTransform.end();
    });

    encryptTransform.end();
  });

  it('handles large data correctly', (done) => {
    const inputData = Buffer.alloc(1024 * 1024); // 1MB
    // Fill with random data using Node.js crypto in chunks
    for (let i = 0; i < inputData.length; i += 65536) {
      const chunk = randomBytes(Math.min(65536, inputData.length - i));
      chunk.copy(inputData, i);
    }
    const inputBuffer = Buffer.from(inputData);
    testEncryptionDecryption(inputBuffer, done);
  });

  describe('random data tests', () => {
    const sizes = [100, 500, 1000, 5000, 10000];

    sizes.forEach((size) => {
      it(`handles data of size ${size} correctly`, (done) => {
        const inputData = randomBytes(size);
        const inputBuffer = Buffer.from(inputData);
        testEncryptionDecryption(inputBuffer, done);
      });
    });
  });
});
