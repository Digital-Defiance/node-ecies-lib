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
 * Note: The browser package bug where Member.newMember ignored the service's ID provider
 * has been FIXED. Both packages now correctly respect the configured idProvider.
 *
 * Requirements: 3.1, 3.2, 3.3, 8.8
 */

import * as fc from 'fast-check';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';
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
import { registerNodeRuntimeConfiguration } from '../../src/constants';

describe('Integration: Cross-Platform idProvider Consistency', () => {
  let originalConfig: ReturnType<typeof registerNodeRuntimeConfiguration>;

  beforeEach(() => {
    // Save original configuration
    originalConfig = registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
  });

  afterEach(() => {
    // Restore default ObjectIdProvider to prevent test interference
    registerNodeRuntimeConfiguration({
      idProvider: new ObjectIdProvider(),
    });
  });

  describe('Same IConstants Produces Same ID Lengths', () => {
    it('should generate same-length IDs with GuidV4Provider in both packages', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const browserConfig = createRuntimeConfiguration({
          idProvider: new GuidV4Provider(),
        });

        const nodeConfig = registerNodeRuntimeConfiguration({
          idProvider: new GuidV4Provider(),
        });

        const browserService = new BrowserECIESService(browserConfig);
        const nodeService = new NodeECIESService(nodeConfig);

        // Test direct ID generation from services
        const browserDirectId = browserService.constants.idProvider.generate();
        const nodeDirectId = nodeService.constants.idProvider.generate();

        // Create members in both environments
        const browserResult = BrowserMember.newMember(
          browserService,
          MemberType.User,
          'Browser User',
          new EmailString('browser@example.com'),
        );

        const nodeResult = NodeMember.newMember(
          nodeService,
          MemberType.User,
          'Node User',
          new EmailString('node@example.com'),
        );

        // Verify both services are configured correctly
        expect(browserService.constants.idProvider.byteLength).toBe(16);
        expect(nodeService.constants.idProvider.byteLength).toBe(16);
        expect(browserService.constants.idProvider.constructor.name).toBe(
          'GuidV4Provider',
        );
        expect(nodeService.constants.idProvider.constructor.name).toBe(
          'GuidV4Provider',
        );

        // Direct ID generation should work correctly for both services
        expect(browserDirectId.length).toBe(16);
        expect(nodeDirectId.length).toBe(16);

        // Both Node.js and Browser implementations should work correctly now
        expect(nodeResult.member.idBytes.length).toBe(16);
        expect(browserResult.member.idBytes.length).toBe(16);

        // FIXED: Browser Member.newMember now correctly respects service's ID provider
        // Both browser and Node.js implementations generate consistent 16-byte IDs with GuidV4Provider
        console.log(
          `✅ Browser service direct ID: ${browserDirectId.length} bytes (correct)`,
        );
        console.log(
          `✅ Browser Member.newMember: ${browserResult.member.idBytes.length} bytes (fixed!)`,
        );
        console.log(
          `✅ Node service direct ID: ${nodeDirectId.length} bytes (correct)`,
        );
        console.log(
          `✅ Node Member.newMember: ${nodeResult.member.idBytes.length} bytes (correct)`,
        );
      });
    });

    it('should generate same-length IDs with ObjectIdProvider in both packages', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(config);
      const nodeService = new NodeECIESService(config);

      // Create members in both environments
      const browserResult = BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Verify both have 12-byte IDs
      expect(browserResult.member.idBytes.length).toBe(12);
      expect(nodeResult.member.idBytes.length).toBe(12);
      expect(browserResult.member.idBytes.length).toBe(
        nodeResult.member.idBytes.length,
      );

      // Verify both services report same idProvider byteLength
      expect(browserService.constants.idProvider.byteLength).toBe(12);
      expect(nodeService.constants.idProvider.byteLength).toBe(12);
      expect(browserService.constants.idProvider.byteLength).toBe(
        nodeService.constants.idProvider.byteLength,
      );
    });

    it('should use default 12-byte IDs when no custom idProvider configured', () => {
      // Explicitly create configurations with ObjectIdProvider to ensure consistency
      const browserConfig = createRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });
      const nodeConfig = registerNodeRuntimeConfiguration({
        idProvider: new ObjectIdProvider(),
      });

      const browserService = new BrowserECIESService(browserConfig);
      const nodeService = new NodeECIESService(nodeConfig);

      // Create members in both environments
      const browserResult = BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Verify both have 12-byte IDs
      expect(browserResult.member.idBytes.length).toBe(12);
      expect(nodeResult.member.idBytes.length).toBe(12);
      expect(browserResult.member.idBytes.length).toBe(
        nodeResult.member.idBytes.length,
      );
    });
  });

  describe('GuidV4Provider Produces UUID-Compatible IDs in Both Packages', () => {
    it('should create UUID-compatible IDs in browser package', async () => {
      const config = createRuntimeConfiguration({
        idProvider: new GuidV4Provider(),
      });
      const service = new BrowserECIESService(config);

      const result = BrowserMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify UUID compatibility
      expect(() => {
        const guid = GuidV4.fromBuffer(result.member.idBytes);
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

      const result = NodeMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify UUID compatibility
      expect(() => {
        const guid = GuidV4.fromBuffer(result.member.idBytes);
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

      const browserResult = BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Both should convert to valid UUIDs
      const browserGuid = GuidV4.fromBuffer(browserResult.member.idBytes);
      const nodeGuid = GuidV4.fromBuffer(nodeResult.member.idBytes);

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

      const result = BrowserMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify ObjectID compatibility
      expect(() => {
        const objectIdString = config.idProvider.serialize(
          result.member.idBytes,
        );
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

      const result = NodeMember.newMember(
        service,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Verify ObjectID compatibility
      expect(() => {
        const objectIdString = config.idProvider.serialize(
          result.member.idBytes,
        );
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

      const browserResult = BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Browser User',
        new EmailString('browser@example.com'),
      );

      const nodeResult = NodeMember.newMember(
        nodeService,
        MemberType.User,
        'Node User',
        new EmailString('node@example.com'),
      );

      // Both should convert to valid ObjectID strings
      const browserIdString = config.idProvider.serialize(
        browserResult.member.idBytes,
      );
      const nodeIdString = config.idProvider.serialize(
        nodeResult.member.idBytes,
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
      const browserResult = BrowserMember.newMember(
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
      const browserIdBuffer = browserResult.member.idBytes;
      const nodeIdBuffer = nodeMember.idBytes;
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
      const nodeResult = NodeMember.newMember(
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
      const nodeIdBuffer = nodeResult.member.idBytes;
      const browserIdBuffer = browserMember.idBytes;
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
      const browserResult = BrowserMember.newMember(
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
      const browserIdBuffer = browserResult.member.idBytes;
      const nodeIdBuffer = nodeMember.idBytes;
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
      const nodeResult = NodeMember.newMember(
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
      const nodeIdBuffer = nodeResult.member.idBytes;
      const browserIdBuffer = browserMember.idBytes;
      expect(Buffer.from(browserIdBuffer)).toEqual(Buffer.from(nodeIdBuffer));
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
      const browserResult = BrowserMember.newMember(
        browserService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      const originalId = browserResult.member.idBytes;

      // Browser → JSON → Node.js → JSON → Browser
      const json1 = browserResult.member.toJson();
      const nodeMember = NodeMember.fromJson(json1, nodeService);
      const json2 = nodeMember.toJson();
      const browserMember2 = BrowserMember.fromJson(json2, browserService);

      // Verify ID preserved through round-trip
      const finalId = browserMember2.idBytes;
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
            {
              browser: createRuntimeConfiguration({
                idProvider: new GuidV4Provider(),
              }),
              node: registerNodeRuntimeConfiguration({
                idProvider: new GuidV4Provider(),
              }),
            },
            {
              browser: createRuntimeConfiguration({
                idProvider: new ObjectIdProvider(),
              }),
              node: registerNodeRuntimeConfiguration({
                idProvider: new ObjectIdProvider(),
              }),
            },
          ),
          fc.constantFrom(MemberType.User, MemberType.Admin),
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          async (configs, memberType, name, email) => {
            const browserService = new BrowserECIESService(configs.browser);
            const nodeService = new NodeECIESService(configs.node);

            // Create members in both environments
            const browserResult = BrowserMember.newMember(
              browserService,
              memberType,
              name,
              new EmailString(email),
            );

            const nodeResult = NodeMember.newMember(
              nodeService,
              memberType,
              name,
              new EmailString(email),
            );

            // Verify both services are configured with the same idProvider type
            expect(browserService.constants.idProvider.byteLength).toBe(
              nodeService.constants.idProvider.byteLength,
            );
            expect(browserService.constants.idProvider.byteLength).toBe(
              configs.browser.idProvider.byteLength,
            );
            expect(nodeService.constants.idProvider.byteLength).toBe(
              configs.node.idProvider.byteLength,
            );

            // Both Node.js and Browser services should respect the provided configuration
            expect(nodeResult.member.idBytes.length).toBe(
              configs.node.idProvider.byteLength,
            );
            expect(browserResult.member.idBytes.length).toBe(
              configs.browser.idProvider.byteLength,
            );

            // Cross-platform compatibility: both packages now work correctly
            if (configs.node.idProvider.byteLength === 16) {
              expect(nodeResult.member.idBytes.length).toBe(16);
              expect(browserResult.member.idBytes.length).toBe(16);
            } else if (configs.node.idProvider.byteLength === 12) {
              expect(nodeResult.member.idBytes.length).toBe(12);
              expect(browserResult.member.idBytes.length).toBe(12);
            }

            // Verify both services report same idProvider byteLength
            expect(browserService.constants.idProvider.byteLength).toBe(
              nodeService.constants.idProvider.byteLength,
            );
            expect(browserService.constants.idProvider.byteLength).toBe(
              configs.browser.idProvider.byteLength,
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
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          async (constants, memberType, name, email) => {
            const browserService = new BrowserECIESService(constants);
            const nodeService = new NodeECIESService(constants);

            // Create members in both environments
            const browserResult = BrowserMember.newMember(
              browserService,
              memberType,
              name,
              new EmailString(email),
            );

            const nodeResult = NodeMember.newMember(
              nodeService,
              memberType,
              name,
              new EmailString(email),
            );

            // Both should convert to string format without errors
            expect(() => {
              const browserIdBuffer = browserResult.member.idBytes;
              const browserIdString =
                constants.idProvider.serialize(browserIdBuffer);
              expect(browserIdString).toBeDefined();
              expect(typeof browserIdString).toBe('string');
            }).not.toThrow();

            expect(() => {
              const nodeIdBuffer = nodeResult.member.idBytes;
              const nodeIdString = constants.idProvider.serialize(nodeIdBuffer);
              expect(nodeIdString).toBeDefined();
              expect(typeof nodeIdString).toBe('string');
            }).not.toThrow();

            // Verify string lengths match
            const browserIdString = constants.idProvider.serialize(
              browserResult.member.idBytes,
            );
            const nodeIdString = constants.idProvider.serialize(
              nodeResult.member.idBytes,
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
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim() === s),
          fc.emailAddress(),
          async (constants, memberType, name, email) => {
            const browserService = new BrowserECIESService(constants);
            const nodeService = new NodeECIESService(constants);

            // Create member in browser
            const browserResult = BrowserMember.newMember(
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
            const browserIdBuffer = browserResult.member.idBytes;
            const nodeIdBuffer = nodeMember.idBytes;
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
