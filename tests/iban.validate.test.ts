// Specification of validateIban (Czech IBAN) – docs/rules/iban.md section 2 (algorithm, steps and precedence,
// decisions 1-5), section 5 (known samples) and section 9 (reason codes). The validator ignores referenceDate.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateIban } from '../src/iban/index.js';
import { oracleIbanValidate, structuredIbanArb } from './support/iban.js';

const PROPERTY_RUNS = 500;
const VALID = { valid: true } as const;
const NBSP = String.fromCharCode(0xa0);
const toFullWidth = (ascii: string): string =>
  ascii
    .split('')
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0))
    .join('');

const VALID_SAMPLES: readonly (readonly [string, string])[] = [
  ['CZ6508000000192000145399', 'ČNB example'],
  ['CZ65 0800 0000 1920 0014 5399', 'ČNB example, written form'],
  ['CZ6907101781240000004159', 'ČNB example with prefix'],
  ['CZ69 0710 1781 2400 0000 4159', 'written form'],
  ['CZ30 0710 0077 5500 7762 8111', 'Finanční správa'],
  ['CZ74 0710 0007 0500 7762 8031', '3-digit prefix'],
  ['CZ27 0710 0007 4800 7762 8031', 'daň silniční'],
  ['CZ49 0710 0028 6600 7762 8031', '4-digit prefix'],
  ['CZ52 0710 0007 0500 7762 8621', 'Jihomoravský kraj'],
  ['CZ07 0710 0007 0500 7762 8461', 'check digits with a leading zero'],
  ['CZ02 0710 0007 0500 7762 1761', 'lowest check digits 02'],
  ['CZ98 0710 0007 4800 7762 8111', 'highest check digits 98'],
  ['CZ5508000000001234567899', 'plain, no prefix'],
  ['CZ55 0800 0000 0012 3456 7899', 'withSpaces'],
  ['cz5508000000001234567899', 'lowercase'],
  ['cz55 0800 0000 0012 3456 7899', 'lowercase and spaces'],
  ['Cz5508000000001234567899', 'mixed case country'],
  ['cZ5508000000001234567899', 'mixed case country'],
  ['CZ3101001234571234567899', '6-digit prefix'],
  ['CZ79 0710 0137 1700 7762 8031', '5-digit prefix'],
  ['CZ9755000000000000000019', 'check digits 97, shortest account'],
];

const INVALID_SAMPLES: readonly (readonly [string, string, string])[] = [
  ['badChecksum', 'CZ6608000000192000145399', 'check digits +1'],
  ['badChecksum', 'CZ6508000000192000143599', 'adjacent digits swapped'],
  ['badChecksum', 'CZ6508000000192000145398', 'last digit changed, checksum comes first'],
  ['badChecksum', 'CZ99 0710 0007 0500 7762 1761', 'check digits 99 with remainder 1'],
  ['badChecksum', 'CZ01 0710 0007 4800 7762 8111', 'check digits 01 with remainder 1'],
  ['badChecksum', 'CZ0055000000000000000019', 'check digits 00 with remainder 1'],
  ['badChecksumNumber', 'CZ0708000000001234567890', 'mod 97 correct, number sum 255'],
  ['badChecksumPrefix', 'CZ5308001234561234567899', 'mod 97 correct, prefix sum 76'],
  ['zeroNumber', 'CZ6108000000000000000000', 'all-zero account'],
  ['unknownBankCode', 'CZ5761000000001234567899', '6100 cancelled'],
  ['unknownBankCode', 'CZ7300000000001234567899', '0000 never assigned'],
  ['wrongCountry', 'SK6807200002891987426353', 'Slovak IBAN'],
  ['wrongCountry', 'SK68 0720 0002 8919 8742 6353', 'Slovak IBAN, written form'],
  ['wrongCountry', 'SK5308000000001234567899', 'Slovak IBAN of a Czech account'],
  ['wrongCountry', 'BE62510007547061', 'country wins over length'],
  ['wrongCountry', 'FR1420041010050500013M02606', 'country wins over letters'],
  ['wrongCountry', '6508000000192000145399', 'country code missing'],
  ['wrongCountry', 'ČZ6508000000192000145399', 'Č is not C'],
  ['wrongCountry', 'IBAN CZ65 0800 0000 1920 0014 5399', 'tag IBAN in front'],
  ['letters', 'CZ65O8000000192000145399', 'O for 0 in the bank code'],
  ['letters', 'CZ6S08000000192000145399', 'letter in the check digits'],
  ['letters', 'CZ65 0800 0000 1920 0014 539l', 'lowercase L, written form'],
  ['letters', 'CZ650800000019200014539é', 'any Unicode letter'],
  ['wrongLength', 'CZ650800000019200014539', '23 characters'],
  ['wrongLength', 'CZ65080000001920001453990', '25 characters'],
  ['wrongLength', 'CZ65 0800 0000 1920 0014 5399 0', 'written shape, 25 characters'],
  ['wrongLength', 'CZ810800192000145399', 'without zero padding'],
  ['wrongLength', 'CZ', 'country only'],
  ['badFormat', '', 'empty'],
  ['badFormat', ' CZ6508000000192000145399', 'leading space'],
  ['badFormat', 'CZ6508000000192000145399 ', 'trailing space'],
  ['badFormat', 'CZ65  0800 0000 1920 0014 5399', 'double space'],
  ['badFormat', 'CZ65 08000000 1920 0014 5399', 'group of 8'],
  ['badFormat', 'CZ6508 0000 0019 2000 1453 99', 'spaces in the wrong places'],
  ['badFormat', 'CZ65-0800-0000-1920-0014-5399', 'hyphens'],
  ['badFormat', `CZ65${NBSP}0800 0000 1920 0014 5399`, 'no-break space'],
  ['badFormat', 'CZ65\t0800 0000 1920 0014 5399', 'tab'],
  ['badFormat', '19-2000145399/0800', 'national format'],
  ['badFormat', toFullWidth('CZ6508000000192000145399'), 'full-width characters'],
];

describe('accepts the known valid IBANs (section 5)', () => {
  it.each(VALID_SAMPLES)('accepts %s (%s)', (value) => {
    expect(validateIban(value)).toEqual(VALID);
    expect(oracleIbanValidate(value)).toEqual(VALID);
  });
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each(INVALID_SAMPLES)('gives %s for %j (%s)', (reason, value) => {
    expect(validateIban(value)).toEqual({ valid: false, reason });
    expect(oracleIbanValidate(value)).toEqual({ valid: false, reason });
  });
});

describe('precedence badFormat → wrongCountry → letters → wrongLength → badChecksum → account rules (decision 1)', () => {
  it.each([
    ['badFormat over wrongCountry', 'SK68  0720', 'badFormat'],
    ['wrongCountry over letters', 'DE89 3704 0044 0532 0130 0O', 'wrongCountry'],
    ['wrongCountry over wrongLength', 'DE89370400440532013000', 'wrongCountry'],
    ['letters over wrongLength', 'CZ65O800', 'letters'],
    ['wrongLength over badChecksum', 'CZ6508000000192000145399000', 'wrongLength'],
    ['badChecksum over badChecksumNumber', 'CZ6508000000192000145398', 'badChecksum'],
    ['badChecksumPrefix over badChecksumNumber', 'CZ0508001234561234567890', 'badChecksumPrefix'],
    ['badChecksumNumber over unknownBankCode', 'CZ0961000000001234567890', 'badChecksumNumber'],
    ['zeroNumber over unknownBankCode', 'CZ6361000000000000000000', 'zeroNumber'],
  ])('%s', (_name, value, reason) => {
    expect(oracleIbanValidate(value)).toEqual({ valid: false, reason });
    expect(validateIban(value)).toEqual({ valid: false, reason });
  });
});

describe('does not depend on the date', () => {
  it('ignores referenceDate', () => {
    expect(validateIban('CZ6508000000192000145399', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validateIban('CZ5761000000001234567899', { referenceDate: '2099-12-31' })).toEqual({
      valid: false,
      reason: 'unknownBankCode',
    });
  });
});

describe('agrees with the independent oracle for any input', () => {
  const charArb = fc.constantFrom(...'CZcz0123456789 SKAOl'.split(''));

  it('matches on structured IBANs (right and wrong check digits, mod 11, codes, case, spacing)', () => {
    fc.assert(
      fc.property(structuredIbanArb, (value) => {
        expect(validateIban(value)).toEqual(oracleIbanValidate(value));
      }),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });

  it('matches on arbitrary strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 30 }),
          fc.array(charArb, { maxLength: 30 }).map((a) => a.join('')),
          fc.array(charArb, { maxLength: 22 }).map((a) => `CZ${a.join('')}`),
        ),
        (value) => {
          expect(validateIban(value)).toEqual(oracleIbanValidate(value));
        },
      ),
      { numRuns: PROPERTY_RUNS * 2 },
    );
  });
});
