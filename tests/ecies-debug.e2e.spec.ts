import {
  EciesEncryptionTypeEnum,
  EciesSingleRecipient,
  IECIESConfig,
  SecureString,
} from '@digitaldefiance/ecies-lib';

import { getNodeRuntimeConfiguration } from '../src/constants';
import { ECIESService } from '../src/services/ecies/service';
import { EciesSingleRecipientCore } from '../src/services/ecies/single-recipient';

describe('ECIES Debug - Length Mismatch Issue', () => {
  let config: IECIESConfig;
  let testMnemonic: SecureString;

  beforeEach(() => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    config = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };

    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  describe('Debug Encryption Length Issue', () => {
    it('should debug the exact encryption/decryption flow causing length mismatch', async () => {
      // Recreate the exact scenario from the failing test
      const backendService = new ECIESService(config);
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);

      // Create a test payload similar to the challenge
      const testPayload = Buffer.from(
        '0000019907e7a1018f62bc20fd86059d60ef5543f00429aac513207a84b58da3e78a902af2799ba631e24ebc46c8ed72d9ea56461e37ff53e23e66c2b55141f3c44f54a7e38ab55062554f4b2aabbba0adb1995b56997821dae3fb89771d2a06da87c73e7da7a9e601',
        'hex',
      );

      expect(testPayload.length).toBe(105);

      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        wallet.getPublicKey(),
      ]);

      // Backend encrypts
      const encrypted = backendService.encryptWithLength(
        publicKey,
        testPayload,
      );

      expect(encrypted.length).toBeGreaterThan(testPayload.length);
      expect(encrypted.subarray(0, 50)).toHaveLength(50);

      // Parse the header to understand the structure
      const backendSingle = new EciesSingleRecipientCore(config);
      const parsed = backendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.WithLength,
        encrypted,
      );

      // Validate header structure
      expect(encrypted[0]).toBeDefined(); // Encryption type byte
      expect(parsed.header.ephemeralPublicKey.length).toBe(33);
      expect(parsed.header.iv.length).toBe(12);
      expect(parsed.header.authTag.length).toBe(16);
      expect(parsed.header.dataLength).toBeGreaterThan(0);
      expect(parsed.data.length).toBeGreaterThan(0);
      expect(parsed.header.headerSize).toBeGreaterThan(0);
      expect(parsed.header.dataLength).toBe(parsed.data.length);

      // Try to decrypt with backend
      const backendDecrypted = backendService.decryptWithLengthAndHeader(
        Buffer.from(wallet.getPrivateKey()),
        encrypted,
      );

      expect(backendDecrypted.length).toBe(testPayload.length);
      expect(backendDecrypted).toEqual(testPayload);

      // Now try with frontend
      const frontendSingle = new EciesSingleRecipient(config);

      try {
        const frontendParsed = frontendSingle.parseEncryptedMessage(
          EciesEncryptionTypeEnum.WithLength,
          new Uint8Array(encrypted),
        );

        // Validate frontend parsing matches backend
        expect(frontendParsed.header.dataLength).toBe(parsed.header.dataLength);
        expect(frontendParsed.data.length).toBe(parsed.data.length);
        expect(frontendParsed.header.dataLength).toBe(
          frontendParsed.data.length,
        );

        const frontendDecrypted = await frontendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.WithLength,
          new Uint8Array(wallet.getPrivateKey()),
          new Uint8Array(encrypted),
        );

        expect(frontendDecrypted.length).toBe(testPayload.length);
        expect(Buffer.from(frontendDecrypted)).toEqual(testPayload);
      } catch (error) {
        // Analyze raw data structure when frontend fails
        let offset = 0;

        // Validate version
        expect(encrypted[offset]).toBe(1);
        offset += 1;

        // Validate cipher suite
        expect(encrypted[offset]).toBe(1);
        offset += 1;

        // Validate encryption type
        expect(encrypted[offset]).toBeDefined();
        offset += 1;

        // Validate ephemeral public key (33 bytes)
        const ephemeralKey = encrypted.subarray(offset, offset + 33);
        expect(ephemeralKey).toHaveLength(33);
        offset += 33;

        // Validate IV (12 bytes)
        const iv = encrypted.subarray(offset, offset + 12);
        expect(iv).toHaveLength(12);
        offset += 12;

        // Validate auth tag (16 bytes)
        const authTag = encrypted.subarray(offset, offset + 16);
        expect(authTag).toHaveLength(16);
        offset += 16;

        // Validate data length (8 bytes)
        const dataLengthBuffer = encrypted.subarray(offset, offset + 8);
        const dataLength = Number(dataLengthBuffer.readBigUInt64BE(0));
        expect(dataLengthBuffer).toHaveLength(8);
        expect(dataLength).toBeGreaterThan(0);
        offset += 8;

        // Validate remaining data matches expected length
        const remainingData = encrypted.subarray(offset);
        expect(remainingData.length).toBe(dataLength);

        throw error;
      }
    });

    it('should compare byte-by-byte encryption output', async () => {
      const backendService = new ECIESService(config);
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);

      const testMessage = Buffer.from('test message');
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        wallet.getPublicKey(),
      ]);

      // Create multiple encryptions to validate consistency
      for (let i = 0; i < 3; i++) {
        const encrypted = backendService.encryptWithLength(
          publicKey,
          testMessage,
        );

        expect(encrypted.length).toBeGreaterThan(testMessage.length);

        // Parse and validate
        const backendSingle = new EciesSingleRecipientCore(config);
        const parsed = backendSingle.parseEncryptedMessage(
          EciesEncryptionTypeEnum.WithLength,
          encrypted,
        );

        expect(parsed.header.dataLength).toBeGreaterThan(0);
        expect(parsed.data.length).toBeGreaterThan(0);
        expect(parsed.header.dataLength).toEqual(parsed.data.length);

        // Verify decryption works
        const decrypted = backendService.decryptWithLengthAndHeader(
          Buffer.from(wallet.getPrivateKey()),
          encrypted,
        );

        expect(decrypted).toEqual(testMessage);
      }
    });

    it('should identify the root cause of length calculation', () => {
      // Test the length calculation logic directly
      const backendSingle = new EciesSingleRecipientCore(config);

      // Create a minimal test case
      const testMessage = Buffer.from('hello');
      const { wallet } = new ECIESService(config).walletAndSeedFromMnemonic(
        testMnemonic,
      );
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        wallet.getPublicKey(),
      ]);

      const encrypted = backendSingle.encrypt(
        EciesEncryptionTypeEnum.WithLength, // single mode
        publicKey,
        testMessage,
      );

      expect(testMessage.length).toBe(5);
      expect(encrypted.length).toBeGreaterThan(testMessage.length);

      // Manual parsing to validate structure
      let offset = 0;

      // Version (1 byte)
      const version = encrypted[offset];
      expect(version).toBe(1);
      offset += 1;

      // CipherSuite (1 byte)
      const cipherSuite = encrypted[offset];
      expect(cipherSuite).toBe(1);
      offset += 1;

      // Encryption type (1 byte)
      const encType = encrypted[offset];
      expect(encType).toBeDefined();
      offset += 1;

      // Ephemeral public key (33 bytes)
      offset += 33;

      // IV (12 bytes)
      offset += 12;

      // Auth tag (16 bytes)
      offset += 16;

      // Data length (8 bytes for single mode)
      const dataLengthBuffer = encrypted.subarray(offset, offset + 8);
      const storedDataLength = Number(dataLengthBuffer.readBigUInt64BE(0));
      expect(storedDataLength).toBeGreaterThan(0);
      offset += 8;

      // Actual encrypted data
      const actualEncryptedData = encrypted.subarray(offset);
      expect(actualEncryptedData.length).toBeGreaterThan(0);

      // Critical validation: stored length must match actual data length
      expect(storedDataLength).toBe(actualEncryptedData.length);
    });
  });
});
