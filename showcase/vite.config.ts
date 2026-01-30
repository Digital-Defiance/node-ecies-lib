import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/node-ecies-lib/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
      requireReturnsDefault: 'auto',
    },
  },
  optimizeDeps: {
    include: [
      'tslib',
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/i18n-lib',
      '@ethereumjs/wallet',
      '@ethereumjs/util',
      '@ethereumjs/rlp',
      '@scure/base',
      'js-md5',
      '@noble/hashes',
      '@noble/hashes/sha256',
      '@noble/hashes/sha512',
      '@noble/hashes/hmac',
      '@noble/curves',
      '@noble/curves/secp256k1',
      '@scure/bip32',
      '@scure/bip39',
      'ethereum-cryptography',
      'ethereum-cryptography/secp256k1',
      'ethereum-cryptography/random',
      'ethereum-cryptography/utils',
      'bson',
      'uuid',
      'events',
    ],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
    force: true,
  },
  resolve: {
    alias: {
      events: 'events',
    },
    dedupe: [
      '@noble/hashes',
      '@noble/curves',
      '@scure/bip32',
      '@scure/bip39',
      '@scure/base',
      'ethereum-cryptography',
      '@ethereumjs/util',
      '@ethereumjs/wallet',
    ],
  },
  define: {
    // Required for some packages that check for Node.js environment
    global: 'globalThis',
  },
});
