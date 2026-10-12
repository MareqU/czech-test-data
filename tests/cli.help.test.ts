// CLI help and version – docs/rules/cli.md section 6 (only the presence of names is tested) and section 1.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli/run.js';
import { IDENTIFIERS } from './support/cli.js';

const TOP_LEVEL_NAMES = [
  'validate',
  '--count',
  '--seed',
  '--reference-date',
  '--format',
  '--edge',
  '--invalid',
  '--help',
  '--version',
  ...IDENTIFIERS.map((e) => e.id),
];

describe('top-level help', () => {
  it.each([[[]], [['--help']], [['-h']]])('is on stdout with exit 0 for %j', (args) => {
    const { stdout, stderr, exitCode } = run(args);
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    for (const name of TOP_LEVEL_NAMES) expect(stdout).toContain(name);
  });
});

describe.each(IDENTIFIERS)('$id --help', (entry) => {
  const generator = entry.create({ seed: 1 });
  it.each([['--help'], ['-h']])('lists its options and every variant name (%s)', (flag) => {
    const { stdout, stderr, exitCode } = run([entry.id, flag]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    for (const name of [...entry.helpOptions, ...generator.edgeVariants, ...generator.invalidVariants]) {
      expect(stdout).toContain(name);
    }
  });

  it('wins over invalid arguments', () => {
    const result = run([entry.id, '--count', 'abc', '--edge', 'nope', '--bogus', '--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(generator.invalidVariants[0] ?? '');
  });
});

describe('help wins over every other argument', () => {
  it('even an unknown identifier does not error', () => {
    expect(run(['foo', '--help']).exitCode).toBe(0);
    expect(run(['--bogus', '--help']).exitCode).toBe(0);
  });
});

describe('version', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  it.each([['--version'], ['-v']])('%s prints the package version', (flag) => {
    const { stdout, stderr, exitCode } = run([flag]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain(version);
  });
});
