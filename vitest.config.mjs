import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts', 'shared/**/*.test.mjs', 'utils/**/*.test.mjs'],
  },
});
