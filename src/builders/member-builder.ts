import {
  EmailString,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';

import {
  NodeEciesComponentId,
  NodeEciesStringKey,
} from '../i18n/ecies-i18n-factory';
import { getNodeEciesI18nEngine } from '../i18n/node-ecies-i18n-setup';
import { IBackendMemberWithMnemonic } from '../interfaces/member-with-mnemonic';
import { PlatformID } from '../interfaces';
import { Member } from '../member';
import { ECIESService } from '../services/ecies';

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
      throw new Error(
        engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Builder_ECIESServiceMustBeSetBeforeGeneratingMnemonic,
        ),
      );
    }
    this.mnemonic = this.eciesService.generateNewMnemonic();
    return this;
  }

  build(): IBackendMemberWithMnemonic {
    const engine = getNodeEciesI18nEngine();
    if (!this.eciesService) {
      throw new Error(
        engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Builder_ECIESServiceIsRequired,
        ),
      );
    }
    if (!this.type || !this.name || !this.email) {
      throw new Error(
        engine.translate(
          NodeEciesComponentId,
          NodeEciesStringKey.Error_Builder_TypeNameAndEmailAreRequired,
        ),
      );
    }

    return Member.newMember(
      this.eciesService,
      this.type,
      this.name,
      this.email,
      this.mnemonic,
      this.createdBy,
    );
  }

  /**
   * Convenience factory method to create a new member with default ECIESService
   * @param type - The member type
   * @param name - The member name
   * @param email - The member email
   * @param forceMnemonic - Optional mnemonic to use instead of generating a new one
   * @param createdBy - Optional creator ID
   * @returns Member with mnemonic
   */
  static newMember(
    type: MemberType,
    name: string,
    email: EmailString | string,
    forceMnemonic?: SecureString,
    createdBy?: Buffer,
  ): IBackendMemberWithMnemonic {
    const service = new ECIESService();
    const emailObj = typeof email === 'string' ? new EmailString(email) : email;

    return Member.newMember(
      service,
      type,
      name,
      emailObj,
      forceMnemonic,
      createdBy,
    );
  }

  /**
   * Convenience factory method to create a member from JSON with default ECIESService
   * @param json - JSON string representation of member
   * @returns Member instance
   */
  static fromJson<TID extends PlatformID = Buffer>(json: string): Member<TID> {
    const service = new ECIESService();
    return Member.fromJson(json, service) as Member<TID>;
  }

  /**
   * Convenience factory method to create a member from mnemonic with default ECIESService
   * @param mnemonic - The mnemonic to use
   * @param memberType - Optional member type (defaults to MemberType.User)
   * @param name - Optional member name (defaults to 'Test User')
   * @param email - Optional member email (defaults to 'test@example.com')
   * @returns Member instance
   */
  static fromMnemonic<TID extends PlatformID = Buffer>(
    mnemonic: SecureString,
    memberType = MemberType.User,
    name = 'Test User',
    email: EmailString | string = 'test@example.com',
  ): Member<TID> {
    const service = new ECIESService();
    const emailObj = typeof email === 'string' ? new EmailString(email) : email;

    return Member.fromMnemonic(mnemonic, service, memberType, name, emailObj) as Member<TID>;
  }
}
