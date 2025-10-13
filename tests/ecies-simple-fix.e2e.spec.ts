import {
  EmailString,
  ECIESService as FrontendECIESService,
  Member as FrontendMember,
  IECIESConfig,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { getNodeRuntimeConfiguration } from '../src/constants';
import { Member as BackendMember } from '../src/member';
import { ECIESService as BackendECIESService } from '../src/services/ecies/service';

// https://docs.rs/bip39/latest/src/bip39/lib.rs.html

describe('ECIES Simple Fix Test', () => {
  let config: IECIESConfig;
  let frontendService: FrontendECIESService;
  let backendService: BackendECIESService;
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
    backendService = new BackendECIESService(config);
    testMnemonic = new SecureString(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    );
  });

  describe('Fixed Compatibility', () => {
    it('should work with members created from same mnemonic', async () => {
      const email = new EmailString('test@example.com');

      // Create members with same mnemonic
      const frontendResult = FrontendMember.newMember(
        frontendService,
        MemberType.User,
        'Frontend User',
        email,
        testMnemonic,
      );
      const frontendMember = frontendResult.member;

      const backendResult = BackendMember.newMember(
        backendService,
        MemberType.User,
        'Backend User',
        email,
        testMnemonic,
      );
      const backendMember = backendResult.member;

      try {
        // Test message
        const testMessage = 'Hello cross-platform!';

        // Frontend encrypts, backend decrypts
        const frontendEncrypted = await frontendMember.encryptData(testMessage);
        const backendDecrypted = backendMember.decryptData(
          Buffer.from(frontendEncrypted),
        );
        expect(backendDecrypted.toString()).toEqual(testMessage);

        // Backend encrypts, frontend decrypts
        const backendEncrypted = backendMember.encryptData(testMessage);
        const frontendDecrypted = await frontendMember.decryptData(
          backendEncrypted,
        );
        expect(Buffer.from(frontendDecrypted).toString()).toEqual(testMessage);

        // Success message - this is expected output for this specific test
        console.log('✅ Cross-platform encryption/decryption working!');
      } finally {
        frontendMember.dispose();
        backendMember.dispose();
      }
    });
  });
});
