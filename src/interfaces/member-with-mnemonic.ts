import { SecureString } from '@digitaldefiance/ecies-lib';
import { Member } from '../member';

export interface IBackendMemberWithMnemonic {
  member: Member;
  mnemonic: SecureString;
}
