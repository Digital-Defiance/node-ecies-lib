/**
 * Full Module Load Integration Test
 * Tests that main index.ts can be imported without errors
 * Verifies all exports are defined
 * Verifies no runtime errors during initialization
 * Validates Requirements 1.3, 3.5, 4.5
 */

describe('Module Load Integration', () => {
  describe('12.1 Full module load test', () => {
    it('should import main index.ts without errors', () => {
      // This test verifies that importing the main module doesn't throw
      expect(() => {
        require('../../src/index');
      }).not.toThrow();
    });

    it('should have all core exports defined', () => {
      const eciesLib = require('../../src/index');

      // Core classes
      expect(eciesLib.Member).toBeDefined();
      expect(eciesLib.ECIESService).toBeDefined();

      // Services
      expect(eciesLib.AESGCMService).toBeDefined();
      expect(eciesLib.ChunkProcessor).toBeDefined();
      expect(eciesLib.EncryptionStream).toBeDefined();
      expect(eciesLib.MultiRecipientProcessor).toBeDefined();
      expect(eciesLib.Pbkdf2Service).toBeDefined();
      expect(eciesLib.ProgressTracker).toBeDefined();

      // Builders
      expect(eciesLib.MemberBuilder).toBeDefined();
    });

    it('should have all interface types exported', () => {
      const eciesLib = require('../../src/index');

      // These are type exports, so we can't check them at runtime
      // But we can verify the module loads without errors
      expect(eciesLib).toBeDefined();
    });

    it('should initialize constants without errors', () => {
      const { Constants } = require('../../src/index');

      expect(Constants).toBeDefined();
      expect(Constants.MEMBER_ID_LENGTH).toBeDefined();
      expect(Constants.idProvider).toBeDefined();
      expect(Constants.ECIES).toBeDefined();
    });

    it('should create service instances without errors', () => {
      const {
        ECIESService,
        Pbkdf2Service,
        AESGCMService,
        ChunkProcessor,
        ProgressTracker,
      } = require('../../src/index');

      expect(() => new ECIESService()).not.toThrow();
      expect(() => new Pbkdf2Service()).not.toThrow();
      expect(() => new AESGCMService()).not.toThrow();
      expect(() => new ChunkProcessor()).not.toThrow();
      expect(() => new ProgressTracker()).not.toThrow();
    });

    it('should create Member using builder without errors', () => {
      const { MemberBuilder } = require('../../src/index');
      const { MemberType, EmailString } = require('@digitaldefiance/ecies-lib');

      const { member, mnemonic } = MemberBuilder.newMember(
        MemberType.User,
        'Test User',
        new EmailString('test@example.com'),
      );

      expect(member).toBeDefined();
      expect(member.name).toBe('Test User');
      expect(mnemonic).toBeDefined();

      member.dispose();
      mnemonic.dispose();
    });

    it('should verify no circular dependency errors during initialization', () => {
      // Clear module cache to test fresh initialization
      jest.resetModules();

      // Track any errors during module loading
      const errors: Error[] = [];
      const originalConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        if (args[0] instanceof Error) {
          errors.push(args[0]);
        }
      };

      try {
        // Import the main module
        require('../../src/index');

        // Should have no errors
        expect(errors).toHaveLength(0);
      } finally {
        // Restore console.error
        console.error = originalConsoleError;
      }
    });

    it('should verify all exports are accessible', () => {
      const eciesLib = require('../../src/index');

      // Get all exported names
      const exportNames = Object.keys(eciesLib);

      // Should have a reasonable number of exports
      expect(exportNames.length).toBeGreaterThan(20);

      // Verify no undefined exports
      const undefinedExports = exportNames.filter(
        (name) => eciesLib[name] === undefined,
      );
      expect(undefinedExports).toHaveLength(0);
    });

    it('should verify enumerations are accessible', () => {
      const { MemberType } = require('@digitaldefiance/ecies-lib');

      expect(MemberType.User).toBeDefined();
      expect(MemberType.System).toBeDefined();
    });

    it('should verify constants registry works correctly', () => {
      const { Constants } = require('../../src/index');
      const { ConstantsRegistry } = require('@digitaldefiance/ecies-lib');

      // Should be able to access default constants
      expect(Constants.MEMBER_ID_LENGTH).toBeDefined();

      // Should be able to access registry
      expect(ConstantsRegistry).toBeDefined();
    });

    it('should verify services can be instantiated and used', () => {
      const { ECIESService } = require('../../src/index');

      const service = new ECIESService();
      const mnemonic = service.generateNewMnemonic();

      expect(mnemonic).toBeDefined();
      expect(mnemonic.value).toBeDefined();

      mnemonic.dispose();
    });

    it('should verify multi-recipient processor can be created', () => {
      const {
        MultiRecipientProcessor,
        ECIESService,
      } = require('../../src/index');

      const eciesService = new ECIESService();
      const processor = new MultiRecipientProcessor(eciesService);

      expect(processor).toBeDefined();
    });

    it('should verify encryption stream can be created', () => {
      const { EncryptionStream, ECIESService } = require('../../src/index');

      const eciesService = new ECIESService();
      const stream = new EncryptionStream(eciesService);

      expect(stream).toBeDefined();
    });
  });
});
