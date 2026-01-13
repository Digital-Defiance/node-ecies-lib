/**
 * Interface definitions for pbkdf2-result.
 */
export interface IPbkdf2Result {
  salt: Buffer;
  hash: Buffer;
  iterations: number;
}
