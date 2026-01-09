import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { withConsoleMocks } from '@digitaldefiance/express-suite-test-utils';

import { getNodeRuntimeConfiguration } from '../src/constants';
import { ECIESService } from '../src/services/ecies/service';

interface TestVector {
  id: string;
  description: string;
  input: string; // base64
  encrypted: string; // base64
  privateKey: string; // hex
  publicKey: string; // hex
}

describe('Enterprise Grade Compatibility & Robustness', () => {
  let service: ECIESService;
  let vectors: TestVector[];

  beforeAll(() => {
    const eciesDefaults = getNodeRuntimeConfiguration().ECIES;
    const config = {
      curveName: eciesDefaults.CURVE_NAME,
      primaryKeyDerivationPath: eciesDefaults.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: eciesDefaults.MNEMONIC_STRENGTH,
      symmetricAlgorithm: eciesDefaults.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: eciesDefaults.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: eciesDefaults.SYMMETRIC.MODE,
    };
    service = new ECIESService(config);

    const vectorsPath = path.join(
      __dirname,
      'fixtures/enterprise-vectors.json',
    );
    if (fs.existsSync(vectorsPath)) {
      vectors = JSON.parse(fs.readFileSync(vectorsPath, 'utf8'));
    } else {
      console.warn('Test vectors not found, skipping vector tests');
      vectors = [];
    }
  });

  describe('Static Vector Validation', () => {
    it('should decrypt all static test vectors correctly', () => {
      if (vectors.length === 0) {
        console.warn('Skipping vector tests (no vectors found)');
        return;
      }

      for (const vector of vectors) {
        const privateKey = Buffer.from(vector.privateKey, 'hex');
        const encrypted = Buffer.from(vector.encrypted, 'base64');
        const expectedInput = Buffer.from(vector.input, 'base64');

        const decrypted = service.decryptSimpleOrSingleWithHeader(
          false,
          privateKey,
          encrypted,
        );

        expect(decrypted).toEqual(expectedInput);
      }
    });
  });

  describe('Fuzzing & Robustness', () => {
    it('should handle random garbage data gracefully', () => {
      withConsoleMocks({ mute: true }, () => {
        const mnemonic = service.generateNewMnemonic();
        const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
        const privateKey = Buffer.from(wallet.getPrivateKey());

        for (let i = 0; i < 100; i++) {
          const garbageLength = Math.floor(Math.random() * 1000) + 1;
          const garbage = randomBytes(garbageLength);

          expect(() => {
            service.decryptSimpleOrSingleWithHeader(false, privateKey, garbage);
          }).toThrow();
        }
      });
    });

    it('should handle mutated valid ciphertexts', () => {
      withConsoleMocks({ mute: true }, () => {
        if (vectors.length === 0) return;

        const vector = vectors[0];
        const validEncrypted = Buffer.from(vector.encrypted, 'base64');
        const privateKey = Buffer.from(vector.privateKey, 'hex');

        // Try flipping bits in various positions
        for (let i = 0; i < 50; i++) {
          const mutated = Buffer.from(validEncrypted);
          const pos = Math.floor(Math.random() * mutated.length);
          mutated[pos] ^= 0xff; // Flip bits

          expect(() => {
            service.decryptSimpleOrSingleWithHeader(false, privateKey, mutated);
          }).toThrow();
        }
      });
    });

    it('should handle truncated ciphertexts', () => {
      withConsoleMocks({ mute: true }, () => {
        if (vectors.length === 0) return;

        const vector = vectors[0];
        const validEncrypted = Buffer.from(vector.encrypted, 'base64');
        const privateKey = Buffer.from(vector.privateKey, 'hex');

        // Try truncating at various lengths
        for (let len = 0; len < validEncrypted.length; len += 5) {
          const truncated = validEncrypted.subarray(0, len);

          expect(() => {
            service.decryptSimpleOrSingleWithHeader(
              false,
              privateKey,
              truncated,
            );
          }).toThrow();
        }
      });
    });
  });

  describe('Concurrency & Stability', () => {
    it('should handle concurrent operations without error', async () => {
      const count = 50;
      const promises = [];
      const message = Buffer.from('Concurrency Test');
      const mnemonic = service.generateNewMnemonic();
      const { wallet } = service.walletAndSeedFromMnemonic(mnemonic);
      const privateKey = Buffer.from(wallet.getPrivateKey());
      const publicKey = Buffer.concat([
        Buffer.from([0x04]),
        Buffer.from(wallet.getPublicKey()),
      ]);

      for (let i = 0; i < count; i++) {
        promises.push(
          (async () => {
            const encrypted = service.encryptSimpleOrSingle(
              false,
              publicKey,
              message,
            );
            const decrypted = service.decryptSimpleOrSingleWithHeader(
              false,
              privateKey,
              encrypted,
            );
            expect(decrypted).toEqual(message);
          })(),
        );
      }

      await Promise.all(promises);
    });
  });
});
