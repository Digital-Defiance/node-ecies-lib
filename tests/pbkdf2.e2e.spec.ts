import { Constants as ApiConstants } from '../src/constants';
import { Pbkdf2ProfileEnum } from '../src/enumerations/pbkdf2-profile';
import { Pbkdf2Service, NodePbkdf2Error } from '../src/services/pbkdf2';
import {
  Pbkdf2ErrorType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { randomBytes, pbkdf2Sync } from 'crypto';

describe('Pbkdf2Service API E2E', () => {
  // Use shorter timeouts for faster tests but allow for slower CI
  jest.setTimeout(60000);

  const testPassword = Buffer.from('test-password-e2e');
  const testSalt = randomBytes(32);

  describe('Key Derivation Operations', () => {
    it('should derive consistent keys with same parameters', () => {
      const result1 = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        testSalt,
        1000,
      );
      const result2 = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        testSalt,
        1000,
      );

      expect(result1.hash).toEqual(result2.hash);
      expect(result1.salt).toEqual(result2.salt);
      expect(result1.iterations).toBe(result2.iterations);
    });

    it('should derive different keys with different salts', () => {
      const result1 = Pbkdf2Service.deriveKeyFromPassword(testPassword);
      const result2 = Pbkdf2Service.deriveKeyFromPassword(testPassword);

      expect(result1.hash).not.toEqual(result2.hash);
      expect(result1.salt).not.toEqual(result2.salt);
      expect(result1.iterations).toBe(result2.iterations);
    });

    it('should handle various password types and lengths', () => {
      const passwords = [
        Buffer.from(''),
        Buffer.from('a'),
        Buffer.from('short'),
        Buffer.from('medium-length-password'),
        Buffer.from(
          'very-long-password-with-many-characters-to-test-edge-cases',
        ),
        Buffer.from('unicode-password-世界-🔐-test'),
        Buffer.from('\x00\x01\x02\x03'), // Binary data
      ];

      for (const password of passwords) {
        const result = Pbkdf2Service.deriveKeyFromPassword(
          password,
          undefined,
          1000,
        );

        expect(result.hash).toBeInstanceOf(Buffer);
        expect(result.salt).toBeInstanceOf(Buffer);
        expect(result.hash.length).toBe(32); // Default ECIES key size
        expect(result.salt.length).toBe(32); // Default salt size
        expect(result.iterations).toBe(1000);
      }
    });

    it('should work with different iteration counts', () => {
      const iterations = [1, 100, 1000, 10000, 50000];
      const results = iterations.map((iter) =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, iter),
      );

      // All should have different hashes due to different iterations
      for (let i = 0; i < results.length - 1; i++) {
        for (let j = i + 1; j < results.length; j++) {
          expect(results[i].hash).not.toEqual(results[j].hash);
        }
      }

      // But same salt and correct iterations
      results.forEach((result, index) => {
        expect(result.salt).toEqual(testSalt);
        expect(result.iterations).toBe(iterations[index]);
      });
    });

    it('should support different hash algorithms', () => {
      const algorithms = ['sha256', 'sha512'];
      const results = algorithms.map((algorithm) =>
        Pbkdf2Service.deriveKeyFromPassword(
          testPassword,
          testSalt,
          1000,
          32,
          32,
          algorithm,
        ),
      );

      // Different algorithms should produce different hashes
      expect(results[0].hash).not.toEqual(results[1].hash);

      // But same other parameters
      expect(results[0].salt).toEqual(results[1].salt);
      expect(results[0].iterations).toBe(results[1].iterations);
    });

    it('should support different key sizes', () => {
      const keySizes = [16, 32, 64];
      const results = keySizes.map((keySize) =>
        Pbkdf2Service.deriveKeyFromPassword(
          testPassword,
          testSalt,
          1000,
          32,
          keySize,
        ),
      );

      results.forEach((result, index) => {
        expect(result.hash.length).toBe(keySizes[index]);
        expect(result.salt).toEqual(testSalt);
      });
    });

    it('should support different salt sizes', () => {
      const saltSizes = [16, 32, 64];

      for (const saltSize of saltSizes) {
        const customSalt = randomBytes(saltSize);
        const result = Pbkdf2Service.deriveKeyFromPassword(
          testPassword,
          customSalt,
          1000,
          saltSize,
        );

        expect(result.salt.length).toBe(saltSize);
        expect(result.salt).toEqual(customSalt);
      }
    });
  });

  describe('Async Key Derivation', () => {
    it('should produce same results as sync version', async () => {
      const syncResult = Pbkdf2Service.deriveKeyFromPassword(
        testPassword,
        testSalt,
        1000,
      );
      const asyncResult = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        testPassword,
        testSalt,
        1000,
      );

      expect(asyncResult.hash).toEqual(syncResult.hash);
      expect(asyncResult.salt).toEqual(syncResult.salt);
      expect(asyncResult.iterations).toBe(syncResult.iterations);
    });

    it('should handle concurrent async operations', async () => {
      const passwords = Array.from({ length: 5 }, (_, i) =>
        Buffer.from(`password-${i}`),
      );

      const promises = passwords.map((password) =>
        Pbkdf2Service.deriveKeyFromPasswordAsync(password, undefined, 1000),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);

      // Each should have unique salt
      const salts = results.map((r) => r.salt.toString('hex'));
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(5);

      // All should have correct parameters
      results.forEach((result) => {
        expect(result.hash.length).toBe(32);
        expect(result.salt.length).toBe(32);
        expect(result.iterations).toBe(1000);
      });
    });

    it('should handle high-iteration async operations', async () => {
      const startTime = Date.now();

      const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        testPassword,
        testSalt,
        100000, // Higher iterations
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.hash).toBeInstanceOf(Buffer);
      expect(result.iterations).toBe(100000);

      // Should complete within reasonable time (30 seconds for CI)
      expect(duration).toBeLessThan(30000);
    });
  });

  describe('Profile-Based Key Derivation', () => {
    it('should provide correct profile configurations', () => {
      const profiles = [
        Pbkdf2ProfileEnum.USER_LOGIN,
        Pbkdf2ProfileEnum.KEY_WRAPPING,
        Pbkdf2ProfileEnum.BACKUP_CODES,
        Pbkdf2ProfileEnum.HIGH_SECURITY,
        Pbkdf2ProfileEnum.TEST_FAST,
      ];

      for (const profile of profiles) {
        const config = Pbkdf2Service.getProfileConfig(profile);

        expect(config.saltBytes).toBeGreaterThan(0);
        expect(config.iterations).toBeGreaterThan(0);
        expect(config.hashBytes).toBeGreaterThan(0);
        expect(config.algorithm).toBeTruthy();
      }
    });

    it('should derive keys using profiles synchronously', () => {
      const profiles = [
        Pbkdf2ProfileEnum.USER_LOGIN,
        Pbkdf2ProfileEnum.KEY_WRAPPING,
        Pbkdf2ProfileEnum.TEST_FAST,
      ];

      for (const profile of profiles) {
        const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
          testPassword,
          profile,
        );

        const config = Pbkdf2Service.getProfileConfig(profile);

        expect(result.salt.length).toBe(config.saltBytes);
        expect(result.hash.length).toBe(config.hashBytes);
        expect(result.iterations).toBe(config.iterations);
      }
    });

    it('should derive keys using profiles asynchronously', async () => {
      const profiles = [
        Pbkdf2ProfileEnum.USER_LOGIN,
        Pbkdf2ProfileEnum.KEY_WRAPPING,
        Pbkdf2ProfileEnum.TEST_FAST,
      ];

      for (const profile of profiles) {
        const result =
          await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
            testPassword,
            profile,
          );

        const config = Pbkdf2Service.getProfileConfig(profile);

        expect(result.salt.length).toBe(config.saltBytes);
        expect(result.hash.length).toBe(config.hashBytes);
        expect(result.iterations).toBe(config.iterations);
      }
    });

    it('should produce consistent results with same profile and salt', async () => {
      const salt = randomBytes(16); // TEST_FAST profile uses 16-byte salts

      const syncResult = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        testPassword,
        Pbkdf2ProfileEnum.TEST_FAST,
        salt,
      );

      const asyncResult =
        await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
          testPassword,
          Pbkdf2ProfileEnum.TEST_FAST,
          salt,
        );

      expect(syncResult.hash).toEqual(asyncResult.hash);
      expect(syncResult.salt).toEqual(asyncResult.salt);
      expect(syncResult.iterations).toBe(asyncResult.iterations);
    });

    it('should work with all defined profiles', () => {
      const profileKeys = Object.keys(ApiConstants.PBKDF2_PROFILES);

      for (const profileKey of profileKeys) {
        const profile = profileKey as keyof typeof ApiConstants.PBKDF2_PROFILES;
        const config = Pbkdf2Service.getProfileConfig(profile);

        expect(config).toBeDefined();
        expect(config.saltBytes).toBeGreaterThan(0);
        expect(config.iterations).toBeGreaterThan(0);
        expect(config.hashBytes).toBeGreaterThan(0);
        expect(config.algorithm).toBeTruthy();
      }
    });
  });

  describe('Key-Wrapping Service Compatibility', () => {
    it('should replicate key-wrapping service behavior exactly', () => {
      const password = Buffer.from('test-password-123');
      const salt = randomBytes(32);
      const iterations = 100000;

      // Direct crypto.pbkdf2Sync call (what key-wrapping service does)
      const directResult = pbkdf2Sync(password, salt, iterations, 32, 'sha256');

      // Pbkdf2Service call
      const serviceResult = Pbkdf2Service.deriveKeyFromPassword(
        password,
        salt,
        iterations,
        32, // saltBytes
        32, // keySize
        'sha256', // algorithm
      );

      expect(serviceResult.hash).toEqual(directResult);
      expect(serviceResult.salt).toEqual(salt);
      expect(serviceResult.iterations).toBe(iterations);
    });

    it('should work with key-wrapping profile parameters', () => {
      const result = Pbkdf2Service.deriveKeyFromPasswordWithProfile(
        testPassword,
        Pbkdf2ProfileEnum.KEY_WRAPPING,
      );

      expect(result.salt.length).toBe(ApiConstants.WRAPPED_KEY.SALT_SIZE);
      expect(result.hash.length).toBe(32); // AES-256 key size
      expect(result.iterations).toBe(ApiConstants.WRAPPED_KEY.MIN_ITERATIONS);
    });

    it('should handle SecureString passwords via buffer conversion', () => {
      const securePassword = new SecureString('test-password-secure');
      const passwordBuffer = securePassword.valueAsUint8Array;
      const salt = randomBytes(32);

      const result = Pbkdf2Service.deriveKeyFromPassword(
        Buffer.from(passwordBuffer),
        salt,
        ApiConstants.WRAPPED_KEY.MIN_ITERATIONS,
        ApiConstants.WRAPPED_KEY.SALT_SIZE,
        32,
        'sha256',
      );

      expect(result.salt).toEqual(salt);
      expect(result.hash.length).toBe(32);
      expect(result.iterations).toBe(ApiConstants.WRAPPED_KEY.MIN_ITERATIONS);

      securePassword.dispose();
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate salt length correctly', () => {
      // Test with default 32-byte configuration
      const shortSalt = Buffer.alloc(31);
      const longSalt = Buffer.alloc(33);

      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, shortSalt),
      ).toThrow(NodePbkdf2Error);

      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, longSalt),
      ).toThrow(NodePbkdf2Error);
    });

    it('should validate salt length for custom configurations', () => {
      const salt16 = Buffer.alloc(16);

      // Should work when explicitly configured for 16-byte salt
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(
          testPassword,
          salt16,
          1000,
          16, // saltBytes param
        ),
      ).not.toThrow();

      // Should fail with default 32-byte config
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, salt16),
      ).toThrow(NodePbkdf2Error);
    });

    it('should handle invalid inputs gracefully', () => {
      // Invalid password
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(undefined as unknown as Buffer),
      ).toThrow();

      // Invalid iterations
      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, -1),
      ).toThrow();

      expect(() =>
        Pbkdf2Service.deriveKeyFromPassword(testPassword, testSalt, 0),
      ).toThrow();
    });

    it('should handle async validation errors', async () => {
      // Invalid password async
      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(
          undefined as unknown as Buffer,
        ),
      ).rejects.toThrow();

      // Invalid iterations async
      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(testPassword, testSalt, -1),
      ).rejects.toThrow();
    });

    it('should throw proper NodePbkdf2Error types', () => {
      const shortSalt = Buffer.alloc(15);

      try {
        Pbkdf2Service.deriveKeyFromPassword(testPassword, shortSalt);
        fail('Should have thrown NodePbkdf2Error');
      } catch (error) {
        expect(error).toBeInstanceOf(NodePbkdf2Error);
        expect((error as NodePbkdf2Error).type).toBe(
          Pbkdf2ErrorType.InvalidSaltLength,
        );
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent operations', async () => {
      const concurrency = 10;
      const promises = Array.from({ length: concurrency }, (_, i) =>
        Pbkdf2Service.deriveKeyFromPasswordAsync(
          Buffer.from(`password-${i}`),
          undefined,
          1000, // Low iterations for speed
        ),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrency);

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(30000);

      // All should have unique salts
      const salts = results.map((r) => r.salt.toString('hex'));
      const uniqueSalts = new Set(salts);
      expect(uniqueSalts.size).toBe(concurrency);
    });

    it('should handle high-security profile within reasonable time', async () => {
      const startTime = Date.now();

      const result = await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        testPassword,
        Pbkdf2ProfileEnum.HIGH_SECURITY,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.hash.length).toBe(64); // SHA-512 output
      expect(result.salt.length).toBe(64); // High security salt

      // Should complete within 60 seconds even for high security
      expect(duration).toBeLessThan(60000);
    });

    it('should maintain consistent performance across iterations', async () => {
      const iterations = 5;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await Pbkdf2Service.deriveKeyFromPasswordAsync(
          Buffer.from(`password-${i}`),
          undefined,
          10000,
        );

        const endTime = Date.now();
        durations.push(endTime - startTime);
      }

      // Calculate variance to ensure consistent performance
      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance =
        durations.reduce(
          (acc, duration) => acc + Math.pow(duration - avgDuration, 2),
          0,
        ) / durations.length;

      // Variance should be reasonable (not too high)
      expect(variance).toBeLessThan(avgDuration * avgDuration); // CV < 100%
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should produce consistent results across different environments', () => {
      const testCases = [
        { password: 'simple', iterations: 1000 },
        { password: 'complex-password-123!@#', iterations: 5000 },
        { password: 'unicode-世界-🔐', iterations: 2000 },
      ];

      for (const testCase of testCases) {
        const password = Buffer.from(testCase.password);
        const salt = Buffer.alloc(32).fill('fixed-salt-for-consistency-test');

        const result = Pbkdf2Service.deriveKeyFromPassword(
          password,
          salt,
          testCase.iterations,
        );

        // Results should be deterministic
        expect(result.hash).toBeInstanceOf(Buffer);
        expect(result.hash.length).toBe(32);
        expect(result.salt).toEqual(salt);
        expect(result.iterations).toBe(testCase.iterations);
      }
    });

    it('should handle edge case inputs', () => {
      const edgeCases = [
        Buffer.alloc(0), // Empty password
        Buffer.alloc(1, 0), // Single null byte
        Buffer.alloc(1000, 255), // Large password with max bytes
        Buffer.from([0, 1, 2, 3, 254, 255]), // Mixed binary data
      ];

      for (const password of edgeCases) {
        const result = Pbkdf2Service.deriveKeyFromPassword(
          password,
          undefined,
          1000,
        );

        expect(result.hash).toBeInstanceOf(Buffer);
        expect(result.salt).toBeInstanceOf(Buffer);
        expect(result.iterations).toBe(1000);
      }
    });
  });
});
