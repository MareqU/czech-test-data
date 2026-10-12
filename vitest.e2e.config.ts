import { defineConfig } from 'vitest/config';

// End-to-end CLI tests: they spawn the built dist/cli.mjs, so `npm run build` must run first (docs/rules/cli.md §7).
export default defineConfig({
  test: {
    include: ['tests/**/*.e2e.test.ts'],
    update: 'none',
  },
});
