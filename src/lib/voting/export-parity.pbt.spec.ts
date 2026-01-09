/**
 * Property-Based Test: Export Parity
 * Feature: sync-voting-system-refactor, Property 4: Export Parity
 * Validates: Requirements 6.1
 *
 * Verifies that node-ecies-lib exports all the same symbols as ecies-lib,
 * allowing for Node.js-specific additions.
 */

import * as eciesLibVoting from '@digitaldefiance/ecies-lib/lib/voting';
import * as nodeEciesLibVoting from './index';

describe('Export Parity Property Test', () => {
  describe('Property 4: Export Parity', () => {
    it('should export all classes from ecies-lib', () => {
      // Core classes that must be present in both libraries
      const requiredClasses = [
        'Poll',
        'PollTallier',
        'VoteEncoder',
        'PollFactory',
        'VotingSecurityValidator',
        'ImmutableAuditLog',
        'PublicBulletinBoard',
        'PollEventLogger',
        'PrecinctAggregator',
        'CountyAggregator',
        'StateAggregator',
        'NationalAggregator',
        'BatchVoteProcessor',
      ];

      for (const className of requiredClasses) {
        expect(nodeEciesLibVoting).toHaveProperty(className);
        expect(typeof (nodeEciesLibVoting as any)[className]).toBe('function');
      }
    });

    it('should export all enumerations from ecies-lib', () => {
      // Enumerations that must be present in both libraries
      const requiredEnums = [
        'VotingMethod',
        'SecurityLevel',
        'EventType',
        'AuditEventType',
        'JurisdictionLevel',
      ];

      for (const enumName of requiredEnums) {
        expect(nodeEciesLibVoting).toHaveProperty(enumName);
        expect(typeof (nodeEciesLibVoting as any)[enumName]).toBe('object');
      }
    });

    it('should export VOTING_SECURITY constant', () => {
      expect(nodeEciesLibVoting).toHaveProperty('VOTING_SECURITY');
      expect(typeof nodeEciesLibVoting.VOTING_SECURITY).toBe('object');
    });

    it('should export Node.js-specific classes', () => {
      // Node.js-specific classes that should only be in node-ecies-lib
      const nodeSpecificClasses = [
        'NodeVoteLogger',
        'NodeCheckpointManager',
        'VotingPoll', // Legacy wrapper
      ];

      for (const className of nodeSpecificClasses) {
        expect(nodeEciesLibVoting).toHaveProperty(className);
        expect(typeof (nodeEciesLibVoting as any)[className]).toBe('function');
      }
    });

    it('should have one-to-one correspondence for shared exports', () => {
      // Get all exports from ecies-lib
      const eciesExports = Object.keys(eciesLibVoting);

      // Filter out default export and __esModule
      const eciesNamedExports = eciesExports.filter(
        (name) => name !== 'default' && name !== '__esModule',
      );

      // Get all exports from node-ecies-lib
      const nodeExports = Object.keys(nodeEciesLibVoting);
      const nodeNamedExports = nodeExports.filter(
        (name) => name !== 'default' && name !== '__esModule',
      );

      // Every ecies-lib export should exist in node-ecies-lib
      for (const exportName of eciesNamedExports) {
        expect(nodeNamedExports).toContain(exportName);
      }

      // node-ecies-lib can have additional exports (Node.js-specific)
      // So we don't require exact equality, just that all ecies-lib exports are present
      expect(nodeNamedExports.length).toBeGreaterThanOrEqual(
        eciesNamedExports.length,
      );
    });

    it('should export the same enumeration values', () => {
      // Verify VotingMethod enum values match
      const eciesVotingMethod = eciesLibVoting.VotingMethod;
      const nodeVotingMethod = nodeEciesLibVoting.VotingMethod;

      const eciesValues = Object.values(eciesVotingMethod);
      const nodeValues = Object.values(nodeVotingMethod);

      expect(nodeValues).toEqual(eciesValues);
    });

    it('should export the same SecurityLevel enum values', () => {
      const eciesSecurityLevel = eciesLibVoting.SecurityLevel;
      const nodeSecurityLevel = nodeEciesLibVoting.SecurityLevel;

      const eciesValues = Object.values(eciesSecurityLevel);
      const nodeValues = Object.values(nodeSecurityLevel);

      expect(nodeValues).toEqual(eciesValues);
    });

    it('should export the same EventType enum values', () => {
      const eciesEventType = eciesLibVoting.EventType;
      const nodeEventType = nodeEciesLibVoting.EventType;

      const eciesValues = Object.values(eciesEventType);
      const nodeValues = Object.values(nodeEventType);

      expect(nodeValues).toEqual(eciesValues);
    });

    it('should export the same AuditEventType enum values', () => {
      const eciesAuditEventType = eciesLibVoting.AuditEventType;
      const nodeAuditEventType = nodeEciesLibVoting.AuditEventType;

      const eciesValues = Object.values(eciesAuditEventType);
      const nodeValues = Object.values(nodeAuditEventType);

      expect(nodeValues).toEqual(eciesValues);
    });

    it('should export the same JurisdictionLevel enum values', () => {
      const eciesJurisdictionLevel = eciesLibVoting.JurisdictionLevel;
      const nodeJurisdictionLevel = nodeEciesLibVoting.JurisdictionLevel;

      const eciesValues = Object.values(eciesJurisdictionLevel);
      const nodeValues = Object.values(nodeJurisdictionLevel);

      expect(nodeValues).toEqual(eciesValues);
    });
  });
});
