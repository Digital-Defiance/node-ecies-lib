import { 
  InvariantValidator as BaseInvariantValidator,
  IInvariant 
} from '@digitaldefiance/ecies-lib';
import { TranslatableGenericError } from '@digitaldefiance/i18n-lib';
import { IConstants } from '../interfaces/constants';
import { RecipientIdConsistencyInvariant } from './invariants/recipient-id-consistency';
import { NodeEciesStringKey, NodeEciesComponentId } from '../i18n/node-keys';
import { getNodeEciesI18nEngine } from '../i18n/node-ecies-i18n-setup';

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
    // Also register with base validator for consistency
    BaseInvariantValidator.registerInvariant(invariant);
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
   * This checks both:
   * - Base ecies-lib invariants (via BaseInvariantValidator)
   * - Node-specific invariants
   * 
   * @param config - The configuration to validate
   * @throws Error if any invariant check fails
   */
  static validateAll(config: IConstants): void {
    const failures: string[] = [];

    // First, validate base ecies-lib invariants, excluding the one we are replacing
    const baseInvariants = BaseInvariantValidator.getAllInvariants();
    for (const invariant of baseInvariants) {
      if (invariant.name === 'RecipientIdConsistency') {
        continue;
      }
      if (!invariant.check(config)) {
        failures.push(invariant.errorMessage(config));
      }
    }

    // Then validate Node-specific invariants
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
