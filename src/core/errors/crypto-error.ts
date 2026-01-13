/**
 * Unified error class for all crypto operations.
 * Provides consistent error handling across the library.
 */
export class CryptoError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}
