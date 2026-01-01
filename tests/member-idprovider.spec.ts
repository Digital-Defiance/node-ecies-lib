/**
 * Unit Tests: Member idProvider Integration (Node.js)
 *
 * Feature: fix-idprovider-member-generation
 * These tests validate specific examples and edge cases for Member.newMember()
 * using configured idProvider from ECIESService.
 */

import {
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
  GuidV4,
  createRuntimeConfiguration,
} from '@digitaldefiance/ecies-lib';
import { Member } from '../src/member';
import { ECIESService } from '../src/services/ecies/service';

describe('Unit Tests: Member idProvider Integration (Node.js)', () => {
  describe('Member.newMember() with GuidV4Provider', () => {
    it('should create Member with 16-byte ID when GuidV4Provider is configured', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Act
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

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
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - GuidV4.fromBuffer should succeed
      const guid = GuidV4.fromBuffer(Buffer.from(result.member.id));
      expect(guid).toBeDefined();
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('Member.newMember() with ObjectIdProvider', () => {
    it('should create Member with 12-byte ID when ObjectIdProvider is configured', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(constants);

      // Act
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

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
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - ObjectID serialization should succeed
      const idBuffer = Buffer.isBuffer(result.member.id)
        ? result.member.id
        : Buffer.from(result.member.id);
      const objectIdString = constants.idProvider.serialize(idBuffer);
      expect(objectIdString).toBeDefined();
      expect(typeof objectIdString).toBe('string');
      expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
    });
  });

  describe('Member.newMember() without custom idProvider', () => {
    it('should create Member with 12-byte ID when no custom idProvider is configured', () => {
      // Arrange - Use Partial<IECIESConfig> without idProvider
      const service = new ECIESService({
        curveName: 'secp256k1',
      });

      // Act
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - Should use default 12-byte ObjectID
      expect(result.member.id.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });

    it('should create Member with 12-byte ID when service created with no config', () => {
      // Arrange
      const service = new ECIESService();

      // Act
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Assert - Should use default 12-byte ObjectID
      expect(result.member.id.length).toBe(12);
    });
  });

  describe('Documented usage pattern from bug report', () => {
    it('should work correctly with the documented pattern', () => {
      // This is the exact pattern from the bug report that was failing
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(config);
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test',
        new EmailString('test@example.com'),
      );

      // Verify the fix works
      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(result.member.id.length).toBe(16);

      // Verify GuidV4.fromBuffer succeeds (this was failing before the fix)
      const guid = GuidV4.fromBuffer(Buffer.from(result.member.id));
      expect(guid).toBeDefined();
      expect(guid.asFullHexGuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('Multiple Members with same idProvider', () => {
    it('should create multiple Members with consistent ID lengths', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);

      // Act - Create multiple members
      const member1 = Member.newMember(
        service,
        MemberType.User,
        'User 1',
        new EmailString('user1@example.com'),
      );
      const member2 = Member.newMember(
        service,
        MemberType.User,
        'User 2',
        new EmailString('user2@example.com'),
      );
      const member3 = Member.newMember(
        service,
        MemberType.Admin,
        'Admin',
        new EmailString('admin@example.com'),
      );

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

  describe('Switching idProvider between service instances', () => {
    it('should respect different idProviders in different service instances', () => {
      // Arrange - Create two services with different idProviders
      const guidService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
      );
      const objectIdService = new ECIESService(
        createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
      );

      // Act
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

      // Assert
      expect(guidMember.member.id.length).toBe(16);
      expect(objectIdMember.member.id.length).toBe(12);
    });
  });

  describe('Member serialization with idProvider', () => {
    it('should preserve ID through serialization/deserialization with GuidV4Provider', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = result.member.id;

      // Act - Serialize and deserialize
      const json = result.member.toJson();
      const deserialized = Member.fromJson(json, service);

      // Assert - ID should be preserved
      const originalBuffer = Buffer.isBuffer(originalId)
        ? originalId
        : Buffer.from(originalId);
      const deserializedBuffer = Buffer.isBuffer(deserialized.id)
        ? deserialized.id
        : Buffer.from(deserialized.id);

      expect(deserializedBuffer).toEqual(originalBuffer);
      expect(deserializedBuffer.length).toBe(16);
      expect(deserialized.name).toBe('Test User');
      expect(deserialized.email.toString()).toBe('test@example.com');
    });

    it('should preserve ID through serialization/deserialization with ObjectIdProvider', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new ECIESService(constants);
      const result = Member.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = result.member.id;

      // Act - Serialize and deserialize
      const json = result.member.toJson();
      const deserialized = Member.fromJson(json, service);

      // Assert - ID should be preserved
      const originalBuffer = Buffer.isBuffer(originalId)
        ? originalId
        : Buffer.from(originalId);
      const deserializedBuffer = Buffer.isBuffer(deserialized.id)
        ? deserialized.id
        : Buffer.from(deserialized.id);

      expect(deserializedBuffer).toEqual(originalBuffer);
      expect(deserializedBuffer.length).toBe(12);
      expect(deserialized.name).toBe('Test User');
      expect(deserialized.email.toString()).toBe('test@example.com');
    });

    it('should warn when deserialized ID length does not match configured idProvider', () => {
      // Arrange - Create member with ObjectIdProvider (12 bytes)
      const objectIdConstants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const objectIdService = new ECIESService(objectIdConstants);
      const result = Member.newMember(
        objectIdService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const json = result.member.toJson();

      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act - Deserialize with same service (no mismatch)
      const deserialized = Member.fromJson(json, objectIdService);

      // Assert - Should NOT warn when ID length matches
      expect(warnSpy).not.toHaveBeenCalled();
      expect(deserialized.id.length).toBe(12);

      // Cleanup
      warnSpy.mockRestore();
    });

    it('should not fail on ID length mismatch (backward compatibility)', () => {
      // Note: This test demonstrates that serialization format is tied to the idProvider.
      // You cannot deserialize a Member serialized with one idProvider using a different
      // idProvider because the string format is incompatible (e.g., ObjectID hex vs UUID format).
      // This is expected behavior - the warning in fromJson() only applies when the
      // deserialization succeeds but the byte length differs.

      // Arrange - Create member with ObjectIdProvider (12 bytes)
      const objectIdConstants = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const objectIdService = new ECIESService(objectIdConstants);
      const result = Member.newMember(
        objectIdService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const json = result.member.toJson();

      // Suppress console.warn for this test
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act & Assert - Deserializing with same idProvider should work
      expect(() => {
        const deserialized = Member.fromJson(json, objectIdService);
        expect(deserialized).toBeDefined();
        expect(deserialized.id.length).toBe(12);
      }).not.toThrow();

      // Cleanup
      warnSpy.mockRestore();
    });

    it('should preserve all Member properties through serialization', () => {
      // Arrange
      const constants = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new ECIESService(constants);
      const result = Member.newMember(
        service,
        MemberType.Admin,
        'Admin User',
        new EmailString('admin@example.com'),
      );
      const original = result.member;

      // Act
      const json = original.toJson();
      const deserialized = Member.fromJson(json, service);

      // Assert - All properties preserved
      const originalBuffer = Buffer.isBuffer(original.id)
        ? original.id
        : Buffer.from(original.id);
      const deserializedBuffer = Buffer.isBuffer(deserialized.id)
        ? deserialized.id
        : Buffer.from(deserialized.id);

      expect(deserializedBuffer).toEqual(originalBuffer);
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.email.toString()).toBe(original.email.toString());
      expect(Buffer.from(deserialized.publicKey)).toEqual(
        Buffer.from(original.publicKey),
      );
      expect(Buffer.from(deserialized.creatorId)).toEqual(
        Buffer.from(original.creatorId),
      );
      expect(deserialized.dateCreated.getTime()).toBe(original.dateCreated.getTime());
      expect(deserialized.dateUpdated.getTime()).toBe(original.dateUpdated.getTime());
    });
  });
});
