/**
 * Property-Based Tests: Member idProvider Integration (Node.js)
 *
 * Feature: fix-idprovider-member-generation
 * These tests validate that Member.newMember() uses the configured idProvider
 * from ECIESService and generates IDs with the correct length and format.
 */

import * as fc from 'fast-check';
import {
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
  Guid,
  createRuntimeConfiguration,
} from '@digitaldefiance/ecies-lib';
import { Member } from '../src/member';
import { ECIESService } from '../src/services/ecies/service';

describe('Property-Based Tests: Member idProvider Integration (Node.js)', () => {
  /**
   * Property 4: Member ID Length Matches Configured idProvider
   * Feature: fix-idprovider-member-generation, Property 4: Member ID Length Matches Configured idProvider
   * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 5.2
   *
   * For any ECIESService with any idProvider configuration, when Member.newMember()
   * creates a Member, the Member.id.length should equal service.constants.idProvider.byteLength.
   */
  describe('Property 4: Member ID Length Matches Configured idProvider', () => {
    it('should generate Member IDs matching configured idProvider length', () => {
      fc.assert(
        fc.property(
          // Generate random idProvider configurations
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (constants, memberType, name, email) => {
            // Create service with configured idProvider
            const service = new ECIESService(constants);

            // Create member
            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify Member ID length matches configured idProvider
            expect(result.member.idBytes.length).toBe(
              service.constants.idProvider.byteLength,
            );
            expect(result.member.idBytes.length).toBe(
              constants.MEMBER_ID_LENGTH,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should generate 16-byte IDs with GuidV4Provider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new GuidV4Provider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify 16-byte GUID
            expect(result.member.idBytes.length).toBe(16);
            expect(service.constants.idProvider.byteLength).toBe(16);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should generate 12-byte IDs with ObjectIdProvider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new ObjectIdProvider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify 12-byte ObjectID
            expect(result.member.idBytes.length).toBe(12);
            expect(service.constants.idProvider.byteLength).toBe(12);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 5: Member Uses Default idProvider When Not Configured
   * Feature: fix-idprovider-member-generation, Property 5: Member Uses Default idProvider When Not Configured
   * Validates: Requirements 2.4, 6.1, 6.3
   *
   * For any ECIESService constructed without a custom idProvider, when Member.newMember()
   * creates a Member, the Member.id.length should equal 12 (the default ObjectIdProvider byte length).
   */
  describe('Property 5: Member Uses Default idProvider When Not Configured', () => {
    it('should use default 12-byte ObjectID when no custom idProvider configured', () => {
      fc.assert(
        fc.property(
          fc.record(
            {
              curveName: fc.constantFrom('secp256k1'),
              symmetricAlgorithm: fc.constantFrom('aes-256-gcm'),
            },
            { requiredKeys: [] },
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (partialConfig, memberType, name, email) => {
            // Create service with Partial<IECIESConfig> (no custom idProvider)
            const service = new ECIESService(partialConfig);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify default 12-byte ObjectID
            expect(result.member.idBytes.length).toBe(12);
            expect(service.constants.idProvider.byteLength).toBe(12);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use default idProvider when service created with no config', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const service = new ECIESService();

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify default 12-byte ObjectID
            expect(result.member.idBytes.length).toBe(12);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 6: GuidV4 Members Are UUID-Compatible
   * Feature: fix-idprovider-member-generation, Property 6: GuidV4 Members Are UUID-Compatible
   * Validates: Requirements 4.1, 5.3
   *
   * For any ECIESService configured with GuidV4Provider, when Member.newMember()
   * creates a Member, Guid.fromBuffer(member.id) should successfully convert to
   * a valid UUID without throwing errors.
   */
  describe('Property 6: GuidV4 Members Are UUID-Compatible', () => {
    it('should create UUID-compatible IDs with GuidV4Provider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new GuidV4Provider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify Guid.fromBuffer succeeds
            expect(() => {
              const guid = Guid.fromPlatformBuffer(result.member.idBytes);
              expect(guid).toBeDefined();
              expect(guid.asFullHexGuid).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
              );
            }).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: ObjectId Members Are ObjectID-Compatible
   * Feature: fix-idprovider-member-generation, Property 7: ObjectId Members Are ObjectID-Compatible
   * Validates: Requirements 4.2
   *
   * For any ECIESService configured with ObjectIdProvider, when Member.newMember()
   * creates a Member, the Member.id should be convertible to a valid ObjectID string
   * representation without throwing errors.
   */
  describe('Property 7: ObjectId Members Are ObjectID-Compatible', () => {
    it('should create ObjectID-compatible IDs with ObjectIdProvider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new ObjectIdProvider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify ObjectID conversion succeeds
            expect(() => {
              const idBuffer = result.member.idBytes;
              const objectIdString = constants.idProvider.serialize(idBuffer);
              expect(objectIdString).toBeDefined();
              expect(typeof objectIdString).toBe('string');
              expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
            }).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 8: Member ID Conversion Never Throws
   * Feature: fix-idprovider-member-generation, Property 8: Member ID Conversion Never Throws
   * Validates: Requirements 4.3
   *
   * For any Member created with any idProvider, converting the Member.id to its
   * string representation using the corresponding provider's conversion method
   * should not throw errors.
   */
  describe('Property 8: Member ID Conversion Never Throws', () => {
    it('should never throw when converting Member IDs to strings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (constants, memberType, name, email) => {
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify ID conversion doesn't throw
            expect(() => {
              const idBuffer = result.member.idBytes;
              const idString = constants.idProvider.serialize(idBuffer);
              expect(idString).toBeDefined();
              expect(typeof idString).toBe('string');
            }).not.toThrow();

            // Verify round-trip conversion
            expect(() => {
              const idBuffer = result.member.idBytes;
              const idString = constants.idProvider.serialize(idBuffer);
              const deserializedId = constants.idProvider.deserialize(idString);
              expect(Buffer.from(deserializedId)).toEqual(idBuffer);
            }).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 10: Member Serialization Round-Trip Preserves ID
   * Feature: fix-idprovider-member-generation, Property 10: Member Serialization Round-Trip Preserves ID
   * Validates: Requirements 7.2, 7.3, 7.4
   *
   * For any Member created with any idProvider, serializing to JSON and then
   * deserializing should produce a Member with an identical ID buffer.
   */
  describe('Property 10: Member Serialization Round-Trip Preserves ID', () => {
    it('should preserve Member ID through serialization round-trip', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (constants, memberType, name, email) => {
            const service = new ECIESService(constants);

            // Create member
            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );
            const originalMember = result.member;
            const originalId = originalMember.id;

            // Serialize to JSON
            const json = originalMember.toJson();
            expect(json).toBeDefined();
            expect(typeof json).toBe('string');

            // Deserialize from JSON
            const deserializedMember = Member.fromJson(json, service);

            // Verify ID is preserved
            const originalBuffer = originalMember.idBytes;
            const deserializedBuffer = deserializedMember.idBytes;

            expect(Buffer.compare(deserializedBuffer, originalBuffer)).toBe(0);
            expect(deserializedBuffer.length).toBe(originalBuffer.length);
            expect(deserializedBuffer.length).toBe(
              service.constants.idProvider.byteLength,
            );

            // Verify other properties are preserved
            expect(deserializedMember.type).toBe(originalMember.type);
            expect(deserializedMember.name).toBe(originalMember.name);
            expect(deserializedMember.email.toString()).toBe(
              originalMember.email.toString(),
            );
            expect(Buffer.from(deserializedMember.publicKey)).toEqual(
              Buffer.from(originalMember.publicKey),
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve 16-byte GuidV4 IDs through serialization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new GuidV4Provider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );
            const originalId = result.member.id;

            // Serialize and deserialize
            const json = result.member.toJson();
            const deserialized = Member.fromJson(json, service);

            // Verify 16-byte ID preserved
            const originalBuffer = result.member.idBytes;
            const deserializedBuffer = deserialized.idBytes;

            expect(Buffer.compare(deserializedBuffer, originalBuffer)).toBe(0);
            expect(deserializedBuffer.length).toBe(16);

            // Verify UUID compatibility maintained
            const guid = Guid.fromPlatformBuffer(deserializedBuffer);
            expect(guid).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve 12-byte ObjectID IDs through serialization', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new ObjectIdProvider(),
            });
            const service = new ECIESService(constants);

            const result = Member.newMember(
              service,
              memberType,
              name,
              new EmailString(email),
            );
            const originalId = result.member.id;

            // Serialize and deserialize
            const json = result.member.toJson();
            const deserialized = Member.fromJson(json, service);

            // Verify 12-byte ID preserved
            const originalBuffer = result.member.idBytes;
            const deserializedBuffer = deserialized.idBytes;

            expect(Buffer.compare(deserializedBuffer, originalBuffer)).toBe(0);
            expect(deserializedBuffer.length).toBe(12);

            // Verify ObjectID compatibility maintained
            const objectIdString =
              constants.idProvider.serialize(deserializedBuffer);
            expect(objectIdString).toBeDefined();
            expect(objectIdString.length).toBe(24);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
