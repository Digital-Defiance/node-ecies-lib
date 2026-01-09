# Secure Voting System

Government-grade voting system built on node-ecies-lib with comprehensive cryptographic security and exhaustive testing. Node.js optimized with native crypto and Buffer support.

## Features

### ✅ Fully Secure Methods (Single-round, Privacy-preserving)
- **Plurality** - First-past-the-post (most common)
- **Approval** - Vote for multiple candidates
- **Weighted** - Stakeholder voting with configurable limits
- **Borda Count** - Ranked voting with point allocation
- **Score Voting** - Rate candidates 0-10
- **Yes/No** - Referendums and ballot measures
- **Yes/No/Abstain** - With abstention option
- **Supermajority** - Requires 2/3 or 3/4 threshold

### ⚠️ Multi-Round Methods (Requires intermediate decryption)
- **Ranked Choice (IRV)** - Instant runoff with elimination
- **Two-Round** - Top 2 runoff election
- **STAR** - Score Then Automatic Runoff
- **STV** - Single Transferable Vote (proportional representation)

### ❌ Insecure Methods (No privacy - for special cases only)
- **Quadratic** - Quadratic voting (requires non-homomorphic operations)
- **Consensus** - Requires 95%+ agreement
- **Consent-Based** - Sociocracy-style (no strong objections)

### Core Security Features
- ✅ **Homomorphic Encryption** - Votes remain encrypted until tally using Paillier cryptosystem
- ✅ **Verifiable Receipts** - Cryptographically signed confirmations with ECDSA
- ✅ **Public Bulletin Board** - Transparent, append-only vote publication with Merkle tree integrity
- ✅ **Immutable Audit Log** - Cryptographic hash chain for all operations
- ✅ **Event Logger** - Comprehensive event tracking with microsecond timestamps and sequence numbers
- ✅ **Role Separation** - Poll aggregator cannot decrypt votes (separate PollTallier)
- ✅ **Double-Vote Prevention** - Each member votes once per poll
- ✅ **Attack Resistance** - Tested against manipulation attempts
- ✅ **Node.js Optimized** - Uses native crypto module and Buffer for performance
- ✅ **Government-Grade Testing** - 1100+ test cases covering all methods and edge cases

## Architecture

### Role Separation

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Poll (Vote Aggregator)                                     │
│  ├─ Paillier PUBLIC key only  ← encrypts & aggregates      │
│  ├─ Authority's EC keys       ← signs receipts              │
│  └─ Cannot decrypt votes                                    │
│                                                              │
│  PollTallier (Separate Entity)                              │
│  ├─ Paillier PRIVATE key      ← decrypts ONLY after close  │
│  └─ Computes results                                        │
│                                                              │
│  Voter (Member from node-ecies-lib)                         │
│  ├─ EC keypair                ← verifies receipts           │
│  └─ Voting public key         ← encrypts votes              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Poll** (`poll-core.ts`) - Aggregates encrypted votes, issues receipts, enforces rules
2. **VotingPoll** (`poll.ts`) - High-level voting with encrypted receipts
3. **PollTallier** (`tallier.ts`) - Holds private key, decrypts results after close
4. **VoteEncoder** (`encoder.ts`) - Encrypts votes using Paillier homomorphic encryption
5. **PollFactory** (`factory.ts`) - Convenient poll creation with method-specific configurations
6. **ImmutableAuditLog** (`audit.ts`) - Cryptographic hash chain for audit trail (Requirement 1.1)
7. **PublicBulletinBoard** (`bulletin-board.ts`) - Transparent, append-only vote publication (Requirement 1.2)
8. **PollEventLogger** (`event-logger.ts`) - Comprehensive event tracking (Requirement 1.3)
9. **VotingSecurityValidator** (`security.ts`) - Security level validation and enforcement

## Voting Methods

### Security Levels

All methods are classified by security level:

```typescript
import { VotingSecurityValidator, SecurityLevel, VotingMethod } from '@digitaldefiance/node-ecies-lib';

// Check security level
const level = VotingSecurityValidator.getSecurityLevel(VotingMethod.Plurality);
// Returns: SecurityLevel.FullyHomomorphic

// Validate before use
VotingSecurityValidator.validate(VotingMethod.Quadratic); // Throws error
VotingSecurityValidator.validate(VotingMethod.Quadratic, { allowInsecure: true }); // OK
```

### Method Comparison

| Method | Security | Use Case | Multi-Winner |
|--------|----------|----------|-------------|
| Plurality | ✅ Full | General elections | No |
| Approval | ✅ Full | Committee selection | No |
| Weighted | ✅ Full | Shareholder voting | No |
| Borda | ✅ Full | Ranked preferences | No |
| Score | ✅ Full | Rating candidates | No |
| YesNo | ✅ Full | Referendums | No |
| Supermajority | ✅ Full | Constitutional changes | No |
| RankedChoice | ⚠️ Multi | Modern elections | No |
| TwoRound | ⚠️ Multi | Presidential elections | No |
| STAR | ⚠️ Multi | Hybrid score/runoff | No |
| STV | ⚠️ Multi | Proportional representation | Yes |
| Quadratic | ❌ None | Budget allocation | No |
| Consensus | ❌ None | Small groups | No |
| ConsentBased | ❌ None | Cooperatives | No |

## Government Requirements (EARS Specification)

### 1.1 Immutable Audit Log ✅

```typescript
import { ImmutableAuditLog } from '@digitaldefiance/node-ecies-lib';

const auditLog = new ImmutableAuditLog(authority);

// Record poll creation
auditLog.recordPollCreated(pollId, { choices: ['A', 'B'] });

// Record vote cast
auditLog.recordVoteCast(pollId, voterIdHash);

// Record poll closure
auditLog.recordPollClosed(pollId, { finalTally: [100n, 200n] });

// Verify chain integrity
const isValid = auditLog.verifyChain();
```

**Features:**
- Cryptographically signed entries
- Hash-chained for immutability
- Microsecond-precision timestamps
- Verifiable chain of custody

### 1.2 Public Bulletin Board ✅

```typescript
import { PublicBulletinBoard } from '@digitaldefiance/node-ecies-lib';

const board = new PublicBulletinBoard(authority);

// Publish encrypted vote
const entry = board.publishVote(pollId, encryptedVote, voterIdHash);

// Publish tally with proof
const proof = board.publishTally(
  pollId,
  tallies,
  choices,
  encryptedVotes
);

// Any observer can download and verify
const allEntries = board.getAllEntries();
const isValid = board.verifyEntry(entry);
const isTallyValid = board.verifyTallyProof(proof);

// Export for archival
const archive = board.export();
```

**Features:**
- Append-only publication
- Merkle tree for structural integrity
- Zero-knowledge proofs of correct decryption
- Public verification by any observer
- Complete export for archival

### 1.3 Event Logging ✅

```typescript
import { PollEventLogger, EventType } from '@digitaldefiance/node-ecies-lib';

const eventLogger = new PollEventLogger();

// Log poll creation
eventLogger.logPollCreated(pollId, creatorId, {
  method: 'plurality',
  choices: ['Alice', 'Bob', 'Charlie'],
});

// Log vote cast
eventLogger.logVoteCast(pollId, voterToken, {
  ipAddress: '192.168.1.1',
});

// Log poll closure
eventLogger.logPollClosed(pollId, tallyHash, {
  totalVotes: 100,
});

// Query events
const allEvents = eventLogger.getEvents();
const pollEvents = eventLogger.getEventsForPoll(pollId);
const voteEvents = eventLogger.getEventsByType(EventType.VoteCast);

// Verify sequence integrity
const isValid = eventLogger.verifySequence();

// Export for archival
const archive = eventLogger.export();
```

**Features:**
- Microsecond-precision timestamps
- Sequential event numbering
- Comprehensive event types (creation, voting, closure, verification, tally, audit)
- Anonymized voter tokens
- Poll configuration tracking
- Sequence integrity verification

## Usage

### Prerequisites

```typescript
import { Member, ECIESService } from '@digitaldefiance/node-ecies-lib';
import { MemberType, EmailString } from '@digitaldefiance/ecies-lib';
import {
  PollFactory,
  VoteEncoder,
  PollTallier,
  VotingMethod,
  VotingSecurityValidator
} from '@digitaldefiance/node-ecies-lib';

const eciesService = new ECIESService();

// Create authority with voting keys
const { member: authority, mnemonic } = Member.newMember(
  eciesService,
  MemberType.System,
  'Election Authority',
  new EmailString('authority@example.com')
);
await authority.deriveVotingKeys();

// Create voters
const { member: voter1 } = Member.newMember(
  eciesService,
  MemberType.Individual,
  'Alice',
  new EmailString('alice@example.com')
);
await voter1.deriveVotingKeys();
```

### Quick Start

```typescript
import { Member, ECIESService } from '@digitaldefiance/node-ecies-lib';
import { PollFactory, VoteEncoder, PollTallier } from '@digitaldefiance/node-ecies-lib';

// 1. Create authority
const eciesService = new ECIESService();
const { member: authority, mnemonic } = Member.newMember(
  eciesService,
  MemberType.System,
  'Election Authority',
  new EmailString('authority@example.com')
);
await authority.deriveVotingKeys();

// 2. Create poll
const poll = PollFactory.createPlurality(
  ['Alice', 'Bob', 'Charlie'],
  authority
);

// 3. Create voters and cast votes
const { member: voter } = Member.newMember(/* ... */);
await voter.deriveVotingKeys();

const encoder = new VoteEncoder(authority.votingPublicKey!);
const vote = encoder.encodePlurality(0, 3); // Vote for Alice
const receipt = poll.vote(voter, vote);

// 4. Close and tally
poll.close();
const tallier = new PollTallier(
  authority,
  authority.votingPrivateKey!,
  authority.votingPublicKey!
);
const results = tallier.tally(poll);

console.log('Winner:', results.choices[results.winner!]);
```

### Ranked Choice Voting (True IRV)

```typescript
const poll = PollFactory.createRankedChoice(
  ['Alice', 'Bob', 'Charlie', 'Diana'],
  authority
);

const encoder = new VoteEncoder(authority.votingPublicKey!);

// Voter ranks: Alice > Bob > Charlie
const vote = encoder.encodeRankedChoice([0, 1, 2], 4);
poll.vote(voter, vote);

// ... more votes ...

poll.close();
const results = tallier.tally(poll);

// Results include elimination rounds
console.log('Winner:', results.choices[results.winner!]);
console.log('Rounds:', results.rounds);
console.log('Eliminated:', results.eliminated);
```

### Weighted Voting

```typescript
const poll = PollFactory.createWeighted(
  ['Proposal A', 'Proposal B'],
  authority,
  1000n // Maximum weight
);

const encoder = new VoteEncoder(authority.votingPublicKey!);

// Large stakeholder votes with weight 500
const vote = encoder.encodeWeighted(0, 500n, 2);
poll.vote(whale, vote);
```

### Security Validation

```typescript
// Check security level before creating poll
const level = VotingSecurityValidator.getSecurityLevel(VotingMethod.Quadratic);
console.log(level); // SecurityLevel.Insecure

// Validate method (throws if insecure)
try {
  VotingSecurityValidator.validate(VotingMethod.Quadratic);
} catch (error) {
  console.error('Method is not secure!');
}

// Allow insecure methods explicitly
VotingSecurityValidator.validate(VotingMethod.Quadratic, { allowInsecure: true });
```

## API Reference

### Quick Reference

| Export | Type | Purpose |
|--------|------|----------|
| `Poll` | Class | Core poll with vote aggregation |
| `VotingPoll` | Class | High-level voting with encrypted receipts |
| `PollTallier` | Class | Decrypts and tallies votes |
| `VoteEncoder` | Class | Encrypts votes by method |
| `PollFactory` | Class | Convenient poll creation |
| `VotingSecurityValidator` | Class | Security level validation |
| `ImmutableAuditLog` | Class | Hash-chained audit trail |
| `PublicBulletinBoard` | Class | Append-only vote publication |
| `PollEventLogger` | Class | Event tracking with timestamps |
| `VotingMethod` | Enum | All 17 voting methods |
| `SecurityLevel` | Enum | Security classifications |
| `EventType` | Enum | Event types for logging |
| `AuditEventType` | Enum | Audit event types |
| `VoteReceipt` | Interface | Cryptographic vote receipt |
| `PollResults` | Interface | Tally results with winner(s) |
| `EncryptedVote` | Interface | Encrypted vote structure |

## Testing

The system includes 1100+ government-grade test cases across multiple test files:

```bash
# Run all voting tests
yarn test voting.spec.ts          # Core voting functionality
yarn test voting-stress.spec.ts   # Stress tests with large datasets
yarn test poll-core.spec.ts       # Poll core functionality
yarn test poll-audit.spec.ts      # Audit log integration
yarn test factory.spec.ts         # Poll factory
yarn test encoder.spec.ts         # Vote encoding
yarn test security.spec.ts        # Security validation
yarn test audit.spec.ts           # Audit log
yarn test bulletin-board.spec.ts  # Bulletin board
yarn test event-logger.spec.ts    # Event logger
yarn test poll.spec.ts            # VotingPoll with encrypted receipts
```

### Test Coverage

- ✅ All 17 voting methods
- ✅ Security validation (fully homomorphic, multi-round, insecure classifications)
- ✅ Attack resistance (vote manipulation, double voting, unauthorized decryption)
- ✅ Cryptographic correctness (homomorphic addition, receipt signatures)
- ✅ Edge cases (ties, single voter, unanimous votes, empty rankings)
- ✅ Large scale (1000 voters, 100 choices)
- ✅ Boundary conditions (max weights, zero votes, partial rankings)
- ✅ Determinism (same votes = same results)
- ✅ Receipt verification (signature validation, tampering detection)
- ✅ Multi-round elimination (IRV, STAR, STV, Two-Round)
- ✅ Government requirements (audit log, bulletin board, event logger)
- ✅ Stress testing (concurrent operations, memory limits)

## Node.js Specific Features

### Buffer Support

All voting operations use Node.js `Buffer` instead of `Uint8Array` for better performance:

```typescript
// Poll IDs, voter IDs, and hashes are all Buffers
const pollId = Buffer.from([1, 2, 3, 4]);
const voterIdHash = Buffer.from(crypto.createHash('sha256').update(voter.id).digest());
```

### Native Crypto

Uses Node.js native `crypto` module for:
- SHA-256 hashing (audit log, bulletin board)
- Random bytes generation (nonces, IDs)
- Microsecond timestamps via `process.hrtime.bigint()`

## Binary Compatibility

The voting system in node-ecies-lib is **100% compatible** with the browser-based ecies-lib voting system:

- Same Paillier encryption parameters
- Same vote encoding formats
- Same receipt structures
- Same audit log format

Data encrypted in Node.js can be tallied in the browser and vice versa.

## Documentation

### Core Documentation

- **README.md** (this file) - Overview and quick start
- **docs/GOVERNMENT-REQUIREMENTS.md** - Complete EARS specification with implementation status
- **docs/PHASE2-README.md** - Voter registration and eligibility system (design phase)
- **docs/PHASE2-SUMMARY.md** - Executive summary of Phase 2 features

### Examples

The `examples.ts` file contains comprehensive usage examples:

**Basic Voting Methods:**
- `examplePlurality()` - Simple majority voting
- `exampleRankedChoice()` - Instant runoff voting (IRV)
- `exampleWeighted()` - Stakeholder voting with weights
- `exampleBorda()` - Ranked voting with point allocation
- `exampleApproval()` - Multi-choice approval voting
- `exampleReceipts()` - Receipt generation and verification

**Node.js-Specific Examples:**
- `exampleFilePersistence()` - Save/load encrypted votes to/from disk
- `exampleStreamProcessing()` - Process large voter datasets using streams
- `exampleBufferCrypto()` - Cryptographic operations with Buffer
- `exampleAuditLogExport()` - Export audit logs to JSON files

```typescript
import {
  examplePlurality,
  exampleFilePersistence,
  exampleBufferCrypto
} from '@digitaldefiance/node-ecies-lib/voting/examples';

// Run examples
await examplePlurality();
await exampleFilePersistence();
await exampleBufferCrypto();
```

### Platform Differences

This Node.js implementation differs from the browser implementation in these ways:

| Feature | Browser (ecies-lib) | Node.js (node-ecies-lib) |
|---------|---------------------|--------------------------|
| Binary Data | `Uint8Array` | `Buffer` |
| Crypto API | Web Crypto API | Node.js `crypto` module |
| File I/O | Not available | Native `fs` module |
| Streams | Not available | Native Node.js streams |
| Performance | Browser-optimized | V8-optimized |

All cryptographic operations, security properties, and voting methods are identical between platforms.

## License

MIT
