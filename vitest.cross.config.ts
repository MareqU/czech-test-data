import { defineConfig } from 'vitest/config';

// Cross-check against independent npm validators (docs/spec.md, "Křížová kontrola"): `npm run test:cross`.
// Kept out of `npm test`, because a new version of another library may disagree and needs a human to investigate.
export default defineConfig({
  test: {
    include: ['tests/**/*.cross.test.ts'],
    update: 'none',
  },
});
