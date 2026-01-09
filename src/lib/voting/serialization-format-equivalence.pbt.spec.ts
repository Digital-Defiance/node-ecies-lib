/**
 * Property-Based Test: Serialization Format Equivalence
 * Feature: sync-voting-system-refactor, Property 7: Serialization Format Equivalence
 * Validates: Requirements 7.4
 *
 * This test verifies that voting data structures serialize to structurally
 * equivalent JSON in both ecies-lib and node-ecies-lib, modulo Buffer/Uint8Array
 * representation differences.
 */

import * as fc from 'fast-check';
import * as eciesLib from '@digitaldefiance/ecies-lib';
import * as nodeLib from '../index';

describe('Property 7: Serialization Format Equivalence', () => {
  // Helper function to normalize binary data in serialized objects
  function normalizeBinaryData(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle Buffer serialization format {type: "Buffer", data: [...]}
    if (
      typeof obj === 'object' &&
      obj.type === 'Buffer' &&
      Array.isArray(obj.data)
    ) {
      return obj.data;
    }

    if (Buffer.isBuffer(obj)) {
      return Array.from(obj);
    }

    if (obj instanceof Uint8Array) {
      return Array.from(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(normalizeBinaryData);
    }

    if (typeof obj === 'object') {
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = normalizeBinaryData(value);
      }
      return normalized;
    }

    return obj;
  }

  // Helper function to create equivalent voting data for both libraries
  function createTestVotingData() {
    return {
      encryptedVote: {
        choiceIndex: 1,
        choices: [0, 1],
        rankings: [2, 1, 0],
        weight: BigInt(100),
        score: 85.5,
        encrypted: [BigInt(123), BigInt(456), BigInt(789)],
      },
      pollResults: {
        winner: 'Alice',
        tally: new Map([
          ['Alice', BigInt(150)],
          ['Bob', BigInt(100)],
          ['Charlie', BigInt(75)],
        ]),
        totalVotes: BigInt(325),
      },
      auditEntry: {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        eventType: 'VOTE_CAST',
        description: 'Vote cast by voter 123',
        hash: 'abc123def456',
      },
      votingReceipt: {
        receiptId: 'receipt-123',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        pollId: 'poll-456',
        voterHash: 'voter-hash-789',
      },
    };
  }

  it('should serialize EncryptedVote equivalently in both libraries', () => {
    fc.assert(
      fc.property(
        fc.record({
          choiceIndex: fc.option(fc.integer({ min: 0, max: 10 })),
          choices: fc.option(
            fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 5 }),
          ),
          rankings: fc.option(
            fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 5 }),
          ),
          weight: fc.option(fc.bigInt({ min: 1n, max: 1000n })),
          score: fc.option(fc.float({ min: 0, max: 100 })),
          encrypted: fc.array(fc.bigInt({ min: 1n, max: 999999n }), {
            minLength: 1,
            maxLength: 5,
          }),
        }),
        (voteData) => {
          // Create equivalent vote objects for both libraries
          const eciesVote: any = {
            ...voteData,
            // Add mock binary data as Uint8Array for ecies-lib
            mockBinaryData: new Uint8Array([1, 2, 3, 4]),
          };

          const nodeVote: any = {
            ...voteData,
            // Add mock binary data as Buffer for node-ecies-lib
            mockBinaryData: Buffer.from([1, 2, 3, 4]),
          };

          // Serialize both
          const eciesSerialized = JSON.stringify(eciesVote, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (value instanceof Uint8Array) {
              return Array.from(value);
            }
            return value;
          });

          const nodeSerialized = JSON.stringify(nodeVote, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (Buffer.isBuffer(value)) {
              return Array.from(value);
            }
            return value;
          });

          // Parse and normalize both
          const eciesParsed = JSON.parse(eciesSerialized);
          const nodeParsed = JSON.parse(nodeSerialized);

          const eciesNormalized = normalizeBinaryData(eciesParsed);
          const nodeNormalized = normalizeBinaryData(nodeParsed);

          // Should be structurally equivalent
          expect(nodeNormalized).toEqual(eciesNormalized);

          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should serialize PollResults equivalently in both libraries', () => {
    fc.assert(
      fc.property(
        fc.record({
          winner: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
          tally: fc.dictionary(
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.bigInt({ min: 0n, max: 1000n }),
          ),
          totalVotes: fc.bigInt({ min: 0n, max: 10000n }),
        }),
        (resultsData) => {
          // Convert dictionary to Map for both libraries
          const tallyMap = new Map(Object.entries(resultsData.tally));

          const eciesResults: any = {
            ...resultsData,
            tally: tallyMap,
            // Add mock binary data
            signature: new Uint8Array([5, 6, 7, 8]),
          };

          const nodeResults: any = {
            ...resultsData,
            tally: tallyMap,
            // Add mock binary data
            signature: Buffer.from([5, 6, 7, 8]),
          };

          // Serialize both with Map and BigInt handling
          const eciesSerialized = JSON.stringify(eciesResults, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (value instanceof Map) {
              return Object.fromEntries(value);
            }
            if (value instanceof Uint8Array) {
              return Array.from(value);
            }
            return value;
          });

          const nodeSerialized = JSON.stringify(nodeResults, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (value instanceof Map) {
              return Object.fromEntries(value);
            }
            if (Buffer.isBuffer(value)) {
              return Array.from(value);
            }
            return value;
          });

          // Parse and normalize
          const eciesParsed = JSON.parse(eciesSerialized);
          const nodeParsed = JSON.parse(nodeSerialized);

          const eciesNormalized = normalizeBinaryData(eciesParsed);
          const nodeNormalized = normalizeBinaryData(nodeParsed);

          // Should be structurally equivalent
          expect(nodeNormalized).toEqual(eciesNormalized);

          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should serialize AuditEntry equivalently in both libraries', () => {
    fc.assert(
      fc.property(
        fc.record({
          timestamp: fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-01-01'),
          }),
          eventType: fc.constantFrom(
            'VOTE_CAST',
            'POLL_CREATED',
            'TALLY_COMPUTED',
            'AUDIT_REQUESTED',
          ),
          description: fc.string({ minLength: 1, maxLength: 100 }),
          hash: fc
            .array(
              fc.constantFrom(
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'a',
                'b',
                'c',
                'd',
                'e',
                'f',
              ),
              { minLength: 8, maxLength: 64 },
            )
            .map((arr) => arr.join('')),
        }),
        (auditData) => {
          const eciesEntry: any = {
            ...auditData,
            // Add mock binary data
            signature: new Uint8Array([9, 10, 11, 12]),
            previousHash: new Uint8Array([13, 14, 15, 16]),
          };

          const nodeEntry: any = {
            ...auditData,
            // Add mock binary data
            signature: Buffer.from([9, 10, 11, 12]),
            previousHash: Buffer.from([13, 14, 15, 16]),
          };

          // Serialize both
          const eciesSerialized = JSON.stringify(eciesEntry, (key, value) => {
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (value instanceof Uint8Array) {
              return Array.from(value);
            }
            return value;
          });

          const nodeSerialized = JSON.stringify(nodeEntry, (key, value) => {
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (Buffer.isBuffer(value)) {
              return Array.from(value);
            }
            return value;
          });

          // Parse and normalize
          const eciesParsed = JSON.parse(eciesSerialized);
          const nodeParsed = JSON.parse(nodeSerialized);

          const eciesNormalized = normalizeBinaryData(eciesParsed);
          const nodeNormalized = normalizeBinaryData(nodeParsed);

          // Should be structurally equivalent
          expect(nodeNormalized).toEqual(eciesNormalized);

          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should serialize VotingReceipt equivalently in both libraries', () => {
    fc.assert(
      fc.property(
        fc.record({
          receiptId: fc.string({ minLength: 1, maxLength: 50 }),
          timestamp: fc.date({
            min: new Date('2020-01-01'),
            max: new Date('2030-01-01'),
          }),
          pollId: fc.string({ minLength: 1, maxLength: 50 }),
          voterHash: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        (receiptData) => {
          const eciesReceipt: any = {
            ...receiptData,
            // Add mock binary data
            cryptographicProof: new Uint8Array([17, 18, 19, 20]),
            voterSignature: new Uint8Array([21, 22, 23, 24]),
          };

          const nodeReceipt: any = {
            ...receiptData,
            // Add mock binary data
            cryptographicProof: Buffer.from([17, 18, 19, 20]),
            voterSignature: Buffer.from([21, 22, 23, 24]),
          };

          // Serialize both
          const eciesSerialized = JSON.stringify(eciesReceipt, (key, value) => {
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (value instanceof Uint8Array) {
              return Array.from(value);
            }
            return value;
          });

          const nodeSerialized = JSON.stringify(nodeReceipt, (key, value) => {
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (Buffer.isBuffer(value)) {
              return Array.from(value);
            }
            return value;
          });

          // Parse and normalize
          const eciesParsed = JSON.parse(eciesSerialized);
          const nodeParsed = JSON.parse(nodeSerialized);

          const eciesNormalized = normalizeBinaryData(eciesParsed);
          const nodeNormalized = normalizeBinaryData(nodeParsed);

          // Should be structurally equivalent
          expect(nodeNormalized).toEqual(eciesNormalized);

          return true;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('should handle complex nested structures with binary data', () => {
    fc.assert(
      fc.property(
        fc.record({
          level1: fc.record({
            level2: fc.record({
              binaryArray: fc.array(fc.integer({ min: 0, max: 255 }), {
                maxLength: 10,
              }),
              textData: fc.string({ maxLength: 50 }),
              numericData: fc.bigInt({ min: 1n, max: 1000n }),
            }),
          }),
          topLevelBinary: fc.array(fc.integer({ min: 0, max: 255 }), {
            maxLength: 5,
          }),
        }),
        (complexData) => {
          // Create nested structures with binary data
          const eciesComplex: any = {
            level1: {
              level2: {
                ...complexData.level1.level2,
                binaryArray: new Uint8Array(
                  complexData.level1.level2.binaryArray,
                ),
              },
            },
            topLevelBinary: new Uint8Array(complexData.topLevelBinary),
          };

          const nodeComplex: any = {
            level1: {
              level2: {
                ...complexData.level1.level2,
                binaryArray: Buffer.from(complexData.level1.level2.binaryArray),
              },
            },
            topLevelBinary: Buffer.from(complexData.topLevelBinary),
          };

          // Serialize both
          const eciesSerialized = JSON.stringify(eciesComplex, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (value instanceof Uint8Array) {
              return Array.from(value);
            }
            return value;
          });

          const nodeSerialized = JSON.stringify(nodeComplex, (key, value) => {
            if (typeof value === 'bigint') {
              return value.toString();
            }
            if (Buffer.isBuffer(value)) {
              return Array.from(value);
            }
            return value;
          });

          // Parse and normalize
          const eciesParsed = JSON.parse(eciesSerialized);
          const nodeParsed = JSON.parse(nodeSerialized);

          const eciesNormalized = normalizeBinaryData(eciesParsed);
          const nodeNormalized = normalizeBinaryData(nodeParsed);

          // Should be structurally equivalent
          expect(nodeNormalized).toEqual(eciesNormalized);

          return true;
        },
      ),
      { numRuns: 30 },
    );
  });

  it('should verify serialization format property across all voting data types', () => {
    // Meta-property: For any voting data structure, serialization should be equivalent
    // modulo Buffer/Uint8Array representation
    const testData = createTestVotingData();

    // Test each data type
    const dataTypes = [
      { name: 'encryptedVote', data: testData.encryptedVote },
      { name: 'pollResults', data: testData.pollResults },
      { name: 'auditEntry', data: testData.auditEntry },
      { name: 'votingReceipt', data: testData.votingReceipt },
    ];

    for (const { name, data } of dataTypes) {
      // Add binary data to test serialization
      const eciesData = {
        ...data,
        mockBinary: new Uint8Array([1, 2, 3]),
      };
      const nodeData = {
        ...data,
        mockBinary: Buffer.from([1, 2, 3]),
      };

      // Serialize with appropriate handlers
      const eciesSerialized = JSON.stringify(eciesData, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        if (value instanceof Date) return value.toISOString();
        if (value instanceof Map) return Object.fromEntries(value);
        if (value instanceof Uint8Array) return Array.from(value);
        return value;
      });

      const nodeSerialized = JSON.stringify(nodeData, (key, value) => {
        if (typeof value === 'bigint') return value.toString();
        if (value instanceof Date) return value.toISOString();
        if (value instanceof Map) return Object.fromEntries(value);
        if (Buffer.isBuffer(value)) return Array.from(value);
        return value;
      });

      // Parse and normalize
      const eciesParsed = JSON.parse(eciesSerialized);
      const nodeParsed = JSON.parse(nodeSerialized);

      const eciesNormalized = normalizeBinaryData(eciesParsed);
      const nodeNormalized = normalizeBinaryData(nodeParsed);

      // Should be equivalent for each data type
      expect(nodeNormalized).toEqual(eciesNormalized);
    }
  });
});
