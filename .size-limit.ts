// Size budget from docs/spec.md (min+gzip, ESM), variant B decided by Marek on 2026-10-05:
// - the shared core (src/core/) is budgeted once;
// - each identifier is budgeted by what it adds on top of the core, so the numbers stay comparable;
//   amended 2026-10-07 (docs/rules/dic.md decision 1): that budget counts the identifier's own code (other
//   identifiers it reuses are external too), and a reusing identifier also gets a standalone budget;
// - the whole published library keeps its overall budget.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { SizeLimitConfig } from 'size-limit';

interface PackageJson {
  exports: Record<string, string | { import: string }>;
}

const { exports } = JSON.parse(readFileSync('./package.json', 'utf8')) as PackageJson;

// Measured from source: the built bundle merges core and identifiers into shared chunks. One generated
// entry re-exports every core module, so the core is measured as one bundle (as an identifier sees it)
// and a new core module cannot be forgotten.
const coreEntry = join(tmpdir(), 'czech-test-data-size-core.ts');
writeFileSync(
  coreEntry,
  readdirSync('src/core')
    .filter((file) => file.endsWith('.ts'))
    .map((file) => `export * from ${JSON.stringify(resolve('src/core', file))};\n`)
    .join(''),
);

// Every identifier subpath export (e.g. "./ico") gets the per-identifier budget.
// Optional data subpaths (e.g. "./data/postal-codes") are not part of the core budget.
const ids = Object.keys(exports)
  .filter((key) => key !== '.' && key !== './package.json' && !key.startsWith('./data/'))
  .map((key) => key.slice(2));

// Identifiers that reuse other identifiers: what importing their subpath alone costs on top of the core.
const standaloneLimits = new Map([['dic', '3 kB']]);

const identifiers: SizeLimitConfig = ids.flatMap((id) => {
  const ownCode = {
    name: `identifier ${id} (own code, on top of core)`,
    path: `src/${id}/index.ts`,
    import: '*',
    // Identifier modules import the core as ../core/<module>.js and reused identifiers as ../<id>/<module>.js;
    // keeping both external leaves only the identifier's own code in the measurement.
    ignore: ['../core', ...ids.filter((other) => other !== id).map((other) => `../${other}`)],
    limit: '2 kB',
    gzip: true,
  };
  const standalone = standaloneLimits.get(id);
  return standalone === undefined
    ? [ownCode]
    : [ownCode, { ...ownCode, name: `identifier ${id} (standalone, on top of core)`, ignore: ['../core'], limit: standalone }];
});

export default [
  { name: 'whole library', path: 'dist/index.js', import: '*', limit: '10 kB', gzip: true },
  { name: 'core', path: coreEntry, import: '*', limit: '2 kB', gzip: true },
  ...identifiers,
] satisfies SizeLimitConfig;
