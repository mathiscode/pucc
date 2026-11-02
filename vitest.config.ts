import { defineConfig } from 'vitest/config';
import { packageJson } from './config/shared.mjs';

export default defineConfig({
  define: { __PUCC_VERSION__: JSON.stringify(packageJson.version) },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
