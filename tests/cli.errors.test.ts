// CLI errors and exit codes – docs/rules/cli.md section 5 (and the usage rules of sections 1, 2 and 4).
import { describe, expect, it } from 'vitest';
import { createDic } from '../src/dic/index.js';
import { run } from '../src/cli/run.js';

const GENERAL_HINT = "Run 'czech-test-data --help' for usage.";

function libraryMessage(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof RangeError) return error.message;
  }
  throw new Error('the library did not throw a RangeError');
}

describe('usage errors exit 2 with stderr only', () => {
  const usage: readonly (readonly [string, string[]])[] = [
    ['unknown identifier', ['foo']],
    ['camelCase identifier (kebab-case only)', ['birthNumber']],
    ['unknown identifier in validate', ['validate', 'foo', '1']],
    ['validate without identifier', ['validate']],
    ['missing identifier', ['-n', '2']],
    ['unexpected positional argument', ['ico', 'extra']],
    ['unknown option', ['ico', '--bogus']],
    ['option without value', ['ico', '--count']],
    ['repeated option', ['ico', '--count', '1', '--count', '2']],
    ['count 0', ['ico', '--count', '0']],
    ['count above 10000', ['ico', '--count', '10001']],
    ['count not an integer', ['ico', '--count', '1.5']],
    ['count negative', ['ico', '--count', '-1']],
    ['count not a number', ['ico', '--count', 'abc']],
    ['seed negative', ['ico', '--seed', '-1']],
    ['seed above 2^32 - 1', ['ico', '--seed', '4294967296']],
    ['seed with a decimal point', ['ico', '--seed', '1.5']],
    ['seed in exponent notation', ['ico', '--seed', '1e3']],
    ['seed in hex', ['ico', '--seed', '0x10']],
    ['unknown format', ['ico', '--format', 'xml']],
    ['malformed reference date', ['ico', '--reference-date', 'yesterday']],
    ['unknown edge variant', ['ico', '--edge', 'nope']],
    ['unknown invalid variant', ['ico', '--invalid', 'nope']],
    ['--edge together with --invalid', ['ico', '--edge', 'all', '--invalid', 'all']],
    ['generator option the identifier does not have', ['ico', '--gender', 'male']],
    ['--with-prefix on phone', ['phone', '--with-prefix']],
    ['generator option with --edge', ['birth-number', '--gender', 'male', '--edge', 'all']],
    ['generator option with --invalid', ['phone', '--type', 'fixed', '--invalid', 'random']],
    ['validate with --count', ['validate', 'ico', '--count', '2', '00177041']],
    ['validate with --seed', ['validate', 'ico', '--seed', '2', '00177041']],
    ['validate with --edge', ['validate', 'ico', '--edge', 'all', '00177041']],
    ['validate with a generator option', ['validate', 'birth-number', '--gender', 'male', '1']],
    ['validate with no values (stdin not piped)', ['validate', 'ico']],
  ];

  it.each(usage)('%s', (_title, args) => {
    const { stdout, stderr, exitCode } = run(args);
    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toMatch(/^czech-test-data: .+\n/u);
    expect(stderr.endsWith('\n')).toBe(true);
    expect(stderr).not.toMatch(/\n\s+at /u);
    expect(stderr).toContain("Run 'czech-test-data");
  });

  it.each(['', '\n', '\r\n\r\n'])('validate with empty stdin %j', (stdin) => {
    const { stdout, exitCode } = run(['validate', 'ico'], stdin);
    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
  });

  it('points to the general help when the identifier is unknown', () => {
    expect(run(['foo']).stderr).toContain(GENERAL_HINT);
  });

  it('points to the identifier help when the identifier is known', () => {
    expect(run(['birth-number', '--bogus']).stderr).toContain("Run 'czech-test-data birth-number --help' for usage.");
    expect(run(['ico', '--count', '0']).stderr).toContain("Run 'czech-test-data ico --help' for usage.");
  });
});

describe('library RangeError becomes an error line with exit 2 (section 2.2)', () => {
  it('prints the library message for an invalid option combination', () => {
    const message = libraryMessage(() => createDic({ seed: 1 })({ from: 'ico', gender: 'male' } as never));
    const { stdout, stderr, exitCode } = run(['dic', '--from', 'ico', '--gender', 'male', '-s', '1']);
    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain(`czech-test-data: ${message}`);
    expect(stderr).not.toMatch(/\n\s+at /u);
  });

  it.each([
    ['unknown bank code', ['bank-account', '--bank-code', 'ZZZZ']],
    ['malformed account for IBAN', ['iban', '--account', 'not-an-account']],
    ['bad birth date', ['birth-number', '--birth-date', '1990-02-31']],
    ['unknown --from', ['dic', '--from', 'passport']],
  ])('%s', (_title, args) => {
    const { stdout, stderr, exitCode } = run([...args, '-s', '1']);
    expect(exitCode).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toMatch(/^czech-test-data: .+\n/u);
  });

  it('prints nothing on stdout even when the error comes after earlier values (all generated first)', () => {
    expect(run(['bank-account', '-n', '5', '--bank-code', 'ZZZZ', '-s', '1']).stdout).toBe('');
  });
});
