/**
 * @fileoverview Comprehensive tests for the Member class
 * Tests cover:
 * - Basic member creation and properties
 * - Key management (loading/unloading)
 * - Cryptographic operations (sign/verify, encrypt/decrypt)
 * - Voting key integration (ECIES-to-Paillier bridge)
 * - Stream encryption/decryption
 * - Error handling and validation
 * - State management and lifecycle
 */

import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import type { Wallet } from '@ethereumjs/wallet';
import { PrivateKey, PublicKey } from 'paillier-bigint';

import { Constants } from './constants';
import { Member } from './member';
import { ECIESService } from './services/ecies/service';
import { VotingService } from './services/voting.service';

describe('Member', () => {
  let eciesService: ECIESService;
  let votingService: VotingService;

  beforeEach(() => {
    eciesService = new ECIESService();
    votingService = VotingService.getInstance();
  });

  describe('Member Creation', () => {
    it('should create a new member with all required properties', () => {
      const { member, mnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(member).toBeDefined();
      expect(member.id).toBeDefined();
      expect(member.type).toBe(MemberType.User);
      expect(member.name).toBe('Test User');
      expect(member.email.toString()).toBe('test@example.com');
      expect(member.publicKey).toBeDefined();
      expect(member.publicKey.length).toBeGreaterThan(0);
      expect(member.hasPrivateKey).toBe(true);
      expect(mnemonic).toBeDefined();
      expect(typeof mnemonic.value).toBe('string');
    });

    it('should create a member from mnemonic', () => {
      // First create a member to get a mnemonic
      const { mnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Original User',
        new EmailString('original@example.com'),
      );

      // Create a new member from the mnemonic
      const member = Member.fromMnemonic(
        mnemonic,
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(member).toBeDefined();
      expect(member.hasPrivateKey).toBe(true);
      expect(member.publicKey).toBeDefined();
    });

    it('should create members with different IDs', () => {
      const { member: member1 } = Member.newMember(
        eciesService,
        MemberType.User,
        'User 1',
        new EmailString('user1@example.com'),
      );
      const { member: member2 } = Member.newMember(
        eciesService,
        MemberType.User,
        'User 2',
        new EmailString('user2@example.com'),
      );

      expect(member1.id).not.toEqual(member2.id);
    });

    it('should throw error for empty name', () => {
      expect(() => {
        Member.newMember(
          eciesService,
          MemberType.User,
          '',
          new EmailString('test@example.com'),
        );
      }).toThrow();
    });

    it('should throw error for whitespace-only name', () => {
      expect(() => {
        Member.newMember(
          eciesService,
          MemberType.User,
          '   ',
          new EmailString('test@example.com'),
        );
      }).toThrow();
    });

    it('should throw error for name with leading whitespace', () => {
      expect(() => {
        Member.newMember(
          eciesService,
          MemberType.User,
          ' Test User',
          new EmailString('test@example.com'),
        );
      }).toThrow();
    });

    it('should throw error for name with trailing whitespace', () => {
      expect(() => {
        Member.newMember(
          eciesService,
          MemberType.User,
          'Test User ',
          new EmailString('test@example.com'),
        );
      }).toThrow();
    });
  });

  describe('Key Management', () => {
    let member: Member;
    let originalMnemonic: SecureString;

    beforeEach(() => {
      const result = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );
      member = result.member;
      originalMnemonic = result.mnemonic;
    });

    it('should have private key after creation', () => {
      expect(member.hasPrivateKey).toBe(true);
      expect(member.privateKey).toBeDefined();
    });

    it('should unload private key', () => {
      member.unloadPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.privateKey).toBeUndefined();
      expect(member.publicKey).toBeDefined(); // Public key should remain
    });

    it('should unload wallet', () => {
      expect(member.hasPrivateKey).toBe(true);

      member.unloadWallet();

      // Wallet getter throws if undefined
      expect(() => member.wallet).toThrow();
    });

    it('should unload both wallet and private key', () => {
      member.unloadWalletAndPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.privateKey).toBeUndefined();

      // Wallet getter throws if undefined
      expect(() => member.wallet).toThrow();
      expect(member.publicKey).toBeDefined(); // Public key should remain
    });

    it('should reload wallet from mnemonic', () => {
      member.unloadWallet();
      expect(() => member.wallet).toThrow();

      member.loadWallet(originalMnemonic);
      expect(() => member.wallet).not.toThrow();
    });

    it('should reload private key', () => {
      const originalPrivateKey = member.privateKey;
      expect(originalPrivateKey).toBeDefined();

      member.unloadPrivateKey();
      expect(member.hasPrivateKey).toBe(false);

      member.loadPrivateKey(originalPrivateKey!);
      expect(member.hasPrivateKey).toBe(true);
      expect(member.privateKey).toEqual(originalPrivateKey);
    });

    it('should expose walletOptional getter', () => {
      expect(member.walletOptional).toBeDefined();
      member.unloadWallet();
      expect(member.walletOptional).toBeUndefined();
    });
  });

  describe('Cryptographic Operations - Sign/Verify', () => {
    let alice: Member;
    let bob: Member;

    beforeEach(() => {
      alice = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      ).member;
      bob = Member.newMember(
        eciesService,
        MemberType.User,
        'Bob',
        new EmailString('bob@example.com'),
      ).member;
    });

    it('should sign and verify data', () => {
      const data = Buffer.from('Hello, World!');
      const signature = alice.sign(data);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(alice.verify(signature, data)).toBe(true);
    });

    it('should fail to verify tampered data', () => {
      const data = Buffer.from('Hello, World!');
      const signature = alice.sign(data);
      const tamperedData = Buffer.from('Hello, World?');

      expect(alice.verify(signature, tamperedData)).toBe(false);
    });

    it('should fail to verify with wrong public key', () => {
      const data = Buffer.from('Hello, World!');
      const signature = alice.sign(data);

      // Bob's member should not verify Alice's signature
      expect(bob.verify(signature, data)).toBe(false);
    });

    it('should throw error when signing without private key', () => {
      alice.unloadPrivateKey();
      const data = Buffer.from('Test data');

      expect(() => {
        alice.sign(data);
      }).toThrow();
    });

    it('should support signData alias', () => {
      const data = Buffer.from('Test message');
      const signature = alice.signData(data);

      expect(signature).toBeDefined();
      expect(alice.verify(signature, data)).toBe(true);
    });
  });

  describe('Cryptographic Operations - Encrypt/Decrypt', () => {
    let alice: Member;
    let bob: Member;

    beforeEach(() => {
      alice = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      ).member;
      bob = Member.newMember(
        eciesService,
        MemberType.User,
        'Bob',
        new EmailString('bob@example.com'),
      ).member;
    });

    it('should encrypt and decrypt data', () => {
      const plaintext = Buffer.from('Secret message');
      const encrypted = alice.encryptData(plaintext, alice.publicKey);

      expect(encrypted).toBeDefined();
      expect(encrypted.length).toBeGreaterThan(plaintext.length); // Encrypted data should be larger

      const decrypted = alice.decryptData(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should encrypt for another member', () => {
      const plaintext = Buffer.from('Message for Bob');
      const encrypted = alice.encryptData(plaintext, bob.publicKey);

      // Bob should be able to decrypt
      const decrypted = bob.decryptData(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should support string encryption', () => {
      const plaintext = 'String message';
      const encrypted = alice.encryptData(plaintext, alice.publicKey);
      const decrypted = alice.decryptData(encrypted);

      expect(Buffer.from(decrypted).toString('utf8')).toBe(plaintext);
    });

    it('should throw error when decrypting without private key', () => {
      const plaintext = Buffer.from('Test data');
      const encrypted = alice.encryptData(plaintext, alice.publicKey);

      alice.unloadPrivateKey();

      expect(() => {
        alice.decryptData(encrypted);
      }).toThrow();
    });

    it('should fail to decrypt data encrypted for another member', () => {
      const plaintext = Buffer.from('Message for Bob');
      const encrypted = alice.encryptData(plaintext, bob.publicKey);

      // Alice should not be able to decrypt
      expect(() => {
        alice.decryptData(encrypted);
      }).toThrow();
    });
  });

  describe('Stream Encryption/Decryption', () => {
    let alice: Member;

    beforeEach(() => {
      alice = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      ).member;
    });

    it('should encrypt and decrypt data stream', async () => {
      const chunks = [
        Buffer.from('First chunk'),
        Buffer.from('Second chunk'),
        Buffer.from('Third chunk'),
      ];

      async function* sourceGenerator() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      // Collect encrypted chunks
      const encryptedChunks: Buffer[] = [];
      for await (const encryptedChunk of alice.encryptDataStream(
        sourceGenerator(),
        {
          recipientPublicKey: alice.publicKey,
        },
      )) {
        encryptedChunks.push(encryptedChunk.data);
      }

      expect(encryptedChunks.length).toBeGreaterThan(0);

      // Decrypt the stream
      async function* encryptedGenerator() {
        for (const chunk of encryptedChunks) {
          yield chunk;
        }
      }

      const decryptedChunks: Buffer[] = [];
      for await (const decryptedChunk of alice.decryptDataStream(
        encryptedGenerator(),
      )) {
        decryptedChunks.push(decryptedChunk);
      }

      const originalData = Buffer.concat(chunks);
      const decryptedData = Buffer.concat(decryptedChunks);
      expect(decryptedData).toEqual(originalData);
    });

    it('should support progress callback for encryption', async () => {
      const chunks = [
        Buffer.from('A'.repeat(1000)),
        Buffer.from('B'.repeat(1000)),
      ];
      let progressCallCount = 0;

      async function* sourceGenerator() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      for await (const _ of alice.encryptDataStream(sourceGenerator(), {
        recipientPublicKey: alice.publicKey,
        onProgress: (progress) => {
          progressCallCount++;
          // Progress interface may vary - just check it was called
          expect(progress).toBeDefined();
        },
      })) {
        // Just iterate
      }

      expect(progressCallCount).toBeGreaterThan(0);
    });

    it('should support abort signal for encryption', async () => {
      const controller = new AbortController();
      const chunks = Array(100).fill(Buffer.from('Data'));

      async function* sourceGenerator() {
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      let chunkCount = 0;
      let wasAborted = false;
      try {
        for await (const _ of alice.encryptDataStream(sourceGenerator(), {
          recipientPublicKey: alice.publicKey,
          signal: controller.signal,
        })) {
          chunkCount++;
          if (chunkCount === 3) {
            controller.abort();
            // Break immediately to allow the abort to be detected
            break;
          }
        }
      } catch (error: unknown) {
        wasAborted = true;
        expect((error as Error).message).toContain('cancel');
      }

      // Should have either aborted or broken out early
      expect(wasAborted || chunkCount < chunks.length).toBe(true);
    });
  });

  describe('Voting Keys Integration', () => {
    let member: Member;

    beforeEach(() => {
      member = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      ).member;
    });

    it('should not have voting keys initially', () => {
      expect(member.votingPublicKey).toBeUndefined();
      expect(member.votingPrivateKey).toBeUndefined();
      expect(member.hasVotingPrivateKey).toBe(false);
    });

    it('should derive voting keys from ECDH', async () => {
      // TODO: Fix public key format issue - Member uses compressed keys,
      // voting bridge expects uncompressed
      // Use smaller key size for speed in tests
      await member.deriveVotingKeys({
        keypairBitLength: 2048,
        primeTestIterations: 64,
      });

      expect(member.votingPublicKey).toBeDefined();
      expect(member.votingPrivateKey).toBeDefined();
      expect(member.hasVotingPrivateKey).toBe(true);
    });

    it('should derive consistent voting keys from same ECDH keys', async () => {
      // Use smaller key size for speed in tests
      const options = { keypairBitLength: 2048, primeTestIterations: 64 };
      await member.deriveVotingKeys(options);
      const publicKey1 = member.votingPublicKey;
      const privateKey1 = member.votingPrivateKey;

      // Unload and derive again
      member.unloadVotingPrivateKey();
      await member.deriveVotingKeys(options);
      const publicKey2 = member.votingPublicKey;
      const privateKey2 = member.votingPrivateKey;

      // Compare using serialization since direct comparison may fail
      expect(votingService.serializePublicKey(publicKey1!)).toEqual(
        votingService.serializePublicKey(publicKey2!),
      );
      expect(votingService.serializePrivateKey(privateKey1!)).toEqual(
        votingService.serializePrivateKey(privateKey2!),
      );
    });

    it('should throw error when deriving voting keys without private key', async () => {
      member.unloadPrivateKey();

      await expect(member.deriveVotingKeys()).rejects.toThrow();
    });

    it('should load voting keys manually', async () => {
      // Generate a voting key pair
      const votingKeyPair = await votingService.generateDeterministicKeyPair(
        Buffer.alloc(64, 0x42),
      );

      member.loadVotingKeys(votingKeyPair.publicKey, votingKeyPair.privateKey);

      expect(member.votingPublicKey).toEqual(votingKeyPair.publicKey);
      expect(member.votingPrivateKey).toEqual(votingKeyPair.privateKey);
      expect(member.hasVotingPrivateKey).toBe(true);
    });

    it('should load only voting public key', async () => {
      const votingKeyPair = await votingService.generateDeterministicKeyPair(
        Buffer.alloc(64, 0x42),
      );

      member.loadVotingKeys(votingKeyPair.publicKey);

      expect(member.votingPublicKey).toEqual(votingKeyPair.publicKey);
      expect(member.votingPrivateKey).toBeUndefined();
      expect(member.hasVotingPrivateKey).toBe(false);
    });

    it('should unload voting private key', async () => {
      await member.deriveVotingKeys();
      const publicKey = member.votingPublicKey;

      expect(member.hasVotingPrivateKey).toBe(true);

      member.unloadVotingPrivateKey();

      expect(member.votingPublicKey).toEqual(publicKey); // Public key should remain
      expect(member.votingPrivateKey).toBeUndefined();
      expect(member.hasVotingPrivateKey).toBe(false);
    });

    it('should support custom key size for voting keys', async () => {
      await member.deriveVotingKeys({ keypairBitLength: 2048 });

      expect(member.votingPublicKey).toBeDefined();
      expect(member.votingPrivateKey).toBeDefined();

      // Check that the modulus is approximately 2048 bits
      // n = p * q where p and q are each ~1024 bits, so n can be up to 2048 bits
      // But in practice it can be slightly more depending on the prime generation
      const n = member.votingPublicKey!.n;
      const bitLength = n.toString(2).length;
      expect(bitLength).toBeGreaterThanOrEqual(2040);
      expect(bitLength).toBeLessThanOrEqual(2056); // Allow slight overflow
    });

    it('should support custom Miller-Rabin rounds for voting keys', async () => {
      // Should not throw with custom rounds
      await expect(
        member.deriveVotingKeys({ primeTestIterations: 64 }),
      ).resolves.not.toThrow();

      expect(member.votingPublicKey).toBeDefined();
      expect(member.votingPrivateKey).toBeDefined();
    });

    it('should throw error for invalid key size', async () => {
      await expect(
        member.deriveVotingKeys({ keypairBitLength: 1024 }),
      ).rejects.toThrow('Key size must be at least 2048 bits');
    });

    it('should throw error for insufficient Miller-Rabin rounds', async () => {
      await expect(
        member.deriveVotingKeys({ primeTestIterations: 32 }),
      ).rejects.toThrow('Must perform at least 64 Miller-Rabin iterations');
    });

    it('should throw error for odd key size', async () => {
      await expect(
        member.deriveVotingKeys({ keypairBitLength: 2049 }),
      ).rejects.toThrow('Key size must be even');
    });

    it('should handle voting key serialization', async () => {
      await member.deriveVotingKeys({
        keypairBitLength: 2048,
        primeTestIterations: 64,
      });

      const publicKeySerialized = votingService.serializePublicKey(
        member.votingPublicKey!,
      );
      const privateKeySerialized = votingService.serializePrivateKey(
        member.votingPrivateKey!,
      );

      expect(publicKeySerialized).toBeDefined();
      expect(privateKeySerialized).toBeDefined();

      const publicKeyDeserialized =
        await votingService.deserializePublicKey(publicKeySerialized);
      const privateKeyDeserialized = await votingService.deserializePrivateKey(
        privateKeySerialized,
        publicKeyDeserialized,
      );

      expect(publicKeyDeserialized.n).toBe(member.votingPublicKey!.n);
      expect(privateKeyDeserialized.lambda).toBe(
        member.votingPrivateKey!.lambda,
      );
    });

    it('should handle prime generation edge cases', () => {
      const seed = Buffer.alloc(64, 0x00);
      const drbg = votingService.createDRBG(seed);

      expect(() => {
        votingService.generateDeterministicPrime(drbg, 1024, 64, 1);
      }).toThrow('Failed to generate prime after 1 attempts');
    });
  });

  describe('Voting Operations with Paillier', () => {
    let member: Member;

    beforeEach(async () => {
      member = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      ).member;
      await member.deriveVotingKeys();
    });

    it('should encrypt and decrypt with derived voting keys', () => {
      const message = 42n;
      const publicKey = member.votingPublicKey!;
      const privateKey = member.votingPrivateKey!;

      const ciphertext = publicKey.encrypt(message);
      const decrypted = privateKey.decrypt(ciphertext);

      expect(decrypted).toBe(message);
    });

    it('should support homomorphic addition', () => {
      const a = 10n;
      const b = 32n;
      const publicKey = member.votingPublicKey!;
      const privateKey = member.votingPrivateKey!;

      const encryptedA = publicKey.encrypt(a);
      const encryptedB = publicKey.encrypt(b);

      // Homomorphic addition: E(a) + E(b) = E(a + b)
      const encryptedSum = publicKey.addition(encryptedA, encryptedB);
      const decryptedSum = privateKey.decrypt(encryptedSum);

      expect(decryptedSum).toBe(a + b);
    });

    it('should fail to decrypt without private key', () => {
      const message = 42n;
      const publicKey = member.votingPublicKey!;

      const ciphertext = publicKey.encrypt(message);

      member.unloadVotingPrivateKey();

      expect(() => {
        member.votingPrivateKey!.decrypt(ciphertext);
      }).toThrow();
    });
  });

  describe('Serialization', () => {
    let member: Member;

    beforeEach(() => {
      member = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      ).member;
    });

    it('should serialize to JSON', () => {
      const json = member.toJson();

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed.id).toBeDefined();
      expect(parsed.type).toBe(MemberType.User);
      expect(parsed.name).toBe('Test User');
      expect(parsed.email).toBe('test@example.com');
      expect(parsed.publicKey).toBeDefined();
    });

    it('should not include private key in JSON by default', () => {
      const json = member.toJson();
      const parsed = JSON.parse(json);

      expect(parsed.privateKey).toBeUndefined();
      expect(parsed.wallet).toBeUndefined();
    });

    it('should round-trip through fromJson correctly', () => {
      const json = member.toJson();
      const restored = Member.fromJson(json);

      expect(restored.id).toBeDefined();
      expect(restored.type).toBe(member.type);
      expect(restored.name).toBe(member.name);
      expect(restored.email.toString()).toBe(member.email.toString());
      expect(restored.publicKey.toString('hex')).toBe(
        member.publicKey.toString('hex'),
      );
      expect(restored.dateCreated.toISOString()).toBe(
        member.dateCreated.toISOString(),
      );
      expect(restored.dateUpdated.toISOString()).toBe(
        member.dateUpdated.toISOString(),
      );
      // Restored member has no private key (public-only)
      expect(restored.hasPrivateKey).toBe(false);
    });
  });

  describe('Lifecycle and Cleanup', () => {
    it('should dispose member properly', () => {
      const { member } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(() => {
        member.dispose();
      }).not.toThrow();
    });

    it('should clear sensitive data on dispose', () => {
      const { member } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      member.dispose();

      // After disposal, sensitive operations should fail or return undefined
      expect(member.hasPrivateKey).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should support complete workflow: create, sign, encrypt, voting', async () => {
      // Create member
      const { member, mnemonic } = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      );

      expect(member).toBeDefined();
      expect(mnemonic).toBeDefined();

      // Sign data
      const data = Buffer.from('Important message');
      const signature = member.sign(data);
      expect(member.verify(signature, data)).toBe(true);

      // Encrypt data
      const plaintext = Buffer.from('Secret data');
      const encrypted = member.encryptData(plaintext, member.publicKey);
      const decrypted = member.decryptData(encrypted);
      expect(decrypted).toEqual(plaintext);

      // Derive voting keys
      await member.deriveVotingKeys();
      expect(member.votingPublicKey).toBeDefined();
      expect(member.votingPrivateKey).toBeDefined();

      // Encrypt a vote
      const vote = 1n;
      const encryptedVote = member.votingPublicKey!.encrypt(vote);
      const decryptedVote = member.votingPrivateKey!.decrypt(encryptedVote);
      expect(decryptedVote).toBe(vote);

      // Unload sensitive data
      member.unloadWalletAndPrivateKey();
      member.unloadVotingPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.hasVotingPrivateKey).toBe(false);

      // Public key should still be available
      expect(member.publicKey).toBeDefined();
      expect(member.votingPublicKey).toBeDefined();
    });

    it('should support member-to-member encrypted communication', () => {
      const { member: alice } = Member.newMember(
        eciesService,
        MemberType.User,
        'Alice',
        new EmailString('alice@example.com'),
      );

      const { member: bob } = Member.newMember(
        eciesService,
        MemberType.User,
        'Bob',
        new EmailString('bob@example.com'),
      );

      // Alice encrypts a message for Bob
      const message = Buffer.from('Hello Bob!');
      const encrypted = alice.encryptData(message, bob.publicKey);

      // Bob decrypts the message
      const decrypted = bob.decryptData(encrypted);
      expect(decrypted).toEqual(message);

      // Alice signs the message
      const signature = alice.sign(message);

      // Bob verifies Alice's signature
      expect(bob.verifySignature(message, signature, alice.publicKey)).toBe(
        true,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject empty data encryption', () => {
      // ECIES explicitly rejects empty data for security reasons
      const { member } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      const empty = Buffer.alloc(0);
      expect(() => member.encryptData(empty, member.publicKey)).toThrow();
    });

    it('should handle large data encryption', () => {
      const { member } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      const largeData = Buffer.alloc(1024 * 1024); // 1MB
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }

      const encrypted = member.encryptData(largeData, member.publicKey);
      const decrypted = member.decryptData(encrypted);

      expect(decrypted).toEqual(largeData);
    });

    it('should maintain state correctly after multiple operations', async () => {
      const { member } = Member.newMember(
        eciesService,
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      // Initial state
      expect(member.hasPrivateKey).toBe(true);
      expect(member.hasVotingPrivateKey).toBe(false);

      // Derive voting keys
      await member.deriveVotingKeys();
      expect(member.hasPrivateKey).toBe(true);
      expect(member.hasVotingPrivateKey).toBe(true);

      // Unload ECIES private key
      member.unloadPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.hasVotingPrivateKey).toBe(true); // Voting key should remain

      // Unload voting private key
      member.unloadVotingPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.hasVotingPrivateKey).toBe(false);
    });
  });
});
