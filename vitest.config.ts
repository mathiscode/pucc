import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __PUCC_AUTO_INIT__: JSON.stringify('false'),
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
