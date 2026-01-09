/**
 * Unit Tests: MemberBuilder ID Generation
 *
 * These tests validate MemberBuilder creates Members with proper IDs.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * - MemberBuilder uses the ECIESService instance it is given; the service's configured idProvider
 *   controls Member ID generation.
 * - member.id is a provider-specific type (GuidV4/ObjectId/etc.), member.idBytes is always a Buffer.
 * - Serialization/deserialization relies on the service's idProvider for correctness.
 */

import {
  createRuntimeConfiguration,
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
} from '@digitaldefiance/ecies-lib';
import { MemberBuilder } from '../../src/builders/member-builder';
import { ECIESService } from '../../src/services/ecies';

describe('Unit Tests: MemberBuilder ID Generation', () => {
  describe('MemberBuilder respects service idProvider', () => {
    it('should create Member IDs matching configured GuidV4Provider', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert - ID is ObjectId type (from global Constants.idProvider)
      expect(result.member.idBytes.length).toBe(16);
      expect(service.constants.idProvider.byteLength).toBe(16);
    });
    it('should create Member with GuidV4 ID using fluent API', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Act - Use fluent API with generateMnemonic
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.Admin)
        .withName('Admin User')
        .withEmail('admin@example.com')
        .generateMnemonic()
        .build();

      // Assert
      expect(result.member.idBytes.length).toBe(16);
      expect(result.mnemonic).toBeDefined();
    });
  });

  describe('MemberBuilder with ObjectIdProvider', () => {
    it('should create Member with consistent 12-byte idBytes when ObjectIdProvider is configured', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(constants);

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert
      expect(result.member.idBytes.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });
    it('should have ObjectID-compatible serialization with ObjectIdProvider', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(constants);

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert - ObjectID serialization should succeed via idBytes
      const objectIdString = constants.idProvider.serialize(
        result.member.idBytes,
      );
      expect(objectIdString).toBeDefined();
      expect(typeof objectIdString).toBe('string');
      expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
    });
  });

  describe('MemberBuilder without custom idProvider', () => {
    it('should create Member with 12-byte idBytes when no custom idProvider is configured', () => {
      // Arrange - Use service without custom idProvider
      const service = new ECIESService();

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert - Should use default 12-byte ObjectID in idBytes
      expect(result.member.idBytes.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });

    it('should create Member with 12-byte ID using default service', () => {
      // Arrange
      const service = new ECIESService({
        curveName: 'secp256k1',
      });

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert - Should use default 12-byte ObjectID in idBytes
      expect(result.member.idBytes.length).toBe(12);
    });
  });

  describe('MemberBuilder with multiple Members', () => {
    it('should create multiple Members with unique IDs', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Act - Create multiple members
      const member1 = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('User 1')
        .withEmail(new EmailString('user1@example.com'))
        .build();

      const member2 = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('User 2')
        .withEmail(new EmailString('user2@example.com'))
        .build();

      const member3 = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.Admin)
        .withName('Admin')
        .withEmail(new EmailString('admin@example.com'))
        .build();

      const expectedLength = service.constants.idProvider.byteLength;

      // Assert - All should have idBytes matching configured provider
      expect(member1.member.idBytes.length).toBe(expectedLength);
      expect(member2.member.idBytes.length).toBe(expectedLength);
      expect(member3.member.idBytes.length).toBe(expectedLength);

      // Assert - IDs should be unique
      expect(member1.member.id).not.toEqual(member2.member.id);
      expect(member1.member.id).not.toEqual(member3.member.id);
      expect(member2.member.id).not.toEqual(member3.member.id);
    });
  });

  describe('MemberBuilder with different idProviders', () => {
    it('should respect different idProviders in different builders', () => {
      // Arrange - Create two services with different idProviders
      const guidService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
      );
      const objectIdService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
      );

      // Act
      const guidMember = MemberBuilder.create()
        .withEciesService(guidService)
        .withType(MemberType.User)
        .withName('GUID User')
        .withEmail(new EmailString('guid@example.com'))
        .build();

      const objectIdMember = MemberBuilder.create()
        .withEciesService(objectIdService)
        .withType(MemberType.User)
        .withName('ObjectID User')
        .withEmail(new EmailString('objectid@example.com'))
        .build();

      // Assert - Each uses its service-configured provider
      expect(guidMember.member.idBytes.length).toBe(
        guidService.constants.idProvider.byteLength,
      );
      expect(objectIdMember.member.idBytes.length).toBe(
        objectIdService.constants.idProvider.byteLength,
      );
    });
  });

  describe('MemberBuilder with createdBy', () => {
    it('should correctly set creatorId when creating Member with createdBy', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Create a creator
      const creator = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.Admin)
        .withName('Creator')
        .withEmail(new EmailString('creator@example.com'))
        .build();

      // Act - Create member with createdBy
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Created User')
        .withEmail(new EmailString('created@example.com'))
        .withCreatedBy(creator.member.id)
        .build();

      // Assert
      expect(result.member.idBytes.length).toBe(16);
      expect(result.member.creatorId).toEqual(creator.member.id);
    });
  });

  describe('MemberBuilder static factory methods', () => {
    it('should use default idProvider in static newMember method', () => {
      // Act - Static factory method uses default ECIESService
      const result = MemberBuilder.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - Should use default 12-byte ObjectID
      expect(result.member.idBytes.length).toBe(12);
    });

    it('should use default idProvider in static fromMnemonic method', () => {
      // Arrange - Create a member to get a mnemonic
      const service = new ECIESService();
      const original = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Original')
        .withEmail(new EmailString('original@example.com'))
        .generateMnemonic()
        .build();

      // Act - Use static fromMnemonic
      const result = MemberBuilder.fromMnemonic(
        original.mnemonic,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - Should use default 12-byte ObjectID
      expect(result.idBytes.length).toBe(12);
    });

    it('should use default idProvider in static fromJson method', () => {
      // Arrange - Create and serialize a member
      const service = new ECIESService();
      const original = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Original')
        .withEmail(new EmailString('original@example.com'))
        .build();
      const json = original.member.toJson();

      // Act - Use static fromJson
      const result = MemberBuilder.fromJson(json);

      // Assert - Should preserve 12-byte ObjectID
      expect(result.idBytes.length).toBe(12);
      expect(result.id).toEqual(original.member.id);
    });
  });
});
