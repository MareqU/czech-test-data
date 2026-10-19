import { defineConfig } from 'vite';

// Relative base, so the built page works from any path (GitHub Pages serves it under /czech-test-data/).
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
