import { defineConfig } from 'vite';
import { pages } from './build/plugin.js';

// Relative base, so the built pages work from any path (GitHub Pages serves them under /czech-test-data/).
// `mpa`: every page is its own HTML file; an unknown path is a 404, not the home page.
export default defineConfig({
  base: './',
  appType: 'mpa',
  plugins: [pages(import.meta.dirname)],
  build: { target: 'es2022' },
});
