import { Member as BackendMember } from '../src/member';
import { ECIESService as BackendECIESService } from '../src/services/ecies/service';
import { getNodeRuntimeConfiguration } from '../src/constants';
import {
  EmailString,
  Member as FrontendMember,
  ECIESService as FrontendECIESService,
  getEciesI18nEngine,
  IECIESConfig,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

describe('ECIES Bidirectional Compatibility', () => {
  let config: IECIESConfig;
  let frontendService: FrontendECIESService;
  let backendService: BackendECIESService;
  let frontendMember: FrontendMember;
  let backendMember: BackendMember;
  let testMnemonic: SecureString;

  beforeAll(() => {
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
    backendService = new BackendECIESService(getEciesI18nEngine(), config);
    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  beforeAll(() => {
    const email = new EmailString('test@example.com');

    // Create frontend member
    const frontendResult = FrontendMember.newMember(
      frontendService,
      MemberType.User,
      'Frontend User',
      email,
      testMnemonic,
    );
    frontendMember = frontendResult.member;

    // Create backend member with same mnemonic for compatibility
    const backendResult = BackendMember.newMember(
      backendService,
      MemberType.User,
      'Backend User',
      email,
      testMnemonic,
    );
    backendMember = backendResult.member;
  });

  afterAll(() => {
    frontendMember?.dispose();
    backendMember?.dispose();
  });

  describe('Cross-Platform Member Communication', () => {
    it('should have identical public keys from same mnemonic', () => {
      expect(Buffer.from(frontendMember.publicKey)).toEqual(
        backendMember.publicKey,
      );
    });

    it('should encrypt/decrypt messages between frontend and backend members', async () => {
      const testMessage = 'Hello from cross-platform ECIES!';

      // Frontend encrypts for backend
      const frontendEncrypted = await frontendMember.encryptData(testMessage);
      const backendDecrypted = backendMember.decryptData(
        Buffer.from(frontendEncrypted),
      );
      expect(backendDecrypted.toString()).toEqual(testMessage);

      // Backend encrypts for frontend
      const backendEncrypted = backendMember.encryptData(testMessage);
      const frontendDecrypted = await frontendMember.decryptData(
        backendEncrypted,
      );
      expect(Buffer.from(frontendDecrypted).toString()).toEqual(testMessage);
    });

    it('should handle various message types cross-platform', async () => {
      const testCases = [
        'Simple ASCII text',
        'Unicode: 🔐🌍🚀 émojis and àccénts',
        JSON.stringify({ test: 'object', number: 42 }),
        'Multi\nline\ntext\nwith\nbreaks',
        '', // Empty string
        'A'.repeat(1000), // Large message
      ];

      for (const testCase of testCases) {
        if (!testCase) continue; // Skip empty string

        // Frontend → Backend
        const frontendEncrypted = await frontendMember.encryptData(testCase);
        const backendDecrypted = backendMember.decryptData(
          Buffer.from(frontendEncrypted),
        );
        expect(backendDecrypted.toString()).toEqual(testCase);

        // Backend → Frontend
        const backendEncrypted = backendMember.encryptData(testCase);
        const frontendDecrypted = await frontendMember.decryptData(
          backendEncrypted,
        );
        expect(Buffer.from(frontendDecrypted).toString()).toEqual(testCase);
      }
    });

    it('should sign/verify messages cross-platform', () => {
      const testData = Buffer.from('Cross-platform signature test');

      // Frontend signs, backend verifies
      const frontendSignature = frontendMember.sign(testData);
      const frontendVerified = backendMember.verify(
        Buffer.from(frontendSignature) as any,
        testData,
      );
      expect(frontendVerified).toBe(true);

      // Backend signs, frontend verifies
      const backendSignature = backendMember.sign(testData);
      const backendVerified = frontendMember.verify(
        new Uint8Array(backendSignature) as any,
        testData,
      );
      expect(backendVerified).toBe(true);
    });
  });

  describe('Service Level Cross-Platform Tests', () => {
    it('should encrypt/decrypt at service level cross-platform', async () => {
      const testMessage = Buffer.from('Service level test message');
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const privateKey = Buffer.from(wallet.getPrivateKey());
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);

      // Backend service encrypts, frontend service decrypts
      const backendEncrypted = backendService.encryptSimpleOrSingle(
        false, // single mode
        publicKey,
        testMessage,
      );

      const frontendDecrypted =
        await frontendService.decryptSimpleOrSingleWithHeader(
          false, // single mode
          new Uint8Array(privateKey),
          new Uint8Array(backendEncrypted),
        );

      expect(Buffer.from(frontendDecrypted)).toEqual(testMessage);

      // Frontend service encrypts, backend service decrypts
      const frontendEncrypted = await frontendService.encryptSimpleOrSingle(
        false, // single mode
        new Uint8Array(publicKey),
        new Uint8Array(testMessage),
      );

      const backendDecrypted = backendService.decryptSimpleOrSingleWithHeader(
        false, // single mode
        privateKey,
        Buffer.from(frontendEncrypted),
      );

      expect(backendDecrypted).toEqual(testMessage);
    });

    it('should handle both simple and single modes cross-platform', async () => {
      const testMessage = Buffer.from('Mode compatibility test');
      const { wallet } = backendService.walletAndSeedFromMnemonic(testMnemonic);
      const privateKey = Buffer.from(wallet.getPrivateKey());
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);

      // Test simple mode
      const backendSimple = backendService.encryptSimpleOrSingle(
        true,
        publicKey,
        testMessage,
      );
      const frontendSimpleDecrypted =
        await frontendService.decryptSimpleOrSingleWithHeader(
          true,
          new Uint8Array(privateKey),
          new Uint8Array(backendSimple),
        );
      expect(Buffer.from(frontendSimpleDecrypted)).toEqual(testMessage);

      // Test single mode
      const backendSingle = backendService.encryptSimpleOrSingle(
        false,
        publicKey,
        testMessage,
      );
      const frontendSingleDecrypted =
        await frontendService.decryptSimpleOrSingleWithHeader(
          false,
          new Uint8Array(privateKey),
          new Uint8Array(backendSingle),
        );
      expect(Buffer.from(frontendSingleDecrypted)).toEqual(testMessage);
    });
  });

  describe('Error Handling Cross-Platform', () => {
    it('should reject corrupted data on both platforms', async () => {
      const testMessage = 'Error handling test';
      const backendEncrypted = backendMember.encryptData(testMessage);

      // Corrupt the data
      const corrupted = Buffer.from(backendEncrypted);
      corrupted[corrupted.length - 1] ^= 0xff;

      // Both should reject corrupted data
      expect(() => backendMember.decryptData(corrupted)).toThrow();
      await expect(frontendMember.decryptData(corrupted)).rejects.toThrow();
    });

    it('should reject wrong private keys on both platforms', async () => {
      const testMessage = 'Wrong key test';
      const encrypted = await frontendMember.encryptData(testMessage);

      // Create different member with different key
      const wrongMnemonic = backendService.generateNewMnemonic();
      const wrongBackend = BackendMember.newMember(
        backendService,
        MemberType.User,
        'Wrong User',
        new EmailString('wrong@example.com'),
        wrongMnemonic,
      );
      const wrongFrontend = FrontendMember.newMember(
        frontendService,
        MemberType.User,
        'Wrong User',
        new EmailString('wrong@example.com'),
        wrongMnemonic,
      );

      // Both should reject with wrong keys
      expect(() =>
        wrongBackend.member.decryptData(Buffer.from(encrypted)),
      ).toThrow();
      await expect(
        wrongFrontend.member.decryptData(Buffer.from(encrypted)),
      ).rejects.toThrow();

      wrongBackend.member.dispose();
      wrongFrontend.member.dispose();
    });
  });
});
