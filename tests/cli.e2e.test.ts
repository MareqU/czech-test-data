// End-to-end CLI smoke tests (docs/rules/cli.md section 7): spawn the built dist/cli.mjs. Run by `npm run test:e2e`
// after `npm run build`; excluded from `npm test`.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  IDENTIFIERS,
  REFERENCE_DATE,
  SEED,
  expectedRecords,
  expectedValidation,
  renderGenerated,
  renderValidated,
  type Format,
} from './support/cli.js';

const CLI = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url));

function cli(args: string[], input?: string): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    input,
  });
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status,
  };
}

const ico = IDENTIFIERS.find((e) => e.id === 'ico');
if (ico === undefined) throw new Error('ico missing from the fixture table');

describe('built CLI', () => {
  it.each<Format>(['text', 'json', 'csv'])('prints %s equal to the library output, exit 0', (format) => {
    const records = expectedRecords(ico, {
      mode: 'invalid',
      variant: 'all',
      count: 2,
    });
    const result = cli([
      'ico',
      '-n',
      '2',
      '--invalid',
      'all',
      '-s',
      String(SEED),
      '--reference-date',
      REFERENCE_DATE,
      '-f',
      format,
    ]);
    expect(result).toEqual({
      stdout: renderGenerated(records, format),
      stderr: '',
      status: 0,
    });
  });

  it.each(IDENTIFIERS)('generates $id', (entry) => {
    const result = cli([entry.id, '-n', '2', '-s', String(SEED), '--reference-date', REFERENCE_DATE]);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(renderGenerated(expectedRecords(entry, { mode: 'valid', count: 2 }), 'text'));
  });

  it('writes the seed notice to stderr only without --seed', () => {
    const result = cli(['ico']);
    expect(result.status).toBe(0);
    expect(result.stderr).toMatch(/^czech-test-data: seed \d+, reference date \d{4}-\d{2}-\d{2} \(reproduce with /u);
    expect(result.stdout).toMatch(/^\d{8}\n$/u);
  });

  it('validates values piped on stdin, exit 0 when all are valid', () => {
    const result = cli(['validate', 'ico'], '00177041\r\n\r\n');
    expect(result).toEqual({
      stdout: '00177041\tvalid\n',
      stderr: '',
      status: 0,
    });
  });

  it('exits 1 when a validated value is invalid, output still printed', () => {
    const values = ['00177041', '00177042'];
    const result = cli(['validate', 'ico', ...values, '--reference-date', REFERENCE_DATE, '-f', 'json']);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(renderValidated(expectedValidation(ico, values), 'json'));
  });

  it.each([
    ['unknown identifier', ['foo']],
    ['bad count', ['ico', '--count', '0']],
    ['library RangeError', ['dic', '--from', 'ico', '--gender', 'male', '-s', '1']],
  ])('exits 2 with stderr only: %s', (_title, args) => {
    const result = cli(args);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^czech-test-data: /u);
    expect(result.stderr).not.toMatch(/\n\s+at /u);
  });

  it('prints help and version with exit 0', () => {
    expect(cli([]).status).toBe(0);
    expect(cli(['ico', '--help']).stdout).toContain('badChecksum');
    expect(cli(['--version']).status).toBe(0);
  });

  // Stdin is a pipe that is never ended: the CLI must not wait for it unless `validate` has no values.
  const openStdin = (args: string[], timeout = 5000) =>
    new Promise<{ stdout: string; status: number | null }>((resolve, reject) => {
      const child = spawn(process.execPath, [CLI, ...args], { stdio: 'pipe' });
      let stdout = '';
      child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error(`did not finish within ${timeout} ms`));
      }, timeout);
      child.on('close', (status) => {
        clearTimeout(timer);
        resolve({ stdout, status });
      });
    });

  it('does not wait for stdin when validate has values (stdin left open)', async () => {
    expect(await openStdin(['validate', 'ico', '00177041'])).toEqual({ stdout: '00177041\tvalid\n', status: 0 });
  });

  it('reads stdin for validate with options before the command', async () => {
    const result = cli(['-f', 'json', 'validate', 'ico'], '00177041\n');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([{ value: '00177041', valid: true }]);
  });
});
