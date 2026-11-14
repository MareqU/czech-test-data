// Specification of validateVin (VIN, identifikační číslo vozidla) – docs/rules/vin.md section 2 (check digit, steps
// and precedence, decisions 1-5), section 5 (known samples) and section 9 (reason codes). The validator ignores
// referenceDate.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateVin } from '../src/vin/index.js';
import {
  ALPHABET,
  CHECK,
  FORBIDDEN,
  LETTERS,
  NBSP,
  VALUE_ROWS,
  WEIGHTS,
  checkChar,
  oracleVin,
  replaceAt,
  structuredVinArb,
  toFullWidth,
  validVinArb,
  valueOf,
  weightedSum,
} from './support/vin.js';

const PROPERTY_RUNS = 500;
const VALID = { valid: true } as const;
const ALPHABET_CHARS = ALPHABET.split('');
const bad = (reason: string): { readonly valid: false; readonly reason: string } => ({ valid: false, reason });

/** Valid samples with the weighted sum S of section 5 (position 9 counts 0). */
const VALID_SAMPLES: readonly (readonly [string, number, string])[] = [
  ['1G4AH59H45G118341', 411, '49 CFR 565.15 Table VI, worked example 1'],
  ['VRZUA5FX29J276031', 464, '2021/535 Section B, Models A and E'],
  ['ZCFC35A3405850414', 356, '2021/535 Model B, 0 in position 10'],
  ['YSXFB56VX71134031', 362, '2021/535 Model C, check digit X (worked example 3)'],
  ['2T0YX646XX7472266', 428, '2021/535 Model D, X next to X in position 10'],
  ['1M8GDM9AXKP042788', 351, 'Wikipedia check-digit example, X'],
  ['TMBJR8NX6PY123456', 413, 'constructed, Skoda-shaped (worked example 2)'],
  ['TMBJR8NXXPY123413', 395, 'constructed, checkDigitX'],
  ['TMBJR8NX90Y123456', 350, 'constructed, noModelYear'],
  ['TM9KX3B11R0AB7012', 309, 'constructed, smallManufacturer, letters at positions 12-13'],
  ['TMBAR8NX6PY123456', 413, 'J to A, both value 1: an undetectable error (2.6)'],
  ['11111111111111111', 89, 'WMI not checked (decision 5)'],
  ['00000000000000000', 0, 'placeholder passes (question D)'],
];

const INVALID_SAMPLES: readonly (readonly [string, string, string])[] = [
  ['badChecksum', 'TMBJR8NX4PY123456', '6 to 4'],
  ['badChecksum', 'TMBJR8NXXPY123456', '6 to X'],
  ['badChecksum', 'TMBJR8NX3PY123465', 'last two digits swapped (the correct check digit is 7)'],
  ['badChecksum', '1G4AH59H55G118341', 'official US sample, 4 to 5'],
  ['badChecksum', 'TMBZZZ5JZ8B012345', 'legacy European shape, filler Z in position 9'],
  ['badChecksum', 'TM1VM11233A000001', 'Czech uredni cislo shape (3.4), the correct check digit is 7'],
  ['nonNumericSerial', 'TMBJR8NX5PY1234S6', 'S in position 16'],
  ['nonNumericSerial', 'TMBJR8NX8PY1234S6', 'S in position 16, check digit recomputed (S = 404, r = 8)'],
  ['nonNumericSerial', 'TMBJR8NX3PY1234S6', 'same with a wrong check digit: serial before checksum'],
  ['forbiddenLetter', 'TMBJR8NX3PYI23456', 'I for 1'],
  ['forbiddenLetter', 'TMBJR8NX3OY123456', 'O in position 10'],
  ['forbiddenLetter', 'TMBJR8NX3PY12345O', 'O in position 17: forbidden letter before serial'],
  ['forbiddenLetter', 'TMBJR8NX3PQ123456', 'Q'],
  ['wrongLength', 'TMBJR8NX3PY12345', '16 characters'],
  ['wrongLength', 'TMBJR8NX6PY1234560', '18 characters'],
  ['wrongLength', 'TMBJR8NX3PYI2345', '16 with I: length before forbidden letter'],
  ['wrongLength', 'TMB12345', 'short pre-standard shape'],
  ['wrongLength', '', 'empty'],
  ['badFormat', 'tmbjr8nx3py123456', 'lower case'],
  ['badFormat', 'TMBJR8NXxPY123413', 'lower-case x as check digit'],
  ['badFormat', 'TMB JR8NX3 PY123456', 'spaces'],
  ['badFormat', ' TMBJR8NX6PY123456', 'leading space, not trimmed'],
  ['badFormat', 'TMBJR8NX6PY123456 ', 'trailing space'],
  ['badFormat', 'TMBJR8NX3PY-123456', 'hyphen'],
  ['badFormat', 'TMBJR8NX*PY123456', 'masked check digit of the Skoda article'],
  ['badFormat', '*TMBJR8NX6PY123456*', 'start and end symbols of a two-line marking'],
  ['badFormat', 'TMBJR8NX3PY12345Ö', 'non-ASCII letter'],
  ['badFormat', `TMBJR8NX3${NBSP}PY123456`, 'no-break space'],
  ['badFormat', toFullWidth('TMBJR8NX3PY123456'), 'full-width characters'],
];

describe('accepts the known valid VINs (section 5)', () => {
  it.each(VALID_SAMPLES)('accepts %s (S = %d, %s)', (value) => {
    expect(validateVin(value)).toEqual(VALID);
    expect(oracleVin(value)).toEqual(VALID);
  });
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each(INVALID_SAMPLES)('gives %s for %j (%s)', (reason, value) => {
    expect(validateVin(value)).toEqual(bad(reason));
    expect(oracleVin(value)).toEqual(bad(reason));
  });
});

describe('check digit (section 2.1)', () => {
  it('equals the weighted sum mod 11 of the samples, X for remainder 10', () => {
    for (const [value, sum] of VALID_SAMPLES) {
      expect(weightedSum(value)).toBe(sum);
      expect(CHECK.charAt(sum % 11)).toBe(value.charAt(8));
    }
    expect(weightedSum('TMBJR8NX5PY1234S6') % 11).toBe(8);
  });

  it.each(Object.entries(VALUE_ROWS))('transliterates the letters of value %s as that digit', (value, letters) => {
    for (const letter of letters) {
      // a letter in position 1 has weight 8, so the check digit is 8 * value mod 11
      const vin = `${letter}0000000${CHECK.charAt((8 * Number(value)) % 11)}00000000`;
      expect(validateVin(vin)).toEqual(VALID);
      expect(oracleVin(vin)).toEqual(VALID);
      const wrong = replaceAt(vin, 8, CHECK.charAt((8 * Number(value) + 1) % 11));
      expect(validateVin(wrong)).toEqual(bad('badChecksum'));
    }
  });

  it.each(WEIGHTS.map((weight, index) => [index + 1, weight] as const).filter(([position]) => position !== 9))(
    'weights position %d by %d',
    (position, weight) => {
      // a single 1 at the position, zeros elsewhere: the check digit is the weight mod 11 (10 gives X)
      const body = replaceAt('00000000000000000', position - 1, '1');
      const vin = replaceAt(body, 8, CHECK.charAt(weight % 11));
      expect(validateVin(vin)).toEqual(VALID);
      expect(validateVin(replaceAt(vin, 8, CHECK.charAt((weight + 1) % 11)))).toEqual(bad('badChecksum'));
    },
  );

  it('gives position 9 weight 0: its own value does not matter, only that it equals the check digit', () => {
    expect(validateVin('1G4AH59H45G118341')).toEqual(VALID);
    expect(validateVin('1G4AH59H55G118341')).toEqual(bad('badChecksum'));
  });

  it('accepts exactly the one computed character at position 9, letters other than X included as wrong', () => {
    fc.assert(
      fc.property(validVinArb, (vin) => {
        const accepted = ALPHABET_CHARS.filter((char) => validateVin(replaceAt(vin, 8, char)).valid);
        expect(accepted).toEqual([checkChar(vin)]);
        for (const char of LETTERS.replace('X', '')) {
          expect(validateVin(replaceAt(vin, 8, char))).toEqual(bad('badChecksum'));
        }
      }),
      { numRuns: 200 },
    );
  });

  it('accepts any content of the allowed alphabet at positions 1-8 and 10-13 (decision 5), letters included', () => {
    fc.assert(
      fc.property(validVinArb, (vin) => {
        expect(validateVin(vin)).toEqual(VALID);
        expect(oracleVin(vin)).toEqual(VALID);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('what the check digit detects (section 2.6)', () => {
  const positionArb = fc.constantFrom(0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16);
  const choiceArb = fc.nat();
  const pick = (candidates: readonly string[], choice: number): string => candidates[choice % candidates.length] ?? '';

  it('misses a substitution by a character of the same value outside the serial', () => {
    fc.assert(
      fc.property(validVinArb, fc.constantFrom(0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12), choiceArb, (vin, index, choice) => {
        const original = vin.charAt(index);
        const same = ALPHABET_CHARS.filter((char) => char !== original && valueOf(char) === valueOf(original));
        fc.pre(same.length > 0); // the digit 0 has no letter of the same value
        expect(validateVin(replaceAt(vin, index, pick(same, choice)))).toEqual(VALID);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('catches every substitution by a character of another value (serial: digits only)', () => {
    fc.assert(
      fc.property(validVinArb, positionArb, choiceArb, (vin, index, choice) => {
        const other = ALPHABET_CHARS.filter(
          (char) => valueOf(char) !== valueOf(vin.charAt(index)) && (index <= 12 || /^[0-9]$/.test(char)),
        );
        expect(validateVin(replaceAt(vin, index, pick(other, choice)))).toEqual(bad('badChecksum'));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('catches a swap of two neighbours of different value that skips position 9', () => {
    fc.assert(
      fc.property(validVinArb, fc.constantFrom(0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15), (vin, index) => {
        const swapped = replaceAt(replaceAt(vin, index, vin.charAt(index + 1)), index + 1, vin.charAt(index));
        fc.pre(valueOf(vin.charAt(index)) !== valueOf(vin.charAt(index + 1)) && /^[0-9]{4}$/.test(swapped.slice(13)));
        expect(validateVin(swapped)).toEqual(bad('badChecksum'));
      }),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });
});

describe('serial, positions 14-17 (section 2.5 step 4)', () => {
  const letterArb = fc.constantFrom(...LETTERS.split(''));
  const serialIndexArb = fc.constantFrom(13, 14, 15, 16);

  it('gives nonNumericSerial for a letter in any of the last four positions, whatever the check digit', () => {
    fc.assert(
      fc.property(validVinArb, serialIndexArb, letterArb, (vin, index, letter) => {
        const value = replaceAt(vin, index, letter);
        expect(validateVin(value)).toEqual(bad('nonNumericSerial'));
        expect(validateVin(replaceAt(value, 8, checkChar(value)))).toEqual(bad('nonNumericSerial'));
        expect(oracleVin(value)).toEqual(bad('nonNumericSerial'));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('allows letters at positions 12 and 13 (small manufacturers), position 14 is the first digit', () => {
    expect(validateVin('TM9KX3B11R0AB7012')).toEqual(VALID);
    expect(validateVin('TM9KX3B11R0ABA012')).toEqual(bad('nonNumericSerial'));
    expect(validateVin('TM9KX3B11R0AB7A12')).toEqual(bad('nonNumericSerial'));
  });
});

describe('forbidden letters I, O and Q (section 2.5 step 3)', () => {
  it('gives forbiddenLetter for I, O or Q at any position, check digit position and serial included', () => {
    fc.assert(
      fc.property(
        validVinArb,
        fc.integer({ min: 0, max: 16 }),
        fc.constantFrom(...FORBIDDEN.split('')),
        (vin, index, letter) => {
          expect(validateVin(replaceAt(vin, index, letter))).toEqual(bad('forbiddenLetter'));
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('length (section 2.5 step 2)', () => {
  it('gives wrongLength for any VIN with a character removed or a digit added', () => {
    fc.assert(
      fc.property(validVinArb, fc.integer({ min: 0, max: 16 }), fc.integer({ min: 0, max: 17 }), (vin, drop, add) => {
        expect(validateVin(`${vin.slice(0, drop)}${vin.slice(drop + 1)}`)).toEqual(bad('wrongLength'));
        expect(validateVin(`${vin.slice(0, add)}7${vin.slice(add)}`)).toEqual(bad('wrongLength'));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('characters (section 1.5, decision 2)', () => {
  it.each([
    ['lower case', 'a'],
    ['space', ' '],
    ['hyphen', '-'],
    ['asterisk', '*'],
    ['dot', '.'],
    ['tab', '\t'],
    ['no-break space', NBSP],
    ['diacritics', 'Ž'],
    ['full-width letter', toFullWidth('A')],
    ['full-width digit', toFullWidth('1')],
  ])('gives badFormat for %s at any position', (_name, char) => {
    fc.assert(
      fc.property(validVinArb, fc.integer({ min: 0, max: 16 }), (vin, index) => {
        expect(validateVin(replaceAt(vin, index, char))).toEqual(bad('badFormat'));
      }),
      { numRuns: 60 },
    );
  });
});

describe('precedence badFormat → wrongLength → forbiddenLetter → nonNumericSerial → badChecksum (decision 4)', () => {
  it.each([
    ['badFormat over wrongLength', 'tmbjr8nx3py1234560', 'badFormat'],
    ['badFormat over forbiddenLetter', 'TMBJR8NX3OY12345*', 'badFormat'],
    ['badFormat over nonNumericSerial', 'TMBJR8NX3PY1234s6', 'badFormat'],
    ['badFormat over badChecksum', 'TMBJR8NX*PY123456', 'badFormat'],
    ['wrongLength over forbiddenLetter', 'TMBJR8NX3PYI2345', 'wrongLength'],
    ['wrongLength over nonNumericSerial', 'TMBJR8NX3PY1234S', 'wrongLength'],
    ['wrongLength over badChecksum', 'TMBJR8NX3PY12345', 'wrongLength'],
    ['forbiddenLetter over nonNumericSerial', 'TMBJR8NX3PY12I4S6', 'forbiddenLetter'],
    ['forbiddenLetter over nonNumericSerial in the same position', 'TMBJR8NX3PY12345O', 'forbiddenLetter'],
    ['forbiddenLetter over badChecksum', 'TMBJR8NX3PQ123456', 'forbiddenLetter'],
    ['nonNumericSerial over badChecksum', 'TMBJR8NX3PY1234S6', 'nonNumericSerial'],
  ])('%s', (_name, value, reason) => {
    expect(oracleVin(value)).toEqual(bad(reason));
    expect(validateVin(value)).toEqual(bad(reason));
  });
});

describe('does not depend on the date', () => {
  it('ignores referenceDate', () => {
    expect(validateVin('1G4AH59H45G118341', { referenceDate: '1900-01-01' })).toEqual(VALID);
    expect(validateVin('TMBJR8NX4PY123456', { referenceDate: '2099-12-31' })).toEqual(bad('badChecksum'));
  });
});

describe('agrees with the independent oracle for any input', () => {
  const charArb = fc.constantFrom(...'0123456789ABKXZIOQa -*'.split(''));

  it('matches on structured values (right, wrong and letter check digit, forbidden and serial letters, bad shapes)', () => {
    fc.assert(
      fc.property(structuredVinArb, (value) => {
        expect(validateVin(value)).toEqual(oracleVin(value));
      }),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });

  it('matches on arbitrary strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 20 }),
          fc.array(charArb, { maxLength: 20 }).map((list) => list.join('')),
          fc.array(charArb, { minLength: 17, maxLength: 17 }).map((list) => list.join('')),
        ),
        (value) => {
          expect(validateVin(value)).toEqual(oracleVin(value));
        },
      ),
      { numRuns: PROPERTY_RUNS * 2 },
    );
  });
});
