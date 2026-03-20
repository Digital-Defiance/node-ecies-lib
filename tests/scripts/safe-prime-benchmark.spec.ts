/**
 * Benchmark: Regular primes vs Safe primes at 1536 bits
 *
 * A "safe prime" p is one where (p-1)/2 is also prime (a Sophie Germain prime).
 * Safe primes resist Pollard's p-1 and Williams' p+1 factoring attacks.
 *
 * This benchmark measures the real-world cost difference using the same
 * HMAC-DRBG and Miller-Rabin infrastructure from voting.service.ts.
 *
 * Strategy for safe primes: generate a prime q, then test if 2q+1 is also prime.
 * This is more efficient than testing random candidates for both properties.
 */

import {
  SecureDeterministicDRBG,
  millerRabinTest,
} from '../../src/services/voting.service';

// Small prime sieve (same as voting.service.ts)
const SMALL_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151,
  157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233,
  239, 241, 251,
];

function smallPrimeSieve(candidate: bigint): boolean {
  for (const sp of SMALL_PRIMES) {
    if (candidate % BigInt(sp) === 0n && candidate !== BigInt(sp)) {
      return false; // composite
    }
  }
  return true; // passed sieve
}

function generateRegularPrime(
  drbg: SecureDeterministicDRBG,
  numBits: number,
  mrRounds: number,
): { prime: bigint; candidates: number; timeMs: number } {
  const numBytes = Math.ceil(numBits / 8);
  const topBitMask = 1 << ((numBits - 1) % 8);
  const start = Date.now();
  let candidates = 0;

  for (let attempt = 0; attempt < 50000; attempt++) {
    const bytes = drbg.generate(numBytes);
    bytes[0] |= topBitMask;
    bytes[bytes.length - 1] |= 1;

    const candidate = BigInt('0x' + Buffer.from(bytes).toString('hex'));
    candidates++;

    if (!smallPrimeSieve(candidate)) continue;
    if (millerRabinTest(candidate, mrRounds)) {
      return { prime: candidate, candidates, timeMs: Date.now() - start };
    }
  }
  throw new Error('Failed to find regular prime');
}

/**
 * Generate a safe prime using the "find q, test 2q+1" strategy.
 * This is the standard approach: find a Sophie Germain prime q,
 * then p = 2q + 1 is a safe prime.
 */
function generateSafePrime(
  drbg: SecureDeterministicDRBG,
  numBits: number,
  mrRounds: number,
): {
  prime: bigint;
  sophieGermain: bigint;
  candidates: number;
  qTested: number;
  timeMs: number;
} {
  const qBits = numBits - 1; // q is one bit shorter so 2q+1 has numBits bits
  const numBytes = Math.ceil(qBits / 8);
  const topBitMask = 1 << ((qBits - 1) % 8);
  const start = Date.now();
  let candidates = 0;
  let qTested = 0;

  for (let attempt = 0; attempt < 5000000; attempt++) {
    const bytes = drbg.generate(numBytes);
    bytes[0] |= topBitMask;
    bytes[bytes.length - 1] |= 1;

    const q = BigInt('0x' + Buffer.from(bytes).toString('hex'));
    candidates++;

    // Quick sieve on q
    if (!smallPrimeSieve(q)) continue;

    // Quick sieve on p = 2q + 1
    const p = 2n * q + 1n;
    if (!smallPrimeSieve(p)) continue;

    // Full Miller-Rabin on q
    if (!millerRabinTest(q, mrRounds)) continue;
    qTested++;

    // Full Miller-Rabin on p = 2q + 1
    if (millerRabinTest(p, mrRounds)) {
      return {
        prime: p,
        sophieGermain: q,
        candidates,
        qTested,
        timeMs: Date.now() - start,
      };
    }
  }
  throw new Error('Failed to find safe prime in 5000000 attempts');
}

describe('Safe Prime Benchmark', () => {
  // 10 minutes — safe primes at 1536 bits can be slow
  jest.setTimeout(600000);

  it('should benchmark regular vs safe prime generation at 1536 bits', () => {
    const numBits = 1536;
    const mrRounds = 256;
    const trials = 3;

    console.log(`\n${'='.repeat(70)}`);
    console.log(
      `Prime Generation Benchmark: ${numBits}-bit primes, ${mrRounds} MR rounds`,
    );
    console.log(`${'='.repeat(70)}\n`);

    // --- Regular primes ---
    const regularResults: { candidates: number; timeMs: number }[] = [];
    for (let i = 0; i < trials; i++) {
      const seed = Buffer.alloc(64);
      seed.writeUInt32BE(i + 100, 0); // different seed each trial
      const drbg = new SecureDeterministicDRBG(seed);
      const result = generateRegularPrime(drbg, numBits, mrRounds);
      regularResults.push(result);
      console.log(
        `  Regular prime #${i + 1}: ${result.timeMs}ms, ${result.candidates} candidates tested`,
      );
    }

    const avgRegularMs =
      regularResults.reduce((s, r) => s + r.timeMs, 0) / trials;
    const avgRegularCandidates =
      regularResults.reduce((s, r) => s + r.candidates, 0) / trials;

    console.log(
      `\n  Regular average: ${avgRegularMs.toFixed(0)}ms, ${avgRegularCandidates.toFixed(0)} candidates\n`,
    );

    // --- Safe primes ---
    const safeResults: {
      candidates: number;
      qTested: number;
      timeMs: number;
    }[] = [];
    for (let i = 0; i < trials; i++) {
      const seed = Buffer.alloc(64);
      seed.writeUInt32BE(i + 100, 0); // same seeds for fairness
      const drbg = new SecureDeterministicDRBG(seed);
      const result = generateSafePrime(drbg, numBits, mrRounds);
      safeResults.push(result);
      console.log(
        `  Safe prime #${i + 1}: ${result.timeMs}ms, ${result.candidates} candidates, ${result.qTested} passed q-MR`,
      );

      // Verify it's actually a safe prime
      const sophie = (result.prime - 1n) / 2n;
      expect(millerRabinTest(result.prime, 64)).toBe(true);
      expect(millerRabinTest(sophie, 64)).toBe(true);
    }

    const avgSafeMs = safeResults.reduce((s, r) => s + r.timeMs, 0) / trials;
    const avgSafeCandidates =
      safeResults.reduce((s, r) => s + r.candidates, 0) / trials;
    const avgQTested = safeResults.reduce((s, r) => s + r.qTested, 0) / trials;

    console.log(
      `\n  Safe average: ${avgSafeMs.toFixed(0)}ms, ${avgSafeCandidates.toFixed(0)} candidates, ${avgQTested.toFixed(0)} q-primes tested\n`,
    );

    // --- Summary ---
    const slowdown = avgSafeMs / avgRegularMs;
    const candidateRatio = avgSafeCandidates / avgRegularCandidates;

    console.log(`${'─'.repeat(70)}`);
    console.log(`  Slowdown factor:       ${slowdown.toFixed(1)}×`);
    console.log(`  Candidate ratio:       ${candidateRatio.toFixed(1)}×`);
    console.log(
      `  Regular: 2 primes ≈ ${((avgRegularMs * 2) / 1000).toFixed(1)}s per key pair`,
    );
    console.log(
      `  Safe:    2 primes ≈ ${((avgSafeMs * 2) / 1000).toFixed(1)}s per key pair`,
    );
    console.log(
      `  Theoretical density ratio: ~ln(2^${numBits}) ≈ ${Math.round(numBits * Math.LN2)}×`,
    );
    console.log(`${'─'.repeat(70)}\n`);

    // Sanity: both should complete (the test itself is the benchmark)
    expect(regularResults.length).toBe(trials);
    expect(safeResults.length).toBe(trials);
  });
});
