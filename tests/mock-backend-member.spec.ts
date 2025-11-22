import { EmailString, MemberType, SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { randomBytes } from 'crypto';
import { MockBackendMember } from '../src/test-mocks/mock-backend-member';

describe('MockBackendMember', () => {
  describe('constructor and getters', () => {
    it('should create with default values', () => {
      const member = new MockBackendMember();
      expect(member.id).toBeDefined();
      expect(member.id.constructor.name).toBe('Buffer');
      expect(Object.values(MemberType)).toContain(member.type);
      expect(member.name).toBeTruthy();
      expect(member.email).toBeInstanceOf(EmailString);
      expect(member.publicKey).toBeInstanceOf(Buffer);
      expect(member.creatorId).toBeDefined();
      expect(member.creatorId.constructor.name).toBe('Buffer');
      expect(member.dateCreated).toBeInstanceOf(Date);
      expect(member.dateUpdated).toBeInstanceOf(Date);
      expect(typeof member.hasPrivateKey).toBe('boolean');
    });

    it('should create with custom values', () => {
      const id = randomBytes(12);
      const email = new EmailString('test@example.com');
      const publicKey = Buffer.from('abcd', 'hex');
      const creatorId = randomBytes(12);
      const dateCreated = new Date('2024-01-01');
      const dateUpdated = new Date('2024-01-02');

      const member = new MockBackendMember({
        id,
        type: MemberType.User,
        name: 'Test User',
        email,
        publicKey,
        creatorId,
        dateCreated,
        dateUpdated,
        hasPrivateKey: false,
      });

      expect(member.id).toBe(id);
      expect(member.type).toBe(MemberType.User);
      expect(member.name).toBe('Test User');
      expect(member.email).toBe(email);
      expect(member.publicKey).toBe(publicKey);
      expect(member.creatorId).toBe(creatorId);
      expect(member.dateCreated).toBe(dateCreated);
      expect(member.dateUpdated).toBe(dateUpdated);
      expect(member.hasPrivateKey).toBe(false);
    });
  });

  describe('methods', () => {
    it('should call unloadPrivateKey without error', () => {
      const member = new MockBackendMember();
      expect(() => member.unloadPrivateKey()).not.toThrow();
    });

    it('should call unloadWallet without error', () => {
      const member = new MockBackendMember();
      expect(() => member.unloadWallet()).not.toThrow();
    });

    it('should call unloadWalletAndPrivateKey without error', () => {
      const member = new MockBackendMember();
      expect(() => member.unloadWalletAndPrivateKey()).not.toThrow();
    });

    it('should call loadWallet without error', () => {
      const member = new MockBackendMember();
      const mnemonic = new SecureString('test mnemonic phrase');
      expect(() => member.loadWallet(mnemonic)).not.toThrow();
    });

    it('should call loadPrivateKey without error', () => {
      const member = new MockBackendMember();
      const privateKey = new SecureBuffer(Buffer.from('abcd', 'hex'));
      expect(() => member.loadPrivateKey(privateKey)).not.toThrow();
    });

    it('should sign data', () => {
      const member = new MockBackendMember();
      const data = Buffer.from('test data');
      const signature = member.sign(data);
      expect(signature).toBeInstanceOf(Buffer);
    });

    it('should verify signature', () => {
      const member = new MockBackendMember();
      const data = Buffer.from('test data');
      const signature = member.sign(data);
      expect(member.verify(signature, data)).toBe(true);
    });

    it('should encrypt data with string', () => {
      const member = new MockBackendMember();
      const data = 'test data';
      const encrypted = member.encryptData(data);
      expect(encrypted).toBeInstanceOf(Buffer);
    });

    it('should encrypt data with buffer', () => {
      const member = new MockBackendMember();
      const data = Buffer.from('test data');
      const encrypted = member.encryptData(data);
      expect(encrypted).toBeInstanceOf(Buffer);
    });

    it('should decrypt data', () => {
      const member = new MockBackendMember();
      const encrypted = Buffer.from('abcd', 'hex');
      const decrypted = member.decryptData(encrypted);
      expect(decrypted).toBeInstanceOf(Buffer);
      expect(decrypted.length).toBeGreaterThan(0);
    });

    it('should convert to JSON', () => {
      const member = new MockBackendMember();
      const json = member.toJson();
      expect(json).toBeTruthy();
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeTruthy();
      expect(parsed.type).toBeTruthy();
      expect(parsed.name).toBeTruthy();
      expect(parsed.email).toBeTruthy();
      expect(parsed).toHaveProperty('publicKey');
    });

    it('should call dispose without error', () => {
      const member = new MockBackendMember();
      expect(() => member.dispose()).not.toThrow();
    });
  });

  describe('static factory methods', () => {
    it('should create with static create method', () => {
      const member = MockBackendMember.create();
      expect(member).toBeInstanceOf(MockBackendMember);
    });

    it('should create with overrides', () => {
      const member = MockBackendMember.create({ name: 'Custom Name' });
      expect(member.name).toBe('Custom Name');
    });

    it('should create multiple members', () => {
      const members = MockBackendMember.createMultiple(3);
      expect(members).toHaveLength(3);
      members.forEach(m => expect(m).toBeInstanceOf(MockBackendMember));
    });

    it('should create with private key', () => {
      const member = MockBackendMember.createWithPrivateKey();
      expect(member.hasPrivateKey).toBe(true);
      expect(member.privateKey).toBeDefined();
    });

    it('should create without private key', () => {
      const member = MockBackendMember.createWithoutPrivateKey();
      expect(member.hasPrivateKey).toBe(false);
      expect(member.privateKey).toBeUndefined();
    });
  });
});
