/**
 * Interface definitions for audit-entry.
 */
import type { AuditEntry as BaseAuditEntry } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Audit entry for immutable audit log.
 * Contains event data with cryptographic chain integrity.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type AuditEntry<TID extends PlatformID = Buffer> = BaseAuditEntry<TID>;
