/**
 * Result type for better error handling.
 * Provides a type-safe way to return either success with data or failure with error.
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
