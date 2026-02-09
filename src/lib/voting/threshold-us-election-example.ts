/**
 * Threshold U.S. Election Example
 *
 * Demonstrates a 5-of-9 Guardian threshold voting setup with hourly
 * interval decryption and public tally feed consumption — modeled
 * after a U.S. presidential election with real-time CNN-style results.
 *
 * Key concepts shown:
 * - Threshold key generation (5-of-9)
 * - Guardian registration and management
 * - Hourly interval decryption ceremonies
 * - Public tally feed subscription for media/observers
 * - Hierarchical aggregation with threshold decryption
 * - Third-party tally verification
 *
 * NOTE: This example is for documentation purposes and demonstrates the
 * intended API. Due to type incompatibilities between ecies-lib Member
 * (Uint8Array) and node-ecies-lib voting system (Buffer), some type
 * assertions may be needed in actual usage. See test files for working
 * integration examples.
 */

import {
  ThresholdKeyGenerator,
  GuardianRegistry,
  GuardianStatus,
  CeremonyCoordinator,
  PublicTallyFeed,
  TallyVerifier,
  PartialDecryptionService,
  IntervalTriggerType,
} from './threshold';
import type {
  ThresholdKeyConfig,
  IntervalConfig,
  ThresholdPollConfig,
  Guardian,
  IntervalTally,
} from './threshold';

/**
 * Run a simulated U.S. presidential election with threshold decryption.
 *
 * Setup:
 * - 9 Guardians (bipartisan election officials, judiciary, civil society)
 * - Threshold of 5 (majority required to decrypt)
 * - Hourly interval decryption during voting hours (6 AM – 8 PM)
 * - Public tally feed for media consumption
 */
async function runThresholdUSElection(): Promise<void> {
  console.log('=== Threshold U.S. Presidential Election ===\n');
  console.log('Configuration: 5-of-9 Guardian threshold');
  console.log('Interval: Hourly decryption ceremonies\n');

  // ─── Step 1: Generate threshold keys ───────────────────────────
  console.log('Step 1: Generating threshold Paillier keys...');

  const thresholdConfig: ThresholdKeyConfig = {
    totalShares: 9,
    threshold: 5,
    keyBitLength: 512, // Small for demo; use 2048+ in production
  };

  const keyGen = new ThresholdKeyGenerator();
  keyGen.validateConfig(thresholdConfig);
  const keyPair = await keyGen.generate(thresholdConfig);

  console.log(`  Public key generated (${thresholdConfig.keyBitLength}-bit)`);
  console.log(`  ${keyPair.keyShares.length} key shares created`);
  console.log(
    `  Threshold: ${thresholdConfig.threshold} of ${thresholdConfig.totalShares}\n`,
  );

  // ─── Step 2: Register Guardians ────────────────────────────────
  console.log('Step 2: Registering 9 Guardians...');

  const guardianNames = [
    'Democratic Party Representative',
    'Republican Party Representative',
    'Federal Judge (Chief)',
    'Federal Judge (Associate)',
    'State Secretary of State',
    'League of Women Voters',
    'ACLU Observer',
    'Academic Cryptographer',
    'International Election Monitor',
  ];

  const registry = new GuardianRegistry<Buffer>(thresholdConfig.totalShares);

  const guardianIds: Buffer[] = [];
  for (let i = 0; i < thresholdConfig.totalShares; i++) {
    const id = Buffer.from([i + 1]);
    guardianIds.push(id);

    const guardian: Guardian<Buffer> = {
      id,
      name: guardianNames[i],
      shareIndex: keyPair.keyShares[i].index,
      verificationKey: keyPair.keyShares[i].verificationKey,
      status: GuardianStatus.Online,
    };

    registry.register(guardian);
    console.log(`  [${i + 1}] ${guardianNames[i]} — Online`);
  }

  // Monitor Guardian status changes
  registry.onStatusChange((event) => {
    const guardian = registry.getGuardian(event.guardianId);
    console.log(
      `  ⚡ Guardian "${guardian?.name}" status: ${event.previousStatus} → ${event.newStatus}`,
    );
  });

  console.log(`  Total registered: ${registry.count}\n`);

  // ─── Step 3: Configure interval scheduling ─────────────────────
  console.log('Step 3: Configuring hourly interval decryption...');

  const intervalConfig: IntervalConfig = {
    triggerType: IntervalTriggerType.TimeBased,
    timeIntervalMs: 60 * 60 * 1000, // 1 hour
    minimumIntervalMs: 30 * 60 * 1000, // 30 min minimum between ceremonies
    ceremonyTimeoutMs: 5 * 60 * 1000, // 5 min timeout per ceremony
  };

  console.log(`  Trigger: ${intervalConfig.triggerType}`);
  console.log(
    `  Interval: ${(intervalConfig.timeIntervalMs ?? 0) / 60000} minutes`,
  );
  console.log(
    `  Ceremony timeout: ${intervalConfig.ceremonyTimeoutMs / 60000} minutes\n`,
  );

  // ─── Step 4: Create threshold poll ─────────────────────────────
  console.log('Step 4: Creating threshold-enabled poll...');

  const thresholdPollConfig: ThresholdPollConfig<Buffer> = {
    thresholdConfig,
    intervalConfig,
    guardianRegistry: registry,
    keyPair,
  };

  console.log('  Poll configuration created:');
  console.log(
    `    Threshold: ${thresholdPollConfig.thresholdConfig.threshold} of ${thresholdPollConfig.thresholdConfig.totalShares}`,
  );
  console.log(
    `    Interval trigger: ${thresholdPollConfig.intervalConfig.triggerType}`,
  );
  console.log(
    `    Guardians registered: ${thresholdPollConfig.guardianRegistry.count}`,
  );
  console.log(
    `    Key pair provided: ${thresholdPollConfig.keyPair ? '✓' : '✗'}`,
  );
  console.log('  Choices: ["Alice Johnson", "Bob Smith", "Charlie Davis"]');
  console.log(
    '  In production: ThresholdPollFactory.createThresholdPoll(choices, method, authority, config)\n',
  );

  // ─── Step 5: Set up public tally feed ──────────────────────────
  console.log('Step 5: Setting up public tally feed...');

  const tallyFeed = new PublicTallyFeed<Buffer>();
  const pollId = Buffer.from([0, 0, 0, 1]);

  // Media subscriber (e.g., CNN)
  const cnnSubscription = tallyFeed.subscribe(pollId, (tally) => {
    console.log(`  📺 CNN BREAKING: Interval ${tally.intervalNumber} results:`);
    tally.choices.forEach((choice, i) => {
      const votes = tally.tallies[i];
      const pct =
        tally.cumulativeVoteCount > 0
          ? ((Number(votes) / tally.cumulativeVoteCount) * 100).toFixed(1)
          : '0.0';
      console.log(`     ${choice}: ${votes} votes (${pct}%)`);
    });
    console.log(`     Total votes counted: ${tally.cumulativeVoteCount}`);
    console.log(
      `     Guardians participated: ${tally.participatingGuardians.length}/9`,
    );
    console.log(`     Verified: ${tally.proof ? '✓' : '✗'}\n`);
  });

  // AP subscriber
  const apSubscription = tallyFeed.subscribe(pollId, (tally) => {
    console.log(
      `  📰 AP Wire: ${tally.isFinal ? 'FINAL' : `Update #${tally.intervalNumber}`} — ` +
        `${tally.cumulativeVoteCount} votes tallied`,
    );
  });

  console.log('  CNN subscription active');
  console.log('  AP Wire subscription active\n');

  // ─── Step 6: Simulate interval decryption ceremony ─────────────
  console.log('Step 6: Simulating hourly decryption ceremony...');
  console.log('  (In production, votes would be cast and encrypted first)\n');

  // Create ceremony coordinator
  const coordinator = new CeremonyCoordinator<Buffer>(
    keyPair.publicKey,
    keyPair.verificationKeys,
    keyPair.theta,
    thresholdConfig,
    intervalConfig.ceremonyTimeoutMs,
  );

  // Simulate encrypted tallies (3 candidates)
  // In production these come from homomorphic aggregation of encrypted votes
  const simulatedVotes = [42000n, 38000n, 20000n];
  const encryptedTally = simulatedVotes.map((v) =>
    keyPair.publicKey.encrypt(v),
  );

  console.log('  Starting ceremony for interval 1...');
  const ceremony = coordinator.startCeremony(pollId, 1, encryptedTally);
  console.log(`  Ceremony ID: ${ceremony.id}`);
  console.log(
    `  Nonce: ${Buffer.from(ceremony.nonce).toString('hex').slice(0, 16)}...`,
  );

  // 5 of 9 Guardians submit partial decryptions
  const partialService = new PartialDecryptionService(keyPair.publicKey);
  const participatingIndices = [0, 1, 2, 3, 4]; // First 5 Guardians

  console.log('\n  Collecting partial decryptions:');
  for (const idx of participatingIndices) {
    const share = keyPair.keyShares[idx];
    const partial = partialService.computePartial(
      encryptedTally,
      share,
      ceremony.nonce,
    );
    const accepted = coordinator.submitPartial(ceremony.id, partial);
    console.log(
      `    Guardian ${idx + 1} (${guardianNames[idx]}): ${accepted ? '✓ accepted' : '✗ rejected'}`,
    );
  }

  console.log(`\n  Ceremony status: ${ceremony.status}`);

  // ─── Step 7: Combine and publish results ───────────────────────
  if (ceremony.result) {
    console.log('\nStep 7: Publishing interval tally...');

    const intervalTally: IntervalTally<Buffer> = {
      pollId,
      intervalNumber: 1,
      tallies: ceremony.result.tallies,
      choices: ['Alice Johnson', 'Bob Smith', 'Charlie Davis'],
      voteCount: Number(simulatedVotes.reduce((a, b) => a + b, 0n)),
      cumulativeVoteCount: Number(simulatedVotes.reduce((a, b) => a + b, 0n)),
      proof: ceremony.result.combinedProof,
      participatingGuardians: ceremony.result.participatingGuardians,
      timestamp: Date.now(),
      isFinal: false,
    };

    // Publishing triggers subscriber callbacks (CNN, AP)
    tallyFeed.publish(intervalTally);

    // ─── Step 8: Third-party verification ──────────────────────
    console.log('Step 8: Third-party verification...');

    const verifier = new TallyVerifier<Buffer>(
      keyPair.publicKey,
      keyPair.verificationKeys,
      thresholdConfig,
      keyPair.theta,
    );

    const registeredIndices = keyPair.keyShares.map((s) => s.index);
    const verificationResult = verifier.verify(
      intervalTally,
      encryptedTally,
      keyPair.verificationKeys,
      keyPair.publicKey,
      registeredIndices,
    );

    console.log(
      `  Proof valid: ${verificationResult.checks.proofValid ? '✓' : '✗'}`,
    );
    console.log(
      `  Guardians authorized: ${verificationResult.checks.guardiansAuthorized ? '✓' : '✗'}`,
    );
    console.log(
      `  Tally matches encrypted: ${verificationResult.checks.tallyMatchesEncrypted ? '✓' : '✗'}`,
    );
    console.log(
      `  Timestamp valid: ${verificationResult.checks.timestampValid ? '✓' : '✗'}`,
    );
    console.log(
      `  Overall: ${verificationResult.valid ? '✓ VERIFIED' : '✗ FAILED'}\n`,
    );
  }

  // ─── Step 9: Query tally feed history ──────────────────────────
  console.log('Step 9: Tally feed history...');
  const history = tallyFeed.getHistory(pollId);
  console.log(`  Published intervals: ${history.length}`);
  const current = tallyFeed.getCurrentTally(pollId);
  if (current) {
    console.log(`  Latest interval: ${current.intervalNumber}`);
    console.log(`  Cumulative votes: ${current.cumulativeVoteCount}`);
  }

  // Cleanup subscriptions
  cnnSubscription.unsubscribe();
  apSubscription.unsubscribe();

  console.log('\n=== Election simulation complete ===');
  console.log('In production:');
  console.log('  - 175,000 precincts aggregate votes homomorphically');
  console.log('  - Hourly ceremonies decrypt aggregate tallies');
  console.log('  - Media subscribers receive verified results in real-time');
  console.log('  - Any third party can verify proofs independently');
  console.log('  - Final ceremony at poll close produces certified results');
}

// Run example
if (require.main === module) {
  runThresholdUSElection().catch(console.error);
}

export { runThresholdUSElection };
