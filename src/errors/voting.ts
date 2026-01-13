/**
 * Voting error class for Node.js ECIES library.
 * Provides internationalized error messages for voting system operations including
 * key derivation, prime generation, key pair validation, serialization, and instance isolation.
 */
import {
  buildReasonMap,
  HandleableErrorOptions,
  TypedHandleableError,
} from '@digitaldefiance/i18n-lib';

import { VotingErrorType } from '../enumerations/voting-error-type';
import { EciesComponentId } from '../i18n-setup';

/**
 * Error class for voting-related operations.
 * Provides detailed error information for debugging and user feedback.
 */
export class VotingError extends TypedHandleableError<
  typeof VotingErrorType,
  string
> {
  /**
   * Create a new VotingError
   * @param type - The type of error that occurred
   * @param options - Optional error configuration
   * @param replacements - Optional replacement values for error message placeholders
   */
  constructor(
    type: VotingErrorType,
    options?: HandleableErrorOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _replacements?: Record<string, string | number>,
  ) {
    const source =
      options?.cause instanceof Error ? options.cause : new Error();
    super(
      EciesComponentId,
      type,
      buildReasonMap(VotingErrorType, ['Error', 'VotingError']),
      source,
      options,
      undefined,
    );
    this.name = 'VotingError';
  }
}
