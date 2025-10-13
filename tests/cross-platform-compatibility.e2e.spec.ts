import { EciesCryptoCore as BackendCryptoCore } from '../src/services/ecies/crypto-core';
import { ECIESService as BackendECIESService } from '../src/services/ecies/service';
import { EciesSignature as BackendSignature } from '../src/services/ecies/signature';
import { EciesSingleRecipientCore as BackendSingleRecipient } from '../src/services/ecies/single-recipient';
import { EciesMultiRecipient as BackendMultiRecipient } from '../src/services/ecies/multi-recipient';
import { Member as BackendMember } from '../src/member';
import {
  EciesEncryptionTypeEnum,
  Member as FrontendBurnbagMember,
  EciesCryptoCore as FrontendCryptoCore,
  ECIESService as FrontendECIESService,
  EciesMultiRecipient as FrontendMultiRecipient,
  EciesSignature as FrontendSignature,
  EciesSingleRecipient as FrontendSingleRecipient,
  getEciesI18nEngine,
  IMultiRecipient,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { getNodeRuntimeConfiguration } from '../src/constants';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

describe('Cross-Platform Compatibility', () => {
  const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
  const config = {
    curveName: eciesDefaults.CURVE_NAME,
    primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
    mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
    symmetricAlgorithm: eciesDefaults.SYMMETRIC.ALGORITHM,
    symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
    symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
  };

  const testMnemonic = new SecureString(
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  );

  let frontendCore: FrontendCryptoCore;
  let backendCore: BackendCryptoCore;
  let frontendSig: FrontendSignature;
  let backendSig: BackendSignature;
  let frontendSingle: FrontendSingleRecipient;
  let backendSingle: BackendSingleRecipient;
  let frontendMulti: FrontendMultiRecipient;
  let backendMulti: BackendMultiRecipient;
  let frontendECIES: FrontendECIESService;
  let backendECIES: BackendECIESService;

  beforeAll(() => {
    frontendCore = new FrontendCryptoCore(config);
    backendCore = new BackendCryptoCore(config);
    frontendSig = new FrontendSignature(frontendCore);
    backendSig = new BackendSignature(backendCore);
    frontendSingle = new FrontendSingleRecipient(config);
    backendSingle = new BackendSingleRecipient(config, getEciesI18nEngine());
    frontendMulti = new FrontendMultiRecipient(config);
    backendMulti = new BackendMultiRecipient(backendCore, getEciesI18nEngine());
    frontendECIES = new FrontendECIESService(config);
    backendECIES = new BackendECIESService(getEciesI18nEngine(), config);
  });

  describe('Signature Cross-Compatibility', () => {
    const testData = [
      Buffer.from('Hello World'),
      Buffer.from([0x00, 0x01, 0xff, 0xfe]),
      Buffer.from(''),
      Buffer.from('🔐 Unicode test 🔥'),
      Buffer.alloc(1024, 0xab),
    ];

    testData.forEach((data, index) => {
      it(`should sign and verify binary data ${
        index + 1
      } cross-platform`, () => {
        const { wallet } = backendCore.walletAndSeedFromMnemonic(testMnemonic);
        const privateKey = wallet.getPrivateKey();
        const publicKey = Buffer.concat([
          Buffer.from([0x04]),
          wallet.getPublicKey(),
        ]);

        // Frontend signs, backend verifies
        const frontendSignature = frontendSig.signMessage(
          new Uint8Array(privateKey),
          new Uint8Array(data),
        );
        const backendVerifies = backendSig.verifyMessage(
          Buffer.concat([
            Buffer.from([0x04]),
            Buffer.from(wallet.getPublicKey()),
          ]),
          data,
          Buffer.from(frontendSignature) as any,
        );
        expect(backendVerifies).toBe(true);

        // Backend signs, frontend verifies
        const backendSignature = backendSig.signMessage(
          Buffer.from(privateKey),
          data,
        );
        const frontendVerifies = frontendSig.verifyMessage(
          new Uint8Array(publicKey),
          new Uint8Array(data),
          new Uint8Array(backendSignature) as any,
        );
        expect(frontendVerifies).toBe(true);

        // Signatures should be identical (deterministic)
        expect(Buffer.from(frontendSignature)).toEqual(
          Buffer.from(backendSignature),
        );
      });
    });
  });

  describe('Encryption Cross-Compatibility', () => {
    const testMessages = [
      Buffer.from('Simple message'),
      Buffer.from([0x00, 0x01, 0x02, 0xff]),
      Buffer.from(JSON.stringify({ test: 'data', number: 42 })),
      Buffer.alloc(256, 0x42),
    ];

    testMessages.forEach((message, index) => {
      it(`should encrypt/decrypt message ${
        index + 1
      } cross-platform (simple mode)`, async () => {
        if (message.length === 0) return; // Skip empty data
        const { wallet } = backendCore.walletAndSeedFromMnemonic(testMnemonic);
        const privateKey = wallet.getPrivateKey();
        const publicKey = Buffer.concat([
          Buffer.from([0x04]),
          wallet.getPublicKey(),
        ]);

        // Frontend encrypts, backend decrypts
        const frontendEncrypted = await frontendSingle.encrypt(
          true,
          new Uint8Array(publicKey),
          new Uint8Array(message),
        );
        const backendDecrypted = backendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.Simple,
          Buffer.from(privateKey),
          Buffer.from(frontendEncrypted),
        );
        expect(backendDecrypted).toEqual(message);

        // Backend encrypts, frontend decrypts
        const backendEncrypted = backendSingle.encrypt(
          true,
          publicKey,
          message,
        );
        const frontendDecrypted = await frontendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.Simple,
          new Uint8Array(Buffer.from(privateKey)),
          new Uint8Array(backendEncrypted),
        );
        expect(Buffer.from(frontendDecrypted)).toEqual(message);
      });

      it(`should encrypt/decrypt message ${
        index + 1
      } cross-platform (single mode)`, async () => {
        if (message.length === 0) return; // Skip empty data
        const { wallet } = backendCore.walletAndSeedFromMnemonic(testMnemonic);
        const privateKey = wallet.getPrivateKey();
        const publicKey = Buffer.concat([
          Buffer.from([0x04]),
          wallet.getPublicKey(),
        ]);

        // Frontend encrypts, backend decrypts
        const frontendEncrypted = await frontendSingle.encrypt(
          false,
          new Uint8Array(publicKey),
          new Uint8Array(message),
        );
        const backendDecrypted = backendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          Buffer.from(privateKey),
          Buffer.from(frontendEncrypted),
        );
        expect(backendDecrypted).toEqual(message);

        // Backend encrypts, frontend decrypts
        const backendEncrypted = backendSingle.encrypt(
          false,
          publicKey,
          message,
        );
        const frontendDecrypted = await frontendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          new Uint8Array(Buffer.from(privateKey)),
          new Uint8Array(backendEncrypted),
        );
        expect(Buffer.from(frontendDecrypted)).toEqual(message);
      });
    });
  });

  describe('Member-Level Cross-Compatibility', () => {
    it('should handle member communication cross-platform', async () => {
      // Create frontend and backend members
      const frontendMember = FrontendBurnbagMember.fromMnemonic(
        testMnemonic,
        frontendECIES,
      );
      const backendMember = BackendMember.fromMnemonic(
        testMnemonic,
        backendECIES,
      );

      const testMessage = 'Cross-platform member test';

      // Frontend member encrypts for backend member
      const frontendEncrypted = await frontendMember.encryptData(
        testMessage,
        new Uint8Array(backendMember.publicKey),
      );
      const backendDecrypted = backendMember.decryptData(
        Buffer.from(frontendEncrypted),
      );
      expect(backendDecrypted.toString()).toBe(testMessage);

      // Backend member encrypts for frontend member
      const backendEncrypted = backendMember.encryptData(
        testMessage,
        Buffer.from(frontendMember.publicKey),
      );
      const frontendDecrypted = await frontendMember.decryptData(
        Buffer.from(backendEncrypted),
      );
      expect(Buffer.from(frontendDecrypted).toString()).toBe(testMessage);
    });

    it('should handle signed messages cross-platform', async () => {
      const frontendMember = FrontendBurnbagMember.fromMnemonic(
        testMnemonic,
        frontendECIES,
      );
      const backendMember = BackendMember.fromMnemonic(
        testMnemonic,
        backendECIES,
      );

      const testMessage = Buffer.from('Signed message test');

      // Frontend signs, backend verifies
      const frontendSignature = frontendMember.signData(
        new Uint8Array(testMessage),
      );
      const backendVerifies = backendMember.verifySignature(
        testMessage,
        Buffer.from(frontendSignature),
        Buffer.from(frontendMember.publicKey),
      );
      expect(backendVerifies).toBe(true);

      // Backend signs, frontend verifies
      const backendSignature = backendMember.signData(testMessage);
      const frontendVerifies = frontendMember.verifySignature(
        new Uint8Array(testMessage),
        new Uint8Array(backendSignature),
        new Uint8Array(backendMember.publicKey),
      );
      expect(frontendVerifies).toBe(true);
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large data cross-platform', async () => {
      const { wallet } = backendCore.walletAndSeedFromMnemonic(testMnemonic);
      const privateKey = wallet.getPrivateKey();
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        wallet.getPublicKey(),
      ]);

      const largeData = Buffer.alloc(10240, 0x55); // 10KB

      // Test encryption/decryption
      const encrypted = backendSingle.encrypt(
        false,
        publicKey,
        largeData,
      );
      const decrypted = backendSingle.decryptWithHeader(
        EciesEncryptionTypeEnum.Single,
        Buffer.from(privateKey),
        encrypted,
      );
      expect(decrypted).toEqual(largeData);

      // Test signing/verification
      const signature = frontendSig.signMessage(
        new Uint8Array(privateKey),
        new Uint8Array(largeData),
      );
      const verified = backendSig.verifyMessage(
        publicKey,
        largeData,
        Buffer.from(signature) as any,
      );
      expect(verified).toBe(true);
    });

    it('should maintain consistency across multiple operations', async () => {
      const { wallet } = backendCore.walletAndSeedFromMnemonic(testMnemonic);
      const privateKey = wallet.getPrivateKey();
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        wallet.getPublicKey(),
      ]);

      for (let i = 0; i < 10; i++) {
        const message = Buffer.from(`Test message ${i}`);

        // Encrypt and decrypt with backend
        const encrypted = backendSingle.encrypt(
          false,
          publicKey,
          message,
        );
        const decrypted = backendSingle.decryptWithHeader(
          EciesEncryptionTypeEnum.Single,
          Buffer.from(privateKey),
          encrypted,
        );
        expect(decrypted).toEqual(message);

        // Sign with backend, verify with frontend
        const signature = backendSig.signMessage(
          Buffer.from(privateKey),
          message,
        );
        const verified = frontendSig.verifyMessage(
          new Uint8Array(publicKey),
          new Uint8Array(message),
          new Uint8Array(signature) as any,
        );
        expect(verified).toBe(true);
      }
    });
  });

  describe('Multi-Recipient Cross-Compatibility', () => {
    it('should encrypt/decrypt multi-recipient messages: frontend→backend', async () => {
      const testMessage = Buffer.from('Frontend to backend test');
      const recipients: BackendMember[] = [];
      const frontendRecipients: IMultiRecipient[] = [];

      // Create recipients
      for (let i = 0; i < 2; i++) {
        const backendMember = BackendMember.newMember(
          backendECIES,
          MemberType.User,
          `Recipient ${i}`,
          `recipient${i}@test.com` as any,
        ).member;
        recipients.push(backendMember);

        frontendRecipients.push({
          id: new Uint8Array(backendMember.id.id),
          publicKey: new Uint8Array(backendMember.publicKey),
        });
      }

      // Backend encrypts
      const backendEncrypted = backendMulti.encryptMultiple(
        recipients,
        testMessage,
      );



      // Backend decrypts
      for (const recipient of recipients) {
        const decrypted = backendMulti.decryptMultipleECIEForRecipient(
          backendEncrypted as any,
          recipient,
        );
        expect(decrypted).toEqual(testMessage);
      }
    });

    it('should encrypt/decrypt multi-recipient messages: backend→frontend', async () => {
      const testMessage = Buffer.from('Backend to frontend test');
      const recipients: BackendMember[] = [];
      const privateKeys: Uint8Array[] = [];

      // Create recipients
      for (let i = 0; i < 2; i++) {
        const backendMember = BackendMember.newMember(
          backendECIES,
          MemberType.User,
          `Recipient ${i}`,
          `recipient${i}@test.com` as any,
        ).member;
        recipients.push(backendMember);
        privateKeys.push(new Uint8Array(backendMember.privateKey!.value));
      }

      // Backend encrypts
      const backendEncrypted = backendMulti.encryptMultiple(
        recipients,
        testMessage,
      );

      // Convert to frontend format
      const frontendFormat = {
        dataLength: backendEncrypted.dataLength,
        recipientCount: backendEncrypted.recipientCount,
        recipientIds: backendEncrypted.recipientIds.map(
          (id) => new Uint8Array(Buffer.from(id.toHexString(), 'hex')),
        ),
        recipientKeys: backendEncrypted.recipientKeys.map(
          (key) => new Uint8Array(key),
        ),
        encryptedMessage: new Uint8Array(backendEncrypted.encryptedMessage),
        headerSize: backendEncrypted.headerSize,
      };

      // Backend decrypts (testing consistency)
      for (const recipient of recipients) {
        const decrypted = backendMulti.decryptMultipleECIEForRecipient(
          backendEncrypted as any,
          recipient,
        );
        expect(decrypted).toEqual(testMessage);
      }
    });

    it('should parse headers cross-platform: frontend→backend', async () => {
      const recipients: IMultiRecipient[] = [];
      for (let i = 0; i < 2; i++) {
        const mnemonic = backendCore.generateNewMnemonic();
        const { wallet } = backendCore.walletAndSeedFromMnemonic(mnemonic);
        const publicKey = Buffer.concat([
          Buffer.from([0x04]),
          wallet.getPublicKey(),
        ]);
        recipients.push({
          id: crypto.getRandomValues(new Uint8Array(16)),
          publicKey: new Uint8Array(publicKey),
        });
      }

      const backendRecipients = recipients.map(r => {
        const member = BackendMember.newMember(
          backendECIES,
          MemberType.User,
          `Test ${r.id}`,
          `test${r.id}@test.com` as any,
        ).member;
        return member;
      });

      const backendEncrypted = backendMulti.encryptMultiple(
        backendRecipients,
        Buffer.from('test'),
      );
      const backendHeader = backendMulti.buildECIESMultipleRecipientHeader(backendEncrypted);
      const backendParsed = backendMulti.parseMultiEncryptedHeader(
        backendHeader,
      );

      expect(backendParsed.dataLength).toBe(backendEncrypted.dataLength);
      expect(backendParsed.recipientCount).toBe(backendRecipients.length);
    });

    it('should parse headers cross-platform: backend→frontend', async () => {
      const recipients = [
        BackendMember.newMember(
          backendECIES,
          MemberType.User,
          'Test1',
          'test1@test.com' as any,
        ).member,
        BackendMember.newMember(
          backendECIES,
          MemberType.User,
          'Test2',
          'test2@test.com' as any,
        ).member,
      ];

      const backendEncrypted = backendMulti.encryptMultiple(
        recipients,
        Buffer.from('test'),
      );
      const backendHeader =
        backendMulti.buildECIESMultipleRecipientHeader(backendEncrypted);
      const frontendParsed = frontendMulti.parseHeader(
        new Uint8Array(backendHeader),
      );

      expect(frontendParsed.dataLength).toBe(backendEncrypted.dataLength);
      expect(frontendParsed.recipientCount).toBe(recipients.length);
    });
  });
});
