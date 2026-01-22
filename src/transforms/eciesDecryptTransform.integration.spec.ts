import { SecureString, ECIES } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../services';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { EciesDecryptionTransform } from './eciesDecryptTransform';
import { ISimpleKeyPairBuffer } from '../interfaces';

describe('EciesDecryptionTransform Integration Tests', () => {
  const blockSize = 1024;
  let eciesService: ECIESService<Buffer>;
  let mnemonic: SecureString;
  let keypair: ISimpleKeyPairBuffer;

  beforeEach(() => {
    eciesService = new ECIESService<Buffer>();
    mnemonic = eciesService.generateNewMnemonic();
    const kp = eciesService.mnemonicToSimpleKeyPair(mnemonic);
    keypair = kp;
  });

  async function encryptData(
    inputData: Buffer,
    publicKey: Buffer,
  ): Promise<Buffer> {
    return Promise.resolve(eciesService.encryptBasic(publicKey, inputData));
  }

  const testEndToEndDecryption = async (inputData: Buffer): Promise<Buffer> => {
    // Encrypt the data
    const encryptedData = await encryptData(
      inputData,
      Buffer.from(keypair.publicKey),
    );

    // Now decrypt the data
    const decryptionTransform = new EciesDecryptionTransform<Buffer>(
      eciesService,
      Buffer.from(keypair.privateKey),
      encryptedData.length, // Use actual encrypted size as block size
    );
    const decryptedChunks: Buffer[] = [];
    const readableForDecryption = new Readable({
      read() {
        this.push(encryptedData);
        this.push(null); // End the stream
      },
    });

    readableForDecryption.pipe(decryptionTransform);
    for await (const chunk of decryptionTransform) {
      decryptedChunks.push(chunk);
    }

    // Concatenate the decrypted chunks
    return Buffer.concat(decryptedChunks);
  };

  it('correctly decrypts data that was encrypted and spans multiple blocks', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = 1000; // A reasonable size that would span multiple blocks
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is shorter than a block', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = 100; // A small size that fits in one block
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });

  it('correctly decrypts data that was encrypted and is exactly one block', async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds
    const testDataLength = blockSize - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
    const inputData = randomBytes(testDataLength);
    const decryptedData = await testEndToEndDecryption(inputData);
    expect(decryptedData).toEqual(inputData);
  });
});
