import {
  EciesEncryptionTypeEnum,
  EmailString,
  ECIESService as FrontendECIESService,
  EciesCryptoCore as FrontendEciesCryptoCore,
  EciesSingleRecipient as FrontendEciesSingleRecipient,
  Member as FrontendMember,
  IECIESConfig,
  MemberType,
  SecureString,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { getNodeRuntimeConfiguration, Constants as NodeConstants } from '../src/constants';
import { Wallet } from '@ethereumjs/wallet';
import { createECDH, randomBytes } from 'crypto';
import { ISimpleKeyPairBuffer } from '../src/interfaces/simple-key-pair-buffer';
import { Member as BackendMember } from '../src/member';
import { EciesCryptoCore as BackendEciesCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService as BackendECIESService } from '../src/services/ecies/service';
import { EciesSingleRecipientCore as BackendEciesSingleRecipient } from '../src/services/ecies/single-recipient';
import { SignatureBuffer } from '../src/types';

describe('ECIES Cross-Platform Compatibility', () => {
  let config: IECIESConfig;
  let frontendService: FrontendECIESService;
  let backendService: BackendECIESService;
  let testMnemonic: SecureString;
  let testMessage: Buffer;
  let receiverWallet: Wallet;
  let receiverKeyPair: ISimpleKeyPairBuffer;

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

    frontendService = new FrontendECIESService(config);
    backendService = new BackendECIESService(config);
    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
    testMessage = Buffer.from('Hello, ECIES compatibility test!');
    receiverWallet = Wallet.generate();
    receiverKeyPair = {
      privateKey: Buffer.from(receiverWallet.getPrivateKey()),
      publicKey: Buffer.from(receiverWallet.getPublicKey()),
    };
  });

  describe('Core Crypto Components', () => {
    it('should generate identical key pairs from same mnemonic', () => {
      const frontendCore = new FrontendEciesCryptoCore(config);
      const backendCore = new BackendEciesCryptoCore(config);

      const frontendWallet =
        frontendCore.walletAndSeedFromMnemonic(testMnemonic);
      const backendWallet = backendCore.walletAndSeedFromMnemonic(testMnemonic);

      // Compare private keys
      expect(Array.from(frontendWallet.wallet.getPrivateKey())).toEqual(
        Array.from(backendWallet.wallet.getPrivateKey()),
      );

      // Compare public keys
      expect(Array.from(frontendWallet.wallet.getPublicKey())).toEqual(
        Array.from(backendWallet.wallet.getPublicKey()),
      );
    });

    it('should normalize public keys identically', () => {
      const frontendCore = new FrontendEciesCryptoCore(config);
      const backendCore = new BackendEciesCryptoCore(config);

      const { wallet } = frontendCore.walletAndSeedFromMnemonic(testMnemonic);
      const rawPublicKey = wallet.getPublicKey();
      const publicKeyWithPrefix = Buffer.concat([
        Buffer.from([0x04]),
        rawPublicKey,
      ]);

      const frontendNormalized = frontendCore.normalizePublicKey(
        new Uint8Array(publicKeyWithPrefix),
      );
      const backendNormalized =
        backendCore.normalizePublicKey(publicKeyWithPrefix);

      expect(Buffer.from(frontendNormalized)).toEqual(backendNormalized);
    });

    it('should compute identical shared secrets', () => {
      const frontendCore = new FrontendEciesCryptoCore(config);
      const backendCore = new BackendEciesCryptoCore(config);

      // Generate two key pairs
      const mnemonic1 = frontendCore.generateNewMnemonic();
      const mnemonic2 = backendCore.generateNewMnemonic();

      const { wallet: wallet1 } =
        frontendCore.walletAndSeedFromMnemonic(mnemonic1);
      const { wallet: wallet2 } =
        backendCore.walletAndSeedFromMnemonic(mnemonic2);

      const privateKey1 = wallet1.getPrivateKey();
      const publicKey2 = Buffer.concat([
        Buffer.from([0x04]),
        wallet2.getPublicKey(),
      ]);

      // Compute shared secret on frontend
      const frontendSecret = frontendCore.computeSharedSecret(
        new Uint8Array(privateKey1),
        new Uint8Array(publicKey2),
      );

      // Compute shared secret on backend using ECDH directly
      const ecdh = createECDH(config.curveName);
      ecdh.setPrivateKey(privateKey1);
      const backendSecret = ecdh.computeSecret(publicKey2);

      expect(Buffer.from(frontendSecret)).toEqual(backendSecret);
    });
  });

  describe('Single Recipient Encryption', () => {
    let frontendSingle: FrontendEciesSingleRecipient;
    let backendSingle: BackendEciesSingleRecipient;
    let receiverKeyPair: { privateKey: Buffer; publicKey: Buffer };

    beforeEach(() => {
      frontendSingle = new FrontendEciesSingleRecipient(config);
      backendSingle = new BackendEciesSingleRecipient(config);

      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      receiverKeyPair = {
        privateKey: Buffer.from(wallet.getPrivateKey()),
        publicKey: Buffer.concat([Buffer.from([0x04]), wallet.getPublicKey()]),
      };
    });

    it('should encrypt/decrypt simple mode cross-platform', async () => {
      // Backend encrypts, frontend decrypts
      const backendEncrypted = backendSingle.encrypt(
        true, // simple mode
        receiverKeyPair.publicKey,
        testMessage,
      );

      const frontendDecrypted = await frontendSingle.decryptWithHeader(
        EciesEncryptionTypeEnum.Simple,
        new Uint8Array(receiverKeyPair.privateKey),
        new Uint8Array(backendEncrypted),
      );

      expect(Buffer.from(frontendDecrypted)).toEqual(testMessage);

      // Frontend encrypts, backend decrypts
      const frontendEncrypted = await frontendSingle.encrypt(
        true, // simple mode
        new Uint8Array(receiverKeyPair.publicKey),
        new Uint8Array(testMessage),
      );

      const backendDecrypted = backendSingle.decryptWithHeader(
        EciesEncryptionTypeEnum.Simple,
        receiverKeyPair.privateKey,
        Buffer.from(frontendEncrypted),
      );

      expect(backendDecrypted).toEqual(testMessage);
    });

    it('should encrypt/decrypt single mode cross-platform', async () => {
      // Backend encrypts, frontend decrypts
      const backendEncrypted = backendSingle.encrypt(
        false, // single mode
        receiverKeyPair.publicKey,
        testMessage,
      );

      const frontendDecrypted = await frontendSingle.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        new Uint8Array(receiverKeyPair.privateKey),
        new Uint8Array(backendEncrypted),
      );

      expect(Buffer.from(frontendDecrypted)).toEqual(testMessage);

      // Frontend encrypts, backend decrypts
      const frontendEncrypted = await frontendSingle.encrypt(
        false, // single mode
        new Uint8Array(receiverKeyPair.publicKey),
        new Uint8Array(testMessage),
      );

      const backendDecrypted = backendSingle.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        receiverKeyPair.privateKey,
        Buffer.from(frontendEncrypted),
      );

      expect(backendDecrypted).toEqual(testMessage);
    });

    it('should parse headers identically', async () => {
      const encrypted = backendSingle.encrypt(
        false, // single mode
        receiverKeyPair.publicKey,
        testMessage,
      );

      const frontendParsed = frontendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        new Uint8Array(encrypted),
      );

      const backendParsed = backendSingle.parseEncryptedMessage(
        EciesEncryptionTypeEnum.Single,
        encrypted,
      );

      expect(Buffer.from(frontendParsed.header.ephemeralPublicKey)).toEqual(
        backendParsed.header.ephemeralPublicKey,
      );
      expect(Buffer.from(frontendParsed.header.iv)).toEqual(
        backendParsed.header.iv,
      );
      expect(Buffer.from(frontendParsed.header.authTag)).toEqual(
        backendParsed.header.authTag,
      );
      expect(frontendParsed.header.dataLength).toEqual(
        backendParsed.header.dataLength,
      );
    });
  });

  describe('Service Level Compatibility', () => {
    it('should encrypt/decrypt using services cross-platform', async () => {
      // Backend service encrypts, frontend service decrypts
      const backendEncrypted = backendService.encryptSimpleOrSingle(
        false, // single mode
        Buffer.from(receiverKeyPair.publicKey),
        testMessage,
      );

      const frontendDecrypted =
        await frontendService.decryptSimpleOrSingleWithHeader(
          false, // single mode
          new Uint8Array(receiverKeyPair.privateKey),
          new Uint8Array(backendEncrypted),
        );

      expect(Buffer.from(frontendDecrypted)).toEqual(testMessage);

      // Frontend service encrypts, backend service decrypts
      const frontendEncrypted = await frontendService.encryptSimpleOrSingle(
        false, // single mode
        new Uint8Array(receiverKeyPair.publicKey),
        new Uint8Array(testMessage),
      );

      const backendDecrypted = backendService.decryptSimpleOrSingleWithHeader(
        false, // single mode
        receiverKeyPair.privateKey,
        Buffer.from(frontendEncrypted),
      );

      expect(backendDecrypted).toEqual(testMessage);
    });
  });

  describe('ECIES Member Compatibility', () => {
    let frontendMember: FrontendMember;
    let backendMember: BackendMember;

    beforeEach(() => {
      const email = new EmailString('test@example.com');

      // Create frontend member
      const frontendResult = FrontendMember.newMember(
        frontendService,
        MemberType.User,
        'Test User',
        email,
        testMnemonic,
      );
      frontendMember = frontendResult.member;

      // Create backend member with same mnemonic
      const backendResult = BackendMember.newMember(
        backendService,
        MemberType.User,
        'Test User',
        email,
        testMnemonic,
      );
      backendMember = backendResult.member;
    });

    afterAll(() => {
      frontendMember.dispose();
      backendMember.dispose();
    });

    it('should have identical public keys', () => {
      expect(Buffer.from(frontendMember.publicKey)).toEqual(
        backendMember.publicKey,
      );
    });

    it('should encrypt/decrypt between members cross-platform', async () => {
      const testData = 'Cross-platform member test data';

      // Frontend member encrypts, backend member decrypts
      const frontendEncrypted = await frontendMember.encryptData(testData);
      const backendDecrypted = backendMember.decryptData(
        Buffer.from(frontendEncrypted),
      );
      expect(backendDecrypted.toString()).toEqual(testData);

      // Backend member encrypts, frontend member decrypts
      const backendEncrypted = backendMember.encryptData(testData);
      const frontendDecrypted = await frontendMember.decryptData(
        backendEncrypted,
      );
      expect(Buffer.from(frontendDecrypted).toString()).toEqual(testData);
    });

    it('should sign/verify messages cross-platform', () => {
      const testData = Buffer.from('Test signature data');

      // Frontend signs, backend verifies
      const frontendSignature = frontendMember.sign(testData);
      const frontendVerified = backendMember.verify(
        Buffer.from(frontendSignature) as SignatureBuffer,
        testData,
      );
      expect(frontendVerified).toBe(true);

      // Backend signs, frontend verifies
      const backendSignature = backendMember.sign(testData);
      const backendVerified = frontendMember.verify(
        new Uint8Array(backendSignature) as SignatureUint8Array,
        testData,
      );
      expect(backendVerified).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject empty messages', async () => {
      const emptyMessage = Buffer.alloc(0);

      expect(() => {
        backendService.encryptSimpleOrSingle(
          false,
          receiverKeyPair.publicKey,
          emptyMessage,
        );
      }).toThrow();
    });

    it('should handle large messages', async () => {
      const largeMessage = randomBytes(1024 * 100); // 100KB

      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        receiverKeyPair.publicKey,
        largeMessage,
      );

      const decrypted = await frontendService.decryptSimpleOrSingleWithHeader(
        false,
        new Uint8Array(receiverKeyPair.privateKey),
        new Uint8Array(encrypted),
      );

      expect(Buffer.from(decrypted)).toEqual(largeMessage);
    });

    it('should reject corrupted data', async () => {
      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        receiverKeyPair.publicKey,
        testMessage,
      );

      // Corrupt the encrypted data
      const corrupted = Buffer.from(encrypted);
      corrupted[corrupted.length - 1] ^= 0xff;

      await expect(
        frontendService.decryptSimpleOrSingleWithHeader(
          false,
          new Uint8Array(receiverKeyPair.privateKey),
          new Uint8Array(corrupted),
        ),
      ).rejects.toThrow();
    });

    it('should reject wrong private key', async () => {
      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        receiverKeyPair.publicKey,
        testMessage,
      );

      const wrongMnemonic = backendService.generateNewMnemonic();
      const { wallet: wrongWallet } =
        backendService.walletAndSeedFromMnemonic(wrongMnemonic);
      const wrongPrivateKey = wrongWallet.getPrivateKey();

      await expect(
        frontendService.decryptSimpleOrSingleWithHeader(
          false,
          new Uint8Array(wrongPrivateKey),
          new Uint8Array(encrypted),
        ),
      ).rejects.toThrow();
    });
  });

  describe('Performance Comparison', () => {
    const iterations = 10;
    const messageSize = 1024; // 1KB

    it('should have comparable encryption performance', async () => {
      const message = randomBytes(messageSize);

      // Backend performance
      const backendStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        backendService.encryptSimpleOrSingle(
          false,
          receiverKeyPair.publicKey,
          message,
        );
      }
      const backendTime = Date.now() - backendStart;

      // Frontend performance
      const frontendStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await frontendService.encryptSimpleOrSingle(
          false,
          new Uint8Array(receiverKeyPair.publicKey),
          new Uint8Array(message),
        );
      }
      const frontendTime = Date.now() - frontendStart;

      // Performance should be within reasonable bounds (frontend may be slower due to async)
      expect(frontendTime).toBeLessThan(backendTime * 10);
    });

    it('should have comparable decryption performance', async () => {
      const message = randomBytes(messageSize);
      const encrypted = backendService.encryptSimpleOrSingle(
        false,
        receiverKeyPair.publicKey,
        message,
      );

      // Backend performance
      const backendStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        backendService.decryptSimpleOrSingleWithHeader(
          false,
          receiverKeyPair.privateKey,
          encrypted,
        );
      }
      const backendTime = Date.now() - backendStart;

      // Frontend performance
      const frontendStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await frontendService.decryptSimpleOrSingleWithHeader(
          false,
          new Uint8Array(receiverKeyPair.privateKey),
          new Uint8Array(encrypted),
        );
      }
      const frontendTime = Date.now() - frontendStart;

      // Log performance results for analysis - this is expected output for performance tests
      console.log(
        `Backend decryption: ${backendTime}ms for ${iterations} iterations`,
      );
      console.log(
        `Frontend decryption: ${frontendTime}ms for ${iterations} iterations`,
      );

      // Performance should be within reasonable bounds
      expect(frontendTime).toBeLessThan(backendTime * 10);
    });
  });

  describe('Data Format Validation', () => {
    it('should produce identical header structures', async () => {
      const message = Buffer.from('Header structure test');

      const backendEncrypted = backendService.encryptSimpleOrSingle(
        false, // single mode
        receiverKeyPair.publicKey,
        message,
      );

      const frontendEncrypted = await frontendService.encryptSimpleOrSingle(
        false, // single mode
        new Uint8Array(receiverKeyPair.publicKey),
        new Uint8Array(message),
      );

      // Both should have the same header structure
      expect(backendEncrypted[0]).toEqual(frontendEncrypted[0]); // Encryption type
      expect(backendEncrypted.length).toBeGreaterThan(90); // Reasonable size (Header ~72 bytes + Message 21 bytes = 93 bytes)
      expect(frontendEncrypted.length).toBeGreaterThan(90); // Reasonable size
    });

    it('should handle different message types', async () => {
      const testCases = [
        Buffer.from('ASCII text'),
        Buffer.from('Unicode: 🔐🌍🚀'),
        Buffer.from([0x00, 0x01, 0x02, 0xff]), // Binary data
        Buffer.from(JSON.stringify({ test: 'object' })), // JSON
      ];

      for (const testCase of testCases) {
        const encrypted = backendService.encryptSimpleOrSingle(
          false,
          receiverKeyPair.publicKey,
          testCase,
        );

        const decrypted = await frontendService.decryptSimpleOrSingleWithHeader(
          false,
          new Uint8Array(receiverKeyPair.privateKey),
          new Uint8Array(encrypted),
        );

        expect(Buffer.from(decrypted)).toEqual(testCase);
      }
    });
  });
});
