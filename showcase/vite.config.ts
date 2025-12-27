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
    rollupOptions: {
      // Ensure these are bundled, not externalized
      external: [],
    },
  },
  optimizeDeps: {
    include: [
      '@digitaldefiance/ecies-lib',
      '@digitaldefiance/i18n-lib',
      '@ethereumjs/wallet',
      '@noble/curves',
      '@noble/hashes',
      '@scure/bip32',
      '@scure/bip39',
      'bson',
      'currency-codes',
      'lru-cache',
      'moment',
      'moment-timezone',
      'ts-brand',
      'tslib',
      'uuid',
      'validator',
    ],
    esbuildOptions: {
      mainFields: ['module', 'main'],
    },
    force: true,
  },
  resolve: {
    dedupe: ['tslib', '@noble/hashes', '@noble/curves', '@scure/bip32'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  define: {
    global: 'globalThis',
  },
});
