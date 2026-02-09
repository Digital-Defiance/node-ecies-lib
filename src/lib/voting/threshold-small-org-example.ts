/**
 * Threshold Small Organization Vote Example
 *
 * Demonstrates a 2-of-3 Guardian threshold voting setup with a single
 * decryption at poll close — backward-compatible behavior where no
 * interval decryption occurs during voting.
 *
 * This is the simplest threshold configuration, suitable for:
 * - Small nonprofits or clubs
 * - Board elections
 * - Committee decisions
 * - Any scenario where real-time tallies aren't needed but distributed
 *   trust is still desired
 *
 * Key concepts shown:
 * - Minimal threshold setup (2-of-3)
 * - Single decryption at poll close (no intervals)
 * - Backward-compatible behavior with threshold security
 * - Simple ceremony flow
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
  IntervalTally,
  Guardian,
} from './threshold';

/**
 * Run a simulated small organization vote with threshold decryption.
 *
 * Setup:
 * - 3 Guardians (president, secretary, treasurer)
 * - Threshold of 2 (any two officers can decrypt)
 * - Single decryption at poll close (no interval decryption)
 * - Behaves like a standard poll but with distributed trust
 */
async function runSmallOrgVote(): Promise<void> {
  console.log('=== Small Organization Board Election ===\n');
  console.log('Configuration: 2-of-3 Guardian threshold');
  console.log('Interval: Single decryption at poll close\n');

  // ─── Step 1: Generate threshold keys ───────────────────────────
  console.log('Step 1: Generating threshold keys (2-of-3)...');

  const thresholdConfig: ThresholdKeyConfig = {
    totalShares: 3,
    threshold: 2,
    keyBitLength: 512, // Small for demo; use 2048+ in production
  };

  const keyGen = new ThresholdKeyGenerator();
  keyGen.validateConfig(thresholdConfig);
  const keyPair = await keyGen.generate(thresholdConfig);

  console.log(`  ${keyPair.keyShares.length} key shares generated`);
  console.log(`  Any 2 of 3 officers can decrypt results\n`);

  // ─── Step 2: Register Guardians (organization officers) ────────
  console.log('Step 2: Registering organization officers as Guardians...');

  const guardianNames = [
    'President (Jane)',
    'Secretary (Alex)',
    'Treasurer (Sam)',
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

  console.log(`  Total officers: ${registry.count}\n`);

  // ─── Step 3: Configure for single decryption at close ──────────
  console.log('Step 3: Configuring single-decryption mode...');
  console.log('  (No interval decryption — results revealed only at close)\n');

  // Use a very large time interval so no interval triggers fire.
  // The only decryption happens via triggerFinal() at poll close.
  const intervalConfig: IntervalConfig = {
    triggerType: IntervalTriggerType.TimeBased,
    timeIntervalMs: Number.MAX_SAFE_INTEGER, // Effectively disabled
    minimumIntervalMs: 60 * 1000,
    ceremonyTimeoutMs: 2 * 60 * 1000, // 2 min timeout
  };

  console.log('  Time interval: disabled (single decryption at close)');
  console.log(
    `  Ceremony timeout: ${intervalConfig.ceremonyTimeoutMs / 1000}s\n`,
  );

  // ─── Step 4: Simulate voting period ────────────────────────────
  console.log('Step 4: Voting period (no results revealed)...');

  const choices = ['Maria Garcia', 'David Chen', 'Lisa Patel'];
  const pollId = Buffer.from([0, 1]);

  // In production, members would cast encrypted votes here.
  // The homomorphic aggregation accumulates encrypted tallies
  // without anyone being able to see intermediate results.
  console.log('  Ballot: Board Member Election');
  console.log(`  Candidates: ${choices.join(', ')}`);
  console.log('  25 members casting votes...');
  console.log('  (All votes encrypted — no one can see results yet)\n');

  // Simulated final encrypted tallies after all 25 members voted
  const finalVotes = [12n, 8n, 5n]; // 25 total votes
  const encryptedTally = finalVotes.map((v) => keyPair.publicKey.encrypt(v));

  // ─── Step 5: Close poll and run final ceremony ─────────────────
  console.log('Step 5: Poll closed — running final decryption ceremony...');

  const coordinator = new CeremonyCoordinator<Buffer>(
    keyPair.publicKey,
    keyPair.verificationKeys,
    keyPair.theta,
    thresholdConfig,
    intervalConfig.ceremonyTimeoutMs,
  );

  // Final ceremony (intervalNumber = -1 indicates final)
  const ceremony = coordinator.startCeremony(pollId, -1, encryptedTally);
  console.log(`  Final ceremony started: ${ceremony.id.slice(0, 16)}...`);

  // Only 2 of 3 officers needed — Treasurer is traveling
  console.log('\n  Treasurer (Sam) is unavailable — only 2 officers needed:');
  registry.updateStatus(guardianIds[2], GuardianStatus.Offline);

  const partialService = new PartialDecryptionService(keyPair.publicKey);

  // President and Secretary participate
  const participatingIndices = [0, 1];
  for (const idx of participatingIndices) {
    const share = keyPair.keyShares[idx];
    const partial = partialService.computePartial(
      encryptedTally,
      share,
      ceremony.nonce,
    );
    const accepted = coordinator.submitPartial(ceremony.id, partial);
    console.log(
      `    ${guardianNames[idx]}: ${accepted ? '✓ decryption submitted' : '✗ rejected'}`,
    );
  }

  console.log(`\n  Ceremony status: ${ceremony.status}`);

  // ─── Step 6: Publish and verify final results ──────────────────
  if (ceremony.result) {
    console.log('\nStep 6: Publishing final results...');

    const tallyFeed = new PublicTallyFeed<Buffer>();

    const finalTally: IntervalTally<Buffer> = {
      pollId,
      intervalNumber: -1, // Final tally
      tallies: ceremony.result.tallies,
      choices,
      voteCount: 25,
      cumulativeVoteCount: 25,
      proof: ceremony.result.combinedProof,
      participatingGuardians: ceremony.result.participatingGuardians,
      timestamp: Date.now(),
      isFinal: true,
    };

    tallyFeed.publish(finalTally);

    // Display results
    console.log('\n  ╔══════════════════════════════════╗');
    console.log('  ║     BOARD ELECTION RESULTS       ║');
    console.log('  ╠══════════════════════════════════╣');
    choices.forEach((choice, i) => {
      const votes = ceremony.result!.tallies[i];
      const pct = ((Number(votes) / 25) * 100).toFixed(0);
      const bar = '█'.repeat(Math.round(Number(votes)));
      console.log(
        `  ║  ${choice.padEnd(15)} ${String(votes).padStart(3)} (${pct.padStart(2)}%) ${bar}`,
      );
    });
    console.log('  ╠══════════════════════════════════╣');
    console.log(`  ║  Total votes: 25                 ║`);
    console.log('  ╚══════════════════════════════════╝');

    // Determine winner
    let maxVotes = 0n;
    let winnerIdx = 0;
    ceremony.result.tallies.forEach((v, i) => {
      if (v > maxVotes) {
        maxVotes = v;
        winnerIdx = i;
      }
    });
    console.log(`\n  Winner: ${choices[winnerIdx]} 🎉`);

    // ─── Step 7: Verify results ────────────────────────────────
    console.log('\nStep 7: Verifying results...');

    const verifier = new TallyVerifier<Buffer>(
      keyPair.publicKey,
      keyPair.verificationKeys,
      thresholdConfig,
      keyPair.theta,
    );

    const registeredIndices = keyPair.keyShares.map((s) => s.index);
    const result = verifier.verify(
      finalTally,
      encryptedTally,
      keyPair.verificationKeys,
      keyPair.publicKey,
      registeredIndices,
    );

    console.log(`  Proof valid: ${result.checks.proofValid ? '✓' : '✗'}`);
    console.log(
      `  Guardians authorized: ${result.checks.guardiansAuthorized ? '✓' : '✗'}`,
    );
    console.log(
      `  Tally consistent: ${result.checks.tallyMatchesEncrypted ? '✓' : '✗'}`,
    );
    console.log(`  Overall: ${result.valid ? '✓ VERIFIED' : '✗ FAILED'}`);
  }

  console.log('\n=== Small organization vote complete ===');
  console.log('Key takeaway:');
  console.log('  - Same security as a full threshold setup');
  console.log('  - No interval decryption — results only at close');
  console.log('  - Only 2 of 3 officers needed (Treasurer was away)');
  console.log('  - Behaves like a standard poll but no single point of trust');
}

// Run example
if (require.main === module) {
  runSmallOrgVote().catch(console.error);
}

export { runSmallOrgVote };
