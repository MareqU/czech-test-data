// The page promises that a link, the code snippet and the CLI snippet all give the values it shows.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCz } from 'czech-test-data';
import { describe, expect, it } from 'vitest';
import { IDENTIFIERS } from '../src/catalog.js';
import { generateRows, validateLines } from '../src/generate.js';
import type { Row } from '../src/generate.js';
import { codeSnippet, cliSnippet } from '../src/snippet.js';
import { parseState, serializeState } from '../src/state.js';
import type { State } from '../src/state.js';

const DEFAULTS = { seed: 7, referenceDate: '2026-10-19' };
const CLI = fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url));
const CACHE = fileURLToPath(new URL('../node_modules/.cache/snippets/', import.meta.url));
mkdirSync(CACHE, { recursive: true });

function state(patch: Partial<State>): State {
  return { ...parseState('', DEFAULTS), ...patch };
}

function rowsOf(s: State): readonly Row[] {
  const outcome = generateRows(s);
  if ('error' in outcome) {
    throw new Error(outcome.error);
  }
  return outcome.rows;
}

/**
 * Runs the code snippet as a module with Node, import line included: the last statement is printed as JSON.
 * The file lives in node_modules/.cache, so `czech-test-data` resolves as for a user of the package.
 */
function runCode(snippet: string, name: string): string[] {
  const lines = snippet.split('\n');
  const last = (lines.pop() ?? '').replace(/;$/u, '');
  const file = join(CACHE, `${name.replaceAll(/\W+/gu, '-')}.mjs`);
  writeFileSync(file, `${lines.join('\n')}\nconsole.log(JSON.stringify([${last}].flat()));\n`);
  const output: unknown = JSON.parse(execFileSync('node', [file], { encoding: 'utf8' }));
  return Array.isArray(output) ? output.map(String) : [];
}

/** Runs the CLI snippet against the built dist/cli.mjs (the words need no shell quoting in these cases). */
function runCli(snippet: string): string[] {
  const args = snippet.split(' ').slice(2);
  return execFileSync('node', [CLI, ...args], { encoding: 'utf8' }).trimEnd().split('\n');
}

const CASES: readonly [string, Partial<State>][] = [
  ['valid with options', { id: 'birthNumber', count: 3, options: { gender: 'female', birthDate: '1990-05-01' } }],
  ['valid with a checkbox', { id: 'bankAccount', count: 2, options: { bankCode: '0800', withPrefix: 'true' } }],
  ['one valid value', { id: 'ico', count: 1 }],
  ['all edge variants', { id: 'iban', mode: 'edge', variant: 'all', count: 2 }],
  ['all invalid variants, one each', { id: 'phone', mode: 'invalid', variant: 'all', count: 1 }],
  ['a named variant', { id: 'dic', mode: 'invalid', variant: 'foreignPrefix', count: 3 }],
  ['a random variant', { id: 'eic', mode: 'edge', variant: 'random', count: 4 }],
  ['excluded options are ignored', { id: 'dic', count: 2, options: { from: 'ico', gender: 'male' } }],
];

describe('snippets reproduce the page', () => {
  it.each(CASES)('code: %s', (name, patch) => {
    const s = state(patch);
    expect(runCode(codeSnippet(s), name)).toEqual(rowsOf(s).map((row) => row.value));
  });

  it.each(CASES)('CLI: %s', (_, patch) => {
    const s = state(patch);
    expect(runCli(cliSnippet(s))).toEqual(rowsOf(s).map((row) => row.value));
  });
});

describe('rows', () => {
  it('every edge value is valid and every invalid value fails with its variant name', () => {
    for (const info of IDENTIFIERS) {
      for (const row of rowsOf(state({ id: info.id, mode: 'edge', variant: 'all', count: 3 }))) {
        expect(row).toMatchObject({ valid: true });
      }
      for (const row of rowsOf(state({ id: info.id, mode: 'invalid', variant: 'all', count: 3 }))) {
        expect(row).toMatchObject({ valid: false, reason: row.variant });
      }
    }
  });

  it('a library error is reported, not thrown', () => {
    expect(generateRows(state({ id: 'bankAccount', options: { bankCode: '9999' } }))).toHaveProperty('error');
  });

  it('validates lines without trimming them', () => {
    expect(validateLines(state({ id: 'ico' }), '25596641\n\n 25596641\r\n')).toEqual([
      { value: '25596641', valid: true },
      { value: ' 25596641', valid: false, reason: 'badFormat' },
    ]);
  });
});

describe('catalog', () => {
  it('describes every variant the library has, in the same order', () => {
    const cz = createCz({ seed: 1 });
    for (const info of IDENTIFIERS) {
      expect(Object.keys(info.edge)).toEqual(cz[info.id].edgeVariants);
      expect(Object.keys(info.invalid)).toEqual(cz[info.id].invalidVariants);
      expect(Object.keys(info.reasons)).toEqual(expect.arrayContaining(Object.keys(info.invalid)));
    }
  });

  it('has a valid sample for every identifier', () => {
    const cz = createCz({ seed: 1 });
    for (const info of IDENTIFIERS) {
      expect(cz.validate[info.id](info.sample)).toEqual({ valid: true });
    }
  });
});

describe('URL state', () => {
  it('reads back what it writes', () => {
    const s = state({ id: 'iban', count: 12, seed: 4294967295, options: { account: '19-2000145399/0800' } });
    expect(parseState(serializeState(s), DEFAULTS)).toEqual(s);
    const edge = state({ id: 'birthNumber', mode: 'edge', variant: 'month+20' });
    expect(parseState(serializeState(edge), DEFAULTS)).toEqual(edge);
  });

  it('falls back to defaults for malformed values', () => {
    const s = parseState('?id=nope&mode=x&variant=zzz&n=500&seed=-1&date=yesterday&gender=female', DEFAULTS);
    expect(s).toEqual({
      id: 'birthNumber',
      mode: 'valid',
      variant: 'all',
      count: 5,
      seed: 7,
      referenceDate: '2026-10-19',
      options: { gender: 'female' },
    });
  });

  it('drops a variant that does not exist for the identifier', () => {
    expect(parseState('?id=ico&mode=invalid&variant=futureDate', DEFAULTS).variant).toBe('all');
  });
});
