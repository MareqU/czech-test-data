// Specification of validateEic (EIC kód odběrného místa plynu) – docs/rules/eic.md section 2 (algorithm, steps and
// precedence, decisions 1-4), section 5 (known samples) and section 9 (reason codes). The validator ignores referenceDate.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateEic } from '../src/eic/index.js';
import { ALPHABET, checkValue, entsoeCheckValue, oracleEic, structuredEicArb, weightedSum } from './support/eic.js';

const PROPERTY_RUNS = 500;
const VALID = { valid: true } as const;
const NBSP = String.fromCharCode(0xa0);
const toFullWidth = (ascii: string): string =>
  ascii
    .split('')
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) + 0xfee0))
    .join('');

const VALID_SAMPLES: readonly (readonly [string, string])[] = [
  ['27ZG100Z0000001K', 'worked example 2, S = 1164'],
  ['27ZG200Z12345679', 'check character is a digit (checkCharacterDigit)'],
  ['27ZG900Z00000000', 'S = 1258 = 37 * 34, check character 0, not 37'],
  ['27ZG100V0000001J', 'virtual point'],
  ['27ZG100N0000001H', 'non-customer point'],
  ['27ZG299Z00000006', 'LDS-shaped (lds)'],
  ['27ZG203Z9999999Z', 'ENERGO KD LDS prefix, check character Z (value 35)'],
  ['27ZG---VPB-----V', 'OTE VOB code shape, hyphens in positions 5-15 accepted (decision 4)'],
];

const INVALID_SAMPLES: readonly (readonly [string, string, string])[] = [
  ['badChecksum', '27ZG100Z0000001L', 'check K to L'],
  ['badChecksum', '27ZG200Z12345678', 'check 9 to 8'],
  ['badChecksum', '27ZG100Z0000010K', 'positions 14/15 swapped'],
  ['badChecksum', '27ZG1OOZ0000001K', 'letter O for 0'],
  ['badChecksum', '27ZG100Z00000370', 'body with S = 1: no check character can be valid'],
  ['badChecksum', '27ZG---VPB-----E', 'OTE printed VOB code, ENTSO-E expects V'],
  ['dashCheckCharacter', '27ZG100Z0000037-', 'the sum is satisfied by the dash'],
  ['dashCheckCharacter', '27ZG100Z0000001-', 'sum also wrong; the dash step comes first'],
  ['wrongPrefix', '27XGOTE-CZ-GAS-R', 'OTE participant EIC, ENTSO-E-valid'],
  ['wrongPrefix', '27XG200Z12345670', 'wrongPrefix variant shape, ENTSO-E-valid'],
  ['wrongPrefix', '27XG-PPD-DSO-CZE', 'PPD participant EIC'],
  ['wrongPrefix', '21Y---A001A001-B', 'ENTSOG LIO 21'],
  ['wrongPrefix', '10X---ENTSOE---L', 'ENTSO-E RM example'],
  ['wrongPrefix', '10X168Y4E6H0041Z', 'ENTSO-E RM example'],
  ['wrongPrefix', '11XRWENET12345-2', 'ENTSO-E IG example'],
  ['wrongPrefix', '10Z317973010277Q', 'ENTSO-E IG incorrect example; prefix before checksum'],
  ['wrongPrefix', '23X--130302DLGW-', 'trailing dash with S = 1; prefix first'],
  ['wrongLength', '27ZG100Z0000001', '15 characters, check character missing'],
  ['wrongLength', '27ZG100Z0000001K0', '17 characters'],
  ['wrongLength', '859182400512345670', 'an electricity EAN'],
  ['wrongLength', '', 'empty'],
  ['badFormat', '27zg100z0000001k', 'lower case'],
  ['badFormat', '27ZG100Z0000001k', 'lower-case check character'],
  ['badFormat', '27ZG 100Z 0000001K', 'spaces'],
  ['badFormat', ' 27ZG100Z0000001K', 'leading space, not trimmed'],
  ['badFormat', '27ZG100Z0000001K ', 'trailing space'],
  ['badFormat', '27ZG100Z0000001*', 'asterisk'],
  ['badFormat', '27ZG100Z_000001K', 'underscore'],
  ['badFormat', 'EIC 27ZG100Z0000001K', 'label in front, format before length'],
  ['badFormat', `27ZG100Z${NBSP}0000001K`, 'no-break space'],
  ['badFormat', toFullWidth('27ZG100Z0000001K'), 'full-width characters'],
];

describe('accepts the known valid EICs (section 5)', () => {
  it.each(VALID_SAMPLES)('accepts %s (%s)', (value) => {
    expect(validateEic(value)).toEqual(VALID);
    expect(oracleEic(value)).toEqual(VALID);
  });
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each(INVALID_SAMPLES)('gives %s for %j (%s)', (reason, value) => {
    expect(validateEic(value)).toEqual({ valid: false, reason });
    expect(oracleEic(value)).toEqual({ valid: false, reason });
  });
});

describe('check character (section 2)', () => {
  it('matches the recomputed sums and both forms of the formula for the samples', () => {
    expect(weightedSum('11XRWENET12345-')).toBe(2107);
    expect(weightedSum('27ZG100Z0000001')).toBe(1164);
    expect(weightedSum('27ZG200Z1234567')).toBe(1286);
    expect(weightedSum('27ZG900Z0000000')).toBe(1258);
    expect(weightedSum('27ZG---VPB-----')).toBe(3299);
    for (const [value] of VALID_SAMPLES) {
      const body = value.slice(0, 15);
      expect(ALPHABET.charAt(checkValue(body))).toBe(value.charAt(15));
      expect(entsoeCheckValue(body)).toBe(checkValue(body));
    }
  });

  it('accepts exactly the one computed last character, and none when the computed value is 36 (dash)', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9A-Z-]{11}$/), (tail) => {
        const body = `27ZG${tail}`;
        const accepted = ALPHABET.split('').filter((last) => validateEic(`${body}${last}`).valid);
        expect(accepted).toEqual(checkValue(body) === 36 ? [] : [ALPHABET.charAt(checkValue(body))]);
      }),
      { numRuns: 300 },
    );
  });

  it('gives dashCheckCharacter for any 27ZG body followed by a dash, whatever the sum', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9A-Z-]{11}$/), (tail) => {
        expect(validateEic(`27ZG${tail}-`)).toEqual({ valid: false, reason: 'dashCheckCharacter' });
      }),
      { numRuns: 300 },
    );
  });
});

describe('precedence badFormat → wrongLength → wrongPrefix → dashCheckCharacter → badChecksum (decision 2)', () => {
  it.each([
    ['badFormat over wrongLength', '27ZG100Z0000001k0', 'badFormat'],
    ['badFormat over wrongPrefix', '27xg100z0000001K', 'badFormat'],
    ['wrongLength over wrongPrefix', '27XG100Z0000001', 'wrongLength'],
    ['wrongLength over dashCheckCharacter', '27ZG100Z0000001--', 'wrongLength'],
    ['wrongPrefix over dashCheckCharacter', '27XG100Z0000037-', 'wrongPrefix'],
    ['wrongPrefix over badChecksum', '27XG100Z0000001L', 'wrongPrefix'],
    ['dashCheckCharacter over badChecksum', '27ZG100Z0000001-', 'dashCheckCharacter'],
  ])('%s', (_name, value, reason) => {
    expect(oracleEic(value)).toEqual({ valid: false, reason });
    expect(validateEic(value)).toEqual({ valid: false, reason });
  });
});

describe('does not depend on the date', () => {
  it('ignores referenceDate', () => {
    expect(validateEic('27ZG100Z0000001K', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validateEic('27XG200Z12345670', { referenceDate: '2099-12-31' })).toEqual({
      valid: false,
      reason: 'wrongPrefix',
    });
  });
});

describe('agrees with the independent oracle for any input', () => {
  const charArb = fc.constantFrom(...'0123456789ABKZ-27G xl'.split(''));

  it('matches on structured values (right, wrong and dash check character, prefix, length, bad characters)', () => {
    fc.assert(
      fc.property(structuredEicArb, (value) => {
        expect(validateEic(value)).toEqual(oracleEic(value));
      }),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });

  it('matches on arbitrary strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 20 }),
          fc.array(charArb, { maxLength: 20 }).map((a) => a.join('')),
          fc.array(charArb, { maxLength: 14 }).map((a) => `27ZG${a.join('')}`),
        ),
        (value) => {
          expect(validateEic(value)).toEqual(oracleEic(value));
        },
      ),
      { numRuns: PROPERTY_RUNS * 2 },
    );
  });
});
