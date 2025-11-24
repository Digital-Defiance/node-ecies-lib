import type { SecureString } from '@digitaldefiance/ecies-lib';
import type { Member } from '../member';

export interface IBackendMemberWithMnemonic {
  member: Member;
  mnemonic: SecureString;
}
