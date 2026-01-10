/**
 * Integration Tests: idProvider End-to-End Workflows (Node.js)
 *
 * Feature: fix-idprovider-member-generation
 * Task: 12. Write integration tests for end-to-end workflows
 *
 * These tests verify complete end-to-end workflows involving idProvider configuration,
 * including the documented usage pattern from the bug report, Member lifecycle workflows,
 * MemberBuilder workflows, and service instance switching.
 *
 * Requirements: 5.1, 5.4, 8.7
 */

import {
  createRuntimeConfiguration,
  GuidV4Provider,
  ObjectIdProvider,
  Guid,
  EmailString,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { MemberBuilder } from '../../src/builders/member-builder';
import { Member } from '../../src/member';
import { ECIESService } from '../../src/services/ecies/service';

describe('Integration: idProvider End-to-End Workflows (Node.js)', () => {
  describe('Documented Usage Pattern from Bug Report', () => {
    /**
     * This test verifies the exact pattern from the bug report works end-to-end.
     * Requirements: 5.1
     */
    it('should work correctly with the documented pattern end-to-end', () => {
      // Step 1: Configure with GuidV4Provider (from bug report)
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      // Step 2: Create ECIESService with config
      const service = new ECIESService(config);

      // Step 3: Create Member using the service
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test',
        new EmailString('test@example.com'),
      );

      // Step 4: Verify the fix - ID should be 16 bytes
      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(result.member.idBytes.length).toBe(16);

      // Step 5: Verify Guid.fromBuffer succeeds (this was failing before the fix)
      const guid = Guid.fromPlatformBuffer(result.member.idBytes);
      expect(guid).toBeDefined();
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should support the complete documented workflow with encryption', () => {
      // Configure with GuidV4Provider
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Create Member
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify Member ID is UUID-compatible
      expect(result.member.idBytes.length).toBe(16);
      const guid = Guid.fromPlatformBuffer(result.member.idBytes);
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Use the Member's keys for encryption
      const message = Buffer.from('Hello, World!');
      const encrypted = service.encryptSimpleOrSingle(
        true,
        result.member.publicKey,
        message,
      );

      // Decrypt using the mnemonic-derived private key
      const keyPair = service.mnemonicToSimpleKeyPairBuffer(result.mnemonic);
      const decrypted = service.decryptSimpleOrSingleWithHeader(
        true,
        keyPair.privateKey,
        encrypted,
      );

      expect(decrypted.toString()).toBe('Hello, World!');
    });
  });

  describe('Member Creation → Serialization → Deserialization → ID Conversion Workflow', () => {
    /**
     * This test verifies the complete Member lifecycle with idProvider.
     * Requirements: 5.4
     */
    it('should preserve GuidV4 ID through complete lifecycle', () => {
      // Step 1: Create service with GuidV4Provider
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Step 2: Create Member
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = result.member.idBytes;
      expect(originalId.length).toBe(16);

      // Step 3: Convert to UUID string
      const originalGuid = Guid.fromPlatformBuffer(originalId);
      const uuidString = originalGuid.asFullHexGuid;
      expect(uuidString).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Step 4: Serialize Member to JSON
      const json = result.member.toJson();
      expect(json).toBeDefined();

      // Step 5: Deserialize Member from JSON
      const deserialized = Member.fromJson(json, service);
      expect(deserialized.idBytes.length).toBe(16);

      // Step 6: Verify ID is preserved
      expect(Buffer.from(deserialized.idBytes)).toEqual(
        Buffer.from(originalId),
      );

      // Step 7: Convert deserialized ID to UUID string
      const deserializedGuid = Guid.fromPlatformBuffer(deserialized.idBytes);
      expect(deserializedGuid.asFullHexGuid).toBe(uuidString);
    });

    it('should preserve ObjectId ID through complete lifecycle', () => {
      // Step 1: Create service with ObjectIdProvider
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(config);

      // Step 2: Create Member
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = result.member.idBytes;
      expect(originalId.length).toBe(12);

      // Step 3: Convert to ObjectID string
      const objectIdString = config.idProvider.serialize(originalId);
      expect(objectIdString.length).toBe(24);
      expect(objectIdString).toMatch(/^[0-9a-f]{24}$/i);

      // Step 4: Serialize Member to JSON
      const json = result.member.toJson();
      expect(json).toBeDefined();

      // Step 5: Deserialize Member from JSON
      const deserialized = Member.fromJson(json, service);
      expect(deserialized.idBytes.length).toBe(12);

      // Step 6: Verify ID is preserved
      expect(Buffer.from(deserialized.idBytes)).toEqual(
        Buffer.from(originalId),
      );

      // Step 7: Convert deserialized ID to ObjectID string
      const deserializedObjectIdString = config.idProvider.serialize(
        deserialized.idBytes,
      );
      expect(deserializedObjectIdString).toBe(objectIdString);
    });

    it('should handle multiple serialization/deserialization cycles', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Create Member
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = result.member.idBytes;

      // Multiple round-trips
      let member = result.member;
      for (let i = 0; i < 5; i++) {
        const json = member.toJson();
        member = Member.fromJson(json, service);
      }

      // Verify ID is still preserved
      // Convert both to Buffer for comparison (handle Node Buffer vs Uint8Array)
      const memberBufferNormalized = Buffer.isBuffer(member.idBytes)
        ? member.idBytes
        : Buffer.from(member.idBytes);
      const originalBufferNormalized = Buffer.isBuffer(originalId)
        ? originalId
        : Buffer.from(originalId);
      expect(memberBufferNormalized).toEqual(originalBufferNormalized);
      expect(memberBufferNormalized.length).toBe(16);

      // Verify UUID conversion still works
      const guid = Guid.fromPlatformBuffer(member.idBytes);
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('MemberBuilder Workflow with Custom idProvider', () => {
    /**
     * This test verifies MemberBuilder respects idProvider configuration.
     * Requirements: 5.4, 8.7
     */
    it('should create Member with correct ID using MemberBuilder fluent API', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Builder User')
        .withEmail(new EmailString('builder@example.com'))
        .generateMnemonic()
        .build();

      expect(result.member.idBytes.length).toBe(16);
      expect(result.mnemonic).toBeDefined();

      // Verify UUID compatibility
      const guid = Guid.fromPlatformBuffer(result.member.idBytes);
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should support MemberBuilder workflow with createdBy relationship', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Create admin
      const admin = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.Admin)
        .withName('Admin')
        .withEmail(new EmailString('admin@example.com'))
        .build();

      // Create user with createdBy
      const user = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('User')
        .withEmail(new EmailString('user@example.com'))
        .withCreatedBy(admin.member.id)
        .build();

      // Verify both have 16-byte IDs
      expect(admin.member.idBytes.length).toBe(16);
      expect(user.member.idBytes.length).toBe(16);

      // Verify createdBy relationship
      expect(user.member.creatorId).toEqual(admin.member.id);

      // Verify both IDs are UUID-compatible
      const adminGuid = Guid.fromPlatformBuffer(admin.member.idBytes);
      const userGuid = Guid.fromPlatformBuffer(user.member.idBytes);
      expect(adminGuid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(userGuid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should support complete MemberBuilder workflow with serialization', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Create Member using builder
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Builder User')
        .withEmail(new EmailString('builder@example.com'))
        .generateMnemonic()
        .build();

      // Serialize
      const json = result.member.toJson();

      // Deserialize
      const deserialized = Member.fromJson(json, service);

      // Verify ID preserved
      // Convert both to Buffer for comparison (handle Node Buffer vs Uint8Array)
      const deserializedBufferNormalized = Buffer.isBuffer(deserialized.idBytes)
        ? deserialized.idBytes
        : Buffer.from(deserialized.idBytes);
      const resultBufferNormalized = Buffer.isBuffer(result.member.idBytes)
        ? result.member.idBytes
        : Buffer.from(result.member.idBytes);
      expect(deserializedBufferNormalized).toEqual(resultBufferNormalized);
      expect(deserializedBufferNormalized.length).toBe(16);

      // Verify all properties preserved
      expect(deserialized.name).toBe('Builder User');
      expect(deserialized.email.toString()).toBe('builder@example.com');
      expect(deserialized.type).toBe(MemberType.User);
    });
  });

  describe('Multiple Members with Same idProvider', () => {
    /**
     * This test verifies consistent ID lengths across multiple Members.
     * Requirements: 5.4, 8.7
     */
    it('should create multiple Members with consistent 16-byte IDs', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      const members: Member[] = [];
      for (let i = 0; i < 10; i++) {
        const result = Member.newMember(
          service,
          MemberType.User,
          `User ${i}`,
          new EmailString(`user${i}@example.com`),
        );
        members.push(result.member);
      }

      // Verify all have 16-byte IDs
      for (const member of members) {
        expect(member.idBytes.length).toBe(16);
      }

      // Verify all IDs are unique
      const idStrings = members.map(
        (m) => Guid.fromPlatformBuffer(m.idBytes).asFullHexGuid,
      );
      const uniqueIds = new Set(idStrings);
      expect(uniqueIds.size).toBe(members.length);

      // Verify all are valid UUIDs
      for (const idString of idStrings) {
        expect(idString).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }
    });

    it('should create multiple Members with consistent 12-byte IDs', () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(config);

      const members: Member[] = [];
      for (let i = 0; i < 10; i++) {
        const result = Member.newMember(
          service,
          MemberType.User,
          `User ${i}`,
          new EmailString(`user${i}@example.com`),
        );
        members.push(result.member);
      }

      // Verify all have 12-byte IDs
      for (const member of members) {
        expect(member.idBytes.length).toBe(12);
      }

      // Verify all IDs are unique
      const idStrings = members.map((m) =>
        config.idProvider.serialize(m.idBytes),
      );
      const uniqueIds = new Set(idStrings);
      expect(uniqueIds.size).toBe(members.length);

      // Verify all are valid ObjectID strings
      for (const idString of idStrings) {
        expect(idString.length).toBe(24);
        expect(idString).toMatch(/^[0-9a-f]{24}$/i);
      }
    });
  });

  describe('Switching idProvider Between Service Instances', () => {
    /**
     * This test verifies that different service instances can use different idProviders.
     * Requirements: 5.4, 8.7
     */
    it('should support switching between GuidV4Provider and ObjectIdProvider', () => {
      // Create two services with different idProviders
      const guidConfig = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const objectIdConfig = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const guidService = new ECIESService(guidConfig);
      const objectIdService = new ECIESService(objectIdConfig);

      // Create Members with each service
      const guidMember = Member.newMember(
        guidService,
        MemberType.User,
        'GUID User',
        new EmailString('guid@example.com'),
      );

      const objectIdMember = Member.newMember(
        objectIdService,
        MemberType.User,
        'ObjectID User',
        new EmailString('objectid@example.com'),
      );

      // Verify different ID lengths
      expect(guidMember.member.idBytes.length).toBe(16);
      expect(objectIdMember.member.idBytes.length).toBe(12);

      // Verify each ID is compatible with its provider
      const guid = Guid.fromPlatformBuffer(guidMember.member.idBytes);
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      const objectIdString = objectIdConfig.idProvider.serialize(
        objectIdMember.member.idBytes,
      );
      expect(objectIdString.length).toBe(24);
      expect(objectIdString).toMatch(/^[0-9a-f]{24}$/i);
    });

    it('should maintain isolation between service instances', () => {
      // Create multiple services
      const services = [
        new ECIESService(
          createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
        ),
        new ECIESService(
          createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
        ),
        new ECIESService(
          createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
        ),
        new ECIESService(), // Default
      ];

      // Create Members with each service
      const members = services.map((service, i) =>
        Member.newMember(
          service,
          MemberType.User,
          `User ${i}`,
          new EmailString(`user${i}@example.com`),
        ),
      );

      // Verify expected ID lengths
      expect(members[0].member.idBytes.length).toBe(16); // GuidV4
      expect(members[1].member.idBytes.length).toBe(12); // ObjectId
      expect(members[2].member.idBytes.length).toBe(16); // GuidV4
      expect(members[3].member.idBytes.length).toBe(12); // Default (ObjectId)
    });

    it('should allow interleaved Member creation with different services', () => {
      const guidService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
      );
      const objectIdService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
      );

      // Interleave Member creation
      const m1 = Member.newMember(
        guidService,
        MemberType.User,
        'G1',
        new EmailString('g1@example.com'),
      );
      const m2 = Member.newMember(
        objectIdService,
        MemberType.User,
        'O1',
        new EmailString('o1@example.com'),
      );
      const m3 = Member.newMember(
        guidService,
        MemberType.User,
        'G2',
        new EmailString('g2@example.com'),
      );
      const m4 = Member.newMember(
        objectIdService,
        MemberType.User,
        'O2',
        new EmailString('o2@example.com'),
      );
      const m5 = Member.newMember(
        guidService,
        MemberType.User,
        'G3',
        new EmailString('g3@example.com'),
      );

      // Verify correct ID lengths
      expect(m1.member.idBytes.length).toBe(16);
      expect(m2.member.idBytes.length).toBe(12);
      expect(m3.member.idBytes.length).toBe(16);
      expect(m4.member.idBytes.length).toBe(12);
      expect(m5.member.idBytes.length).toBe(16);
    });
  });

  describe('End-to-End Encryption Workflow with idProvider', () => {
    /**
     * This test verifies encryption/decryption works correctly with custom idProvider.
     * Requirements: 5.1, 5.4
     */
    it('should support complete encryption workflow with GuidV4Provider', () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);

      // Create sender and recipient
      const sender = Member.newMember(
        service,
        MemberType.User,
        'Sender',
        new EmailString('sender@example.com'),
      );
      const recipient = Member.newMember(
        service,
        MemberType.User,
        'Recipient',
        new EmailString('recipient@example.com'),
      );

      // Verify both have 16-byte IDs
      expect(sender.member.idBytes.length).toBe(16);
      expect(recipient.member.idBytes.length).toBe(16);

      // Encrypt message for recipient
      const message = Buffer.from('Secret message');
      const encrypted = service.encryptSimpleOrSingle(
        true,
        recipient.member.publicKey,
        message,
      );

      // Decrypt using recipient's private key
      const recipientKeyPair = service.mnemonicToSimpleKeyPairBuffer(
        recipient.mnemonic,
      );
      const decrypted = service.decryptSimpleOrSingleWithHeader(
        true,
        recipientKeyPair.privateKey,
        encrypted,
      );

      expect(decrypted.toString()).toBe('Secret message');
    });
  });
});
