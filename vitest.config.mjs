import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/**/*.test.mjs', 'utils/**/*.test.mjs'],
  },
});
