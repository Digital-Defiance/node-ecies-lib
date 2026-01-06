import type { SecureString } from '@digitaldefiance/ecies-lib';

import type { IMember } from './member';
import type { PlatformID } from './platform-id';

export interface IBackendMemberWithMnemonic<TID extends PlatformID = Buffer> {
  member: IMember<TID>;
  mnemonic: SecureString;
}
