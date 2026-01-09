/**
 * U.S. Scale Election Example
 * Demonstrates hierarchical aggregation for 159 million votes
 */
import {
  Member,
  MemberType,
  EmailString,
  ECIESService,
} from '@digitaldefiance/ecies-lib';
import {
  PollFactory,
  VoteEncoder,
  PollTallier,
  PrecinctAggregator,
  CountyAggregator,
  StateAggregator,
  NationalAggregator,
  JurisdictionLevel,
  type JurisdictionConfig,
} from '@digitaldefiance/ecies-lib';

import { NodeVoteLogger, NodeCheckpointManager } from './node-persistent-state';

/**
 * Example: Presidential Election 2024
 *
 * Structure:
 * - 175,000 precincts (~900 votes each)
 * - 3,000 counties (~50 precincts each)
 * - 51 states (~60 counties each)
 * - 1 national (51 states)
 *
 * Total: ~159 million votes
 */
async function runUSElection() {
  console.log('=== U.S. Presidential Election 2024 ===\n');

  // 1. Setup election authority
  const eciesService = new ECIESService();

  const { member: authority } = Member.newMember(
    eciesService,
    MemberType.System,
    'Federal Election Commission',
    new EmailString('fec@example.gov'),
  );
  await authority.deriveVotingKeys();

  const choices = ['Alice', 'Bob', 'Charlie'];
  console.log(`Candidates: ${choices.join(', ')}\n`);

  // 2. Create precinct (example: Precinct 1, County 1, State 1)
  const precinctConfig: JurisdictionConfig = {
    id: Buffer.from([1, 0, 0, 0]), // Precinct ID
    name: 'Precinct 1',
    level: JurisdictionLevel.Precinct,
    parentId: Buffer.from([1, 0, 0]), // County ID
  };

  const poll = PollFactory.createPlurality(choices, authority);

  // With persistence (Node.js only)
  const logger = new NodeVoteLogger(precinctConfig.id, './election-data/logs');
  const checkpointMgr = new NodeCheckpointManager(
    precinctConfig,
    './election-data/checkpoints',
  );

  const precinct = new PrecinctAggregator(
    poll,
    precinctConfig,
    logger,
    checkpointMgr,
  );

  console.log('Precinct 1 voting (simulating 900 voters)...');

  // 3. Cast votes at precinct level
  const encoder = new VoteEncoder(authority.votingPublicKey!);

  for (let i = 0; i < 900; i++) {
    const voter = Member.newMember(
      eciesService,
      MemberType.User,
      `Voter ${i}`,
      new EmailString(`voter${i}@example.com`),
    ).member;
    await voter.deriveVotingKeys();

    const choiceIndex = i % 3; // Distribute votes
    const vote = encoder.encodePlurality(choiceIndex, choices.length);

    await precinct.vote(voter, vote);

    if ((i + 1) % 100 === 0) {
      console.log(`  ${i + 1} votes cast (checkpoint saved)`);
    }
  }

  precinct.close();
  console.log('✓ Precinct 1 closed\n');

  // 4. Aggregate at county level
  const countyConfig: JurisdictionConfig = {
    id: Buffer.from([1, 0, 0]),
    name: 'County 1',
    level: JurisdictionLevel.County,
    parentId: Buffer.from([1, 0]),
  };

  const county = new CountyAggregator(countyConfig, authority.votingPublicKey!);

  // Add precinct tally
  const precinctTally = precinct.getTally();
  county.addPrecinctTally(precinctTally);

  // In production: add 49 more precincts
  console.log('County 1 aggregation:');
  console.log(`  Precincts: 1 (would be ~50 in production)`);
  console.log(`  Total voters: ${precinctTally.voterCount}`);

  const countyTally = county.getTally();
  console.log('✓ County 1 aggregated\n');

  // 5. Aggregate at state level
  const stateConfig: JurisdictionConfig = {
    id: Buffer.from([1, 0]),
    name: 'State 1',
    level: JurisdictionLevel.State,
  };

  const state = new StateAggregator(stateConfig, authority.votingPublicKey!);
  state.addCountyTally(countyTally);

  console.log('State 1 aggregation:');
  console.log(`  Counties: 1 (would be ~60 in production)`);
  console.log(`  Total voters: ${countyTally.voterCount}`);

  const stateTally = state.getTally();
  console.log('✓ State 1 aggregated\n');

  // 6. Aggregate at national level
  const nationalConfig: JurisdictionConfig = {
    id: Buffer.from([0]),
    name: 'United States',
    level: JurisdictionLevel.National,
  };

  const national = new NationalAggregator(
    nationalConfig,
    authority.votingPublicKey!,
  );
  national.addStateTally(stateTally);

  console.log('National aggregation:');
  console.log(`  States: 1 (would be 51 in production)`);
  console.log(`  Total voters: ${stateTally.voterCount}`);

  // Get national tally for final aggregation
  national.getTally();
  console.log('✓ National aggregated\n');

  // 7. Decrypt final results (threshold decryption in production)
  console.log('Decrypting final results...');
  const tallier = new PollTallier(
    authority,
    authority.votingPrivateKey!,
    authority.votingPublicKey!,
  );

  const results = tallier.tally(poll);

  console.log('\n=== FINAL RESULTS ===');
  console.log(`Total votes: ${results.voterCount}`);
  for (let i = 0; i < choices.length; i++) {
    const percentage =
      results.voterCount > 0
        ? ((Number(results.tallies[i]) / results.voterCount) * 100).toFixed(2)
        : '0.00';
    console.log(`${choices[i]}: ${results.tallies[i]} (${percentage}%)`);
  }
  console.log(`\nWinner: ${choices[results.winner!]}`);

  // 8. Resource usage
  console.log('\n=== RESOURCE USAGE ===');
  console.log('Precinct (in-memory): ~500 KB');
  console.log('County (in-memory): ~10 MB');
  console.log('State (in-memory): ~100 MB');
  console.log('National (in-memory): <1 GB');
  console.log('Disk (logs + checkpoints): ~5 MB per precinct');
  console.log('\nTotal for 175K precincts:');
  console.log('  Memory: ~100 GB (distributed)');
  console.log('  Disk: ~875 GB (distributed)');

  await logger.close();
}

/**
 * Scalability demonstration
 */
function demonstrateScalability() {
  console.log('\n=== SCALABILITY ANALYSIS ===\n');

  const stats = {
    precincts: 175_000,
    avgVotersPerPrecinct: 900,
    counties: 3_000,
    states: 51,
    totalVoters: 159_000_000,
  };

  console.log('Hierarchical Structure:');
  console.log(`  ${stats.precincts.toLocaleString()} precincts`);
  console.log(`  ${stats.counties.toLocaleString()} counties`);
  console.log(`  ${stats.states} states`);
  console.log(`  ${stats.totalVoters.toLocaleString()} total voters\n`);

  console.log('Memory per Level:');
  console.log(
    `  Precinct: 500 KB × ${stats.precincts.toLocaleString()} = 87.5 GB`,
  );
  console.log(`  County: 10 MB × ${stats.counties.toLocaleString()} = 30 GB`);
  console.log(`  State: 100 MB × ${stats.states} = 5.1 GB`);
  console.log(`  National: 1 GB × 1 = 1 GB`);
  console.log(`  Total: ~124 GB (distributed across nodes)\n`);

  console.log('Disk per Level:');
  console.log(
    `  Precinct logs: 5 MB × ${stats.precincts.toLocaleString()} = 875 GB`,
  );
  console.log(
    `  Checkpoints: 1 MB × ${stats.precincts.toLocaleString()} = 175 GB`,
  );
  console.log(`  Total: ~1 TB (distributed)\n`);

  console.log('Timeline:');
  console.log('  6 AM - 8 PM: Voting (14 hours)');
  console.log('  8 PM - 9 PM: Precinct finalization');
  console.log('  9 PM - 10 PM: County aggregation');
  console.log('  10 PM - 11 PM: State aggregation');
  console.log('  11 PM - 12 AM: National aggregation');
  console.log('  12 AM: Results announced\n');

  console.log('Parallel Processing:');
  console.log('  175K precincts process votes simultaneously');
  console.log('  No central bottleneck during voting');
  console.log('  Aggregation happens bottom-up after polls close');
}

// Run example
if (require.main === module) {
  runUSElection()
    .then(() => demonstrateScalability())
    .catch(console.error);
}
