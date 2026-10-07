// Specification of validatePostalCode (PSČ) – docs/rules/postalCode.md section 2 (algorithm and precedence),
// section 5 (known samples) and section 8 (decisions). Format only: no checksum, existence is not checked.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validatePostalCode } from '../src/postalCode/index.js';
import { oracleValidate } from './support/postalCode.js';

const PROPERTY_RUNS = 500;
const NBSP = String.fromCharCode(0xa0);
const FULL_WIDTH = [0xff11, 0xff12, 0xff13, 0x20, 0xff14, 0xff15].map((c) => String.fromCharCode(c)).join('');

const VALID = { valid: true } as const;

describe('accepts the real postal codes of Česká pošta and UPU documents (section 5)', () => {
  it.each(['190 16', '623 00', '378 07', '513 01', '460 15', '150 06', '102 00', '100 00', '251 66', '530 87', '110 00', '225 99'])(
    'accepts %j',
    (value) => {
      expect(validatePostalCode(value)).toEqual(VALID);
      expect(validatePostalCode(value.replace(' ', ''))).toEqual(VALID);
    },
  );

  it.each(['62300', '12345', '799 99', '200 00', '10000', '79999', '249 99'])(
    'accepts the well-formed %j (space optional, non-geographic range, existence not checked)',
    (value) => {
      expect(validatePostalCode(value)).toEqual(VALID);
    },
  );
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each([
    ['foreignRange', '948 01', 'Lučenec, Slovakia'],
    ['foreignRange', '811 01', 'first digit 8'],
    ['foreignRange', '010 01', 'first digit 0'],
    ['foreignRange', '00000', 'first digit 0 without space'],
    ['foreignRange', '99999', 'first digit 9 without space'],
    ['wrongLength', '1011', 'Wien, 4 digits'],
    ['wrongLength', '623 0', '4 digits, space in place'],
    ['wrongLength', '623 000', '6 digits, space in place'],
    ['wrongLength', '623000', '6 digits'],
    ['wrongLength', '', 'empty string'],
    ['wrongLength', '623 ', 'trailing space at index 3, only 3 digits'],
    ['badFormat', ' ', 'a lone space at index 0 is misplaced'],
    ['letters', 'CZ-110 00', 'country prefix'],
    ['letters', '1O0 00', 'letter O instead of zero'],
    ['letters', 'HR-21001', 'Croatian prefix'],
    ['badFormat', '6230 0', 'space after the 4th digit'],
    ['badFormat', '62 300', 'space after the 2nd digit'],
    ['badFormat', '623-00', 'hyphen'],
    ['badFormat', '623  00', 'two spaces'],
    ['badFormat', ' 62300', 'leading space is not trimmed'],
    ['badFormat', '62300 ', 'trailing space is not trimmed'],
    ['badFormat', `623${NBSP}00`, 'no-break space (decision 4)'],
    ['badFormat', FULL_WIDTH, 'full-width digits'],
    ['badFormat', '623\t00', 'tab'],
    ['badFormat', '62300\n', 'newline'],
    ['badFormat', '623.00', 'dot'],
  ] as const)('rejects as %s: %j (%s)', (...[reason, value]) => {
    expect(validatePostalCode(value)).toEqual({ valid: false, reason });
  });
});

describe('precedence letters → badFormat → wrongLength → foreignRange (section 2)', () => {
  it.each([
    ['62 30', 'badFormat', 'misplaced space runs before the length check'],
    ['9O8 01', 'letters', 'a letter beats the foreign first digit'],
    ['948 0', 'wrongLength', 'length runs before the range check'],
    ['9O8-01', 'letters', 'a letter beats the hyphen'],
    ['A23-45', 'letters', 'a letter beats the hyphen, valid first digit'],
    ['948-01', 'badFormat', 'a bad separator beats the foreign first digit'],
    ['0 1', 'badFormat', 'a bad separator beats the length'],
    ['CZ110 00', 'letters', 'letters beat everything'],
  ] as const)('%j gives %s (%s)', (...[value, reason]) => {
    expect(validatePostalCode(value)).toEqual({ valid: false, reason });
  });
});

describe('the validator is the format of section 2 and nothing else', () => {
  it('agrees with the independent oracle on arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 10 }), (value) => {
        expect(validatePostalCode(value)).toEqual(oracleValidate(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('agrees with the oracle on strings made of digits, spaces and separators', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9 A-]{0,8}$/), (value) => {
        expect(validatePostalCode(value)).toEqual(oracleValidate(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('accepts every NNN NN and NNNNN with a first digit 1 to 7, and rejects 0, 8, 9 as foreignRange', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99999 }), fc.boolean(), (n, spaced) => {
        const digits = String(n).padStart(5, '0');
        const value = spaced ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
        const foreign = /^[089]/.test(digits);
        expect(validatePostalCode(value)).toEqual(foreign ? { valid: false, reason: 'foreignRange' } : VALID);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('ignores referenceDate', () => {
    expect(validatePostalCode('623 00', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validatePostalCode('948 01', { referenceDate: '2099-12-31' })).toEqual({ valid: false, reason: 'foreignRange' });
  });
});
