import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
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
