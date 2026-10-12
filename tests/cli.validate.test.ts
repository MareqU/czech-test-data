// CLI `validate` command – docs/rules/cli.md section 4.
import { describe, expect, it } from 'vitest';
import { needsStdin, run } from '../src/cli/run.js';
import {
  IDENTIFIERS,
  REFERENCE_DATE,
  expectedValidation,
  renderValidated,
  sampleValues,
  type Format,
} from './support/cli.js';

const FORMATS: readonly Format[] = ['text', 'json', 'csv'];

describe.each(IDENTIFIERS)('validate $id', (entry) => {
  const values = sampleValues(entry);
  const expected = expectedValidation(entry, values);
  const allValid = expected.every((r) => r.valid);

  it.each(FORMATS)('validates arguments in input order (%s)', (format) => {
    const result = run(['validate', entry.id, ...values, '--reference-date', REFERENCE_DATE, '-f', format]);
    expect(result.stdout).toBe(renderValidated(expected, format));
    expect(result.exitCode).toBe(allValid ? 0 : 1);
  });

  it('validates the same values from stdin', () => {
    const result = run(['validate', entry.id, '--reference-date', REFERENCE_DATE], `${values.join('\n')}\n`);
    expect(result.stdout).toBe(renderValidated(expected, 'text'));
  });
});

describe('validate details', () => {
  it('exits 0 when every value is valid and prints value<TAB>valid', () => {
    expect(run(['validate', 'ico', '00177041'])).toEqual({
      stdout: '00177041\tvalid\n',
      stderr: '',
      exitCode: 0,
    });
  });

  it('exits 1 when one value is invalid, printing everything on stdout', () => {
    const { stdout, exitCode } = run(['validate', 'ico', '00177041', '00177042']);
    expect(exitCode).toBe(1);
    expect(stdout).toBe('00177041\tvalid\n00177042\tinvalid\tbadChecksum\n');
  });

  it('prints json and csv records with reason only when invalid', () => {
    const json = run(['validate', 'ico', '00177041', '00177042', '-f', 'json']).stdout;
    expect(JSON.parse(json)).toEqual([
      { value: '00177041', valid: true },
      { value: '00177042', valid: false, reason: 'badChecksum' },
    ]);
    expect(Object.keys((JSON.parse(json) as object[])[1] ?? {})).toEqual(['value', 'valid', 'reason']);
    expect(run(['validate', 'ico', '00177041', '00177042', '-f', 'csv']).stdout).toBe(
      'value,valid,reason\n00177041,true,\n00177042,false,badChecksum\n',
    );
  });

  it('quotes csv fields that need it', () => {
    expect(run(['validate', 'ico', 'a,"b"', '-f', 'csv']).stdout).toMatch(
      /^value,valid,reason\n"a,""b""",false,\w+\n$/u,
    );
  });

  it('quotes csv fields containing LF or CR', () => {
    expect(run(['validate', 'ico', 'a\nb', 'a\rb', '-f', 'csv']).stdout).toMatch(
      /^value,valid,reason\n"a\nb",false,\w+\n"a\rb",false,\w+\n$/u,
    );
  });

  it('reads stdin with \\n or \\r\\n and skips empty lines', () => {
    const result = run(['validate', 'ico', '-f', 'csv'], '00177041\r\n\r\n00177042\n\n');
    expect(result.stdout).toBe('value,valid,reason\n00177041,true,\n00177042,false,badChecksum\n');
    expect(result.exitCode).toBe(1);
  });

  it('does not trim: a trailing space is validated as given', () => {
    const { stdout, exitCode } = run(['validate', 'ico', '-f', 'json'], '00177041 \n 00177041\n');
    expect(JSON.parse(stdout)).toMatchObject([
      { value: '00177041 ', valid: false },
      { value: ' 00177041', valid: false },
    ]);
    expect(exitCode).toBe(1);
  });

  it('takes arguments over stdin', () => {
    expect(run(['validate', 'ico', '00177041'], '00177042\n').stdout).toBe('00177041\tvalid\n');
  });

  it('passes --reference-date to the validator', () => {
    const entry = IDENTIFIERS.find((e) => e.id === 'birth-number');
    if (entry === undefined) throw new Error('birth-number missing');
    const value = '500101/4788';
    const outputs = [
      ['2000-01-01', `${value}\tinvalid\tfutureDate\n`],
      ['2099-01-01', `${value}\tvalid\n`],
    ] as const;
    for (const [referenceDate, output] of outputs) {
      const expected = expectedValidation(entry, [value], referenceDate);
      const { stdout } = run(['validate', 'birth-number', value, '--reference-date', referenceDate]);
      expect(stdout).toBe(renderValidated(expected, 'text'));
      expect(stdout).toBe(output);
    }
  });
});

describe('needsStdin (section 4: stdin is read only when validate has no values)', () => {
  it.each<readonly [string[], boolean]>([
    [['validate', 'ico'], true],
    [['-f', 'json', 'validate', 'ico'], true],
    [['validate', 'ico', '-f', 'json'], true],
    [['validate', 'ico', '--reference-date', '2024-01-01'], true],
    [['validate', 'ico', '00177041'], false],
    [['-f', 'json', 'validate', 'ico', '00177041'], false],
    [['validate', 'ico', '--help'], false],
    [['validate', 'ico', '-h'], false],
    [['validate', '--help'], false],
    [['--help'], false],
    [['-h'], false],
    [['--version'], false],
    [['validate', 'ico', '--version'], false],
    [[], false],
    [['ico'], false],
    [['birth-number', '-n', '2'], false],
    [['validate', 'foo'], false],
    [['validate'], false],
    [['validate', 'ico', '--bogus'], false],
    [['validate', 'ico', '--count', '2'], false],
  ])('%j -> %s', (args, expected) => {
    expect(needsStdin(args)).toBe(expected);
  });
});
