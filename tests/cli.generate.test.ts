// CLI generating values – docs/rules/cli.md sections 2 (options, determinism, seed notice) and 3 (formats).
// The oracle is a fresh library generator called in the order of section 2.3; no generated values are pinned.
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli/run.js';
import {
  IDENTIFIERS,
  REFERENCE_DATE,
  SEED,
  csvRows,
  expectedRecords,
  renderGenerated,
  type Format,
  type Mode,
} from './support/cli.js';

const FORMATS: readonly Format[] = ['text', 'json', 'csv'];
const COMMON = ['--seed', String(SEED), '--reference-date', REFERENCE_DATE];
const COUNT = 3;

describe.each(IDENTIFIERS)('$id generates what the library generates (section 2.3)', (entry) => {
  const library = entry.create({ seed: SEED, referenceDate: REFERENCE_DATE });
  const cases: {
    title: string;
    args: string[];
    mode: Mode;
    variant?: string;
  }[] = [
    { title: 'valid values', args: [], mode: 'valid' },
    ...library.edgeVariants.map((v) => ({
      title: `edge ${v}`,
      args: ['--edge', v],
      mode: 'edge' as const,
      variant: v,
    })),
    ...library.invalidVariants.map((v) => ({
      title: `invalid ${v}`,
      args: ['--invalid', v],
      mode: 'invalid' as const,
      variant: v,
    })),
    {
      title: 'edge random',
      args: ['--edge', 'random'],
      mode: 'edge',
      variant: 'random',
    },
    {
      title: 'invalid random',
      args: ['--invalid', 'random'],
      mode: 'invalid',
      variant: 'random',
    },
    {
      title: 'edge all (variant-major)',
      args: ['--edge', 'all'],
      mode: 'edge',
      variant: 'all',
    },
    {
      title: 'invalid all (variant-major)',
      args: ['--invalid', 'all'],
      mode: 'invalid',
      variant: 'all',
    },
  ];

  it.each(cases)('$title', ({ args, mode, variant }) => {
    const records = expectedRecords(entry, { mode, variant, count: COUNT });
    const result = run([entry.id, '-n', String(COUNT), ...COMMON, ...args]);
    expect(result).toEqual({
      stdout: renderGenerated(records, 'text'),
      stderr: '',
      exitCode: 0,
    });
    for (const format of FORMATS) {
      expect(run([entry.id, '-n', String(COUNT), ...COMMON, ...args, '-f', format]).stdout).toBe(
        renderGenerated(records, format),
      );
    }
  });

  it('defaults to one value in text format', () => {
    const { stdout } = run([entry.id, ...COMMON]);
    expect(stdout).toBe(renderGenerated(expectedRecords(entry, { mode: 'valid', count: 1 }), 'text'));
  });

  if (entry.mapping !== undefined) {
    const { args, options } = entry.mapping;
    it(`maps ${args.join(' ')} to the API options (section 2.2)`, () => {
      const records = expectedRecords(entry, {
        mode: 'valid',
        count: COUNT,
        options,
      });
      expect(run([entry.id, '--count', String(COUNT), ...COMMON, ...args]).stdout).toBe(
        renderGenerated(records, 'text'),
      );
    });
  }
});

describe('common options (section 2.1)', () => {
  const [ico] = IDENTIFIERS.filter((e) => e.id === 'ico');
  if (ico === undefined) throw new Error('ico missing from the fixture table');

  it('has short forms -n, -s and -f', () => {
    const long = run(['ico', '--count', '4', '--seed', '7', '--reference-date', REFERENCE_DATE, '--format', 'json']);
    const short = run(['ico', '-n', '4', '-s', '7', '--reference-date', REFERENCE_DATE, '-f', 'json']);
    expect(short).toEqual(long);
    expect(long.exitCode).toBe(0);
  });

  it.each([1, 10_000])('accepts --count %d', (count) => {
    const { stdout, exitCode } = run(['ico', '-n', String(count), ...COMMON]);
    expect(exitCode).toBe(0);
    expect(stdout.split('\n')).toHaveLength(count + 1);
  });

  it.each(['0', '4294967295'])('accepts --seed %s', (seed) => {
    const { stdout, exitCode } = run(['ico', '-s', seed]);
    expect(exitCode).toBe(0);
    const expected = ico.create({ seed: Number(seed), referenceDate: REFERENCE_DATE }).generate();
    expect(stdout).toBe(`${expected}\n`);
  });

  it('does not pass options that were not given (the library default applies)', () => {
    const phone = IDENTIFIERS.find((e) => e.id === 'phone');
    if (phone === undefined) throw new Error('phone missing');
    const expected = phone.create({ seed: SEED }).generate();
    expect(run(['phone', ...COMMON.slice(0, 2)]).stdout).toBe(`${expected}\n`);
  });
});

describe('formats (section 3)', () => {
  it('text is values only, even with --invalid all', () => {
    const { stdout } = run(['ico', '--invalid', 'all', '-s', '1']);
    for (const line of stdout.split('\n').slice(0, -1)) expect(line).not.toMatch(/[,\t ]/u);
    expect(stdout.endsWith('\n')).toBe(true);
  });

  it('json keys are value, kind, variant in this order and variant is absent for valid and random', () => {
    const named = JSON.parse(run(['ico', '--edge', 'all', '-s', '1', '-f', 'json']).stdout) as object[];
    for (const record of named) expect(Object.keys(record)).toEqual(['value', 'kind', 'variant']);
    for (const args of [[], ['--edge', 'random'], ['--invalid', 'random']]) {
      const result = JSON.parse(run(['ico', ...args, '-s', '1', '-f', 'json']).stdout) as object[];
      for (const record of result) expect(Object.keys(record)).toEqual(['value', 'kind']);
    }
  });

  it('json is indented by two spaces and ends with one newline', () => {
    const { stdout } = run(['ico', '-s', '1', '-f', 'json']);
    expect(stdout).toMatch(/^\[\n {2}\{\n {4}"value": "\d{8}",\n {4}"kind": "valid"\n {2}\}\n\]\n$/u);
  });

  it.each([
    [['ico', '-s', '1', '-f', 'csv'], 'valid'],
    [['ico', '-s', '1', '--edge', 'random', '-f', 'csv'], 'edge'],
  ])('csv has the header value,kind,variant and empty variant when absent: %j', (args, kind) => {
    const lines = run(args).stdout.split('\n');
    expect(lines[0]).toBe('value,kind,variant');
    expect(lines[1]).toMatch(new RegExp(`^\\d{8},${kind},$`, 'u'));
    expect(lines[2]).toBe('');
  });

  it('csv of a named variant carries the variant name', () => {
    const { stdout } = run(['ico', '-s', '1', '--invalid', 'badChecksum', '-f', 'csv']);
    expect(stdout).toMatch(/^value,kind,variant\n[^,\n]*,invalid,badChecksum\n$/u);
  });

  it('csv quotes only fields with a comma, quote, CR or LF (RFC 4180)', () => {
    expect(csvRows([['a', 'b,c', 'say "x"', 'l\nl', '']])).toBe('a,"b,c","say ""x""","l\nl",\n');
  });

  it('an invalid value with letters stays unquoted in csv unless it needs quoting', () => {
    const { stdout } = run(['ico', '-s', '1', '--invalid', 'letters', '-f', 'csv']);
    expect(stdout).not.toContain('"');
  });
});

describe('seed notice (section 2.4)', () => {
  const NOTICE =
    /^czech-test-data: seed (\d+), reference date (\d{4}-\d{2}-\d{2}) \(reproduce with --seed \1 --reference-date \2\)\n$/u;

  it('is one stderr line without --seed and reproduces the run', () => {
    const first = run(['ico', '-n', '5']);
    expect(first.exitCode).toBe(0);
    const match = NOTICE.exec(first.stderr);
    expect(match).not.toBeNull();
    const again = run(['ico', '-n', '5', '--seed', match?.[1] ?? '', '--reference-date', match?.[2] ?? '']);
    expect(again.stdout).toBe(first.stdout);
  });

  it('uses the given reference date', () => {
    expect(NOTICE.exec(run(['ico', '--reference-date', '2020-02-29']).stderr)?.[2]).toBe('2020-02-29');
  });

  it('is absent with --seed, and stdout stays pure data', () => {
    expect(run(['ico', '--seed', '1']).stderr).toBe('');
    expect(NOTICE.test(run(['ico']).stdout)).toBe(false);
  });
});
