// V2 Architecture exports
export * from './builders';
export * from './core';
export * from './lib';

// Existing exports (backward compatibility)
export * from './constants';
export * from './enumerations';
export * from './i18n';
export * from './interfaces';
export * from './member';
export * from './types';
export * from './secure-buffer';

// Services - explicit exports to avoid conflicts
export { AESGCMService } from './services/aes-gcm';
export { ChunkProcessor } from './services/chunk-processor';
export * from './services/ecies';
export { EncryptionStream } from './services/encryption-stream';
export { MultiRecipientProcessor } from './services/multi-recipient-processor';
export { Pbkdf2Service } from './services/pbkdf2';
export { ProgressTracker } from './services/progress-tracker';
export * from './services/voting.service';

// Isolated key classes for voting
export { IsolatedPublicKey } from './isolated-public';
export { IsolatedPrivateKey } from './isolated-private';

// Re-export Paillier types for voting functionality (optional peer dependency)
export type {
  PrivateKey,
  PublicKey,
  KeyPair as PaillierKeyPair,
} from 'paillier-bigint';

// Typed configuration system for strong typing with ID providers
export * from './typed-configuration';
