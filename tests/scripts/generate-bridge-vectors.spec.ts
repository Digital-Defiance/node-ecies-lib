/**
 * Paillier Bridge Key Derivation — Test Vector Generator
 *
 * Generates reproducible test vectors for the ECDH-to-Paillier bridge pipeline.
 * Each vector captures every intermediate value so an independent implementation
 * can verify byte-exact agreement at each stage.
 *
 * Usage: run via jest (it's wrapped in a describe block so nx can execute it)
 *   NX_TUI=false npx nx run digitaldefiance-node-ecies-lib:test --outputStyle=stream \
 *     -- --testNamePattern="Generate Paillier Bridge"
 */

import { createECDH, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { secp256k1 } from '@noble/curves/secp256k1';

import {
  hkdf,
  SecureDeterministicDRBG,
  millerRabinTest,
  generateDeterministicPrime,
  generateDeterministicKeyPair,
  deriveVotingKeysFromECDH,
} from '../../src/services/voting.service';

// Extend timeout — prime generation is slow
jest.setTimeout(300_000);

/**
 * A fixed, well-known ECDH private key for reproducible vectors.
 * This is the SHA-256 of the ASCII string "PaillierBridgeTestVector1".
 */
const FIXED_PRIVATE_KEY = createHash('sha256')
  .update('PaillierBridgeTestVector1')
  .digest();

function toHex(buf: Uint8Array | Buffer): string {
  return Buffer.from(buf).toString('hex');
}

interface BridgeVector {
  id: string;
  description: string;
  stage1_ecdh: {
    privateKey: string;
    publicKey_uncompressed: string;
    sharedSecret: string;
  };
  stage2_hkdf: {
    ikm: string;
    salt: string;
    info: string;
    info_hex: string;
    length: number;
    algorithm: string;
    seed: string;
  };
  stage3_drbg: {
    algorithm: string;
    initial_K: string;
    initial_V: string;
  };
  stage3_primes: {
    p_hex: string;
    p_bitLength: number;
    q_hex: string;
    q_bitLength: number;
  };
  stage4_paillier: {
    n_hex: string;
    n_bitLength: number;
    g_equals_n_plus_1: boolean;
    lambda_hex: string;
    mu_hex: string;
    validation_plaintext: string;
    validation_passed: boolean;
  };
  keyId: {
    nHex_padded_length: number;
    encoding: string;
    hash_algorithm: string;
    keyId_hex: string;
  };
  millerRabin: {
    configured_rounds: number;
    phase1_witnesses: string[];
    phase2_method: string;
    phase2_hash: string;
  };
}

describe('Generate Paillier Bridge Test Vectors', () => {
  it('should generate a complete bridge derivation vector', async () => {
    // --- Stage 1: ECDH ---
    const privKey = FIXED_PRIVATE_KEY;

    // Derive the public key from the private key using @noble/secp256k1
    const pubKeyUncompressed = secp256k1.getPublicKey(privKey, false);

    // Compute shared secret (self-ECDH for a single-party test vector)
    const sharedSecret = secp256k1.getSharedSecret(
      privKey,
      pubKeyUncompressed,
      false,
    );

    expect(sharedSecret.length).toBe(65);
    expect(sharedSecret[0]).toBe(0x04);

    // --- Stage 2: HKDF ---
    const hkdfSalt = Buffer.alloc(64); // 64 zero bytes (SHA-512 hash length)
    const hkdfInfo = 'PaillierPrimeGen';
    const hkdfLength = 64;
    const hkdfAlgorithm = 'sha512';

    const seed = hkdf(
      sharedSecret,
      null, // null salt → normalized to 64 zero bytes internally
      hkdfInfo,
      hkdfLength,
      hkdfAlgorithm,
    );

    expect(seed.length).toBe(64);

    // --- Stage 3: DRBG + Prime Generation ---
    // We need to capture the primes. Use generateDeterministicKeyPair
    // which internally creates the DRBG and generates p, q.
    // But to capture p and q individually, we replicate the pipeline.
    const drbg = new SecureDeterministicDRBG(seed, 'sha512');
    const primeBits = 1536; // 3072 / 2
    const primeTestIterations = 256;

    const p = generateDeterministicPrime(drbg, primeBits, primeTestIterations);
    const q = generateDeterministicPrime(drbg, primeBits, primeTestIterations);

    // Verify they're actually prime
    expect(millerRabinTest(p, 256)).toBe(true);
    expect(millerRabinTest(q, 256)).toBe(true);

    // Verify bit lengths
    const pBits = p.toString(2).length;
    const qBits = q.toString(2).length;
    expect(pBits).toBe(1536);
    expect(qBits).toBe(1536);

    // --- Stage 4: Paillier Key Construction ---
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const paillier = require('paillier-bigint');
    const { PublicKey, PrivateKey } = paillier;

    const n = p * q;
    const g = n + 1n;

    // gcd/lcm helpers (inline to avoid import issues)
    function _gcd(a: bigint, b: bigint): bigint {
      a = a < 0n ? -a : a;
      b = b < 0n ? -b : b;
      while (b !== 0n) {
        const t = b;
        b = a % b;
        a = t;
      }
      return a;
    }
    function _lcm(a: bigint, b: bigint): bigint {
      return (a * b) / _gcd(a, b);
    }
    function _modPow(base: bigint, exp: bigint, mod: bigint): bigint {
      if (mod === 1n) return 0n;
      let result = 1n;
      base = base % mod;
      while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        exp = exp >> 1n;
        base = (base * base) % mod;
      }
      return result;
    }
    function _modInverse(a: bigint, m: bigint): bigint {
      if (m === 1n) return 0n;
      const m0 = m;
      let x0 = 0n,
        x1 = 1n,
        a0 = a;
      while (a0 > 1n) {
        const q = a0 / m;
        let t = m;
        m = a0 % m;
        a0 = t;
        t = x0;
        x0 = x1 - q * x0;
        x1 = t;
      }
      if (x1 < 0n) x1 += m0;
      return x1;
    }

    const lambda = _lcm(p - 1n, q - 1n);
    const nSquared = n * n;
    const gLambda = _modPow(g, lambda, nSquared);
    const l = (gLambda - 1n) / n;
    const mu = _modInverse(l, n);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const publicKey = new PublicKey(n, g);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const privateKey = new PrivateKey(lambda, mu, publicKey);

    // Validate
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const encrypted = publicKey.encrypt(42n);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const decrypted = privateKey.decrypt(encrypted);
    expect(decrypted).toBe(42n);

    // --- keyId computation ---
    const nHex = n.toString(16).padStart(768, '0');
    const nBytesForKeyId = Buffer.from(nHex, 'utf8');
    const keyIdBuf = createHash('sha256').update(nBytesForKeyId).digest();

    // --- Also verify via deriveVotingKeysFromECDH for consistency ---
    const fullKeyPair = deriveVotingKeysFromECDH(privKey, pubKeyUncompressed);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(fullKeyPair.publicKey.n).toBe(n);

    // --- Build the vector ---
    const infoBytes = Buffer.from(hkdfInfo, 'utf-8');

    const vector: BridgeVector = {
      id: 'vector-1',
      description:
        'Full bridge derivation from SHA-256("PaillierBridgeTestVector1") as ECDH private key',
      stage1_ecdh: {
        privateKey: toHex(privKey),
        publicKey_uncompressed: toHex(pubKeyUncompressed),
        sharedSecret: toHex(sharedSecret),
      },
      stage2_hkdf: {
        ikm: toHex(sharedSecret),
        salt: toHex(hkdfSalt),
        info: hkdfInfo,
        info_hex: toHex(infoBytes),
        length: hkdfLength,
        algorithm: hkdfAlgorithm,
        seed: toHex(seed),
      },
      stage3_drbg: {
        algorithm: 'HMAC-DRBG-SHA512',
        initial_K: toHex(Buffer.alloc(64, 0x00)),
        initial_V: toHex(Buffer.alloc(64, 0x01)),
      },
      stage3_primes: {
        p_hex: p.toString(16),
        p_bitLength: pBits,
        q_hex: q.toString(16),
        q_bitLength: qBits,
      },
      stage4_paillier: {
        n_hex: n.toString(16),
        n_bitLength: n.toString(2).length,
        g_equals_n_plus_1: true,
        lambda_hex: lambda.toString(16),
        mu_hex: mu.toString(16),
        validation_plaintext: '42',
        validation_passed: true,
      },
      keyId: {
        nHex_padded_length: 768,
        encoding: 'UTF-8',
        hash_algorithm: 'SHA-256',
        keyId_hex: toHex(keyIdBuf),
      },
      millerRabin: {
        configured_rounds: 256,
        phase1_witnesses: [
          '2',
          '3',
          '5',
          '7',
          '11',
          '13',
          '17',
          '19',
          '23',
          '29',
          '31',
          '37',
        ],
        phase2_method: 'HMAC-SHA256(key=UTF-8(hex(n)), data=UTF-8(hex(round)))',
        phase2_hash: 'SHA-256 via HMAC',
      },
    };

    // --- Vector 2: Different key to prove algorithm tightness ---
    const privKey2 = createHash('sha256')
      .update('PaillierBridgeTestVector2')
      .digest();
    const pubKey2 = secp256k1.getPublicKey(privKey2, false);
    const sharedSecret2 = secp256k1.getSharedSecret(privKey2, pubKey2, false);
    const seed2 = hkdf(
      sharedSecret2,
      null,
      hkdfInfo,
      hkdfLength,
      hkdfAlgorithm,
    );
    const drbg2 = new SecureDeterministicDRBG(seed2, 'sha512');
    const p2 = generateDeterministicPrime(
      drbg2,
      primeBits,
      primeTestIterations,
    );
    const q2 = generateDeterministicPrime(
      drbg2,
      primeBits,
      primeTestIterations,
    );
    expect(millerRabinTest(p2, 256)).toBe(true);
    expect(millerRabinTest(q2, 256)).toBe(true);
    const n2 = p2 * q2;
    const lambda2 = _lcm(p2 - 1n, q2 - 1n);
    const nSquared2 = n2 * n2;
    const gLambda2 = _modPow(n2 + 1n, lambda2, nSquared2);
    const l2 = (gLambda2 - 1n) / n2;
    const mu2 = _modInverse(l2, n2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const pub2 = new PublicKey(n2, n2 + 1n);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const priv2 = new PrivateKey(lambda2, mu2, pub2);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    expect(priv2.decrypt(pub2.encrypt(42n))).toBe(42n);
    const nHex2 = n2.toString(16).padStart(768, '0');
    const keyId2 = createHash('sha256')
      .update(Buffer.from(nHex2, 'utf8'))
      .digest();

    const vector2: BridgeVector = {
      id: 'vector-2',
      description:
        'Full bridge derivation from SHA-256("PaillierBridgeTestVector2") as ECDH private key',
      stage1_ecdh: {
        privateKey: toHex(privKey2),
        publicKey_uncompressed: toHex(pubKey2),
        sharedSecret: toHex(sharedSecret2),
      },
      stage2_hkdf: {
        ikm: toHex(sharedSecret2),
        salt: toHex(hkdfSalt),
        info: hkdfInfo,
        info_hex: toHex(infoBytes),
        length: hkdfLength,
        algorithm: hkdfAlgorithm,
        seed: toHex(seed2),
      },
      stage3_drbg: {
        algorithm: 'HMAC-DRBG-SHA512',
        initial_K: toHex(Buffer.alloc(64, 0x00)),
        initial_V: toHex(Buffer.alloc(64, 0x01)),
      },
      stage3_primes: {
        p_hex: p2.toString(16),
        p_bitLength: p2.toString(2).length,
        q_hex: q2.toString(16),
        q_bitLength: q2.toString(2).length,
      },
      stage4_paillier: {
        n_hex: n2.toString(16),
        n_bitLength: n2.toString(2).length,
        g_equals_n_plus_1: true,
        lambda_hex: lambda2.toString(16),
        mu_hex: mu2.toString(16),
        validation_plaintext: '42',
        validation_passed: true,
      },
      keyId: {
        nHex_padded_length: 768,
        encoding: 'UTF-8',
        hash_algorithm: 'SHA-256',
        keyId_hex: toHex(keyId2),
      },
      millerRabin: {
        configured_rounds: 256,
        phase1_witnesses: [
          '2',
          '3',
          '5',
          '7',
          '11',
          '13',
          '17',
          '19',
          '23',
          '29',
          '31',
          '37',
        ],
        phase2_method: 'HMAC-SHA256(key=UTF-8(hex(n)), data=UTF-8(hex(round)))',
        phase2_hash: 'SHA-256 via HMAC',
      },
    };

    // Write to file
    const outputPath = path.join(__dirname, '../fixtures/bridge-vectors.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify([vector, vector2], null, 2));
    console.log(`\nGenerated 2 bridge vectors to ${outputPath}`);
    console.log(
      `  Vector 1 — privKey: ${vector.stage1_ecdh.privateKey.substring(0, 16)}... n bits: ${vector.stage4_paillier.n_bitLength} keyId: ${vector.keyId.keyId_hex.substring(0, 16)}...`,
    );
    console.log(
      `  Vector 2 — privKey: ${vector2.stage1_ecdh.privateKey.substring(0, 16)}... n bits: ${vector2.stage4_paillier.n_bitLength} keyId: ${vector2.keyId.keyId_hex.substring(0, 16)}...`,
    );
  });
});
