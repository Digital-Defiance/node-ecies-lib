/**
 * Property-Based Tests: MemberBuilder idProvider Integration
 *
 * Feature: fix-idprovider-member-generation
 * These tests validate that MemberBuilder respects the configured idProvider
 * from ECIESService when creating Members.
 */

import * as fc from 'fast-check';
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

describe('Property-Based Tests: MemberBuilder idProvider Integration', () => {
  /**
   * Property 9: MemberBuilder Respects Configured idProvider
   * Feature: fix-idprovider-member-generation, Property 9: MemberBuilder Respects Configured idProvider
   * Validates: Requirements 7.1
   *
   * For any MemberBuilder configured with an ECIESService that has a custom idProvider,
   * when build() creates a Member, the Member.id.length should match the service's
   * idProvider.byteLength.
   */
  describe('Property 9: MemberBuilder Respects Configured idProvider', () => {
    it('should create Members with ID length matching configured idProvider', () => {
      fc.assert(
        fc.property(
          // Generate random idProvider configurations
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          (constants, memberType, name, email) => {
            // Create service with configured idProvider
            const service = new ECIESService(constants);

            // Create member using MemberBuilder
            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // Verify Member ID length matches configured idProvider
            expect(result.member.id.length).toBe(
              service.constants.idProvider.byteLength,
            );
            expect(result.member.id.length).toBe(constants.MEMBER_ID_LENGTH);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create 16-byte IDs with GuidV4Provider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new GuidV4Provider(),
            });
            const service = new ECIESService(constants);

            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // Verify 16-byte GUID
            expect(result.member.id.length).toBe(16);
            expect(service.constants.idProvider.byteLength).toBe(16);

            // Verify UUID compatibility
            const guid = GuidV4.fromBuffer(result.member.id);
            expect(guid).toBeDefined();
            expect(guid.asFullHexGuid).toMatch(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create 12-byte IDs with ObjectIdProvider', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            const constants = createRuntimeConfiguration({
              idProvider: new ObjectIdProvider(),
            });
            const service = new ECIESService(constants);

            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // Verify 12-byte ObjectID
            expect(result.member.id.length).toBe(12);
            expect(service.constants.idProvider.byteLength).toBe(12);

            // Verify ObjectID compatibility
            const objectIdString = constants.idProvider.serialize(result.member.id);
            expect(objectIdString).toBeDefined();
            expect(objectIdString.length).toBe(24);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should use default 12-byte ObjectID when no custom idProvider configured', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          (memberType, name, email) => {
            // Create service without custom idProvider
            const service = new ECIESService();

            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // Verify default 12-byte ObjectID
            expect(result.member.id.length).toBe(12);
            expect(service.constants.idProvider.byteLength).toBe(12);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create multiple Members with consistent ID lengths', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.array(
            fc.record({
              type: fc.constantFrom(MemberType.User, MemberType.Admin),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
              email: fc.emailAddress(),
            }),
            { minLength: 2, maxLength: 5 },
          ),
          (constants, memberConfigs) => {
            const service = new ECIESService(constants);
            const expectedLength = service.constants.idProvider.byteLength;

            // Create multiple members
            const members = memberConfigs.map(config =>
              MemberBuilder.create()
                .withEciesService(service)
                .withType(config.type)
                .withName(config.name)
                .withEmail(new EmailString(config.email))
                .build(),
            );

            // Verify all have consistent ID lengths
            members.forEach(result => {
              expect(result.member.id.length).toBe(expectedLength);
            });

            // Verify IDs are unique
            const ids = members.map(m => m.member.id);
            const uniqueIds = new Set(ids.map(id => Buffer.from(id).toString('hex')));
            expect(uniqueIds.size).toBe(ids.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
