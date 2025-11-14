import { ECIESBuilder } from '../src/builders/ecies-builder';
import { MemberBuilder } from '../src/builders/member-builder';
import { ECIESService } from '../src/services/ecies';
import { Constants } from '../src/constants';
import { EmailString, MemberType } from '@digitaldefiance/ecies-lib';

describe('ECIESBuilder', () => {
  it('should create builder instance', () => {
    const builder = ECIESBuilder.create();
    expect(builder).toBeInstanceOf(ECIESBuilder);
  });

  it('should build ECIESService with default constants', () => {
    const service = ECIESBuilder.create().build();
    expect(service).toBeInstanceOf(ECIESService);
  });

  it('should build ECIESService with custom constants', () => {
    const customConstants = { ...Constants.ECIES, symmetricKeyBits: 128 };
    const service = ECIESBuilder.create()
      .withConstants(customConstants)
      .build();
    expect(service).toBeInstanceOf(ECIESService);
  });
});

describe('MemberBuilder', () => {
  it('should create builder instance', () => {
    const builder = MemberBuilder.create();
    expect(builder).toBeInstanceOf(MemberBuilder);
  });

  it('should build member with required fields', () => {
    const ecies = new ECIESService();
    const result = MemberBuilder.create()
      .withEciesService(ecies)
      .withType(MemberType.User)
      .withName('Test User')
      .withEmail('test@example.com')
      .build();
    
    expect(result).toBeDefined();
    expect(result.member).toBeDefined();
    expect(result.member.name).toBe('Test User');
    expect(result.member.type).toBe(MemberType.User);
    expect(result.mnemonic).toBeDefined();
  });

  it('should build member with EmailString', () => {
    const ecies = new ECIESService();
    const email = new EmailString('test@example.com');
    const result = MemberBuilder.create()
      .withEciesService(ecies)
      .withType(MemberType.Admin)
      .withName('Admin User')
      .withEmail(email)
      .build();
    
    expect(result).toBeDefined();
    expect(result.member.email).toEqual(email);
  });

  it('should build member with custom ECIES service', () => {
    const ecies = new ECIESService();
    const result = MemberBuilder.create()
      .withType(MemberType.System)
      .withName('System User')
      .withEmail('system@example.com')
      .withEciesService(ecies)
      .build();
    
    expect(result).toBeDefined();
    expect(result.member).toBeDefined();
  });

  it('should throw error when type is missing', () => {
    const ecies = new ECIESService();
    expect(() => {
      MemberBuilder.create()
        .withEciesService(ecies)
        .withName('Test')
        .withEmail('test@example.com')
        .build();
    }).toThrow('Type, name, and email are required');
  });

  it('should throw error when name is missing', () => {
    const ecies = new ECIESService();
    expect(() => {
      MemberBuilder.create()
        .withEciesService(ecies)
        .withType(MemberType.User)
        .withEmail('test@example.com')
        .build();
    }).toThrow('Type, name, and email are required');
  });

  it('should throw error when email is missing', () => {
    const ecies = new ECIESService();
    expect(() => {
      MemberBuilder.create()
        .withEciesService(ecies)
        .withType(MemberType.User)
        .withName('Test')
        .build();
    }).toThrow('Type, name, and email are required');
  });
});
