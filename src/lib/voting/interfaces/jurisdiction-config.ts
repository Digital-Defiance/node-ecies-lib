/**
 * Interface definitions for jurisdiction-config.
 */
import type { JurisdictionConfig as BaseJurisdictionConfig } from '@digitaldefiance/ecies-lib';

import type { PlatformID } from '../../../interfaces';

/**
 * Jurisdiction configuration for hierarchical aggregation.
 * Defines a jurisdiction's identity and position in the hierarchy.
 *
 * Node.js specialization with Buffer as the default platform ID type.
 */
export type JurisdictionConfig<TID extends PlatformID = Buffer> =
  BaseJurisdictionConfig<TID>;
