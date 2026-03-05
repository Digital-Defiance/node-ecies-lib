/**
 * Verifies that Node_PlatformID is a proper superset of Base_PlatformID.
 *
 * Requirements: R3-AC1, R3-AC2
 * - R3-AC1: Node_PlatformID SHALL be a superset of Base_PlatformID such that
 *   every value satisfying Base_PlatformID also satisfies Node_PlatformID.
 * - R3-AC2: Node_Member SHALL accept any TID that extends Node_PlatformID,
 *   which includes all types from Base_PlatformID plus Buffer, GuidV4Buffer,
 *   and Types.ObjectId.
 */
import { ObjectId } from 'bson';
import {
  PlatformID as BasePlatformID,
  GuidV4Uint8Array,
} from '@digitaldefiance/ecies-lib';
import { PlatformID as NodePlatformID } from '../src/interfaces/platform-id';
import { GuidV4Buffer } from '../src/types/guid-versions';
import { Types } from '@digitaldefiance/mongoose-types';

describe('PlatformID type compatibility', () => {
  describe('Node_PlatformID is a superset of Base_PlatformID (R3-AC1)', () => {
    // Compile-time assertion: every Base_PlatformID value is assignable to Node_PlatformID.
    // If this file compiles, the assertion holds.
    // We also verify at runtime with concrete values.

    it('Uint8Array (base type) is assignable to Node_PlatformID', () => {
      const value: Uint8Array = new Uint8Array([1, 2, 3]);
      // Compile-time: BasePlatformID -> NodePlatformID
      const _asBase: BasePlatformID = value;
      const _asNode: NodePlatformID = _asBase;
      expect(_asNode).toBe(value);
    });

    it('string (base type) is assignable to Node_PlatformID', () => {
      const value = 'some-id';
      const _asBase: BasePlatformID = value;
      const _asNode: NodePlatformID = _asBase;
      expect(_asNode).toBe(value);
    });

    it('ObjectId (base type) is assignable to Node_PlatformID', () => {
      const value = new ObjectId();
      const _asBase: BasePlatformID = value;
      const _asNode: NodePlatformID = _asBase;
      expect(_asNode).toBe(value);
    });

    it('GuidV4Uint8Array (base type) is assignable to Node_PlatformID', () => {
      // GuidV4Uint8Array is a branded Uint8Array — create one via raw cast for type-level check
      const raw = new Uint8Array(16);
      const value = raw as GuidV4Uint8Array;
      const _asBase: BasePlatformID = value;
      const _asNode: NodePlatformID = _asBase;
      expect(_asNode).toBe(value);
    });
  });

  describe('Node_PlatformID includes Node-specific types (R3-AC2)', () => {
    it('Buffer is a valid Node_PlatformID', () => {
      const value = Buffer.from([1, 2, 3]);
      const _asNode: NodePlatformID = value;
      expect(_asNode).toBeInstanceOf(Buffer);
    });

    it('GuidV4Buffer is a valid Node_PlatformID', () => {
      const raw = Buffer.alloc(16);
      const value = raw as GuidV4Buffer;
      const _asNode: NodePlatformID = value;
      expect(_asNode).toBe(value);
    });

    it('Types.ObjectId is a valid Node_PlatformID', () => {
      const value = new Types.ObjectId();
      const _asNode: NodePlatformID = value;
      expect(_asNode).toBeInstanceOf(Types.ObjectId);
    });
  });

  describe('compile-time superset proof', () => {
    it('any BasePlatformID is assignable to NodePlatformID without cast', () => {
      // This function accepts BasePlatformID and returns NodePlatformID.
      // If it compiles, the superset relationship holds.
      function baseToNode(id: BasePlatformID): NodePlatformID {
        return id;
      }

      expect(baseToNode(new Uint8Array(12))).toBeDefined();
      expect(baseToNode('test-id')).toBeDefined();
      expect(baseToNode(new ObjectId())).toBeDefined();
    });
  });
});
