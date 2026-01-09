/**
 * Property-Based Tests: MemberBuilder ID Generation
 *
 * These tests validate that MemberBuilder creates Members with proper IDs.
 *
 * IMPORTANT ARCHITECTURE NOTE:
 * - Member always uses global Constants.idProvider (ObjectIdProvider) for ID generation
 * - The service's idProvider configuration does NOT affect Member ID generation
 * - member.id is a native type (ObjectId), member.idBytes is the raw Buffer
 */

import * as fc from 'fast-check';
import {
  createRuntimeConfiguration,
  EmailString,
  MemberType,
  GuidV4Provider,
  ObjectIdProvider,
} from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import { Constants } from '../../src/constants';

import { MemberBuilder } from '../../src/builders/member-builder';
import { ECIESService } from '../../src/services/ecies';

describe('Property-Based Tests: MemberBuilder ID Generation', () => {
  /**
   * Property 9: MemberBuilder Respects Configured idProvider
   * Feature: fix-idprovider-member-generation, Property 9: MemberBuilder Respects Configured idProvider
   * Validates: Requirements 7.1
   *
   * For any MemberBuilder configured with an ECIESService that has a custom idProvider,
   * when build() creates a Member, the Member.id.length should match the service's
   * idProvider.byteLength.
   */
  describe('MemberBuilder creates IDs using service idProvider', () => {
    it('should create Members with IDs matching service idProvider config', () => {
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

            // Create member using MemberBuilder
            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // Member ID should match service's configured idProvider length
            expect(result.member.idBytes.length).toBe(
              constants.idProvider.byteLength,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create 16-byte idBytes with GuidV4Provider configuration', () => {
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

            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            // With GuidV4Provider, Member uses 16-byte GUIDs
            expect(result.member.idBytes.length).toBe(16);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should have consistent idBytes with ObjectIdProvider service', () => {
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

            const result = MemberBuilder.create()
              .withEciesService(service)
              .withType(memberType)
              .withName(name)
              .withEmail(new EmailString(email))
              .build();

            expect(result.member.idBytes.length).toBe(12);
            // Verify idBytes matches id via provider
            const idToBytes = constants.idProvider.toBytes(result.member.id);
            expect(Buffer.from(idToBytes)).toEqual(result.member.idBytes);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should default to 12-byte ObjectId IDs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
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

            // Verify default 12-byte ObjectID in idBytes
            expect(result.member.idBytes.length).toBe(12);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should create multiple Members with unique IDs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.array(
            fc.record({
              type: fc.constantFrom(MemberType.User, MemberType.Admin),
              name: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => s.trim() === s),
              email: fc.emailAddress(),
            }),
            { minLength: 2, maxLength: 5 },
          ),
          (constants, memberConfigs) => {
            const service = new ECIESService(constants);
            const expectedLength = constants.idProvider.byteLength;

            // Create multiple members
            const members = memberConfigs.map((config) =>
              MemberBuilder.create()
                .withEciesService(service)
                .withType(config.type)
                .withName(config.name)
                .withEmail(new EmailString(config.email))
                .build(),
            );

            // Verify all have consistent idBytes matching configured idProvider
            members.forEach((result) => {
              expect(result.member.idBytes.length).toBe(expectedLength);
            });

            // Verify IDs are unique via string representation
            const idStrings = members.map((m) => m.member.id.toString());
            const uniqueIds = new Set(idStrings);
            expect(uniqueIds.size).toBe(idStrings.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
