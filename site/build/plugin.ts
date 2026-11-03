// Vite plugin: writes the generated pages (build/pages.ts) into site/ and hands them to Vite as inputs, so the dev
// server serves /ico/ etc. and the build emits dist/ico/index.html. It also writes public/llms.txt (build/llms.ts),
// public/sitemap.xml and public/robots.txt.
// The written files are in .gitignore.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { renderLlms } from './llms.js';
import { renderPages, renderRobots, renderSitemap } from './pages.js';

export function pages(root: string): Plugin {
  const all = renderPages();
  for (const page of all) {
    const file = resolve(root, page.path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page.html);
  }
  // public/ is copied to the root of dist/ and served by the dev server as is.
  mkdirSync(resolve(root, 'public'), { recursive: true });
  writeFileSync(resolve(root, 'public/llms.txt'), renderLlms());
  writeFileSync(resolve(root, 'public/sitemap.xml'), renderSitemap(all));
  writeFileSync(resolve(root, 'public/robots.txt'), renderRobots());
  return {
    name: 'czech-test-data-pages',
    config: () => ({
      build: { rollupOptions: { input: Object.fromEntries(all.map((page) => [page.name, resolve(root, page.path)])) } },
    }),
  };
}
