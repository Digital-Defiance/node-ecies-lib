/**
 * Integration Tests: Cross-Platform idProvider Consistency
 *
 * Feature: fix-idprovider-member-generation
 * Task: 11. Write cross-platform consistency tests
 *
 * These tests verify that the idProvider behavior is identical in both
 * browser (@digitaldefiance/ecies-lib) and Node.js (@digitaldefiance/node-ecies-lib)
 * environments. Members created in different environments should have compatible IDs.
 *
 * Requirements: 3.1, 3.2, 3.3, 8.8
 */

import * as fc from 'fast-check';
import {
  createRuntimeConfiguration,
  GuidV4Provider,
  ObjectIdProvider,
  GuidV4,
  EmailString,
  MemberType,
  ECIESService as BrowserECIESService,
  Member as BrowserMember,
} from '@digitaldefiance/ecies-lib';
import { ECIESService as NodeECIESService } from '../../src/services/ecies/service';
import { Member as NodeMember } from '../../src/member';

describe('Integration: Cross-Platform idProvider Consistency', () => {
  describe('Same IConstants Produces Same ID Lengths', () => {
    it('should generate same-length IDs with GuidV4Provider in both packages', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create members in both environments
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Verify both have 16-byte IDs
      expect(browserResult.member.id.length).toBe(16);
      expect(nodeResult.member.id.length).toBe(16);
      expect(browserResult.member.id.length).toBe(nodeResult.member.id.length);

      // Verify both services report same idProvider byteLength
      expect(browserService.constants.idProvider.byteLength).toBe(16);
      expect(nodeService.constants.idProvider.byteLength).toBe(16);
      expect(browserService.constants.idProvider.byteLength).toBe(
        nodeService.constants.idProvider.byteLength,
      );
    });

    it('should generate same-length IDs with ObjectIdProvider in both packages', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create members in both environments
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Verify both have 12-byte IDs
      expect(browserResult.member.id.length).toBe(12);
      expect(nodeResult.member.id.length).toBe(12);
      expect(browserResult.member.id.length).toBe(nodeResult.member.id.length);

      // Verify both services report same idProvider byteLength
      expect(browserService.constants.idProvider.byteLength).toBe(12);
      expect(nodeService.constants.idProvider.byteLength).toBe(12);
      expect(browserService.constants.idProvider.byteLength).toBe(
        nodeService.constants.idProvider.byteLength,
      );
    });

    it('should use default 12-byte IDs when no custom idProvider configured', async () => {
      const browserService = new BrowserECIESService();
      const nodeService = new NodeECIESService();

      // Create members in both environments
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Verify both have default 12-byte IDs
      expect(browserResult.member.id.length).toBe(12);
      expect(nodeResult.member.id.length).toBe(12);
      expect(browserResult.member.id.length).toBe(nodeResult.member.id.length);
    });
  });

  describe('GuidV4Provider Produces UUID-Compatible IDs in Both Packages', () => {
    it('should create UUID-compatible IDs in browser package', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new BrowserECIESService(config);

      const result = await BrowserMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify UUID compatibility
      expect(() => {
        const guid = GuidV4.fromBuffer(Buffer.from(result.member.id));
        expect(guid).toBeDefined();
        expect(guid.asFullHexGuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }).not.toThrow();
    });

    it('should create UUID-compatible IDs in Node.js package', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new NodeECIESService(config);

      const result = await NodeMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify UUID compatibility
      expect(() => {
        const guid = GuidV4.fromBuffer(Buffer.from(result.member.id));
        expect(guid).toBeDefined();
        expect(guid.asFullHexGuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }).not.toThrow();
    });

    it('should create UUID-compatible IDs with same format in both packages', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Both should convert to valid UUIDs
      const browserGuid = GuidV4.fromBuffer(Buffer.from(browserResult.member.id));
      const nodeGuid = GuidV4.fromBuffer(Buffer.from(nodeResult.member.id));

      // Verify both match UUID v4 format
      const uuidV4Pattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(browserGuid.asFullHexGuid).toMatch(uuidV4Pattern);
      expect(nodeGuid.asFullHexGuid).toMatch(uuidV4Pattern);
    });
  });

  describe('ObjectIdProvider Produces ObjectID-Compatible IDs in Both Packages', () => {
    it('should create ObjectID-compatible IDs in browser package', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new BrowserECIESService(config);

      const result = await BrowserMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify ObjectID compatibility
      expect(() => {
        const idBuffer = Buffer.from(result.member.id);
        const objectIdString = config.idProvider.serialize(idBuffer);
        expect(objectIdString).toBeDefined();
        expect(typeof objectIdString).toBe('string');
        expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
      }).not.toThrow();
    });

    it('should create ObjectID-compatible IDs in Node.js package', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const service = new NodeECIESService(config);

      const result = await NodeMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify ObjectID compatibility
      expect(() => {
        const idBuffer = Buffer.from(result.member.id);
        const objectIdString = config.idProvider.serialize(idBuffer);
        expect(objectIdString).toBeDefined();
        expect(typeof objectIdString).toBe('string');
        expect(objectIdString.length).toBe(24); // ObjectID hex string is 24 chars
      }).not.toThrow();
    });

    it('should create ObjectID-compatible IDs with same format in both packages', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Both should convert to valid ObjectID strings
      const browserIdString = config.idProvider.serialize(
        Buffer.from(browserResult.member.id),
      );
      const nodeIdString = config.idProvider.serialize(
        Buffer.from(nodeResult.member.id),
      );

      // Verify both are 24-character hex strings
      expect(browserIdString.length).toBe(24);
      expect(nodeIdString.length).toBe(24);
      expect(browserIdString).toMatch(/^[0-9a-f]{24}$/i);
      expect(nodeIdString).toMatch(/^[0-9a-f]{24}$/i);
    });
  });

  describe('Serialized Members Cross-Platform Compatibility', () => {
    it('should deserialize browser Member in Node.js with GuidV4Provider', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create member in browser
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      // Serialize in browser
      const json = browserResult.member.toJson();

      // Deserialize in Node.js
      const nodeMember = NodeMember.fromJson(json, nodeService);

      // Verify ID is preserved
      const browserIdBuffer = Buffer.from(browserResult.member.id);
      const nodeIdBuffer = Buffer.from(nodeMember.id);
      expect(nodeIdBuffer).toEqual(browserIdBuffer);
      expect(nodeIdBuffer.length).toBe(16);

      // Verify UUID compatibility maintained
      const guid = GuidV4.fromBuffer(nodeIdBuffer);
      expect(guid).toBeDefined();
    });

    it('should deserialize Node.js Member in browser with GuidV4Provider', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create member in Node.js
      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Serialize in Node.js
      const json = nodeResult.member.toJson();

      // Deserialize in browser
      const browserMember = BrowserMember.fromJson(json, browserService);

      // Verify ID is preserved
      const nodeIdBuffer = Buffer.from(nodeResult.member.id);
      const browserIdBuffer = Buffer.from(browserMember.id);
      expect(browserIdBuffer).toEqual(nodeIdBuffer);
      expect(browserIdBuffer.length).toBe(16);

      // Verify UUID compatibility maintained
      const guid = GuidV4.fromBuffer(browserIdBuffer);
      expect(guid).toBeDefined();
    });

    it('should deserialize browser Member in Node.js with ObjectIdProvider', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create member in browser
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      // Serialize in browser
      const json = browserResult.member.toJson();

      // Deserialize in Node.js
      const nodeMember = NodeMember.fromJson(json, nodeService);

      // Verify ID is preserved
      const browserIdBuffer = Buffer.from(browserResult.member.id);
      const nodeIdBuffer = Buffer.from(nodeMember.id);
      expect(nodeIdBuffer).toEqual(browserIdBuffer);
      expect(nodeIdBuffer.length).toBe(12);

      // Verify ObjectID compatibility maintained
      const objectIdString = config.idProvider.serialize(nodeIdBuffer);
      expect(objectIdString).toBeDefined();
      expect(objectIdString.length).toBe(24);
    });

    it('should deserialize Node.js Member in browser with ObjectIdProvider', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create member in Node.js
      const nodeResult = await NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Serialize in Node.js
      const json = nodeResult.member.toJson();

      // Deserialize in browser
      const browserMember = BrowserMember.fromJson(json, browserService);

      // Verify ID is preserved
      const nodeIdBuffer = Buffer.from(nodeResult.member.id);
      const browserIdBuffer = Buffer.from(browserMember.id);
      expect(browserIdBuffer).toEqual(nodeIdBuffer);
      expect(browserIdBuffer.length).toBe(12);

      // Verify ObjectID compatibility maintained
      const objectIdString = config.idProvider.serialize(browserIdBuffer);
      expect(objectIdString).toBeDefined();
      expect(objectIdString.length).toBe(24);
    });

    it('should handle round-trip serialization across platforms', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create in browser
      const browserResult = await BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = Buffer.from(browserResult.member.id);

      // Browser → JSON → Node.js → JSON → Browser
      const json1 = browserResult.member.toJson();
      const nodeMember = NodeMember.fromJson(json1, nodeService);
      const json2 = nodeMember.toJson();
      const browserMember2 = BrowserMember.fromJson(json2, browserService);

      // Verify ID preserved through round-trip
      const finalId = Buffer.from(browserMember2.id);
      expect(finalId).toEqual(originalId);
      expect(finalId.length).toBe(16);

      // Verify UUID compatibility maintained
      const guid = GuidV4.fromBuffer(finalId);
      expect(guid).toBeDefined();
    });
  });

  /**
   * Property 11: Cross-Platform ID Generation Consistency
   * Feature: fix-idprovider-member-generation, Property 11: Cross-Platform ID Generation Consistency
   * Validates: Requirements 3.1, 3.2, 3.3
   *
   * For any IConstants configuration with a specific idProvider, when creating Members
   * in both browser (ecies-lib) and Node.js (node-ecies-lib) environments with the same
   * configuration, the generated Member IDs should have the same length and be compatible
   * with the same conversion methods.
   */
  describe('Property 11: Cross-Platform ID Generation Consistency', () => {
    it('should generate same-length IDs across platforms for any IConstants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          async (constants, memberType, name, email) => {
            const browserService = new BrowserECIESService(constants);
            const nodeService = new NodeECIESService(constants);

            // Create members in both environments
            const browserResult = await BrowserMember.newMember(
              browserService,
              memberType,
              name,
              new EmailString(email),
            );

            const nodeResult = await NodeMember.newMember(
              nodeService,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify same ID length
            expect(browserResult.member.id.length).toBe(nodeResult.member.id.length);
            expect(browserResult.member.id.length).toBe(
              constants.idProvider.byteLength,
            );
            expect(nodeResult.member.id.length).toBe(
              constants.idProvider.byteLength,
            );

            // Verify both services report same idProvider byteLength
            expect(browserService.constants.idProvider.byteLength).toBe(
              nodeService.constants.idProvider.byteLength,
            );
            expect(browserService.constants.idProvider.byteLength).toBe(
              constants.idProvider.byteLength,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should produce compatible ID formats across platforms', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          async (constants, memberType, name, email) => {
            const browserService = new BrowserECIESService(constants);
            const nodeService = new NodeECIESService(constants);

            // Create members in both environments
            const browserResult = await BrowserMember.newMember(
              browserService,
              memberType,
              name,
              new EmailString(email),
            );

            const nodeResult = await NodeMember.newMember(
              nodeService,
              memberType,
              name,
              new EmailString(email),
            );

            // Both should convert to string format without errors
            expect(() => {
              const browserIdBuffer = Buffer.from(browserResult.member.id);
              const browserIdString = constants.idProvider.serialize(browserIdBuffer);
              expect(browserIdString).toBeDefined();
              expect(typeof browserIdString).toBe('string');
            }).not.toThrow();

            expect(() => {
              const nodeIdBuffer = Buffer.from(nodeResult.member.id);
              const nodeIdString = constants.idProvider.serialize(nodeIdBuffer);
              expect(nodeIdString).toBeDefined();
              expect(typeof nodeIdString).toBe('string');
            }).not.toThrow();

            // Verify string lengths match
            const browserIdString = constants.idProvider.serialize(
              Buffer.from(browserResult.member.id),
            );
            const nodeIdString = constants.idProvider.serialize(
              Buffer.from(nodeResult.member.id),
            );
            expect(browserIdString.length).toBe(nodeIdString.length);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should support cross-platform serialization for any IConstants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            createRuntimeConfiguration({ idProvider: new GuidV4Provider() }),
            createRuntimeConfiguration({ idProvider: new ObjectIdProvider() }),
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() === s),
          fc.emailAddress(),
          async (constants, memberType, name, email) => {
            const browserService = new BrowserECIESService(constants);
            const nodeService = new NodeECIESService(constants);

            // Create member in browser
            const browserResult = await BrowserMember.newMember(
              browserService,
              memberType,
              name,
              new EmailString(email),
            );

            // Serialize in browser
            const json = browserResult.member.toJson();

            // Deserialize in Node.js
            const nodeMember = NodeMember.fromJson(json, nodeService);

            // Verify ID preserved
            const browserIdBuffer = Buffer.from(browserResult.member.id);
            const nodeIdBuffer = Buffer.from(nodeMember.id);
            expect(nodeIdBuffer).toEqual(browserIdBuffer);
            expect(nodeIdBuffer.length).toBe(constants.idProvider.byteLength);

            // Verify conversion still works
            expect(() => {
              const idString = constants.idProvider.serialize(nodeIdBuffer);
              expect(idString).toBeDefined();
            }).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
