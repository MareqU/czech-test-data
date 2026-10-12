// CLI `validate` command – docs/rules/cli.md section 4.
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli/run.js';
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
    const value = '995231/1234';
    for (const referenceDate of ['2000-01-01', '2099-01-01']) {
      const expected = expectedValidation(entry, [value], referenceDate);
      expect(run(['validate', 'birth-number', value, '--reference-date', referenceDate]).stdout).toBe(
        renderValidated(expected, 'text'),
      );
    }
  });
});
