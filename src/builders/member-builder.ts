import { Member } from '../member';
import { MemberType, EmailString, SecureString } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../services/ecies';
import { IBackendMemberWithMnemonic } from '../interfaces/member-with-mnemonic';
import { getNodeEciesI18nEngine } from '../i18n/node-ecies-i18n-setup';
import { NodeEciesComponentId, NodeEciesStringKey } from '../i18n/ecies-i18n-factory';

export class MemberBuilder {
  private eciesService?: ECIESService;
  private type?: MemberType;
  private name?: string;
  private email?: EmailString;
  private mnemonic?: SecureString;
  private createdBy?: Buffer;

  static create(): MemberBuilder {
    return new MemberBuilder();
  }

  withEciesService(service: ECIESService): this {
    this.eciesService = service;
    return this;
  }

  withType(type: MemberType): this {
    this.type = type;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withEmail(email: string | EmailString): this {
    this.email = typeof email === 'string' ? new EmailString(email) : email;
    return this;
  }

  withMnemonic(mnemonic: SecureString): this {
    this.mnemonic = mnemonic;
    return this;
  }

  withCreatedBy(creatorId: Buffer): this {
    this.createdBy = creatorId;
    return this;
  }

  generateMnemonic(): this {
    if (!this.eciesService) {
      const engine = getNodeEciesI18nEngine();
      throw new Error(engine.translate(NodeEciesComponentId, NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic));
    }
    this.mnemonic = this.eciesService.generateNewMnemonic();
    return this;
  }

  build(): IBackendMemberWithMnemonic {
    const engine = getNodeEciesI18nEngine();
    if (!this.eciesService) {
      throw new Error(engine.translate(NodeEciesComponentId, NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired));
    }
    if (!this.type || !this.name || !this.email) {
      throw new Error(engine.translate(NodeEciesComponentId, NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired));
    }
    
    return Member.newMember(
      this.eciesService,
      this.type,
      this.name,
      this.email,
      this.mnemonic,
      this.createdBy
    );
  }
}
