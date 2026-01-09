/**
 * Property-Based Test: Enumeration Value Equivalence
 * Feature: sync-voting-system-refactor, Property 1: Enumeration Value Equivalence
 * Validates: Requirements 2.2
 *
 * This test verifies that all enumerations exported by ecies-lib have identical
 * values in node-ecies-lib. This ensures cross-platform compatibility and
 * consistent behavior between browser and Node.js environments.
 */

import * as eciesEnums from '@digitaldefiance/ecies-lib';
import * as nodeEnums from './index';

describe('Property 1: Enumeration Value Equivalence', () => {
  // List of all expected enumerations
  const expectedEnumerations = [
    'VotingMethod',
    'SecurityLevel',
    'EventType',
    'AuditEventType',
    'JurisdictionLevel',
  ];

  it('should export all 5 expected enumerations', () => {
    expectedEnumerations.forEach((enumName) => {
      expect(eciesEnums).toHaveProperty(enumName);
      expect(nodeEnums).toHaveProperty(enumName);
    });
  });

  it('should have identical enumeration values for VotingMethod', () => {
    const eciesEnum = eciesEnums.VotingMethod;
    const nodeEnum = nodeEnums.VotingMethod;

    // Get all keys from both enums
    const eciesKeys = Object.keys(eciesEnum);
    const nodeKeys = Object.keys(nodeEnum);

    // Verify same number of keys
    expect(nodeKeys.length).toBe(eciesKeys.length);

    // Verify each key exists and has the same value
    eciesKeys.forEach((key) => {
      expect(nodeEnum).toHaveProperty(key);
      expect(nodeEnum[key as keyof typeof nodeEnum]).toBe(
        eciesEnum[key as keyof typeof eciesEnum],
      );
    });
  });

  it('should have identical enumeration values for SecurityLevel', () => {
    const eciesEnum = eciesEnums.SecurityLevel;
    const nodeEnum = nodeEnums.SecurityLevel;

    const eciesKeys = Object.keys(eciesEnum);
    const nodeKeys = Object.keys(nodeEnum);

    expect(nodeKeys.length).toBe(eciesKeys.length);

    eciesKeys.forEach((key) => {
      expect(nodeEnum).toHaveProperty(key);
      expect(nodeEnum[key as keyof typeof nodeEnum]).toBe(
        eciesEnum[key as keyof typeof eciesEnum],
      );
    });
  });

  it('should have identical enumeration values for EventType', () => {
    const eciesEnum = eciesEnums.EventType;
    const nodeEnum = nodeEnums.EventType;

    const eciesKeys = Object.keys(eciesEnum);
    const nodeKeys = Object.keys(nodeEnum);

    expect(nodeKeys.length).toBe(eciesKeys.length);

    eciesKeys.forEach((key) => {
      expect(nodeEnum).toHaveProperty(key);
      expect(nodeEnum[key as keyof typeof nodeEnum]).toBe(
        eciesEnum[key as keyof typeof eciesEnum],
      );
    });
  });

  it('should have identical enumeration values for AuditEventType', () => {
    const eciesEnum = eciesEnums.AuditEventType;
    const nodeEnum = nodeEnums.AuditEventType;

    const eciesKeys = Object.keys(eciesEnum);
    const nodeKeys = Object.keys(nodeEnum);

    expect(nodeKeys.length).toBe(eciesKeys.length);

    eciesKeys.forEach((key) => {
      expect(nodeEnum).toHaveProperty(key);
      expect(nodeEnum[key as keyof typeof nodeEnum]).toBe(
        eciesEnum[key as keyof typeof eciesEnum],
      );
    });
  });

  it('should have identical enumeration values for JurisdictionLevel', () => {
    const eciesEnum = eciesEnums.JurisdictionLevel;
    const nodeEnum = nodeEnums.JurisdictionLevel;

    const eciesKeys = Object.keys(eciesEnum);
    const nodeKeys = Object.keys(nodeEnum);

    expect(nodeKeys.length).toBe(eciesKeys.length);

    eciesKeys.forEach((key) => {
      expect(nodeEnum).toHaveProperty(key);
      expect(nodeEnum[key as keyof typeof nodeEnum]).toBe(
        eciesEnum[key as keyof typeof eciesEnum],
      );
    });
  });

  it('should verify all enumerations are re-exported correctly', () => {
    // This property test verifies that for ALL enumerations,
    // the values are identical between ecies-lib and node-ecies-lib
    expectedEnumerations.forEach((enumName) => {
      const eciesEnum = (eciesEnums as any)[enumName];
      const nodeEnum = (nodeEnums as any)[enumName];

      expect(nodeEnum).toBeDefined();
      expect(eciesEnum).toBeDefined();

      // Get all keys
      const eciesKeys = Object.keys(eciesEnum);
      const nodeKeys = Object.keys(nodeEnum);

      // Verify same number of keys
      expect(nodeKeys.length).toBe(eciesKeys.length);

      // Verify each key-value pair matches
      eciesKeys.forEach((key) => {
        expect(nodeEnum[key]).toBe(eciesEnum[key]);
      });
    });
  });
});
