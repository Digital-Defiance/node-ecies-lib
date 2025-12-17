/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TranslatableGenericError } from '@digitaldefiance/i18n-lib';

import { getNodeEciesI18nEngine } from '../i18n/node-ecies-i18n-setup';
import { NodeEciesComponentId, NodeEciesStringKey } from '../i18n/node-keys';
import { IConstants } from '../interfaces/constants';

import { RecipientIdConsistencyInvariant } from './invariants/recipient-id-consistency';

/**
 * Base interface for invariants
 */
interface IInvariant {
  name: string;
  description: string;
  check(config: IConstants): boolean;
  errorMessage(config: IConstants): string;
}

/**
 * Node.js-specific invariant validator.
 *
 * Extends the base ecies-lib validator with Node.js-specific invariants.
 * Validates configuration consistency to prevent bugs like the 12 vs 32-byte
 * recipient ID discrepancy.
 *
 * @example
 * ```typescript
 * import { InvariantValidator } from '@digitaldefiance/node-ecies-lib';
 * import { MyCustomInvariant } from './my-invariants';
 *
 * // Register a custom invariant
 * InvariantValidator.registerInvariant(new MyCustomInvariant());
 *
 * // Validate configuration
 * InvariantValidator.validateAll(config); // throws if any invariant fails
 * ```
 */
export class InvariantValidator {
  /**
   * Node-specific invariants registered by default.
   */
  private static readonly NODE_DEFAULT_INVARIANTS: IInvariant[] = [
    new RecipientIdConsistencyInvariant(),
  ];

  private static customInvariants: IInvariant[] = [];

  /**
   * Register a custom invariant to be checked during validation.
   *
   * @param invariant - The invariant to register
   */
  static registerInvariant(invariant: IInvariant): void {
    this.customInvariants.push(invariant);
  }

  /**
   * Unregister a custom invariant by name.
   *
   * @param name - The name of the invariant to unregister
   * @returns true if the invariant was found and removed, false otherwise
   */
  static unregisterInvariant(name: string): boolean {
    const index = this.customInvariants.findIndex((inv) => inv.name === name);
    if (index === -1) {
      return false;
    }
    this.customInvariants.splice(index, 1);
    return true;
  }

  /**
   * Get all registered invariants (default + custom).
   */
  static getAllInvariants(): readonly IInvariant[] {
    return [...this.NODE_DEFAULT_INVARIANTS, ...this.customInvariants];
  }

  /**
   * Validate all registered invariants against a configuration.
   *
   * This checks Node-specific invariants.
   *
   * @param config - The configuration to validate
   * @throws Error if any invariant check fails
   */
  static validateAll(config: IConstants): void {
    const failures: string[] = [];

    // Validate Node-specific invariants
    for (const invariant of this.getAllInvariants()) {
      if (!invariant.check(config)) {
        failures.push(invariant.errorMessage(config));
      }
    }

    if (failures.length > 0) {
      const engine = getNodeEciesI18nEngine();
      throw TranslatableGenericError.withEngine(
        engine,
        NodeEciesComponentId,
        NodeEciesStringKey.Error_Invariant_ConfigurationValidationFailedTemplate,
        { failures: failures.join('\n\n') },
        undefined,
        { invariantCount: failures.length }
      );
    }
  }

  /**
   * Clear all custom invariants.
   * Default invariants are not affected.
   */
  static clearCustomInvariants(): void {
    this.customInvariants = [];
  }
}
