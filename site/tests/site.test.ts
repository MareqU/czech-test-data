// The page promises that a link, the code snippet and the CLI snippet all give the values it shows.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCz } from 'czech-test-data';
import { describe, expect, it } from 'vitest';
import { LLMS_COMMANDS, renderLlms } from '../build/llms.js';
import { cellHtml, escapeHtml, renderPages, renderRobots, renderSitemap, SITE, USAGE } from '../build/pages.js';
import { IDENTIFIERS } from '../src/catalog.js';
import { generateRows, validateLines } from '../src/generate.js';
import type { Row } from '../src/generate.js';
import { buildKit, csvValue, kitFileName, toCsv, toJson, toTsv } from '../src/kit.js';
import type { KitRow } from '../src/kit.js';
import { buildOverview } from '../src/overview.js';
import { codeSnippet, cliSnippet, oneCall } from '../src/snippet.js';
import { cz, czHtml } from '../src/typography.js';
import { parseState, serializeState, variantPosition } from '../src/state.js';
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

describe('one call under the big value', () => {
  it('names the shown variant, or the options of a valid value', () => {
    expect(oneCall(state({ id: 'birthNumber', options: { gender: 'female' } }), undefined)).toBe("cz.birthNumber({ gender: 'female' })");
    expect(oneCall(state({ id: 'ico' }), undefined)).toBe('cz.ico()');
    expect(oneCall(state({ id: 'ico', mode: 'invalid', variant: 'all' }), 'badChecksum')).toBe("cz.ico.invalid('badChecksum')");
    expect(oneCall(state({ id: 'eic', mode: 'edge', variant: 'random' }), undefined)).toBe('cz.eic.edge()');
  });

  it.each([
    ['valid', { id: 'bankAccount', options: { bankCode: '0800', withPrefix: 'true' } }, undefined, true],
    ['edge', { id: 'phone', mode: 'edge' }, 'newMobileRange', true],
    ['invalid', { id: 'dic', mode: 'invalid' }, 'foreignPrefix', false],
  ] as const)('runs in the library: %s', (name, patch, variant, valid) => {
    const s = state(patch);
    const [value = ''] = runCode(`import { createCz } from 'czech-test-data';\nconst cz = createCz();\n${oneCall(s, variant)};`, `one-${name}`);
    expect(createCz().validate[s.id](value).valid).toBe(valid);
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

describe('variant counter', () => {
  it('counts variants only while walking through all of them', () => {
    expect(variantPosition(state({ id: 'ico', mode: 'invalid', variant: 'all', count: 1, index: 1 }), 3)).toBe('varianta 2 z 3');
    expect(variantPosition(state({ id: 'ico', mode: 'edge', variant: 'all', count: 1, index: 0 }), 3)).toBe('varianta 1 z 3');
  });

  it('counts variants, not values, when each variant has several values', () => {
    const s = state({ id: 'birthNumber', mode: 'edge', variant: 'all', count: 2 });
    expect(variantPosition({ ...s, index: 0 }, 12)).toBe('varianta 1 z 6');
    expect(variantPosition({ ...s, index: 1 }, 12)).toBe('varianta 1 z 6');
    expect(variantPosition({ ...s, index: 2 }, 12)).toBe('varianta 2 z 6');
    expect(variantPosition({ ...s, index: 11 }, 12)).toBe('varianta 6 z 6');
  });

  it('shows nothing for valid values or one chosen variant', () => {
    expect(variantPosition(state({ id: 'ico', mode: 'valid', count: 5, index: 2 }), 5)).toBe('');
    expect(variantPosition(state({ id: 'ico', mode: 'invalid', variant: 'letters', count: 3 }), 3)).toBe('');
    expect(variantPosition(state({ id: 'ico', mode: 'invalid', variant: 'all' }), 0)).toBe('');
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
      index: 0,
      kit: false,
      seed: 7,
      referenceDate: '2026-10-19',
      options: { gender: 'female' },
    });
  });

  it('takes the identifier from the page and leaves it out of the URL there', () => {
    const s = parseState('?id=ico&mode=edge&i=3', DEFAULTS, 'iban');
    expect(s).toMatchObject({ id: 'iban', mode: 'edge', count: 1, index: 3 });
    expect(serializeState(s, false)).not.toContain('id=');
    expect(parseState(serializeState(s, false), DEFAULTS, 'iban')).toEqual(s);
  });

  it('drops a variant that does not exist for the identifier', () => {
    expect(parseState('?id=ico&mode=invalid&variant=futureDate', DEFAULTS).variant).toBe('all');
  });
});

describe('pages', () => {
  const pages = renderPages();

  it('has the home page and one page per identifier, each in its own directory', () => {
    expect(pages.map((page) => page.path)).toEqual(['index.html', ...IDENTIFIERS.map((info) => `${info.slug}/index.html`)]);
  });

  it.each(pages.map((page) => [page.path, page] as const))('%s has its title, h1 and description in the HTML', (_, page) => {
    expect(page.html).toContain(`<title>${cz(page.title)}</title>`);
    expect(page.html).toContain(`<h1>${cz(page.h1)}</h1>`);
    expect(page.html).toMatch(/<meta name="description" content="[^"]{50,}" \/>/u);
  });

  it('shows the library on the home page with an install command and a usage example that runs', () => {
    const home = pages.find((page) => page.path === 'index.html')?.html ?? '';
    expect(home).toContain('npm install --save-dev czech-test-data');
    expect(home).toContain(escapeHtml(USAGE));
    const call = /cz\.ico\.edge\('(\w+)'\)/u.exec(USAGE)?.[1] ?? '';
    expect(createCz().ico.edgeVariants).toContain(call);
  });

  it('links to npm from the header of every page', () => {
    for (const page of pages) {
      expect(page.html).toMatch(/<header[\s\S]*href="https:\/\/www\.npmjs\.com\/package\/czech-test-data"[\s\S]*<\/header>/u);
    }
  });

  it('gives every identifier page its identifier and a distinct title', () => {
    for (const info of IDENTIFIERS) {
      const page = pages.find((candidate) => candidate.path === `${info.slug}/index.html`);
      expect(page?.html).toContain(`<body data-id="${info.id}">`);
    }
    expect(new Set(pages.map((page) => page.title)).size).toBe(pages.length);
  });

  it('links only to pages that exist, relative to the page', () => {
    const paths = new Set(pages.map((page) => page.path));
    for (const page of pages) {
      const root = page.path === 'index.html' ? './' : '../';
      for (const [, href = ''] of page.html.matchAll(/href="(\.{1,2}\/[^"?#]*)/gu)) {
        expect(href.startsWith(root), `${page.path}: ${href}`).toBe(true);
        // Besides the pages there is one generated file: /llms.txt (build/llms.ts).
        const target = href.endsWith('.txt') ? href.slice(root.length) : `${href.slice(root.length)}index.html`;
        if (target === 'llms.txt') {
          continue;
        }
        expect(paths.has(target), `${page.path}: ${href}`).toBe(true);
      }
    }
  });
});

describe('site address', () => {
  const pages = renderPages();

  it('gives every page its canonical address on the site, the same for sharing (og:url)', () => {
    expect(pages.map((page) => page.url)).toEqual([SITE, ...IDENTIFIERS.map((info) => `${SITE}${info.slug}/`)]);
    for (const page of pages) {
      expect(page.html).toContain(`<link rel="canonical" href="${page.url}" />`);
      expect(page.html).toContain(`<meta property="og:url" content="${page.url}" />`);
    }
  });

  it('lists every page in the sitemap, which robots.txt points to', () => {
    const sitemap = renderSitemap(pages);
    expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, loc]) => loc)).toEqual(pages.map((page) => page.url));
    expect(renderRobots()).toContain(`Sitemap: ${SITE}sitemap.xml`);
  });
});

function kitOf(s: State): readonly KitRow[] {
  const kit = buildKit(s);
  if ('error' in kit) {
    throw new Error(kit.error);
  }
  return kit.rows;
}

describe('form-check kit', () => {
  it.each(IDENTIFIERS.map((info) => [info.id, info] as const))(
    '%s: every undisputed variant exactly once, no disputed one, expected outcome matches the validator',
    (_, info) => {
      const rows = kitOf(state({ id: info.id }));
      const undisputed = [...Object.keys(info.edge), ...Object.keys(info.invalid)].filter((name) => !info.disputed.includes(name));
      expect(rows.filter((row) => row.kind !== 'valid').map((row) => row.code)).toEqual(undisputed);
      expect(rows.filter((row) => row.kind === 'valid')).toHaveLength(info.kit.length);
      for (const row of rows) {
        expect(row.valid, `${row.code} ${row.value}`).toBe(row.expected === 'přijmout');
        expect(row.expected).toBe(row.kind === 'invalid' ? 'odmítnout' : 'přijmout');
      }
    },
  );

  it('leaves out the disputed variants', () => {
    expect(kitOf(state({ id: 'dic' })).map((row) => row.code)).not.toContain('lowercasePrefix');
    expect(kitOf(state({ id: 'iban' })).map((row) => row.code)).not.toContain('lowercase');
  });

  it('is the same for the same seed and date, and differs for another seed', () => {
    const s = state({ id: 'ico' });
    expect(kitOf(s)).toEqual(kitOf(s));
    expect(kitOf({ ...s, seed: s.seed + 1 }).map((row) => row.value)).not.toEqual(kitOf(s).map((row) => row.value));
  });

  it('opens the birth number kit with a man and a woman', () => {
    const [man, woman] = kitOf(state({ id: 'birthNumber' }));
    expect(Number(man?.value.slice(2, 4))).toBeLessThanOrEqual(12);
    expect(Number(woman?.value.slice(2, 4))).toBeGreaterThan(50);
  });

  it('is offered on every identifier page, and on the home page for each identifier of the overview', () => {
    for (const page of renderPages()) {
      expect(page.html, page.path).toContain('id="kit"');
      expect(page.html.includes('id="kit-open"'), page.path).toBe(page.path !== 'index.html');
    }
    const home = renderPages().find((page) => page.path === 'index.html')?.html ?? '';
    for (const info of IDENTIFIERS) {
      expect(home).toContain(`data-kit="${info.id}"`);
    }
  });
});

describe('home overview', () => {
  const date = '2026-11-02';

  it('lists every identifier on the home page with a cell per kind, its name linking to its page', () => {
    const home = renderPages().find((page) => page.path === 'index.html')?.html ?? '';
    for (const info of IDENTIFIERS) {
      expect(home).toContain(`<a href="./${info.slug}/">`);
      for (const kind of ['valid', 'edge', 'invalid']) {
        expect(home).toContain(`id="cell-${info.id}-${kind}"`);
      }
    }
  });

  it('gives every identifier a valid, an edge and an invalid value that the validator judges as such', () => {
    const library = createCz({ referenceDate: date });
    for (const row of buildOverview(42, date)) {
      const [valid, edge, invalid] = row.cells;
      expect(library.validate[row.id](valid.value).valid, row.id).toBe(true);
      expect(library.validate[row.id](edge.value).valid, `${row.id} ${edge.title}`).toBe(true);
      expect(library.validate[row.id](invalid.value).valid, `${row.id} ${invalid.title}`).toBe(false);
      expect(edge.title).not.toBe('');
      expect(invalid.title).not.toBe('');
    }
  });

  it('is the same for the same seed and changes with the seed', () => {
    expect(buildOverview(42, date)).toEqual(buildOverview(42, date));
    expect(buildOverview(43, date)).not.toEqual(buildOverview(42, date));
  });

  it('never shows a disputed variant', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const row of buildOverview(seed, date)) {
        const info = IDENTIFIERS.find((candidate) => candidate.id === row.id);
        const titles = (info?.disputed ?? []).map((name) => info?.titles[name]);
        expect(titles).not.toContain(row.cells[1].title);
      }
    }
  });
});

describe('kit export', () => {
  const rows: KitRow[] = [
    {
      value: '06541186',
      kind: 'edge',
      title: 'Nula na začátku',
      code: 'leadingZeros',
      text: 'Řekl "ahoj"; pak odešel.',
      expected: 'přijmout',
      valid: true,
    },
    { value: ' 25596641', kind: 'invalid', title: 'Mezera', code: 'badFormat', text: 'Text', expected: 'odmítnout', valid: false },
  ];

  it('writes CSV for Excel with Czech settings: BOM, semicolons, CRLF, quotes, digits kept as text', () => {
    const csv = toCsv(rows);
    expect(csv.startsWith('\uFEFFHodnota;Varianta;Kód;Co testuje;Očekáváno\r\n')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toBe('="06541186";Nula na začátku;leadingZeros;"Řekl ""ahoj""; pak odešel.";přijmout');
    expect(lines[2]).toBe('=" 25596641";Mezera;badFormat;Text;odmítnout');
    expect(lines[3]).toBe('');
  });

  it('writes every value as an Excel text formula, quoting the field when the value needs it', () => {
    expect(csvValue('+420 601 123 456')).toBe('="+420 601 123 456"');
    expect(csvValue('110 00')).toBe('="110 00"');
    expect(csvValue('859182400800000007')).toBe('="859182400800000007"');
    expect(csvValue('a;b')).toBe('"=""a;b"""');
    expect(csvValue('a"b')).toBe('"=""a""""b"""');
  });

  it('exports plain spaces, never the no-break spaces of the page', () => {
    const kit = kitOf(state({ id: 'birthNumber' }));
    expect(toCsv(kit)).not.toContain(' ');
    expect(toTsv(kit)).not.toContain(' ');
  });

  it('copies TSV with the values exactly as generated', () => {
    expect(toTsv(rows).split('\n')[1]).toBe('06541186\tNula na začátku\tleadingZeros\tŘekl "ahoj"; pak odešel.\tpřijmout');
  });

  it('names the CSV after the page and the seed', () => {
    expect(kitFileName(state({ id: 'bankAccount', seed: 42 }), 'csv')).toBe('sada-cislo-uctu-seed-42.csv');
    expect(kitFileName(state({ id: 'bankAccount', seed: 42 }), 'json')).toBe('sada-cislo-uctu-seed-42.json');
  });
});

describe('Czech typography', () => {
  it('keeps one-letter words with the next word', () => {
    expect(cz('v Praze a u Brna')).toBe('v Praze a u Brna');
    expect(cz('S předčíslím')).toBe('S předčíslím');
    expect(cz('zvýšený o 50.')).toBe('zvýšený o 50.');
    expect(cz('hraniční\n          i chybné')).toBe('hraniční\n          i chybné');
    expect(cz('(z IČO)')).toBe('(z IČO)');
  });

  it('leaves longer words, a one-letter word at the end and other letters alone', () => {
    expect(cz('okno a')).toBe('okno a');
    expect(cz('typ X a Y')).toBe('typ X a Y');
    expect(cz('IČO, DIČ')).toBe('IČO, DIČ');
  });

  it('changes text between tags only, never attributes or code', () => {
    expect(czHtml('<p title="a b">v Praze <code>a b</code> a <pre>s x</pre></p>')).toBe(
      '<p title="a b">v Praze <code>a b</code> a <pre>s x</pre></p>',
    );
  });

  it('leaves no breakable one-letter word in the text of any page', () => {
    for (const page of renderPages()) {
      const text = page.html.replaceAll(/<(code|pre|script)\b[\s\S]*?<\/\1>/gu, '').replaceAll(/<[^>]+>/gu, ' ');
      expect(text, page.path).not.toMatch(/(?<=^|[\s„(])[ksvzouai] +\S/iu);
    }
  });
});

describe('kit JSON for data-driven tests', () => {
  it('lists every row as a case with the raw value, the expected outcome and the library variant code', () => {
    for (const info of IDENTIFIERS) {
      const s = state({ id: info.id, seed: 42 });
      const outcome = buildKit(s);
      const rows = 'error' in outcome ? [] : outcome.rows;
      const cases = JSON.parse(toJson(s, rows)) as { id: string; value: string; valid: boolean; kind: string; variant: string | null; description: string }[];
      expect(cases).toHaveLength(rows.length);
      const library = createCz({ seed: 42, referenceDate: s.referenceDate });
      for (const [index, item] of cases.entries()) {
        expect(Object.keys(item)).toEqual(['id', 'value', 'valid', 'kind', 'variant', 'description']);
        expect(item.id).toBe(info.id);
        expect(item.value).toBe(rows[index]?.value);
        expect(library.validate[info.id](item.value).valid, `${info.id} ${String(item.variant)}`).toBe(item.valid);
        expect(item.variant === null).toBe(item.kind === 'valid');
        expect(item.description).not.toContain('\u00a0');
      }
    }
  });
});

describe('for AI agents', () => {
  it('writes real values into the home page HTML, so an agent without JavaScript sees data', () => {
    const date = '2026-11-02';
    const home = renderPages(date).find((page) => page.path === 'index.html')?.html ?? '';
    for (const row of buildOverview(1, date)) {
      for (const item of row.cells) {
        expect(item.value, `${row.id} ${item.kind}`).not.toBe('');
        expect(home).toContain(`id="cell-${row.id}-${item.kind}" class="cell ${{ valid: 'ok', edge: 'edge', invalid: 'bad' }[item.kind]}" data-label="${{ valid: 'Platné', edge: 'Hraniční', invalid: 'Chybné' }[item.kind]}">${czHtml(cellHtml(item))}`);
      }
    }
  });

  it('lists every identifier with its CLI name and every variant of the library in llms.txt', () => {
    const text = renderLlms();
    const library = createCz();
    for (const info of IDENTIFIERS) {
      expect(text).toContain(`\`${info.id}\` (CLI \`${info.cli}\`)`);
      for (const name of [...library[info.id].edgeVariants, ...library[info.id].invalidVariants]) {
        expect(text, `${info.id} ${name}`).toContain(`\`${name}\` (`);
      }
    }
  });

  it.each(LLMS_COMMANDS)('runs the llms.txt command: %s', (command) => {
    expect(renderLlms()).toContain(`\`${command}\``);
    const output = execFileSync('node', [CLI, ...command.split(' ').slice(2)], { encoding: 'utf8' });
    expect(output.trim()).not.toBe('');
  });
});

describe('kit export safety', () => {
  it('has no text cell that Excel would read as a formula', () => {
    for (const info of IDENTIFIERS) {
      for (const row of kitOf(state({ id: info.id }))) {
        for (const cell of [row.title, row.code, row.text]) {
          expect(cell, `${info.id} ${row.code}`).not.toMatch(/^[=+\-@]/u);
        }
      }
    }
  });
});
