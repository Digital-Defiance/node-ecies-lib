/**
 * Dependency Injection Integration Test
 * Tests that Member can be created with injected services
 * Tests that services can be created with injected dependencies
 * Verifies all functionality works with dependency injection
 * Validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';

import { Member } from '../../src/member';
import { AESGCMService } from '../../src/services/aes-gcm';
import { ECIESService } from '../../src/services/ecies/service';
import { EncryptionStream } from '../../src/services/encryption-stream';
import { MultiRecipientProcessor } from '../../src/services/multi-recipient-processor';
import { ProgressTracker } from '../../src/services/progress-tracker';
import { Constants } from '@digitaldefiance/node-ecies-lib';

describe('Dependency Injection Integration', () => {
  describe('12.2 Dependency injection integration test', () => {
    let eciesService: ECIESService;

    beforeEach(() => {
      eciesService = new ECIESService();
    });

    it('should create Member with injected ECIESService and perform full workflow', async () => {
      // Create member with injected service
      const { member, mnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      );

      // Verify member was created
      expect(member).toBeDefined();
      expect(member.name).toBe('Alice');
      expect(member.hasPrivateKey).toBe(true);

      // Test signing
      const data = Buffer.from([1, 2, 3, 4, 5]);
      const signature = member.sign(data);
      expect(signature).toBeDefined();
      expect(member.verify(signature, data)).toBe(true);

      // Test encryption/decryption
      const message = 'Hello, World!';
      const encrypted = await member.encryptData(message);
      const decrypted = await member.decryptData(encrypted);
      const decryptedText = decrypted.toString('utf-8');
      expect(decryptedText).toBe(message);

      // Clean up
      member.dispose();
      mnemonic.dispose();
    });

    it('should create multiple Members with same service instance', async () => {
      // Create two members with the same service
      const { member: alice, mnemonic: aliceMnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      );

      const { member: bob, mnemonic: bobMnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Bob',
        new EmailString('bob@example.com'),
      );

      // Verify both members work
      expect(alice.name).toBe('Alice');
      expect(bob.name).toBe('Bob');

      // Test cross-member encryption
      const message = 'Secret message from Alice to Bob';
      const encrypted = await alice.encryptData(message, bob.publicKey);
      const decrypted = await bob.decryptData(encrypted);
      const decryptedText = decrypted.toString('utf-8');
      expect(decryptedText).toBe(message);

      // Clean up
      alice.dispose();
      bob.dispose();
      aliceMnemonic.dispose();
      bobMnemonic.dispose();
    });

    it('should create EncryptionStream with injected ECIESService', () => {
      // Create encryption stream with injected service
      const stream = new EncryptionStream(
        Constants,
        Constants.ECIES_CONFIG,
        eciesService,
      );

      // Verify stream was created
      expect(stream).toBeDefined();
    });

    it('should create MultiRecipientProcessor with injected ECIESService', () => {
      // Create processor with injected service
      const processor = new MultiRecipientProcessor(
        Constants,
        Constants.ECIES_CONFIG,
        eciesService.core,
        undefined,
        eciesService.core.consts,
      );

      // Verify processor was created
      expect(processor).toBeDefined();
    });

    it('should create Member from mnemonic with injected service', () => {
      // Generate mnemonic
      const mnemonic = eciesService.generateNewMnemonic();

      // Create member from mnemonic with injected service
      const member = Member.fromMnemonic(
        mnemonic,
        eciesService,
        MemberType.User,
        'Charlie',
        new EmailString('charlie@example.com'),
      );

      // Verify member works
      expect(member).toBeDefined();
      expect(member.name).toBe('Charlie');
      expect(member.hasPrivateKey).toBe(true);

      // Test signing
      const data = Buffer.from([10, 20, 30]);
      const signature = member.sign(data);
      expect(member.verify(signature, data)).toBe(true);

      // Clean up
      member.dispose();
      mnemonic.dispose();
    });

    it('should create Member from JSON with injected service', () => {
      // Create original member
      const { member: original, mnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'David',
        new EmailString('david@example.com'),
      );

      // Serialize to JSON
      const json = original.toJson();

      // Create member from JSON with injected service
      const restored = Member.fromJson(json, eciesService);

      // Verify restored member matches original
      expect(restored.name).toBe(original.name);
      expect(restored.email.toString()).toBe(original.email.toString());
      expect(restored.publicKey).toEqual(original.publicKey);

      // Clean up
      original.dispose();
      restored.dispose();
      mnemonic.dispose();
    });

    it('should support AESGCMService with dependency injection', () => {
      // Create AES-GCM service
      const aesService = new AESGCMService();

      // Verify service was created
      expect(aesService).toBeDefined();
      expect(aesService.ALGORITHM_NAME).toBeDefined();
      expect(aesService.MODE).toBeDefined();
      expect(aesService.KEY_BITS).toBeDefined();
    });

    it('should support complex workflow with multiple services and members', async () => {
      // Create multiple service instances
      const service1 = new ECIESService();
      const service2 = new ECIESService();

      // Create members with different services
      const { member: alice, mnemonic: aliceMnemonic } = Member.newMember(
        service1,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      );

      const { member: bob, mnemonic: bobMnemonic } = Member.newMember(
        service2,
        MemberType.User,
        'Bob',
        new EmailString('bob@example.com'),
      );

      // Test cross-service encryption
      const message = 'Cross-service message';
      const encrypted = await alice.encryptData(message, bob.publicKey);
      const decrypted = await bob.decryptData(encrypted);
      const decryptedText = decrypted.toString('utf-8');
      expect(decryptedText).toBe(message);

      // Clean up
      alice.dispose();
      bob.dispose();
      aliceMnemonic.dispose();
      bobMnemonic.dispose();
    });

    it('should support service reuse across multiple operations', async () => {
      // Create single service instance
      const sharedService = new ECIESService();

      // Create multiple members
      const members: Member[] = [];
      const mnemonics: any[] = [];

      for (let i = 0; i < 3; i++) {
        const { member, mnemonic } = Member.newMember(
          sharedService,
          MemberType.User,
          `User ${i}`,
          new EmailString(`user${i}@example.com`),
        );
        members.push(member);
        mnemonics.push(mnemonic);
      }

      // Verify all members work
      for (let i = 0; i < 3; i++) {
        expect(members[i].name).toBe(`User ${i}`);

        // Test signing
        const data = Buffer.from([i, i + 1, i + 2]);
        const signature = members[i].sign(data);
        expect(members[i].verify(signature, data)).toBe(true);
      }

      // Test cross-member encryption
      const message = 'Shared service message';
      const encrypted = await members[0].encryptData(
        message,
        members[1].publicKey,
      );
      const decrypted = await members[1].decryptData(encrypted);
      const decryptedText = decrypted.toString('utf-8');
      expect(decryptedText).toBe(message);

      // Clean up
      members.forEach((m) => m.dispose());
      mnemonics.forEach((m) => m.dispose());
    });

    it('should support ProgressTracker with dependency injection', () => {
      // Create progress tracker
      const tracker = new ProgressTracker();

      // Verify tracker works
      expect(tracker).toBeDefined();

      // Test progress tracking
      const progress = tracker.update(50);
      expect(progress.bytesProcessed).toBe(50);
    });

    it('should support full encryption workflow with all injected dependencies', async () => {
      // Create all services
      const ecies = new ECIESService();
      const stream = new EncryptionStream(
        Constants,
        Constants.ECIES_CONFIG,
        ecies,
      );
      const tracker = new ProgressTracker();

      // Create sender and recipient
      const { member: sender, mnemonic: senderMnemonic } = Member.newMember(
        ecies,
        MemberType.User,
        'Sender',
        new EmailString('sender@example.com'),
      );

      const { member: recipient, mnemonic: recipientMnemonic } =
        Member.newMember(
          ecies,
          MemberType.User,
          'Recipient',
          new EmailString('recipient@example.com'),
        );

      // Test encryption
      const message = 'Full workflow test message';
      const encrypted = await sender.encryptData(message, recipient.publicKey);
      const decrypted = await recipient.decryptData(encrypted);
      const decryptedText = decrypted.toString('utf-8');
      expect(decryptedText).toBe(message);

      // Test progress tracking
      const progress = tracker.update(encrypted.length);
      expect(progress.bytesProcessed).toBe(encrypted.length);

      // Clean up
      sender.dispose();
      recipient.dispose();
      senderMnemonic.dispose();
      recipientMnemonic.dispose();
    });
  });
});
