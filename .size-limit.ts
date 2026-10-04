// Size budget from docs/spec.md (min+gzip, ESM). Revisit the numbers after M1.
import { readFileSync } from 'node:fs';
import type { SizeLimitConfig } from 'size-limit';

interface PackageJson {
  exports: Record<string, string | { import: string }>;
}

const { exports } = JSON.parse(readFileSync('./package.json', 'utf8')) as PackageJson;

// Every identifier subpath export (e.g. "./ico") gets the per-identifier budget.
// Optional data subpaths (e.g. "./data/postal-codes") are not part of the core budget.
const identifiers: SizeLimitConfig = Object.entries(exports)
  .filter(([key]) => key !== '.' && key !== './package.json' && !key.startsWith('./data/'))
  .map(([key, target]) => ({
    name: `identifier ${key.slice(2)}`,
    path: typeof target === 'string' ? target : target.import,
    limit: '2 kB',
    gzip: true,
  }));

export default [
  { name: 'whole library', path: 'dist/index.js', import: '*', limit: '10 kB', gzip: true },
  ...identifiers,
] satisfies SizeLimitConfig;
