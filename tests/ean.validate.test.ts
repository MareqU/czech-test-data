// Specification of validateEan (EAN odběrného místa elektřiny) – docs/rules/ean.md section 2 (algorithm, steps and
// precedence, decisions 1-4), section 5 (known samples) and section 9 (reason codes). The validator ignores referenceDate.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateEan } from '../src/ean/index.js';
import { checkDigit, oracleEan, shortcutCheckDigit, structuredEanArb } from './support/ean.js';

const PROPERTY_RUNS = 500;
const VALID = { valid: true } as const;
const NBSP = String.fromCharCode(0xa0);
const toFullWidth = (ascii: string): string =>
  ascii
    .split('')
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0))
    .join('');

const VALID_SAMPLES: readonly (readonly [string, string])[] = [
  ['859182412340000003', 'OTE example, S = 117'],
  ['859182412340000010', 'OTE example, check digit 0'],
  ['859182412340000027', 'OTE example'],
  ['859182412340000034', 'OTE example'],
  ['859182412340000041', 'OTE example'],
  ['859182412340000058', 'OTE example'],
  ['859182400512345670', 'ČEZ-shaped, check digit 0 (checkDigitZero)'],
  ['859182400800000007', 'ČEZ-shaped, digit 10 = 8'],
  ['859182400276543213', 'EG.D-shaped'],
  ['859182400199999999', 'EG.D-shaped, many 9s'],
  ['859182400300421982', 'PRE-shaped'],
  ['859182403450123454', 'LDS network 0345'],
  ['859182405012345670', 'undetectable 0/5 transposition'],
  ['859182400000000005', 'positions 8-17 are not range-checked'],
  ['859182499999999995', 'network 9999, not range-checked'],
];

const INVALID_SAMPLES: readonly (readonly [string, string, string])[] = [
  ['badChecksum', '859182400276543214', 'check digit 3 to 4'],
  ['badChecksum', '859182400512345671', 'check digit 0 to 1'],
  ['badChecksum', '859182412340000004', 'OTE example, 3 to 4'],
  ['badChecksum', '859182400267543213', 'positions 11/12 swapped'],
  ['badChecksum', '859182400276543000', 'after Excel 15-digit rounding'],
  ['wrongPrefix', '859182500512345677', 'GS1-valid, 8591825'],
  ['wrongPrefix', '590123400000000011', 'GS1-valid, Polish PPE shape'],
  ['wrongPrefix', '000000000000000000', 'GS1-valid, all zeros'],
  ['wrongLength', '00512345670', '11 digits, length before prefix'],
  ['wrongLength', '85918240051234567', '17 digits, check digit missing'],
  ['wrongLength', '8591824005123456700', '19 digits'],
  ['wrongLength', '8591824000007', '13 digits, OTE registration number shape'],
  ['wrongLength', '', 'empty'],
  ['letters', '85918240051234567O', 'O for 0'],
  ['letters', '8591824OO512345670', 'two letters'],
  ['letters', 'EAN 859182400512345670', 'label in front, letters before format'],
  ['letters', '8,59182E+17', 'Excel scientific notation'],
  ['letters', '27ZG000000000000', 'gas EIC shape'],
  ['badFormat', '859182400 512345670', 'space'],
  ['badFormat', '859 1824 0051 2345 670', 'grouped'],
  ['badFormat', ' 859182400512345670', 'leading space, not trimmed'],
  ['badFormat', '859182400512345670 ', 'trailing space'],
  ['badFormat', '8591824-00512345670', 'hyphen'],
  ['badFormat', '+859182400512345670', 'sign'],
  ['badFormat', `859182400${NBSP}512345670`, 'no-break space'],
  ['badFormat', toFullWidth('859182400512345670'), 'full-width digits'],
];

describe('accepts the known valid EANs (section 5)', () => {
  it.each(VALID_SAMPLES)('accepts %s (%s)', (value) => {
    expect(validateEan(value)).toEqual(VALID);
    expect(oracleEan(value)).toEqual(VALID);
  });
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each(INVALID_SAMPLES)('gives %s for %j (%s)', (reason, value) => {
    expect(validateEan(value)).toEqual({ valid: false, reason });
    expect(oracleEan(value)).toEqual({ valid: false, reason });
  });
});

describe('check digit (section 2.1)', () => {
  it('matches the recomputed OTE values and the shortcut of section 2.2', () => {
    for (const [value] of VALID_SAMPLES.filter(([sample]) => sample.startsWith('8591824'))) {
      expect(checkDigit(value.slice(0, 17))).toBe(Number(value[17]));
      expect(shortcutCheckDigit(value.slice(0, 17))).toBe(Number(value[17]));
    }
  });

  it('accepts exactly one last digit for every 17-digit body with the prefix', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9]{10}$/), (tail) => {
        const body = `8591824${tail}`;
        const accepted = '0123456789'.split('').filter((last) => validateEan(`${body}${last}`).valid);
        expect(accepted).toEqual([String(checkDigit(body))]);
      }),
      { numRuns: 200 },
    );
  });
});

describe('precedence letters → badFormat → wrongLength → wrongPrefix → badChecksum (decision 2)', () => {
  it.each([
    ['letters over badFormat', '8591824 0051234567O', 'letters'],
    ['letters over wrongLength', 'A', 'letters'],
    ['badFormat over wrongLength', '859182400 5', 'badFormat'],
    ['badFormat over wrongPrefix', '5901234 00000000011', 'badFormat'],
    ['wrongLength over wrongPrefix', '5901234000000000111', 'wrongLength'],
    ['wrongPrefix over badChecksum', '859182500512345678', 'wrongPrefix'],
  ])('%s', (_name, value, reason) => {
    expect(oracleEan(value)).toEqual({ valid: false, reason });
    expect(validateEan(value)).toEqual({ valid: false, reason });
  });
});

describe('does not depend on the date', () => {
  it('ignores referenceDate', () => {
    expect(validateEan('859182412340000003', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validateEan('859182500512345677', { referenceDate: '2099-12-31' })).toEqual({
      valid: false,
      reason: 'wrongPrefix',
    });
  });
});

describe('agrees with the independent oracle for any input', () => {
  const charArb = fc.constantFrom(...'0123456789 AOl-8591824'.split(''));

  it('matches on structured values (right and wrong check digit, prefix, length, letters, separators)', () => {
    fc.assert(
      fc.property(structuredEanArb, (value) => {
        expect(validateEan(value)).toEqual(oracleEan(value));
      }),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });

  it('matches on arbitrary strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 24 }),
          fc.array(charArb, { maxLength: 24 }).map((a) => a.join('')),
          fc.array(charArb, { maxLength: 14 }).map((a) => `8591824${a.join('')}`),
        ),
        (value) => {
          expect(validateEan(value)).toEqual(oracleEan(value));
        },
      ),
      { numRuns: PROPERTY_RUNS * 2 },
    );
  });
});
