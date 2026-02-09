/**
 * Threshold Corporate Shareholder Vote Example
 *
 * Demonstrates a 3-of-5 Guardian threshold voting setup with
 * vote-count-based interval decryption — modeled after a corporate
 * shareholder vote where results are revealed as voting milestones
 * are reached.
 *
 * Key concepts shown:
 * - Threshold key generation (3-of-5)
 * - Guardian registration (board members / auditors)
 * - Vote-count-based interval decryption (every 500 votes)
 * - Real-time tally feed for stakeholders
 * - Ceremony coordination with partial decryptions
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
  IntervalScheduler,
  PublicTallyFeed,
  PartialDecryptionService,
  IntervalTriggerType,
} from './threshold';
import type {
  ThresholdKeyConfig,
  IntervalConfig,
  IntervalTally,
  Guardian,
} from './threshold';

/**
 * Run a simulated corporate shareholder vote with threshold decryption.
 *
 * Setup:
 * - 5 Guardians (board chair, CFO, external auditor, legal counsel, shareholder rep)
 * - Threshold of 3 (majority of Guardians required)
 * - Vote-count-based intervals (every 500 votes)
 * - Real-time feed for investor relations
 */
async function runCorporateShareholderVote(): Promise<void> {
  console.log('=== Corporate Shareholder Vote ===\n');
  console.log('Configuration: 3-of-5 Guardian threshold');
  console.log('Interval: Every 500 votes\n');

  // ─── Step 1: Generate threshold keys ───────────────────────────
  console.log('Step 1: Generating threshold keys...');

  const thresholdConfig: ThresholdKeyConfig = {
    totalShares: 5,
    threshold: 3,
    keyBitLength: 512, // Small for demo; use 2048+ in production
  };

  const keyGen = new ThresholdKeyGenerator();
  keyGen.validateConfig(thresholdConfig);
  const keyPair = await keyGen.generate(thresholdConfig);

  console.log(`  ${keyPair.keyShares.length} key shares generated`);
  console.log(
    `  Threshold: ${thresholdConfig.threshold} of ${thresholdConfig.totalShares}\n`,
  );

  // ─── Step 2: Register Guardians ────────────────────────────────
  console.log('Step 2: Registering 5 Guardians...');

  const guardianNames = [
    'Board Chairperson',
    'Chief Financial Officer',
    'External Auditor (Deloitte)',
    'General Counsel',
    'Shareholder Representative',
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

  console.log(`  Total registered: ${registry.count}\n`);

  // ─── Step 3: Configure vote-count-based intervals ──────────────
  console.log('Step 3: Configuring vote-count-based intervals...');

  const intervalConfig: IntervalConfig = {
    triggerType: IntervalTriggerType.VoteCountBased,
    voteCountInterval: 500, // Decrypt every 500 votes
    minimumIntervalMs: 60 * 1000, // 1 min minimum between ceremonies
    ceremonyTimeoutMs: 3 * 60 * 1000, // 3 min timeout
  };

  // Demonstrate the interval scheduler
  const pollId = Buffer.from([0, 0, 1]);
  const scheduler = new IntervalScheduler<Buffer>();
  scheduler.configure(pollId, intervalConfig);

  // Track triggers
  scheduler.onTrigger((event) => {
    console.log(
      `  ⏰ Interval trigger #${event.intervalNumber}: ` +
        `${event.triggerReason} (${event.currentVoteCount} votes)`,
    );
  });

  console.log(`  Trigger: ${intervalConfig.triggerType}`);
  console.log(`  Every ${intervalConfig.voteCountInterval} votes`);
  console.log(
    `  Ceremony timeout: ${intervalConfig.ceremonyTimeoutMs / 1000}s\n`,
  );

  // ─── Step 4: Set up tally feed for stakeholders ────────────────
  console.log('Step 4: Setting up stakeholder tally feed...');

  const tallyFeed = new PublicTallyFeed<Buffer>();

  // Investor relations subscriber
  const irSubscription = tallyFeed.subscribe(pollId, (tally) => {
    console.log(`  📊 IR Update — Interval ${tally.intervalNumber}:`);
    tally.choices.forEach((choice, i) => {
      const votes = tally.tallies[i];
      const pct =
        tally.cumulativeVoteCount > 0
          ? ((Number(votes) / tally.cumulativeVoteCount) * 100).toFixed(1)
          : '0.0';
      console.log(`     ${choice}: ${votes} shares (${pct}%)`);
    });
    console.log(`     Total shares voted: ${tally.cumulativeVoteCount}`);
    console.log(`     Guardians: ${tally.participatingGuardians.length}/5\n`);
  });

  console.log('  Investor Relations subscription active\n');

  // ─── Step 5: Simulate vote-count milestone ceremony ────────────
  console.log('Step 5: Simulating decryption at 500-vote milestone...');

  // Proposal: "Approve merger with TechCorp Inc."
  const choices = ['Approve', 'Reject', 'Abstain'];

  // Simulate encrypted tallies after 500 votes
  const votesAtMilestone = [280n, 150n, 70n]; // 500 total shares voted
  const encryptedTally = votesAtMilestone.map((v) =>
    keyPair.publicKey.encrypt(v),
  );

  // Create ceremony coordinator
  const coordinator = new CeremonyCoordinator<Buffer>(
    keyPair.publicKey,
    keyPair.verificationKeys,
    keyPair.theta,
    thresholdConfig,
    intervalConfig.ceremonyTimeoutMs,
  );

  // Start ceremony
  const ceremony = coordinator.startCeremony(pollId, 1, encryptedTally);
  console.log(`  Ceremony started: ${ceremony.id.slice(0, 16)}...`);

  // 3 of 5 Guardians participate (Board Chair, CFO, External Auditor)
  const partialService = new PartialDecryptionService(keyPair.publicKey);
  const participatingIndices = [0, 1, 2]; // First 3 Guardians

  console.log('\n  Collecting partial decryptions (3 of 5):');
  for (const idx of participatingIndices) {
    const share = keyPair.keyShares[idx];
    const partial = partialService.computePartial(
      encryptedTally,
      share,
      ceremony.nonce,
    );
    const accepted = coordinator.submitPartial(ceremony.id, partial);
    console.log(`    ${guardianNames[idx]}: ${accepted ? '✓' : '✗'}`);
  }

  console.log(`\n  Ceremony status: ${ceremony.status}`);

  // ─── Step 6: Publish milestone results ─────────────────────────
  if (ceremony.result) {
    console.log('\nStep 6: Publishing milestone tally...');

    const intervalTally: IntervalTally<Buffer> = {
      pollId,
      intervalNumber: 1,
      tallies: ceremony.result.tallies,
      choices,
      voteCount: 500,
      cumulativeVoteCount: 500,
      proof: ceremony.result.combinedProof,
      participatingGuardians: ceremony.result.participatingGuardians,
      timestamp: Date.now(),
      isFinal: false,
    };

    // Triggers IR subscriber callback
    tallyFeed.publish(intervalTally);

    // Show running totals
    const history = tallyFeed.getHistory(pollId);
    console.log(`  Published intervals: ${history.length}`);
  }

  // ─── Step 7: Simulate final ceremony at vote close ─────────────
  console.log('\nStep 7: Simulating final ceremony (all shares voted)...');

  const finalVotes = [1200n, 650n, 150n]; // 2000 total shares
  const finalEncrypted = finalVotes.map((v) => keyPair.publicKey.encrypt(v));

  const finalCeremony = coordinator.startCeremony(pollId, -1, finalEncrypted);

  // All 5 Guardians participate for the final tally
  console.log('  All 5 Guardians participating in final ceremony:');
  for (let idx = 0; idx < thresholdConfig.totalShares; idx++) {
    const share = keyPair.keyShares[idx];
    const partial = partialService.computePartial(
      finalEncrypted,
      share,
      finalCeremony.nonce,
    );
    const accepted = coordinator.submitPartial(finalCeremony.id, partial);
    console.log(`    ${guardianNames[idx]}: ${accepted ? '✓' : '✗'}`);
  }

  if (finalCeremony.result) {
    const finalTally: IntervalTally<Buffer> = {
      pollId,
      intervalNumber: -1,
      tallies: finalCeremony.result.tallies,
      choices,
      voteCount: 2000,
      cumulativeVoteCount: 2000,
      proof: finalCeremony.result.combinedProof,
      participatingGuardians: finalCeremony.result.participatingGuardians,
      timestamp: Date.now(),
      isFinal: true,
    };

    tallyFeed.publish(finalTally);

    console.log('\n  === FINAL RESULTS ===');
    choices.forEach((choice, i) => {
      const votes = finalCeremony.result!.tallies[i];
      const pct = ((Number(votes) / 2000) * 100).toFixed(1);
      console.log(`  ${choice}: ${votes} shares (${pct}%)`);
    });

    const approvalPct = (Number(finalCeremony.result.tallies[0]) / 2000) * 100;
    console.log(
      `\n  Merger ${approvalPct > 50 ? 'APPROVED' : 'REJECTED'} (${approvalPct.toFixed(1)}% approval)`,
    );
  }

  // Cleanup
  irSubscription.unsubscribe();

  console.log('\n=== Corporate vote simulation complete ===');
  console.log('In production:');
  console.log('  - Shareholders vote via secure portal');
  console.log('  - Results update every 500 votes cast');
  console.log('  - Board Guardians coordinate decryption ceremonies');
  console.log('  - External auditor verifies all proofs independently');
}

// Run example
if (require.main === module) {
  runCorporateShareholderVote().catch(console.error);
}

export { runCorporateShareholderVote };
