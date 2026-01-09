/**
 * Voting Security Validator
 * Enforces cryptographic security requirements
 * Extends ecies-lib VotingSecurityValidator
 */
import {
  VotingSecurityValidator as BaseVotingSecurityValidator,
  VOTING_SECURITY as BASE_VOTING_SECURITY,
} from '@digitaldefiance/ecies-lib';

// Re-export SecurityLevel from enumerations
export { SecurityLevel } from './enumerations';

// Re-export the VOTING_SECURITY constant from ecies-lib
export const VOTING_SECURITY = BASE_VOTING_SECURITY;

/**
 * Node.js VotingSecurityValidator that extends ecies-lib VotingSecurityValidator
 * No Buffer-specific changes needed as this class doesn't handle binary data
 */
export class VotingSecurityValidator extends BaseVotingSecurityValidator {
  // All methods are inherited from BaseVotingSecurityValidator
  // No overrides needed as this class doesn't use Buffer/Uint8Array
}
