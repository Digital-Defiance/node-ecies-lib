/**
 * Unit Tests: MemberBuilder idProvider Integration
 *
 * Feature: fix-idprovider-member-generation
 * These tests validate specific examples and edge cases for MemberBuilder
 * respecting the configured idProvider from ECIESService.
 */

import {
  createRuntimeConfiguration,
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
  GuidV4,
} from '@digitaldefiance/ecies-lib';

import { MemberBuilder } from '../../src/builders/member-builder';
import { ECIESService } from '../../src/services/ecies';

describe('Unit Tests: MemberBuilder idProvider Integration', () => {
  describe('MemberBuilder with GuidV4Provider', () => {
    it('should create Member with 16-byte ID when GuidV4Provider is configured', () => {
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

      // Assert
      expect(result.member.id.length).toBe(16);
      expect(service.constants.idProvider.byteLength).toBe(16);
    });

    it('should create UUID-compatible ID with GuidV4Provider', () => {
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

      // Assert - GuidV4.fromBuffer should succeed
      const guid = GuidV4.fromBuffer(result.member.id);
      expect(guid).toBeDefined();
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should create Member with 16-byte ID using fluent API', () => {
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
      expect(result.member.id.length).toBe(16);
      expect(result.mnemonic).toBeDefined();
    });
  });

  describe('MemberBuilder with ObjectIdProvider', () => {
    it('should create Member with 12-byte ID when ObjectIdProvider is configured', () => {
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
      expect(result.member.id.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });

    it('should create ObjectID-compatible ID with ObjectIdProvider', () => {
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

      // Assert - ObjectID serialization should succeed
      const objectIdString = constants.idProvider.serialize(result.member.id);
      expect(objectIdString).toBeDefined();
      expect(typeof objectIdString).toBe('string');
      expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
    });
  });

  describe('MemberBuilder without custom idProvider', () => {
    it('should create Member with 12-byte ID when no custom idProvider is configured', () => {
      // Arrange - Use service without custom idProvider
      const service = new ECIESService();

      // Act
      const result = MemberBuilder.create()
        .withEciesService(service)
        .withType(MemberType.User)
        .withName('Test User')
        .withEmail(new EmailString('test@example.com'))
        .build();

      // Assert - Should use default 12-byte ObjectID
      expect(result.member.id.length).toBe(12);
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

      // Assert - Should use default 12-byte ObjectID
      expect(result.member.id.length).toBe(12);
    });
  });

  describe('MemberBuilder with multiple Members', () => {
    it('should create multiple Members with consistent ID lengths', () => {
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

      // Assert - All should have 16-byte IDs
      expect(member1.member.id.length).toBe(16);
      expect(member2.member.id.length).toBe(16);
      expect(member3.member.id.length).toBe(16);

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

      // Assert
      expect(guidMember.member.id.length).toBe(16);
      expect(objectIdMember.member.id.length).toBe(12);
    });
  });

  describe('MemberBuilder with createdBy', () => {
    it('should respect idProvider when creating Member with createdBy', () => {
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
      expect(result.member.id.length).toBe(16);
      expect(result.member.creatorId).toEqual(creator.member.id);
      expect(creator.member.id.length).toBe(16);
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
      expect(result.member.id.length).toBe(12);
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
      expect(result.id.length).toBe(12);
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
      expect(result.id.length).toBe(12);
      expect(result.id).toEqual(original.member.id);
    });
  });
});
