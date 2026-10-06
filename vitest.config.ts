import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Never write new snapshots implicitly (Vitest does outside CI by default). Pinned values are filled
    // on purpose with `vitest -u` and reviewed, so an agent run cannot record its own output as expected.
    update: 'none',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        // Validators hide the edge cases, so they must have full branch coverage (docs/spec.md).
        'src/**/validate*.ts': { branches: 100 },
      },
    },
  },
});
