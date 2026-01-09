/**
 * Voting System Usage Examples (Node.js)
 * Shows how to use with node-ecies-lib Member class
 *
 * Note: This is the Node.js implementation using Buffer instead of Uint8Array.
 * For the browser implementation, see @digitaldefiance/ecies-lib.
 *
 * IMPORTANT: These examples are for documentation purposes and demonstrate the API.
 * Due to type incompatibilities between ecies-lib Member (Uint8Array) and
 * node-ecies-lib voting system (Buffer), these examples may require type assertions
 * or conversion utilities in actual usage. See the test files for working examples.
 *
 * These examples show the intended API usage but may not compile due to type
 * incompatibilities. For working examples, see the test files in the test directory.
 */

// Note: These imports are for documentation purposes
// import { Member, MemberType, EmailString, ECIESService } from '@digitaldefiance/ecies-lib';
// import {
//   PollFactory,
//   VoteEncoder,
//   PollTallier,
//   VotingMethod as _VotingMethod,
// } from './index';

/**
 * Example 1: Simple Plurality Vote
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function examplePlurality() {
  // Note: This is pseudocode for documentation purposes
  // Actual implementation requires proper type conversions between
  // ecies-lib Member (Uint8Array) and node-ecies-lib voting (Buffer)

  console.log(`
  // Create authority (poll creator)
  const authority = createMemberWithVotingKeys();

  // Create poll
  const poll = PollFactory.createPlurality(
    ['Alice', 'Bob', 'Charlie'],
    authority.member, // Note: requires Buffer-compatible member
  );

  // Create voters and cast votes
  const encoder = new VoteEncoder(authority.member.votingPublicKey!);
  
  poll.vote(voter1.member, encoder.encodePlurality(0, 3)); // Alice
  poll.vote(voter2.member, encoder.encodePlurality(0, 3)); // Alice  
  poll.vote(voter3.member, encoder.encodePlurality(1, 3)); // Bob

  // Close and tally
  poll.close();
  const tallier = new PollTallier(
    authority.member,
    authority.member.votingPrivateKey!,
    authority.member.votingPublicKey!,
  );
  const results = tallier.tally(poll);

  console.log('Winner:', results.choices[results.winner!]); // Alice
  console.log('Tallies:', results.tallies); // [2n, 1n, 0n]
  `);
}

/**
 * Example 2: Ranked Choice Voting (True IRV)
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function exampleRankedChoice() {
  console.log(`
  const authority = createMemberWithVotingKeys();

  const poll = PollFactory.createRankedChoice(
    ['Alice', 'Bob', 'Charlie', 'Diana'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Voter 1: Alice > Bob > Charlie
  poll.vote(voter1.member, encoder.encodeRankedChoice([0, 1, 2], 4));

  // Voter 2: Bob > Alice > Diana
  poll.vote(voter2.member, encoder.encodeRankedChoice([1, 0, 3], 4));

  // Voter 3: Charlie > Diana > Bob
  poll.vote(voter3.member, encoder.encodeRankedChoice([2, 3, 1], 4));

  // Voter 4: Alice > Charlie
  poll.vote(voter4.member, encoder.encodeRankedChoice([0, 2], 4));

  poll.close();
  const results = tallier.tally(poll);

  console.log('Winner:', results.choices[results.winner!]);
  console.log('Rounds:', results.rounds);
  console.log('Eliminated:', results.eliminated);
  `);
}

/**
 * Example 3: Weighted Voting (Stakeholder)
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function exampleWeighted() {
  console.log(`
  const authority = createMemberWithVotingKeys();

  const poll = PollFactory.createWeighted(
    ['Proposal A', 'Proposal B'],
    authority.member,
    1000n, // Max weight
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Large stakeholder
  poll.vote(whale.member, encoder.encodeWeighted(0, 500n, 2));

  // Medium stakeholder  
  poll.vote(dolphin.member, encoder.encodeWeighted(1, 200n, 2));

  // Small stakeholder
  poll.vote(shrimp.member, encoder.encodeWeighted(1, 50n, 2));

  poll.close();
  const results = tallier.tally(poll);

  console.log('Results:', results.tallies); // [500n, 250n]
  `);
}

/**
 * Example 4: Borda Count
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function exampleBorda() {
  console.log(`
  const authority = createMemberWithVotingKeys();

  const poll = PollFactory.createBorda(
    ['Option A', 'Option B', 'Option C'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Each voter ranks all options
  poll.vote(voter1.member, encoder.encodeBorda([0, 1, 2], 3)); // A=3, B=2, C=1
  poll.vote(voter2.member, encoder.encodeBorda([1, 0, 2], 3)); // B=3, A=2, C=1
  poll.vote(voter3.member, encoder.encodeBorda([0, 2, 1], 3)); // A=3, C=2, B=1

  poll.close();
  const results = tallier.tally(poll);

  console.log('Points:', results.tallies); // [8n, 6n, 4n]
  console.log('Winner:', results.choices[results.winner!]); // Option A
  `);
}

/**
 * Example 5: Approval Voting
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function exampleApproval() {
  console.log(`
  const authority = createMemberWithVotingKeys();

  const poll = PollFactory.createApproval(
    ['Red', 'Green', 'Blue', 'Yellow'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Voter 1 approves Red and Blue
  poll.vote(voter1.member, encoder.encodeApproval([0, 2], 4));

  // Voter 2 approves Green and Blue
  poll.vote(voter2.member, encoder.encodeApproval([1, 2], 4));

  // Voter 3 approves only Blue
  poll.vote(voter3.member, encoder.encodeApproval([2], 4));

  poll.close();
  const results = tallier.tally(poll);

  console.log('Approvals:', results.tallies); // [1n, 1n, 3n, 0n]
  console.log('Winner:', results.choices[results.winner!]); // Blue
  `);
}

/**
 * Example 6: Receipt Verification
 *
 * This example shows the intended API usage. For working examples,
 * see the test files which handle type conversions properly.
 */
async function exampleReceipts() {
  console.log(`
  const authority = createMemberWithVotingKeys();
  const poll = PollFactory.createPlurality(
    ['Yes', 'No'],
    authority.member,
  );

  const voter = createMemberWithVotingKeys();
  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Cast vote and get receipt
  const receipt = poll.vote(voter.member, encoder.encodePlurality(0, 2));

  // Verify receipt
  const isValid = poll.verifyReceipt(voter.member, receipt);
  console.log('Receipt valid:', isValid); // true

  // Try to verify with wrong voter
  const otherVoter = createMemberWithVotingKeys();
  const isInvalid = poll.verifyReceipt(otherVoter.member, receipt);
  console.log('Wrong voter:', isInvalid); // false
  `);
}

/**
 * Example 7: Node.js-Specific - File-Based Vote Persistence
 *
 * This example shows how to save encrypted votes to disk using Node.js fs module.
 * For working examples, see the test files which handle type conversions properly.
 */
async function exampleFilePersistence() {
  console.log(`
  const authority = createMemberWithVotingKeys();
  const poll = PollFactory.createPlurality(
    ['Option A', 'Option B'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Cast some votes
  poll.vote(voter1.member, encoder.encodePlurality(0, 2));
  poll.vote(voter2.member, encoder.encodePlurality(1, 2));

  // Save encrypted votes to disk (Node.js-specific)
  const votes = Array.from(poll.getEncryptedVotes().entries());
  const votesData = votes.map(([voterId, encrypted]) => ({
    voterId: voterId.toString('hex'), // Convert Buffer to hex string
    encrypted: encrypted.map(n => n.toString()),
  }));

  await fs.writeFile(
    'encrypted-votes.json',
    JSON.stringify(votesData, null, 2)
  );

  console.log('Votes saved to encrypted-votes.json');

  // Load votes from disk
  const loadedData = JSON.parse(
    await fs.readFile('encrypted-votes.json', 'utf-8')
  );

  console.log(\`Loaded \${loadedData.length} votes from disk\`);
  `);
}

/**
 * Example 8: Node.js-Specific - Streaming Large Voter Datasets
 *
 * This example shows how to process votes from a stream using Node.js.
 * For working examples, see the test files which handle type conversions properly.
 */
async function exampleStreamProcessing() {
  console.log(`
  const authority = createMemberWithVotingKeys();
  const poll = PollFactory.createPlurality(
    ['Candidate A', 'Candidate B', 'Candidate C'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Simulate processing votes from a stream
  console.log('Processing votes from stream...');

  // In a real scenario, this would read from a file stream or network stream
  const voteStream = Array.from({ length: 100 }, (_, i) => ({
    voterId: i,
    choice: i % 3, // Distribute votes across 3 candidates
  }));

  for (const voteData of voteStream) {
    const voter = createMemberWithVotingKeys(\`Voter \${voteData.voterId}\`);
    poll.vote(voter.member, encoder.encodePlurality(voteData.choice, 3));
  }

  poll.close();
  const results = tallier.tally(poll);

  console.log('Stream processing complete');
  console.log('Results:', results.tallies);
  console.log('Winner:', results.choices[results.winner!]);
  `);
}

/**
 * Example 9: Node.js-Specific - Cryptographic Operations with Buffer
 *
 * This example shows Node.js-specific cryptographic operations using Buffer.
 */
async function exampleBufferCrypto() {
  console.log(`
  // Generate random voter ID using Node.js crypto (returns Buffer)
  const voterId = crypto.randomBytes(32);
  console.log('Voter ID (Buffer):', voterId.toString('hex'));

  // Hash voter ID using Node.js crypto
  const voterIdHash = crypto.createHash('sha256').update(voterId).digest();
  console.log('Voter ID Hash (Buffer):', voterIdHash.toString('hex'));

  // Create poll ID using Buffer
  const pollId = crypto.randomBytes(16);
  console.log('Poll ID (Buffer):', pollId.toString('hex'));

  // Demonstrate Buffer operations
  const data1 = Buffer.from('Hello');
  const data2 = Buffer.from('World');
  const combined = Buffer.concat([data1, Buffer.from(' '), data2]);
  console.log('Combined Buffer:', combined.toString()); // "Hello World"
  `);
}

/**
 * Example 10: Node.js-Specific - Audit Log Export
 *
 * This example shows how to export audit logs to JSON files using Node.js.
 * For working examples, see the test files which handle type conversions properly.
 */
async function exampleAuditLogExport() {
  console.log(`
  const authority = createMemberWithVotingKeys();
  const poll = PollFactory.createPlurality(
    ['Yes', 'No'],
    authority.member,
  );

  const encoder = new VoteEncoder(authority.member.votingPublicKey!);

  // Cast votes
  poll.vote(voter1.member, encoder.encodePlurality(0, 2));
  poll.vote(voter2.member, encoder.encodePlurality(1, 2));

  poll.close();

  // Export audit log to file (Node.js-specific)
  const auditEntries = poll.auditLog.getEntries();
  const auditData = auditEntries.map(entry => ({
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    pollId: entry.pollId.toString('hex'), // Convert Buffer to hex
    signature: entry.signature.toString('hex'), // Convert Buffer to hex
    previousHash: entry.previousHash?.toString('hex'), // Convert Buffer to hex
  }));

  await fs.writeFile(
    'audit-log.json',
    JSON.stringify(auditData, null, 2)
  );

  console.log('Audit log exported to audit-log.json');
  console.log(\`Total entries: \${auditEntries.length}\`);
  console.log('Chain valid:', poll.auditLog.verifyChain());
  `);
}

/**
 * Helper: Create member with voting keys derived from ECDH
 *
 * Note: This is pseudocode for documentation purposes.
 * Actual implementation requires proper type conversions between
 * ecies-lib Member (Uint8Array) and node-ecies-lib voting (Buffer).
 */
/**
 * Creates a member with voting keys (documentation example)
 * Note: This is pseudocode for documentation purposes.
 * Actual implementation requires proper type conversions between
 * ecies-lib Member (Uint8Array) and node-ecies-lib voting (Buffer).
 *
 * Example usage:
 * ```typescript
 * // This uses node-ecies-lib's Member.newMember() and deriveVotingKeys()
 * const eciesService = new ECIESService();
 * const memberWithMnemonic = Member.newMember(
 *   eciesService,
 *   memberType,
 *   name,
 *   new EmailString(email),
 * );
 * return { member: memberWithMnemonic.member };
 * ```
 */

// Export examples
export {
  examplePlurality,
  exampleRankedChoice,
  exampleWeighted,
  exampleBorda,
  exampleApproval,
  exampleReceipts,
  exampleFilePersistence,
  exampleStreamProcessing,
  exampleBufferCrypto,
  exampleAuditLogExport,
};
