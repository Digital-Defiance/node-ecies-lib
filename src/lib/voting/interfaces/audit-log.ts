import type { AuditLog as BaseAuditLog } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Audit log interface for immutable audit trail.
 * Provides methods to query and verify audit entries.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type AuditLog<TID extends PlatformID = Buffer> = BaseAuditLog<TID>;
