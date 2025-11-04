import { Member } from '../member';
import { MemberType, EmailString } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '../services/ecies';
import { IBackendMemberWithMnemonic } from '../interfaces/member-with-mnemonic';

export class MemberBuilder {
  private type?: MemberType;
  private name?: string;
  private email?: EmailString;
  private ecies?: ECIESService;

  static create(): MemberBuilder {
    return new MemberBuilder();
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

  withECIES(ecies: ECIESService): this {
    this.ecies = ecies;
    return this;
  }

  build(): IBackendMemberWithMnemonic {
    if (!this.type || !this.name || !this.email) {
      throw new Error('Member requires type, name, and email');
    }
    return Member.newMember(
      this.ecies || new ECIESService(),
      this.type,
      this.name,
      this.email
    );
  }
}
