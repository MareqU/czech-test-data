// Specification of validateIco (IČO) – docs/rules/ico.md section 2 (algorithm and precedence), section 5
// (known samples, all hand-verified against S = 8·d1 + … + 2·d7, d8 = (11 − S mod 11) mod 10) and section 9.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateIco } from '../src/ico/index.js';
import { checkDigitOf, oracleValidate, remainderOf } from './support/ico.js';

const PROPERTY_RUNS = 500;
const NBSP = String.fromCharCode(0xa0);
const FULL_WIDTH = [0xff10, 0xff10, 0xff17, 0xff17, 0xff10, 0xff14, 0xff11, 0xff11]
  .map((c) => String.fromCharCode(c))
  .join('');

const VALID = { valid: true } as const;

describe('accepts the real IČO from ARES (section 5), covering every branch of the check digit', () => {
  it.each([
    ['00177041', 'Škoda Auto, a = 0 → d8 1, two leading zeros'],
    ['00064581', 'Hlavní město Praha, a = 0 → d8 1'],
    ['00845451', 'Statutární město Ostrava, a = 0 → d8 1'],
    ['26450691', 'MAKRO, a = 0 → d8 1, no leading zero'],
    ['48136450', 'Česká národní banka, a = 1 → d8 0'],
    ['68407700', 'ČVUT, a = 1 → d8 0'],
    ['00075370', 'Plzeň, a = 1 → d8 0'],
    ['00001350', 'ČSOB, a = 1 → d8 0, four leading zeros'],
    ['01569651', 'Superfaktura.cz, a = 10 → d8 1'],
    ['00006947', 'Ministerstvo financí, a = 4 → d8 7'],
    ['00025593', 'ČSÚ, a = 8 → d8 3'],
    ['45274649', 'ČEZ, a = 2 → d8 9'],
  ])('accepts %s (%s)', (value) => {
    expect(validateIco(value)).toEqual(VALID);
  });

  it.each(['12345679', '11111119', '10001000', '10000101', '00000019', '00000001'])(
    'accepts the constructed %s (including base 0000000, decision 10)',
    (value) => {
      expect(validateIco(value)).toEqual(VALID);
    },
  );
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each([
    ['badChecksum', '12345678', 'expected 9'],
    ['badChecksum', '11111111', 'expected 9'],
    ['badChecksum', '45274648', 'ČEZ with the last digit changed'],
    ['badChecksum', '00177040', 'a = 0 expects 1, a naive sum check accepts it'],
    ['badChecksum', '00064580', 'a = 0 expects 1, a naive sum check accepts it'],
    ['badChecksum', '48136451', 'a = 1 expects 0'],
    ['badChecksum', '00000000', 'a = 0 expects 1'],
    ['wrongLength', '177041', 'Škoda Auto without zeros in front'],
    ['wrongLength', '1569651', '7 digits'],
    ['wrongLength', '001770410', '9 digits'],
    ['wrongLength', '', 'empty string'],
    ['letters', 'CZ00177041', 'DIČ, not IČO'],
    ['letters', '0O177041', 'letter O instead of zero'],
    ['letters', '4813645l', 'lowercase L instead of one'],
    ['letters', '0O17704', 'letters win over length'],
    ['badFormat', '001 77 041', 'spaces'],
    ['badFormat', ' 00177041', 'leading space is not trimmed'],
    ['badFormat', '00177041 ', 'trailing space is not trimmed'],
    ['badFormat', '0017-7041', 'hyphen'],
    ['badFormat', '001 7704', 'format runs before length'],
    ['badFormat', `0017${NBSP}7041`, 'no-break space'],
    ['badFormat', FULL_WIDTH, 'full-width digits are neither [0-9] nor letters'],
    ['badFormat', '0017.7041', 'dot'],
    ['badFormat', '00177041\n', 'newline'],
  ] as const)('rejects as %s: %j (%s)', (...[reason, value]) => {
    expect(validateIco(value)).toEqual({ valid: false, reason });
  });
});

describe('precedence letters → badFormat → wrongLength → badChecksum (section 2)', () => {
  it.each([
    ['0O17 7041', 'letters', 'a letter beats the space'],
    ['12 45678', 'badFormat', 'a bad character beats the checksum'],
    ['1234567', 'wrongLength', 'length beats the checksum'],
    ['A', 'letters', 'a single letter'],
    [' ', 'badFormat', 'a lone space'],
  ] as const)('%j gives %s (%s)', (...[value, reason]) => {
    expect(validateIco(value)).toEqual({ valid: false, reason });
  });
});

describe('the validator is the algorithm of section 2 and nothing else', () => {
  it('agrees with the independent oracle on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 10 }), (value) => {
        expect(validateIco(value)).toEqual(oracleValidate(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('agrees with the oracle on strings of digits, letters and separators', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9 A-]{0,10}$/), (value) => {
        expect(validateIco(value)).toEqual(oracleValidate(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('accepts exactly one check digit for every 7-digit base and rejects the other nine as badChecksum', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_999_999 }), (n) => {
        const base = String(n).padStart(7, '0');
        const expected = checkDigitOf(base);
        for (let digit = 0; digit <= 9; digit += 1) {
          expect(validateIco(`${base}${String(digit)}`)).toEqual(
            digit === expected ? VALID : { valid: false, reason: 'badChecksum' },
          );
        }
      }),
      { numRuns: 200 },
    );
  });

  it('uses (11 − a) mod 10, not the naive "sum with weight 1 divisible by 11" (a = 0 → 1, a = 1 → 0, a = 10 → 1)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9_999_999 }), (n) => {
        const base = String(n).padStart(7, '0');
        const a = remainderOf(base);
        const wrapped: Readonly<Record<number, number>> = { 0: 1, 1: 0, 10: 1 };
        expect(validateIco(`${base}${String(wrapped[a] ?? 11 - a)}`)).toEqual(VALID);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('ignores referenceDate', () => {
    expect(validateIco('00177041', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validateIco('00177040', { referenceDate: '2099-12-31' })).toEqual({ valid: false, reason: 'badChecksum' });
  });
});
