import { Member as BackendMember } from '../src/member';
import { EciesCryptoCore } from '../src/services/ecies/crypto-core';
import { EciesMultiRecipient } from '../src/services/ecies/multi-recipient';
import { ECIESService } from '../src/services/ecies/service';
import {
  Constants as AppConstants,
  EmailString,
  IECIESConfig,
  MemberType,
  ECIESError,
  ECIESErrorTypeEnum,
} from '@digitaldefiance/ecies-lib';

describe('ECIES Multi-Recipient E2E', () => {
  let eciesMultiRecipient: EciesMultiRecipient;
  let recipients: BackendMember[];
  const originalMessage = Buffer.from(
    'This is a top-secret message for e2e testing.',
  );
  let eciesService: ECIESService;

  beforeAll(() => {
    const config: IECIESConfig = {
      curveName: AppConstants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath: AppConstants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: AppConstants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm: AppConstants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: AppConstants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: AppConstants.ECIES.SYMMETRIC.MODE,
    };
    const cryptoCore = new EciesCryptoCore(config);
    eciesService = new ECIESService(config);
    eciesMultiRecipient = new EciesMultiRecipient(cryptoCore);

    // Create mock recipients
    recipients = [
      BackendMember.newMember(
        eciesService,
        MemberType.User,
        'E2E Recipient 1',
        new EmailString('e2e1@example.com'),
      ).member,
      BackendMember.newMember(
        eciesService,
        MemberType.User,
        'E2E Recipient 2',
        new EmailString('e2e2@example.com'),
      ).member,
      BackendMember.newMember(
        eciesService,
        MemberType.User,
        'E2E Recipient 3',
        new EmailString('e2e3@example.com'),
      ).member,
    ];
  });

  it('should encrypt, build, parse, and decrypt a message for multiple recipients', () => {
    // 1. Encrypt the message for multiple recipients
    const encryptedResult = eciesMultiRecipient.encryptMultiple(
      recipients,
      originalMessage,
    );
    expect(encryptedResult).toBeDefined();

    // 2. Build the header
    const header =
      eciesMultiRecipient.buildECIESMultipleRecipientHeader(encryptedResult);
    expect(header).toBeInstanceOf(Buffer);

    // 3. Simulate the full encrypted buffer (header + message)
    const fullEncryptedBuffer = Buffer.concat([
      header,
      encryptedResult.encryptedMessage,
    ]);

    // 4. Parse the full encrypted buffer
    const parsedMessage =
      eciesMultiRecipient.parseMultiEncryptedBuffer(fullEncryptedBuffer);
    expect(parsedMessage).toBeDefined();
    expect(parsedMessage.recipientCount).toBe(recipients.length);
    expect(parsedMessage.dataLength).toBe(originalMessage.length);

    // 5. Decrypt for each recipient and verify
    recipients.forEach((recipient) => {
      const decryptedMessage =
        eciesMultiRecipient.decryptMultipleECIEForRecipient(
          parsedMessage,
          recipient,
        );
      expect(decryptedMessage.toString()).toEqual(originalMessage.toString());
    });
  });

  it('should fail to decrypt for a non-recipient', () => {
    // Encrypt the message
    const encryptedResult = eciesMultiRecipient.encryptMultiple(
      recipients,
      originalMessage,
    );
    const header =
      eciesMultiRecipient.buildECIESMultipleRecipientHeader(encryptedResult);
    const fullEncryptedBuffer = Buffer.concat([
      header,
      encryptedResult.encryptedMessage,
    ]);
    const parsedMessage =
      eciesMultiRecipient.parseMultiEncryptedBuffer(fullEncryptedBuffer);

    // Create an outsider
    const outsider = BackendMember.newMember(
      eciesService,
      MemberType.User,
      'Outsider',
      new EmailString('outsider@example.com'),
    ).member;

    // Expect decryption to fail for the outsider
    expect(() => {
      eciesMultiRecipient.decryptMultipleECIEForRecipient(
        parsedMessage,
        outsider,
      );
    }).toThrowType(ECIESError, (error: ECIESError) => {
          expect(error.type).toBe(ECIESErrorTypeEnum.RecipientNotFound);
        },);
  });
});
