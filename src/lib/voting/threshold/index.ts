/**
 * Threshold Voting Module - Node.js Optimized
 *
 * Re-exports threshold voting components from ecies-lib and adds
 * Node.js-specific extensions with Buffer support for improved performance.
 *
 * Key features:
 * - Threshold Paillier cryptography (k-of-n Guardians required for decryption)
 * - Real-time interval decryption during voting
 * - Zero-knowledge proofs for all decryption operations
 * - Integration with hierarchical aggregation (Precinct → County → State → National)
 * - Backward compatible with single-authority polls
 * - Node.js Buffer support for efficient serialization
 *
 * @example
 * ```typescript
 * import {
 *   ThresholdKeyGenerator,
 *   GuardianRegistry,
 *   CeremonyCoordinator,
 *   GuardianStatus,
 * } from '@digitaldefiance/node-ecies-lib';
 *
 * // Generate threshold keys (5-of-9 configuration)
 * const keyGen = new ThresholdKeyGenerator();
 * const keyPair = await keyGen.generate({ totalShares: 9, threshold: 5 });
 *
 * // Register Guardians
 * const registry = new GuardianRegistry();
 * keyPair.keyShares.forEach((share, i) => {
 *   registry.register({
 *     id: guardianIds[i],
 *     name: `Guardian ${i + 1}`,
 *     shareIndex: share.index,
 *     verificationKey: share.verificationKey,
 *     status: GuardianStatus.Online,
 *   });
 * });
 *
 * // Create threshold poll and conduct voting...
 * ```
 */

// Re-export enumerations from ecies-lib
export * from './enumerations';

// Re-export interfaces from ecies-lib
export type * from './interfaces';

// Node.js Buffer-based extensions
export {
  ThresholdKeyGenerator,
  type BufferKeyShare,
  type BufferThresholdKeyPair,
} from './threshold-key-generator';

export {
  PartialDecryptionService,
  type BufferPartialDecryption,
} from './partial-decryption-service';

export {
  ThresholdPrecinctAggregator,
  ThresholdCountyAggregator,
  ThresholdStateAggregator,
  ThresholdNationalAggregator,
} from './threshold-aggregators';

export { ThresholdPoll } from './threshold-poll';

export { ThresholdPollFactory } from './threshold-poll-factory';

export { ThresholdAuditLog } from './threshold-audit-log';

// Re-export classes from ecies-lib that don't need Buffer extensions
// (they use generics and work with any PlatformID)
export {
  DecryptionCombiner,
  InsufficientPartialsError,
  InvalidPartialInCombineError,
  CombineFailedError,
} from '@digitaldefiance/ecies-lib';

export {
  GuardianRegistry,
  GuardianAlreadyRegisteredError,
  GuardianNotFoundError,
  InvalidShareIndexError,
  RegistryFullError,
} from '@digitaldefiance/ecies-lib';

export {
  IntervalScheduler,
  PollNotConfiguredError,
  InvalidIntervalConfigError,
  PollSchedulingStateError,
} from '@digitaldefiance/ecies-lib';

// Node.js Buffer-based CeremonyCoordinator extension
export { CeremonyCoordinator } from './ceremony-coordinator';

// Re-export error classes from ecies-lib ceremony coordinator
export {
  CeremonyNotFoundError,
  CeremonyAlreadyCompleteError,
  DuplicatePartialSubmissionError,
  InvalidCeremonyPartialProofError,
} from '@digitaldefiance/ecies-lib';

export { PublicTallyFeed } from '@digitaldefiance/ecies-lib';

export { TallyVerifier } from '@digitaldefiance/ecies-lib';

// Re-export error classes from ecies-lib threshold key generator
export {
  InvalidThresholdConfigError,
  KeyGenerationFailedError,
} from '@digitaldefiance/ecies-lib';

// Re-export error classes from ecies-lib partial decryption service
export {
  InvalidPartialProofError,
  DeserializationError,
} from '@digitaldefiance/ecies-lib';

// Re-export error classes from ecies-lib threshold poll factory
export {
  InsufficientGuardiansError,
  InvalidThresholdPollConfigError,
} from '@digitaldefiance/ecies-lib';
