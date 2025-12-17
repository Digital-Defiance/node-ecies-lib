import type { SecureString } from '@digitaldefiance/ecies-lib';

import type { IMember } from './member';

export interface IBackendMemberWithMnemonic {
  member: IMember;
  mnemonic: SecureString;
}
