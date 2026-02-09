/**
 * Cross-Platform Threshold Voting Property-Based Tests
 *
 * Feature: real-time-threshold-voting
 * Property 12: Cross-Platform API Compatibility
 * Property 4: Serialization Round-Trip (Buffer variant)
 *
 * **Validates: Requirements 13.3, 13.5, 13.6**
 */

import * as fc from 'fast-check';
import { describe, it, expect, beforeAll } from '@jest/globals';

// Node.js (Buffer-based) imports
import {
  ThresholdKeyGenerator as NodeThresholdKeyGenerator,
  PartialDecryptionService as NodePartialDecryptionService,
  CeremonyCoordinator as NodeCeremonyCoordinator,
} from './index';
import type { BufferThresholdKeyPair } from './threshold-key-generator';

// Browser (Uint8Array-based) imports
import {
  ThresholdKeyGenerator as BrowserThresholdKeyGenerator,
  PartialDecryptionService as BrowserPartialDecryptionService,
  DecryptionCombiner as BrowserDecryptionCombiner,
} from '@digitaldefiance/ecies-lib';
import type { ThresholdKeyPair } from '@digitaldefiance/ecies-lib';

describe('Property-Based Tests: Cross-Platform Threshold Compatibility', () => {
  let nodeKeyPair: BufferThresholdKeyPair;
  let browserKeyPair: ThresholdKeyPair;
  let nodeService: NodePartialDecryptionService;
  let browserService: BrowserPartialDecryptionService;

  beforeAll(async () => {
    // Generate keys using both implementations
    const nodeGen = new NodeThresholdKeyGenerator();
    nodeKeyPair = await nodeGen.generate({
      totalShares: 3,
      threshold: 2,
      keyBitLength: 512,
    });

    const browserGen = new BrowserThresholdKeyGenerator();
    browserKeyPair = await browserGen.generate({
      totalShares: 3,
      threshold: 2,
      keyBitLength: 512,
    });

    nodeService = new NodePartialDecryptionService(nodeKeyPair.publicKey);
    browserService = new BrowserPartialDecryptionService(
      browserKeyPair.publicKey,
    );
  }, 120000);

  /**
   * Property 12: Cross-Platform API Compatibility
   * Feature: real-time-threshold-voting, Property 12: Cross-Platform API Compatibility
   * **Validates: Requirements 13.5, 13.6**
   *
   * For any threshold voting operation, the ecies-lib (browser) and node-ecies-lib
   * (Node.js) implementations SHALL produce identical results given identical inputs,
   * and SHALL maintain API compatibility.
   */
  describe('Property 12: Cross-Platform API Compatibility', () => {
    it('Node.js key generator should produce Buffer-based verification keys', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          (shareIdx) => {
            const share = nodeKeyPair.keyShares[shareIdx];

            // Verification key should be a Buffer
            expect(Buffer.isBuffer(share.verificationKey)).toBe(true);

            // Verification keys in the key pair should be Buffers
            expect(
              Buffer.isBuffer(nodeKeyPair.verificationKeys[shareIdx]),
            ).toBe(true);

            // Share data should be valid
            expect(share.index).toBeGreaterThanOrEqual(1);
            expect(share.share).toBeDefined();
            expect(typeof share.share).toBe('bigint');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Node.js partial decryptions should produce Buffer-based ceremony nonces', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, shareIdx, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const share = nodeKeyPair.keyShares[shareIdx];

            const partial = nodeService.computePartial(
              [ciphertext],
              share,
              nonce,
            );

            // ceremonyNonce should be a Buffer
            expect(Buffer.isBuffer(partial.ceremonyNonce)).toBe(true);

            // The partial should have valid structure
            expect(partial.guardianIndex).toBe(share.index);
            expect(Array.isArray(partial.values)).toBe(true);
            expect(typeof partial.values[0]).toBe('bigint');
            expect(typeof partial.proof.commitment).toBe('bigint');
            expect(typeof partial.proof.challenge).toBe('bigint');
            expect(typeof partial.proof.response).toBe('bigint');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Node.js partial decryptions should be verifiable by browser service', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, shareIdx, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const share = nodeKeyPair.keyShares[shareIdx];

            // Compute partial using Node.js service
            const partial = nodeService.computePartial(
              [ciphertext],
              share,
              nonce,
            );

            // Verify using browser service (Uint8Array-based)
            // Buffer extends Uint8Array, so this should work seamlessly
            const browserVerifyService = new BrowserPartialDecryptionService(
              nodeKeyPair.publicKey,
            );
            const isValid = browserVerifyService.verifyPartial(
              partial,
              [ciphertext],
              share.verificationKey,
              nodeKeyPair.publicKey,
            );

            expect(isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('browser partial decryptions should be combinable with Node.js partials', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);

            // Compute partials using Node.js service for first 2 shares (threshold = 2)
            const partial0 = nodeService.computePartial(
              [ciphertext],
              nodeKeyPair.keyShares[0],
              nonce,
            );
            const partial1 = nodeService.computePartial(
              [ciphertext],
              nodeKeyPair.keyShares[1],
              nonce,
            );

            // Combine using browser combiner
            const combiner = new BrowserDecryptionCombiner(
              nodeKeyPair.publicKey,
              nodeKeyPair.verificationKeys,
              nodeKeyPair.theta,
            );

            const combined = combiner.combine(
              [partial0, partial1],
              [ciphertext],
              nodeKeyPair.publicKey,
              nodeKeyPair.config,
            );

            // The decrypted tally should match the original plaintext
            expect(combined.tallies[0]).toBe(plaintext);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Node.js CeremonyCoordinator should produce Buffer-based ceremony nonces', () => {
      const coordinator = new NodeCeremonyCoordinator(
        nodeKeyPair.publicKey,
        nodeKeyPair.verificationKeys,
        nodeKeyPair.theta,
        nodeKeyPair.config,
      );

      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 1, max: 100 }),
          (plaintext, intervalNumber) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const pollId = Buffer.from([1, 2, 3]);

            // Start a ceremony
            const ceremony = coordinator.startCeremony(pollId, intervalNumber, [
              ciphertext,
            ]);

            // Nonce should be a Buffer
            expect(Buffer.isBuffer(ceremony.nonce)).toBe(true);
            expect(ceremony.nonce.length).toBeGreaterThan(0);

            // Retrieve via getCeremony — nonce should still be Buffer
            const retrieved = coordinator.getCeremony(ceremony.id);
            expect(retrieved).toBeDefined();
            expect(Buffer.isBuffer(retrieved!.nonce)).toBe(true);

            // Retrieve via getCeremoniesForPoll — nonces should be Buffers
            const forPoll = coordinator.getCeremoniesForPoll(pollId);
            expect(forPoll.length).toBeGreaterThan(0);
            for (const c of forPoll) {
              expect(Buffer.isBuffer(c.nonce)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Property 4: Serialization Round-Trip (Buffer variant)
   * Feature: real-time-threshold-voting, Property 4: Serialization Round-Trip
   * **Validates: Requirements 13.3**
   *
   * For any partial decryption, serializing then deserializing using the Node.js
   * service SHALL produce a value equivalent to the original, with Buffer types
   * for binary fields.
   */
  describe('Property 4: Serialization Round-Trip (Buffer variant)', () => {
    it('Node.js serialize then deserialize should produce equivalent Buffer-based partial decryption', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, shareIdx, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const share = nodeKeyPair.keyShares[shareIdx];

            const original = nodeService.computePartial(
              [ciphertext],
              share,
              nonce,
            );

            // Serialize returns Buffer
            const serialized = nodeService.serialize(original);
            expect(Buffer.isBuffer(serialized)).toBe(true);

            // Deserialize returns BufferPartialDecryption
            const deserialized = nodeService.deserialize(serialized);

            // All fields must be equivalent
            expect(deserialized.guardianIndex).toBe(original.guardianIndex);
            expect(deserialized.values).toEqual(original.values);
            expect(deserialized.proof.commitment).toBe(
              original.proof.commitment,
            );
            expect(deserialized.proof.challenge).toBe(original.proof.challenge);
            expect(deserialized.proof.response).toBe(original.proof.response);
            expect(deserialized.timestamp).toBe(original.timestamp);

            // ceremonyNonce should be a Buffer after deserialization
            expect(Buffer.isBuffer(deserialized.ceremonyNonce)).toBe(true);

            // Content should match
            expect(
              Buffer.from(deserialized.ceremonyNonce).equals(
                Buffer.from(original.ceremonyNonce),
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Node.js serialized data should be deserializable by browser service', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, shareIdx, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const share = nodeKeyPair.keyShares[shareIdx];

            const original = nodeService.computePartial(
              [ciphertext],
              share,
              nonce,
            );

            // Serialize with Node.js service (returns Buffer)
            const serialized = nodeService.serialize(original);

            // Deserialize with browser service (accepts Uint8Array, Buffer extends Uint8Array)
            const browserDeserialized = browserService.deserialize(serialized);

            // Values should match
            expect(browserDeserialized.guardianIndex).toBe(
              original.guardianIndex,
            );
            expect(browserDeserialized.values).toEqual(original.values);
            expect(browserDeserialized.proof.commitment).toBe(
              original.proof.commitment,
            );
            expect(browserDeserialized.proof.challenge).toBe(
              original.proof.challenge,
            );
            expect(browserDeserialized.proof.response).toBe(
              original.proof.response,
            );
            expect(browserDeserialized.timestamp).toBe(original.timestamp);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('deserialized Node.js partial decryptions should still pass verification', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 10000n }),
          fc.integer({ min: 0, max: nodeKeyPair.keyShares.length - 1 }),
          fc.uint8Array({ minLength: 8, maxLength: 32 }),
          (plaintext, shareIdx, nonce) => {
            const ciphertext = nodeKeyPair.publicKey.encrypt(plaintext);
            const share = nodeKeyPair.keyShares[shareIdx];

            const original = nodeService.computePartial(
              [ciphertext],
              share,
              nonce,
            );

            const serialized = nodeService.serialize(original);
            const deserialized = nodeService.deserialize(serialized);

            // The deserialized partial should verify
            const isValid = nodeService.verifyPartial(
              deserialized,
              [ciphertext],
              share.verificationKey,
              nodeKeyPair.publicKey,
            );

            expect(isValid).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
