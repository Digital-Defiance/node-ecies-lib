import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';

import { getLazyNodeEciesTranslation } from '../i18n';
import type { NodeEciesStringKeyValue } from '../i18n';

export class TranslatableNodeEciesError extends Error {
  constructor(
    public readonly error: NodeEciesStringKeyValue,
    public readonly params?: Record<string, string | number>,
    public readonly language?: CoreLanguageCode,
  ) {
    const message = getLazyNodeEciesTranslation(error, params, language);
    super(message);
    this.name = 'TranslatableNodeEciesError';
    Object.setPrototypeOf(this, TranslatableNodeEciesError.prototype);
  }
}
