/**
 * Backward Compatibility Integration Test
 * Tests legacy factory methods still work
 * Tests builder patterns work correctly
 * Verifies existing code continues to work
 * Validates Requirements 2.4, 2.5, 3.4, 3.5
 */

import {
  Constants,
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';

import { MemberBuilder } from '../../src/builders/member-builder';

describe('Backward Compatibility Integration', () => {
  describe('12.3 Backward compatibility integration test', () => {
    describe('Legacy factory methods', () => {
      it('should create Member using MemberBuilder.newMember', () => {
        // Legacy factory method that uses default service
        const { member, mnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Alice',
          new EmailString('alice@example.com')
        );

        // Verify member was created
        expect(member).toBeDefined();
        expect(member.name).toBe('Alice');
        expect(member.email.toString()).toBe('alice@example.com');
        expect(member.hasPrivateKey).toBe(true);
        expect(mnemonic).toBeDefined();

        // Clean up
        member.dispose();
        mnemonic.dispose();
      });

      it('should create Member using MemberBuilder.newMember with string email', () => {
        // Test with string email (convenience overload)
        const { member, mnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Bob',
          'bob@example.com'
        );

        expect(member).toBeDefined();
        expect(member.name).toBe('Bob');
        expect(member.email.toString()).toBe('bob@example.com');

        // Clean up
        member.dispose();
        mnemonic.dispose();
      });

      it('should create Member using MemberBuilder.fromMnemonic', () => {
        // Generate a mnemonic first
        const { mnemonic: originalMnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Temp',
          'temp@example.com'
        );

        // Create member from mnemonic using legacy method
        const member = MemberBuilder.fromMnemonic(
          originalMnemonic,
          MemberType.User,
          'Charlie',
          new EmailString('charlie@example.com')
        );

        expect(member).toBeDefined();
        expect(member.name).toBe('Charlie');
        expect(member.hasPrivateKey).toBe(true);

        // Clean up
        member.dispose();
        originalMnemonic.dispose();
      });

      it('should create Member using MemberBuilder.fromMnemonic with defaults', () => {
        // Generate a mnemonic first
        const { mnemonic: originalMnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Temp',
          'temp@example.com'
        );

        // Create member with default name and email
        const member = MemberBuilder.fromMnemonic(
          originalMnemonic,
          MemberType.User
        );

        expect(member).toBeDefined();
        expect(member.name).toBe('Test User');
        expect(member.email.toString()).toBe('test@example.com');

        // Clean up
        member.dispose();
        originalMnemonic.dispose();
      });

      it('should create Member using MemberBuilder.fromJson', () => {
        // Create original member
        const { member: original, mnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'David',
          'david@example.com'
        );

        // Serialize to JSON
        const json = original.toJson();

        // Create member from JSON using legacy method
        const restored = MemberBuilder.fromJson(json);

        expect(restored).toBeDefined();
        expect(restored.name).toBe('David');
        expect(restored.email.toString()).toBe('david@example.com');

        // Clean up
        original.dispose();
        restored.dispose();
        mnemonic.dispose();
      });
    });

    describe('Builder pattern', () => {
      it('should create Member using fluent builder', () => {
        const { ECIESService } = require('@digitaldefiance/ecies-lib');
        const service = new ECIESService();

        const { member, mnemonic } = MemberBuilder.create()
          .withEciesService(service)
          .withType(MemberType.User)
          .withName('Eve')
          .withEmail('eve@example.com')
          .generateMnemonic()
          .build();

        expect(member).toBeDefined();
        expect(member.name).toBe('Eve');
        expect(member.email.toString()).toBe('eve@example.com');
        expect(mnemonic).toBeDefined();

        // Clean up
        member.dispose();
        mnemonic.dispose();
      });

      it('should create Member using builder with EmailString', () => {
        const { ECIESService } = require('@digitaldefiance/ecies-lib');
        const service = new ECIESService();

        const { member, mnemonic } = MemberBuilder.create()
          .withEciesService(service)
          .withType(MemberType.System)
          .withName('System')
          .withEmail(new EmailString('system@example.com'))
          .generateMnemonic()
          .build();

        expect(member).toBeDefined();
        expect(member.type).toBe(MemberType.System);
        expect(member.name).toBe('System');

        // Clean up
        member.dispose();
        mnemonic.dispose();
      });

      it('should create Member using builder with existing mnemonic', () => {
        const { ECIESService } = require('@digitaldefiance/ecies-lib');
        const service = new ECIESService();

        // Generate mnemonic separately
        const { mnemonic: existingMnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Temp',
          'temp@example.com'
        );

        // Use builder with existing mnemonic
        const { member, mnemonic } = MemberBuilder.create()
          .withEciesService(service)
          .withType(MemberType.User)
          .withName('Frank')
          .withEmail('frank@example.com')
          .withMnemonic(existingMnemonic)
          .build();

        expect(member).toBeDefined();
        expect(member.name).toBe('Frank');
        expect(mnemonic).toBe(existingMnemonic);

        // Clean up
        member.dispose();
        mnemonic.dispose();
      });

      it('should throw error when building without required fields', () => {
        expect(() => {
          MemberBuilder.create().withName('Incomplete').build();
        }).toThrow();
      });

      it('should throw error when generating mnemonic without service', () => {
        expect(() => {
          MemberBuilder.create().generateMnemonic();
        }).toThrow();
      });
    });

    describe('SecureBuffer backward compatibility', () => {
      it('should create SecureBuffer without explicit ID provider', () => {
        // Legacy usage - no ID provider specified
        const data = new Uint8Array([1, 2, 3, 4, 5]);
        const buffer = new SecureBuffer(data);

        expect(buffer).toBeDefined();
        expect(buffer.originalLength).toBe(5);
        expect(buffer.value).toEqual(data);

        // Clean up
        buffer.dispose();
      });

      it('should create SecureBuffer with default ID provider', () => {
        const buffer = new SecureBuffer(new Uint8Array([10, 20, 30]));

        // Should have an ID generated by default provider
        expect(buffer.id).toBeDefined();
        expect(buffer.idUint8Array.length).toBe(Constants.MEMBER_ID_LENGTH);

        // Clean up
        buffer.dispose();
      });

      it('should create empty SecureBuffer', () => {
        const buffer = new SecureBuffer();

        expect(buffer).toBeDefined();
        expect(buffer.originalLength).toBe(0);

        // Clean up
        buffer.dispose();
      });

      it('should support SecureBuffer operations', () => {
        const buffer = new SecureBuffer(new Uint8Array([1, 2, 3]));

        // Test operations
        expect(buffer.originalLength).toBe(3);
        expect(buffer.value[0]).toBe(1);
        expect(buffer.value[1]).toBe(2);
        expect(buffer.value[2]).toBe(3);

        // Clean up
        buffer.dispose();
      });
    });

    describe('SecureString backward compatibility', () => {
      it('should create SecureString without explicit ID provider', () => {
        // Legacy usage - no ID provider specified
        const str = new SecureString('test string');

        expect(str).toBeDefined();
        expect(str.value).toBe('test string');

        // Clean up
        str.dispose();
      });

      it('should create SecureString with default ID provider', () => {
        const str = new SecureString('another test');

        // Should have an ID generated by default provider
        expect(str.id).toBeDefined();
        expect(str.idUint8Array.length).toBe(Constants.MEMBER_ID_LENGTH);

        // Clean up
        str.dispose();
      });

      it('should create empty SecureString', () => {
        const str = new SecureString('');

        expect(str).toBeDefined();
        expect(str.value).toBe('');

        // Clean up
        str.dispose();
      });

      it('should support SecureString operations', () => {
        const str = new SecureString('hello world');

        // Test operations
        expect(str.value).toBe('hello world');
        expect(str.originalLength).toBe(11);

        // Clean up
        str.dispose();
      });
    });

    describe('Full workflow backward compatibility', () => {
      it('should support complete legacy workflow', async () => {
        // Create member using legacy factory
        const { member: alice, mnemonic: aliceMnemonic } =
          MemberBuilder.newMember(
            MemberType.User,
            'Alice',
            'alice@example.com'
          );

        const { member: bob, mnemonic: bobMnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Bob',
          'bob@example.com'
        );

        // Test signing
        const data = new Uint8Array([1, 2, 3]);
        const signature = alice.sign(data);
        expect(alice.verify(signature, data)).toBe(true);

        // Test encryption
        const message = 'Legacy workflow message';
        const encrypted = await alice.encryptData(message, bob.publicKey);
        const decrypted = await bob.decryptData(encrypted);
        const decryptedText = new TextDecoder().decode(decrypted);
        expect(decryptedText).toBe(message);

        // Test serialization
        const aliceJson = alice.toJson();
        const aliceRestored = MemberBuilder.fromJson(aliceJson);
        expect(aliceRestored.name).toBe('Alice');

        // Clean up
        alice.dispose();
        bob.dispose();
        aliceRestored.dispose();
        aliceMnemonic.dispose();
        bobMnemonic.dispose();
      });

      it('should support mixing legacy and new patterns', async () => {
        const { ECIESService } = require('@digitaldefiance/ecies-lib');
        const service = new ECIESService();

        // Create one member using legacy factory
        const { member: legacy, mnemonic: legacyMnemonic } =
          MemberBuilder.newMember(
            MemberType.User,
            'Legacy',
            'legacy@example.com'
          );

        // Create another using builder
        const { member: modern, mnemonic: modernMnemonic } =
          MemberBuilder.create()
            .withEciesService(service)
            .withType(MemberType.User)
            .withName('Modern')
            .withEmail('modern@example.com')
            .generateMnemonic()
            .build();

        // They should be able to communicate
        const message = 'Cross-pattern message';
        const encrypted = await legacy.encryptData(message, modern.publicKey);
        const decrypted = await modern.decryptData(encrypted);
        const decryptedText = Buffer.isBuffer(decrypted)
          ? decrypted.toString('utf-8')
          : new TextDecoder().decode(decrypted);
        expect(decryptedText).toBe(message);

        // Clean up
        legacy.dispose();
        modern.dispose();
        legacyMnemonic.dispose();
        modernMnemonic.dispose();
      });

      it('should support legacy SecureBuffer/SecureString with new Members', () => {
        // Create secure storage using legacy pattern
        const buffer = new SecureBuffer(new Uint8Array([1, 2, 3]));
        const str = new SecureString('test');

        // Create member using new pattern
        const { member, mnemonic } = MemberBuilder.newMember(
          MemberType.User,
          'Test',
          'test@example.com'
        );

        // Should work together
        expect(buffer).toBeDefined();
        expect(str).toBeDefined();
        expect(member).toBeDefined();

        // Clean up
        buffer.dispose();
        str.dispose();
        member.dispose();
        mnemonic.dispose();
      });

      it('should maintain backward compatibility with existing test patterns', () => {
        // This test verifies that existing test code patterns still work

        // Pattern 1: Simple member creation
        const { member: m1, mnemonic: mn1 } = MemberBuilder.newMember(
          MemberType.User,
          'User1',
          'user1@example.com'
        );
        expect(m1).toBeDefined();

        // Pattern 2: Member from mnemonic
        const m2 = MemberBuilder.fromMnemonic(
          mn1,
          'User2',
          'user2@example.com'
        );
        expect(m2).toBeDefined();

        // Pattern 3: Member from JSON
        const json = m1.toJson();
        const m3 = MemberBuilder.fromJson(json);
        expect(m3).toBeDefined();

        // Pattern 4: SecureBuffer/SecureString
        const buf = new SecureBuffer(new Uint8Array([1, 2, 3]));
        const str = new SecureString('test');
        expect(buf).toBeDefined();
        expect(str).toBeDefined();

        // Clean up
        m1.dispose();
        m2.dispose();
        m3.dispose();
        mn1.dispose();
        buf.dispose();
        str.dispose();
      });
    });

    describe('Constants backward compatibility', () => {
      it('should access constants without triggering circular dependencies', () => {
        // Legacy pattern - accessing constants directly
        expect(Constants.MEMBER_ID_LENGTH).toBeDefined();
        expect(Constants.idProvider).toBeDefined();
        expect(Constants.ECIES).toBeDefined();
      });

      it('should use constants with SecureBuffer', () => {
        const buffer = new SecureBuffer(new Uint8Array([1, 2, 3]));

        // ID should match expected length from constants
        expect(buffer.idUint8Array.length).toBe(Constants.MEMBER_ID_LENGTH);

        buffer.dispose();
      });

      it('should use constants with SecureString', () => {
        const str = new SecureString('test');

        // ID should match expected length from constants
        expect(str.idUint8Array.length).toBe(Constants.MEMBER_ID_LENGTH);

        str.dispose();
      });
    });

    describe('Error handling backward compatibility', () => {
      it('should handle invalid email in legacy factory', () => {
        expect(() => {
          MemberBuilder.newMember(
            MemberType.User,
            'Invalid',
            'not-an-email' as any
          );
        }).toThrow();
      });

      it('should handle missing required fields in builder', () => {
        expect(() => {
          MemberBuilder.create().build();
        }).toThrow();
      });

      it('should handle invalid JSON in fromJson', () => {
        expect(() => {
          MemberBuilder.fromJson('invalid json');
        }).toThrow();
      });
    });
  });
});
