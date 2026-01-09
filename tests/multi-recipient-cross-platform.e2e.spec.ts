import {
  EmailString,
  ECIESService as FrontendECIESService,
  Member as FrontendMember,
  IECIESConfig,
  MemberType,
} from '@digitaldefiance/ecies-lib';

import { getNodeRuntimeConfiguration } from '../src/constants';
import { Member as BackendMember } from '../src/member';
import { ECIESService as BackendECIESService } from '../src/services/ecies/service';

describe('Multi-Recipient Cross-Platform Compatibility', () => {
  let frontendService: FrontendECIESService;
  let backendService: BackendECIESService;
  let config: IECIESConfig;

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
  });

  it('should encrypt with Backend and decrypt with Frontend (Multi-Recipient)', async () => {
    const message = Buffer.from('Multi-recipient cross-platform test');

    // Create recipients using Frontend lib (simulating browser users)
    const recipient1 = FrontendMember.newMember(
      frontendService,
      MemberType.User,
      'Frontend User 1',
      new EmailString('user1@example.com'),
    ).member;

    const recipient2 = FrontendMember.newMember(
      frontendService,
      MemberType.User,
      'Frontend User 2',
      new EmailString('user2@example.com'),
    ).member;

    // Backend encrypts for these frontend users
    // We need to convert Frontend members to a format Backend accepts
    // Backend expects objects with id (Buffer) and publicKey (Buffer)
    const backendRecipients = [
      {
        id: recipient1.idBytes,
        publicKey: Buffer.from(recipient1.publicKey),
      },
      {
        id: recipient2.idBytes,
        publicKey: Buffer.from(recipient2.publicKey),
      },
    ];

    const encryptedObj = await backendService.encryptMultiple(
      backendRecipients as any[],
      message,
    );

    // Serialize to full message (Header + Body)
    const header =
      backendService.buildECIESMultipleRecipientHeader(encryptedObj);
    const fullMessage = Buffer.concat([header, encryptedObj.encryptedMessage]);

    // Frontend decrypts
    // Frontend Member.decryptData only supports Single/Simple. We must use the service directly for Multi.
    // We need to access the protected multiRecipient component or use a public method if available.
    // Casting to any to access internal component for testing purposes.
    const frontendMulti = (frontendService as any).multiRecipient;

    const parsed = frontendMulti.parseMessage(new Uint8Array(fullMessage));

    // Convert recipient IDs to Uint8Array for frontend compatibility
    const frontendRecipient1Id = new Uint8Array(recipient1.idBytes);
    const frontendRecipient2Id = new Uint8Array(recipient2.idBytes);

    const decrypted1 = await frontendMulti.decryptMultipleForRecipient(
      parsed,
      frontendRecipient1Id,
      new Uint8Array(recipient1.privateKey!.value),
    );
    expect(Buffer.from(decrypted1)).toEqual(message);

    const decrypted2 = await frontendMulti.decryptMultipleForRecipient(
      parsed,
      frontendRecipient2Id,
      new Uint8Array(recipient2.privateKey!.value),
    );
    expect(Buffer.from(decrypted2)).toEqual(message);
  });

  it('should encrypt with Frontend and decrypt with Backend (Multi-Recipient)', async () => {
    const message = Buffer.from('Frontend to Backend Multi-Recipient');

    // Create recipients using Backend lib
    const recipient1 = BackendMember.newMember(
      backendService,
      MemberType.User,
      'Backend User 1',
      new EmailString('backend1@example.com'),
    ).member;

    const recipient2 = BackendMember.newMember(
      backendService,
      MemberType.User,
      'Backend User 2',
      new EmailString('backend2@example.com'),
    ).member;

    // Frontend encrypts for these backend users
    // Frontend expects { id: Uint8Array, publicKey: Uint8Array }
    const frontendRecipients = [
      {
        id: new Uint8Array(recipient1.idBytes),
        publicKey: new Uint8Array(recipient1.publicKey),
      },
      {
        id: new Uint8Array(recipient2.idBytes),
        publicKey: new Uint8Array(recipient2.publicKey),
      },
    ];

    const encryptedObj = await frontendService.encryptMultiple(
      frontendRecipients,
      new Uint8Array(message),
    );

    // Serialize to full message (Header + Body)
    const frontendMulti = (frontendService as any).multiRecipient;
    const header = frontendMulti.buildHeader(encryptedObj);
    const fullMessage = Buffer.concat([
      Buffer.from(header),
      Buffer.from(encryptedObj.encryptedMessage),
    ]);

    // Backend decrypts
    // Backend Member.decryptData only supports Single/Simple. We must use the service directly.
    const parsed = backendService.parseMultiEncryptedBuffer(fullMessage);

    const decrypted1 = backendService.decryptMultipleECIEForRecipient(
      parsed,
      recipient1,
    );
    expect(decrypted1).toEqual(message);

    const decrypted2 = backendService.decryptMultipleECIEForRecipient(
      parsed,
      recipient2,
    );
    expect(decrypted2).toEqual(message);
  });
});
