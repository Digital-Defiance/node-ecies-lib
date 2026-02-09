/**
 * Re-export all threshold interfaces from ecies-lib
 * This ensures interface parity between browser and Node.js implementations
 *
 * Node.js-specific Buffer extensions will be added in future tasks.
 */
export type {
  // Data structures
  KeyShare,
  ThresholdKeyConfig,
  ThresholdKeyPair,
  ZKProof,
  PartialDecryption,
  CombinedZKProof,
  CombinedDecryption,
  // Guardian types
  Guardian,
  GuardianStatusChangeEvent,
  // Interval types
  IntervalConfig,
  IntervalTriggerEvent,
  // Ceremony types
  Ceremony,
  // Tally types
  IntervalTally,
  TallySubscription,
  VerificationResult,
  // Poll configuration
  ThresholdPollConfig,
  // Audit types
  ThresholdAuditEntry,
  // Service interfaces
  IThresholdKeyGenerator,
  IPartialDecryptionService,
  IDecryptionCombiner,
  IGuardianRegistry,
  IIntervalScheduler,
  ICeremonyCoordinator,
  IPublicTallyFeed,
  ITallyVerifier,
  IThresholdPoll,
  IThresholdPollFactory,
  IThresholdAggregator,
} from '@digitaldefiance/ecies-lib';
