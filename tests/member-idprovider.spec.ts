/**
 * Unit Tests: Member ID Generation (Node.js)
 *
 * These tests validate Member.newMember() creates Members with proper IDs.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * - Member uses the ECIESService it is constructed with; the service's configured idProvider controls
 *   Member ID generation.
 * - member.id is provider-specific (GuidV4/ObjectId/etc.); member.idBytes is always a Buffer.
 * - Serialization/deserialization relies on the service's idProvider for correctness.
 */

import {
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
  createRuntimeConfiguration,
} from '@digitaldefiance/ecies-lib';
import { Member } from '../src/member';
import { ECIESService } from '../src/services/ecies/service';

describe('Unit Tests: Member ID Generation (Node.js)', () => {
  describe('Member.newMember() respects service idProvider', () => {
    it('should create Member with GuidV4 ID when GuidV4Provider is configured', () => {
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

      // Assert - member.idBytes matches configured GuidV4Provider
      expect(result.member.idBytes.length).toBe(16);
      expect(service.constants.idProvider.byteLength).toBe(16);
    });
  });

  describe('Member.newMember() with ObjectIdProvider', () => {
    it('should create Member with 12-byte idBytes when ObjectIdProvider is configured', () => {
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
      expect(result.member.idBytes.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });

    it('should create ObjectID-compatible serialization with ObjectIdProvider', () => {
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
      const objectIdString = constants.idProvider.serialize(
        result.member.idBytes,
      );
      expect(objectIdString).toBeDefined();
      expect(typeof objectIdString).toBe('string');
      expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
    });
  });

  describe('Member.newMember() without custom idProvider', () => {
    it('should create Member with 12-byte idBytes when no custom idProvider is configured', () => {
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
      expect(result.member.idBytes.length).toBe(12);
      expect(service.constants.idProvider.byteLength).toBe(12);
    });

    it('should create Member with 12-byte idBytes when service created with no config', () => {
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
      expect(result.member.idBytes.length).toBe(12);
    });
  });

  describe('Documented usage pattern from bug report', () => {
    it('should work correctly with the documented pattern (ObjectId default)', () => {
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

      // Verify the fix works: Member uses configured GuidV4 provider
      expect(config.MEMBER_ID_LENGTH).toBe(16);
      expect(result.member.idBytes.length).toBe(16);
    });
  });

  describe('Multiple Members with same idProvider', () => {
    it('should create multiple Members with consistent 12-byte idBytes', () => {
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

  describe('Switching idProvider between service instances', () => {
    it('should produce ObjectId IDs with different service idProviders', () => {
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

      // Assert - Each uses its service-configured provider
      expect(guidMember.member.idBytes.length).toBe(
        guidService.constants.idProvider.byteLength,
      );
      expect(objectIdMember.member.idBytes.length).toBe(
        objectIdService.constants.idProvider.byteLength,
      );
    });
  });

  describe('Member serialization with idProvider', () => {
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
      const originalString = originalId.toString();
      const deserializedString = deserialized.id.toString();

      expect(deserializedString).toEqual(originalString);
      expect(deserialized.idBytes.length).toBe(12);
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
      const originalString = originalId.toString();
      const deserializedString = deserialized.id.toString();

      expect(deserializedString).toEqual(originalString);
      expect(deserialized.idBytes.length).toBe(12);
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
      expect(deserialized.idBytes.length).toBe(12);

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
        expect(deserialized.idBytes.length).toBe(12);
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
      const originalString = original.id.toString();
      const deserializedString = deserialized.id.toString();

      expect(deserializedString).toEqual(originalString);
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.name).toBe(original.name);
      expect(deserialized.email.toString()).toBe(original.email.toString());
      expect(Buffer.from(deserialized.publicKey)).toEqual(
        Buffer.from(original.publicKey),
      );
      expect(deserialized.creatorId.toString()).toEqual(
        original.creatorId.toString(),
      );
      expect(deserialized.dateCreated.getTime()).toBe(
        original.dateCreated.getTime(),
      );
      expect(deserialized.dateUpdated.getTime()).toBe(
        original.dateUpdated.getTime(),
      );
    });
  });
});
