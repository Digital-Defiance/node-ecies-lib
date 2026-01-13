/**
 * PBKDF2 profile enumeration.
 * Defines different security profiles for password-based key derivation.
 */
export enum Pbkdf2ProfileEnum {
  USER_LOGIN = 'USER_LOGIN',
  KEY_WRAPPING = 'KEY_WRAPPING',
  BACKUP_CODES = 'BACKUP_CODES',
  HIGH_SECURITY = 'HIGH_SECURITY',
  BROWSER_PASSWORD = 'BROWSER_PASSWORD',
  TEST_FAST = 'TEST_FAST',
}
