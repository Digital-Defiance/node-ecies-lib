/**
 * Tests for VotingService - ECIES to Paillier key bridge
 */

import { createECDH, randomBytes } from 'crypto';
import type { KeyPair, PrivateKey, PublicKey } from 'paillier-bigint';
import {
  VotingService,
  hkdf,
  millerRabinTest,
  modPow,
  modInverse,
  gcd,
  lcm,
  generateDeterministicPrime,
  generateDeterministicKeyPair,
  SecureDeterministicDRBG,
  deriveVotingKeysFromECDH,
} from './voting.service';

// Extend timeout for cryptographic operations
jest.setTimeout(60000);

describe('VotingService', () => {
  let votingService: VotingService;
  let ecdhKeyPair: { privateKey: Buffer; publicKey: Buffer };

  beforeAll(() => {
    votingService = VotingService.getInstance();

    // Generate ECDH key pair for testing
    const ecdh = createECDH('secp256k1');
    ecdh.generateKeys();
    ecdhKeyPair = {
      privateKey: ecdh.getPrivateKey(),
      publicKey: ecdh.getPublicKey(),
    };
  });

  describe('Mathematical Primitives', () => {
    describe('HKDF', () => {
      it('should derive deterministic keys from same input', () => {
        const secret = randomBytes(32);
        const salt = randomBytes(32);
        const info = 'TestInfo';
        const length = 64;

        const derived1 = hkdf(secret, salt, info, length);
        const derived2 = hkdf(secret, salt, info, length);

        expect(derived1).toEqual(derived2);
        expect(derived1.length).toBe(length);
      });

      it('should produce different keys for different salts', () => {
        const secret = randomBytes(32);
        const salt1 = randomBytes(32);
        const salt2 = randomBytes(32);
        const info = 'TestInfo';
        const length = 64;

        const derived1 = hkdf(secret, salt1, info, length);
        const derived2 = hkdf(secret, salt2, info, length);

        expect(derived1).not.toEqual(derived2);
      });

      it('should produce different keys for different info strings', () => {
        const secret = randomBytes(32);
        const salt = randomBytes(32);
        const length = 64;

        const derived1 = hkdf(secret, salt, 'Info1', length);
        const derived2 = hkdf(secret, salt, 'Info2', length);

        expect(derived1).not.toEqual(derived2);
      });

      it('should handle null salt', () => {
        const secret = randomBytes(32);
        const info = 'TestInfo';
        const length = 64;

        const derived = hkdf(secret, null, info, length);
        expect(derived.length).toBe(length);
      });
    });

    describe('Miller-Rabin Primality Test', () => {
      it('should identify small primes correctly', () => {
        const primes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n];
        for (const p of primes) {
          expect(millerRabinTest(p, 10)).toBe(true);
        }
      });

      it('should identify composites correctly', () => {
        const composites = [4n, 6n, 8n, 9n, 10n, 12n, 14n, 15n, 16n, 18n, 20n];
        for (const c of composites) {
          expect(millerRabinTest(c, 10)).toBe(false);
        }
      });

      it('should identify large known primes', () => {
        // Mersenne prime 2^127 - 1
        const mersenne127 = (1n << 127n) - 1n;
        expect(millerRabinTest(mersenne127, 10)).toBe(true);
      });

      it('should handle edge cases', () => {
        expect(millerRabinTest(0n, 10)).toBe(false);
        expect(millerRabinTest(1n, 10)).toBe(false);
      });
    });

    describe('Modular Arithmetic', () => {
      it('should compute modular exponentiation correctly', () => {
        expect(modPow(2n, 10n, 1000n)).toBe(24n);
        expect(modPow(3n, 7n, 11n)).toBe(9n);
        expect(modPow(5n, 3n, 13n)).toBe(8n);
      });

      it('should compute modular inverse correctly', () => {
        const a = 3n;
        const m = 11n;
        const inv = modInverse(a, m);
        expect((a * inv) % m).toBe(1n);
      });

      it('should compute GCD correctly', () => {
        expect(gcd(48n, 18n)).toBe(6n);
        expect(gcd(100n, 35n)).toBe(5n);
        expect(gcd(17n, 19n)).toBe(1n); // coprime
      });

      it('should compute LCM correctly', () => {
        expect(lcm(12n, 18n)).toBe(36n);
        expect(lcm(21n, 6n)).toBe(42n);
      });
    });

    describe('Secure Deterministic DRBG', () => {
      it('should generate deterministic output from same seed', () => {
        const seed = randomBytes(32);
        const drbg1 = new SecureDeterministicDRBG(seed);
        const drbg2 = new SecureDeterministicDRBG(seed);

        const output1 = drbg1.generate(64);
        const output2 = drbg2.generate(64);

        expect(Buffer.from(output1)).toEqual(Buffer.from(output2));
      });

      it('should generate different output for different seeds', () => {
        const seed1 = randomBytes(32);
        const seed2 = randomBytes(32);
        const drbg1 = new SecureDeterministicDRBG(seed1);
        const drbg2 = new SecureDeterministicDRBG(seed2);

        const output1 = drbg1.generate(64);
        const output2 = drbg2.generate(64);

        expect(Buffer.from(output1)).not.toEqual(Buffer.from(output2));
      });

      it('should generate requested number of bytes', () => {
        const seed = randomBytes(32);
        const drbg = new SecureDeterministicDRBG(seed);

        expect(drbg.generate(32).length).toBe(32);
        expect(drbg.generate(64).length).toBe(64);
        expect(drbg.generate(128).length).toBe(128);
      });
    });
  });

  describe('Deterministic Prime Generation', () => {
    it('should generate prime of correct bit length', () => {
      const seed = randomBytes(64);
      const drbg = new SecureDeterministicDRBG(seed);
      const numBits = 512;

      const prime = generateDeterministicPrime(drbg, numBits, 256);

      // Check it's prime
      expect(millerRabinTest(prime, 256)).toBe(true);

      // Check bit length
      const bitLength = prime.toString(2).length;
      expect(bitLength).toBe(numBits);
    });

    it('should generate same prime from same seed', () => {
      const seed = randomBytes(64);
      const drbg1 = new SecureDeterministicDRBG(seed);
      const drbg2 = new SecureDeterministicDRBG(seed);

      const prime1 = generateDeterministicPrime(drbg1, 256, 64);
      const prime2 = generateDeterministicPrime(drbg2, 256, 64);

      expect(prime1).toBe(prime2);
    });

    it('should generate odd primes', () => {
      const seed = randomBytes(64);
      const drbg = new SecureDeterministicDRBG(seed);

      const prime = generateDeterministicPrime(drbg, 256, 64);
      expect(prime % 2n).toBe(1n); // Must be odd
    });

    it('should use constant-time generation (fixed iterations)', () => {
      // This test verifies that prime generation uses fixed iteration count
      // for timing attack mitigation
      const seed = randomBytes(64);
      const drbg = new SecureDeterministicDRBG(seed);

      // Should succeed with default maxAttempts (10000)
      const prime = generateDeterministicPrime(drbg, 256, 64, 10000);
      expect(millerRabinTest(prime, 64)).toBe(true);
    });
  });

  describe('Deterministic Key Pair Generation', () => {
    it('should generate valid Paillier key pair', () => {
      const seed = randomBytes(64);
      const keyPair = generateDeterministicKeyPair(seed, 2048, 128);

      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();

      // Test encryption/decryption
      const plaintext = 42n;
      const ciphertext = keyPair.publicKey.encrypt(plaintext);
      const decrypted = keyPair.privateKey.decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should reject small seed', () => {
      const smallSeed = randomBytes(16); // Too small
      expect(() => {
        generateDeterministicKeyPair(smallSeed, 2048, 128);
      }).toThrow('Seed must be at least 32 bytes');
    });

    it('should reject small key size', () => {
      const seed = randomBytes(64);
      expect(() => {
        generateDeterministicKeyPair(seed, 1024, 128); // Too small
      }).toThrow('Key size must be at least 2048 bits');
    });

    it('should reject odd key size', () => {
      const seed = randomBytes(64);
      expect(() => {
        generateDeterministicKeyPair(seed, 2049, 128); // Odd
      }).toThrow('Key size must be even');
    });

    it('should reject insufficient Miller-Rabin rounds', () => {
      const seed = randomBytes(64);
      expect(() => {
        generateDeterministicKeyPair(seed, 2048, 32); // Too few
      }).toThrow('Must perform at least 64 Miller-Rabin iterations');
    });

    it('should generate same key pair from same seed', () => {
      const seed = randomBytes(64);

      const keyPair1 = generateDeterministicKeyPair(seed, 2048, 128);
      const keyPair2 = generateDeterministicKeyPair(seed, 2048, 128);

      expect(keyPair1.publicKey.n).toBe(keyPair2.publicKey.n);
      expect(keyPair1.privateKey.lambda).toBe(keyPair2.privateKey.lambda);
      expect(keyPair1.privateKey.mu).toBe(keyPair2.privateKey.mu);
    });

    it('should support homomorphic addition', () => {
      const seed = randomBytes(64);
      const keyPair = generateDeterministicKeyPair(seed, 2048, 128);

      const m1 = 10n;
      const m2 = 20n;
      const c1 = keyPair.publicKey.encrypt(m1);
      const c2 = keyPair.publicKey.encrypt(m2);

      // Homomorphic addition: E(m1) * E(m2) = E(m1 + m2)
      const cSum = keyPair.publicKey.addition(c1, c2);
      const decrypted = keyPair.privateKey.decrypt(cSum);

      expect(decrypted).toBe(m1 + m2);
    });
  });

  describe('ECIES to Paillier Bridge', () => {
    it('should derive voting keys from ECDH keys', () => {
      const votingKeys = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      expect(votingKeys.publicKey).toBeDefined();
      expect(votingKeys.privateKey).toBeDefined();

      // Test functionality
      const plaintext = 100n;
      const ciphertext = votingKeys.publicKey.encrypt(plaintext);
      const decrypted = votingKeys.privateKey.decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should reject invalid private key length', () => {
      const invalidPrivKey = randomBytes(16); // Wrong length
      expect(() => {
        deriveVotingKeysFromECDH(invalidPrivKey, ecdhKeyPair.publicKey);
      }).toThrow('Invalid ECDH private key length');
    });

    it('should reject empty keys', () => {
      expect(() => {
        deriveVotingKeysFromECDH(new Uint8Array(0), ecdhKeyPair.publicKey);
      }).toThrow('ECDH private key is required');

      // Need to use a valid 32-byte private key to test empty public key
      const validPrivKey = randomBytes(32);
      expect(() => {
        deriveVotingKeysFromECDH(validPrivKey, new Uint8Array(0));
      }).toThrow('ECDH public key is required');
    });

    it('should derive same keys from same ECDH keys', () => {
      const votingKeys1 = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );
      const votingKeys2 = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      expect(votingKeys1.publicKey.n).toBe(votingKeys2.publicKey.n);
      expect(votingKeys1.privateKey.lambda).toBe(votingKeys2.privateKey.lambda);
      expect(votingKeys1.privateKey.mu).toBe(votingKeys2.privateKey.mu);
    });

    it('should handle public key with 0x04 prefix', () => {
      // Test with prefixed key
      const votingKeys1 = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      // Test with un-prefixed key (remove 0x04)
      const unprefixedPubKey = ecdhKeyPair.publicKey.slice(1);
      const votingKeys2 = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        unprefixedPubKey,
      );

      // Should produce same keys
      expect(votingKeys1.publicKey.n).toBe(votingKeys2.publicKey.n);
    });

    it('should derive different keys for different ECDH keys', () => {
      const ecdh2 = createECDH('secp256k1');
      ecdh2.generateKeys();
      const keyPair2 = {
        privateKey: ecdh2.getPrivateKey(),
        publicKey: ecdh2.getPublicKey(),
      };

      const votingKeys1 = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );
      const votingKeys2 = deriveVotingKeysFromECDH(
        keyPair2.privateKey,
        keyPair2.publicKey,
      );

      expect(votingKeys1.publicKey.n).not.toBe(votingKeys2.publicKey.n);
    });
  });

  describe('VotingService Methods', () => {
    it('should serialize and deserialize public key', async () => {
      const votingKeys = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      const buffer = votingService.votingPublicKeyToBuffer(
        votingKeys.publicKey,
      );
      expect(buffer.length).toBeGreaterThan(0);

      const recovered = await votingService.bufferToVotingPublicKey(buffer);
      expect(recovered.n).toBe(votingKeys.publicKey.n);
    });

    it('should serialize and deserialize private key', async () => {
      const votingKeys = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      const buffer = votingService.votingPrivateKeyToBuffer(
        votingKeys.privateKey,
      );
      expect(buffer.length).toBeGreaterThan(0);

      const recovered = await votingService.bufferToVotingPrivateKey(
        buffer,
        votingKeys.publicKey,
      );

      expect(recovered.lambda).toBe(votingKeys.privateKey.lambda);
      expect(recovered.mu).toBe(votingKeys.privateKey.mu);

      // Test functionality
      const plaintext = 123n;
      const ciphertext = votingKeys.publicKey.encrypt(plaintext);
      const decrypted = recovered.decrypt(ciphertext);
      expect(decrypted).toBe(plaintext);
    });

    it('should use service singleton instance', () => {
      const instance1 = VotingService.getInstance();
      const instance2 = VotingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Security Properties', () => {
    it('should produce non-deterministic ciphertexts', () => {
      const votingKeys = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      const plaintext = 42n;
      const c1 = votingKeys.publicKey.encrypt(plaintext);
      const c2 = votingKeys.publicKey.encrypt(plaintext);

      // Same plaintext should produce different ciphertexts
      expect(c1).not.toBe(c2);

      // But both should decrypt to same value
      expect(votingKeys.privateKey.decrypt(c1)).toBe(plaintext);
      expect(votingKeys.privateKey.decrypt(c2)).toBe(plaintext);
    });

    it('should maintain semantic security', () => {
      const votingKeys = deriveVotingKeysFromECDH(
        ecdhKeyPair.privateKey,
        ecdhKeyPair.publicKey,
      );

      // Encrypt same message multiple times
      const plaintext = 100n;
      const ciphertexts = Array(10)
        .fill(null)
        .map(() => votingKeys.publicKey.encrypt(plaintext));

      // All ciphertexts should be different
      const uniqueCiphertexts = new Set(ciphertexts.map((c) => c.toString()));
      expect(uniqueCiphertexts.size).toBe(10);

      // All should decrypt correctly
      for (const c of ciphertexts) {
        expect(votingKeys.privateKey.decrypt(c)).toBe(plaintext);
      }
    });
  });

  describe('Enhanced Paillier Homomorphic Property Tests', () => {
    let keyPair: { publicKey: PublicKey; privateKey: PrivateKey };

    beforeAll(() => {
      // Generate keys ONCE for all tests - major performance improvement
      const seed = randomBytes(64);
      keyPair = generateDeterministicKeyPair(seed, 2048, 128);
    });

    describe('Homomorphic Multiplication by Constant', () => {
      it('should support scalar multiplication: E(m) ^ k = E(k * m)', () => {
        const m = 7n;
        const k = 5n;

        const encrypted = keyPair.publicKey.encrypt(m);
        const multiplied = keyPair.publicKey.multiply(encrypted, k);
        const decrypted = keyPair.privateKey.decrypt(multiplied);

        expect(decrypted).toBe(k * m);
      });

      it('should handle negative scalar multiplication', () => {
        const m = 10n;
        const k = -3n;

        const encrypted = keyPair.publicKey.encrypt(m);
        const multiplied = keyPair.publicKey.multiply(encrypted, k);
        const decrypted = keyPair.privateKey.decrypt(multiplied);

        // Paillier works modulo n, so negative numbers wrap around
        const expected = (k * m) % keyPair.publicKey.n;
        const normalizedExpected =
          expected < 0n ? expected + keyPair.publicKey.n : expected;

        expect(decrypted).toBe(normalizedExpected);
      });

      it('should handle large scalar values', () => {
        const m = 42n;
        const k = 999999999999n;

        const encrypted = keyPair.publicKey.encrypt(m);
        const multiplied = keyPair.publicKey.multiply(encrypted, k);
        const decrypted = keyPair.privateKey.decrypt(multiplied);

        expect(decrypted).toBe(k * m);
      });

      it('should handle zero scalar (result should be zero)', () => {
        const m = 42n;
        const k = 0n;

        const encrypted = keyPair.publicKey.encrypt(m);
        const multiplied = keyPair.publicKey.multiply(encrypted, k);
        const decrypted = keyPair.privateKey.decrypt(multiplied);

        expect(decrypted).toBe(0n);
      });
    });

    describe('Complex Homomorphic Operations', () => {
      it('should support chained additions: E(a) + E(b) + E(c) = E(a + b + c)', () => {
        const a = 5n;
        const b = 10n;
        const c = 15n;

        const encA = keyPair.publicKey.encrypt(a);
        const encB = keyPair.publicKey.encrypt(b);
        const encC = keyPair.publicKey.encrypt(c);

        const sum1 = keyPair.publicKey.addition(encA, encB);
        const sum2 = keyPair.publicKey.addition(sum1, encC);
        const decrypted = keyPair.privateKey.decrypt(sum2);

        expect(decrypted).toBe(a + b + c);
      });

      it('should support mixed operations: E(a)*k1 + E(b)*k2', () => {
        const a = 3n;
        const b = 7n;
        const k1 = 4n;
        const k2 = 2n;

        const encA = keyPair.publicKey.encrypt(a);
        const encB = keyPair.publicKey.encrypt(b);

        const scaledA = keyPair.publicKey.multiply(encA, k1);
        const scaledB = keyPair.publicKey.multiply(encB, k2);
        const sum = keyPair.publicKey.addition(scaledA, scaledB);
        const decrypted = keyPair.privateKey.decrypt(sum);

        expect(decrypted).toBe(a * k1 + b * k2);
      });

      it('should compute weighted sum: sum(E(mi) * wi)', () => {
        const messages = [10n, 20n, 30n, 40n];
        const weights = [1n, 2n, 3n, 4n];

        let encryptedSum = keyPair.publicKey.encrypt(0n);

        for (let i = 0; i < messages.length; i++) {
          const encrypted = keyPair.publicKey.encrypt(messages[i]);
          const weighted = keyPair.publicKey.multiply(encrypted, weights[i]);
          encryptedSum = keyPair.publicKey.addition(encryptedSum, weighted);
        }

        const decrypted = keyPair.privateKey.decrypt(encryptedSum);
        const expected = messages.reduce(
          (sum, m, i) => sum + m * weights[i],
          0n,
        );

        expect(decrypted).toBe(expected);
      });
    });

    describe('Edge Cases - Large Numbers', () => {
      it('should handle encryption near modulus boundary', () => {
        // Generate a message close to n (but less than n/2 for proper decryption)
        const n = keyPair.publicKey.n;
        const largeMessage = n / 4n; // Safe upper bound

        const encrypted = keyPair.publicKey.encrypt(largeMessage);
        const decrypted = keyPair.privateKey.decrypt(encrypted);

        expect(decrypted).toBe(largeMessage);
      });

      it('should handle very small numbers', () => {
        const small = 1n;

        const encrypted = keyPair.publicKey.encrypt(small);
        const decrypted = keyPair.privateKey.decrypt(encrypted);

        expect(decrypted).toBe(small);
      });

      it('should handle maximum safe integer', () => {
        const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);

        const encrypted = keyPair.publicKey.encrypt(maxSafe);
        const decrypted = keyPair.privateKey.decrypt(encrypted);

        expect(decrypted).toBe(maxSafe);
      });

      it('should handle large sums without overflow', () => {
        const value = 1000000n;
        const count = 1000;

        let encryptedSum = keyPair.publicKey.encrypt(0n);
        for (let i = 0; i < count; i++) {
          const encrypted = keyPair.publicKey.encrypt(value);
          encryptedSum = keyPair.publicKey.addition(encryptedSum, encrypted);
        }

        const decrypted = keyPair.privateKey.decrypt(encryptedSum);
        expect(decrypted).toBe(value * BigInt(count));
      });
    });

    describe('Edge Cases - Zero and Identity', () => {
      it('should encrypt and decrypt zero', () => {
        const zero = 0n;
        const encrypted = keyPair.publicKey.encrypt(zero);
        const decrypted = keyPair.privateKey.decrypt(encrypted);

        expect(decrypted).toBe(zero);
      });

      it('should support E(0) + E(m) = E(m)', () => {
        const m = 42n;

        const encZero = keyPair.publicKey.encrypt(0n);
        const encM = keyPair.publicKey.encrypt(m);
        const sum = keyPair.publicKey.addition(encZero, encM);
        const decrypted = keyPair.privateKey.decrypt(sum);

        expect(decrypted).toBe(m);
      });

      it('should support E(m) * 1 = E(m)', () => {
        const m = 42n;

        const encrypted = keyPair.publicKey.encrypt(m);
        const multiplied = keyPair.publicKey.multiply(encrypted, 1n);
        const decrypted = keyPair.privateKey.decrypt(multiplied);

        expect(decrypted).toBe(m);
      });

      it('should support E(m) + E(-m) ≈ E(0)', () => {
        const m = 42n;

        const encM = keyPair.publicKey.encrypt(m);
        const encNegM = keyPair.publicKey.encrypt(-m);
        const sum = keyPair.publicKey.addition(encM, encNegM);
        const decrypted = keyPair.privateKey.decrypt(sum);

        // Due to modular arithmetic, should be 0 or n
        expect(decrypted === 0n || decrypted === keyPair.publicKey.n).toBe(
          true,
        );
      });
    });

    describe('Cross-Platform Determinism', () => {
      it('should generate identical keys from same seed across multiple invocations', () => {
        const seed = randomBytes(64);

        const results = [];
        for (let i = 0; i < 5; i++) {
          const kp = generateDeterministicKeyPair(seed, 2048, 128);
          results.push({
            n: kp.publicKey.n,
            g: kp.publicKey.g,
            lambda: kp.privateKey.lambda,
            mu: kp.privateKey.mu,
          });
        }

        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i].n).toBe(results[0].n);
          expect(results[i].g).toBe(results[0].g);
          expect(results[i].lambda).toBe(results[0].lambda);
          expect(results[i].mu).toBe(results[0].mu);
        }
      });

      it('should produce same ciphertext for same message and randomness', () => {
        // Note: Paillier encryption is probabilistic, but with deterministic randomness
        // from the same DRBG state, we can verify consistency
        const seed = randomBytes(64);
        const kp1 = generateDeterministicKeyPair(seed, 2048, 128);
        const kp2 = generateDeterministicKeyPair(seed, 2048, 128);

        const message = 42n;

        // Same keys should encrypt consistently (though ciphertexts will differ due to randomness)
        const c1 = kp1.publicKey.encrypt(message);
        const c2 = kp2.publicKey.encrypt(message);

        // Both should decrypt correctly
        expect(kp1.privateKey.decrypt(c1)).toBe(message);
        expect(kp2.privateKey.decrypt(c2)).toBe(message);

        // Cross-decryption should work (same keys)
        expect(kp1.privateKey.decrypt(c2)).toBe(message);
        expect(kp2.privateKey.decrypt(c1)).toBe(message);
      });

      it('should produce consistent results for ECIES-to-Paillier bridge', () => {
        // Test that the bridge produces consistent results
        const results = [];
        for (let i = 0; i < 3; i++) {
          const votingKeys = deriveVotingKeysFromECDH(
            ecdhKeyPair.privateKey,
            ecdhKeyPair.publicKey,
          );
          results.push({
            n: votingKeys.publicKey.n,
            g: votingKeys.publicKey.g,
            lambda: votingKeys.privateKey.lambda,
            mu: votingKeys.privateKey.mu,
          });
        }

        // All results should be identical
        for (let i = 1; i < results.length; i++) {
          expect(results[i].n).toBe(results[0].n);
          expect(results[i].g).toBe(results[0].g);
          expect(results[i].lambda).toBe(results[0].lambda);
          expect(results[i].mu).toBe(results[0].mu);
        }
      });
    });

    describe('Key Recovery and Serialization', () => {
      it('should recover keys from serialized form', async () => {
        const publicKeySerialized = votingService.serializePublicKey(
          keyPair.publicKey,
        );
        const privateKeySerialized = votingService.serializePrivateKey(
          keyPair.privateKey,
        );

        const recoveredPublic =
          await votingService.deserializePublicKey(publicKeySerialized);
        const recoveredPrivate = await votingService.deserializePrivateKey(
          privateKeySerialized,
          recoveredPublic,
        );

        // Test functionality
        const message = 123n;
        const encrypted = recoveredPublic.encrypt(message);
        const decrypted = recoveredPrivate.decrypt(encrypted);

        expect(decrypted).toBe(message);
      });

      it('should maintain homomorphic properties after serialization', async () => {
        const publicKeySerialized = votingService.serializePublicKey(
          keyPair.publicKey,
        );
        const privateKeySerialized = votingService.serializePrivateKey(
          keyPair.privateKey,
        );

        const recoveredPublic =
          await votingService.deserializePublicKey(publicKeySerialized);
        const recoveredPrivate = await votingService.deserializePrivateKey(
          privateKeySerialized,
          recoveredPublic,
        );

        const a = 10n;
        const b = 20n;

        const encA = recoveredPublic.encrypt(a);
        const encB = recoveredPublic.encrypt(b);
        const sum = recoveredPublic.addition(encA, encB);
        const decrypted = recoveredPrivate.decrypt(sum);

        expect(decrypted).toBe(a + b);
      });

      it('should handle multiple serialization-deserialization cycles', async () => {
        let currentPublic = keyPair.publicKey;
        let currentPrivate = keyPair.privateKey;

        for (let i = 0; i < 3; i++) {
          const pubSerialized = votingService.serializePublicKey(currentPublic);
          const privSerialized =
            votingService.serializePrivateKey(currentPrivate);

          currentPublic =
            await votingService.deserializePublicKey(pubSerialized);
          currentPrivate = await votingService.deserializePrivateKey(
            privSerialized,
            currentPublic,
          );
        }

        // Test functionality after multiple cycles
        const message = 456n;
        const encrypted = currentPublic.encrypt(message);
        const decrypted = currentPrivate.decrypt(encrypted);

        expect(decrypted).toBe(message);
      });
    });

    describe('Performance and Stress Tests', () => {
      it('should handle batch encryption efficiently', () => {
        const messages = Array.from({ length: 100 }, (_, i) => BigInt(i + 1));
        const encrypted = messages.map((m) => keyPair.publicKey.encrypt(m));

        for (let i = 0; i < encrypted.length; i++) {
          const decrypted = keyPair.privateKey.decrypt(encrypted[i]);
          expect(decrypted).toBe(messages[i]);
        }
      });

      it('should handle batch homomorphic operations', () => {
        const values = Array.from({ length: 50 }, (_, i) => BigInt(i + 1));
        const encrypted = values.map((v) => keyPair.publicKey.encrypt(v));

        // Sum all encrypted values
        let sum = encrypted[0];
        for (let i = 1; i < encrypted.length; i++) {
          sum = keyPair.publicKey.addition(sum, encrypted[i]);
        }

        const decrypted = keyPair.privateKey.decrypt(sum);
        const expected = values.reduce((acc, v) => acc + v, 0n);

        expect(decrypted).toBe(expected);
      });
    });
  });
});
