// Specification of the plain DIČ generator and its options – docs/rules/dic.md section 8 (options, form draw,
// consistency, RangeErrors) and section 9 (decisions 3, 4, 8, 10); docs/rules/core.md section 3 (invalid options
// throw RangeError naming the option). Expected properties come from tests/support/dic.ts (independent oracle)
// and tests/support/birthNumber.ts (decoding the inner birth number).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDic, validateDic } from '../src/dic/index.js';
import type { DicOptions } from '../src/dic/index.js';
import { IMPOSSIBLE_DATES, MALFORMED_DATES, dateArb, draw, seedArb } from './support/helpers.js';
import { decodeOrFail, isZeroEnding, minDate } from './support/birthNumber.js';
import type { OracleGender } from './support/birthNumber.js';
import { oracleValidate, referenceDicRandom, referenceIco } from './support/dic.js';

const PROPERTY_RUNS = 300;
const REFERENCE_DATE = '2026-10-07';
const genderArb = fc.constantFrom<OracleGender>('male', 'female');

/** Birth dates the options accept with referenceDate 2026-10-07: 1900-01-01 … referenceDate (decision 8). */
const birthDateArb = dateArb('1900-01-01', REFERENCE_DATE);

describe('plain values without options (section 8: form draw, then the plain inner generator)', () => {
  it('are valid, CZ + 8 digits (IČO) or CZ + 10 digits (birth number), no separators', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^CZ(?:[1-9][0-9]{7}|[0-9]{10})$/);
          expect(validateDic(value, { referenceDate: REFERENCE_DATE })).toEqual({ valid: true });
          expect(oracleValidate(value, REFERENCE_DATE)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('draws the form first: int(0, 1) of the dic stream, 0 = IČO (derivable draws), 1 = birth number', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const reference = referenceDicRandom(seed);
        const value = createDic({ seed, referenceDate: REFERENCE_DATE })();
        if (reference.int(0, 1) === 0) {
          expect(value).toBe(`CZ${referenceIco(reference)}`);
        } else {
          expect(value).toMatch(/^CZ[0-9]{10}$/);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('uses both forms about equally often', () => {
    const generator = createDic({ seed: 20261007, referenceDate: REFERENCE_DATE });
    const lengths = draw(2000, () => generator().length);
    const icoCount = lengths.filter((length) => length === 10).length;
    expect(icoCount).toBeGreaterThan(850);
    expect(icoCount).toBeLessThan(1150);
    expect(lengths.every((length) => length === 10 || length === 12)).toBe(true);
  });

  it('builds the birth-number form from 1954-01-01 … min(2025-12-31, referenceDate), 10 digits, no +20/+70', () => {
    fc.assert(
      fc.property(seedArb, dateArb('1954-01-01', '2099-12-31'), (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(10, () => generator())) {
          expect(oracleValidate(value, referenceDate)).toEqual({ valid: true });
          if (value.length === 12) {
            const decoded = decodeOrFail(value.slice(2));
            expect(decoded.date >= '1954-01-01' && decoded.date <= minDate('2025-12-31', referenceDate)).toBe(true);
            expect(decoded.additionalSeries).toBe(false);
            expect(isZeroEnding(decoded)).toBe(false);
          }
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never builds an assigned-looking number or a 9-digit number (decision 3, section 8)', () => {
    const generator = createDic({ seed: 7, referenceDate: REFERENCE_DATE });
    for (const value of draw(3000, () => generator())) {
      expect(value).not.toMatch(/^CZ6[0-9]{8}$/);
      expect(value).not.toMatch(/^CZ[0-9]{9}$/);
    }
  });
});

describe('option from: ico', () => {
  it('gives CZ + the plain IČO draws (d1 = int(1, 9), digits(6), check digit) without a form draw', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        const reference = referenceDicRandom(seed);
        for (let i = 0; i < 5; i += 1) {
          expect(generator({ from: 'ico' })).toBe(`CZ${referenceIco(reference)}`);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('throws RangeError naming the option when gender or birthDate is passed with it', () => {
    const generator = createDic({ seed: 1, referenceDate: REFERENCE_DATE });
    const withGender = { from: 'ico', gender: 'male' } as unknown as DicOptions;
    const withBirthDate = { from: 'ico', birthDate: '1990-05-01' } as unknown as DicOptions;
    expect(() => generator(withGender)).toThrow(RangeError);
    expect(() => generator(withGender)).toThrow(/gender/);
    expect(() => generator(withBirthDate)).toThrow(RangeError);
    expect(() => generator(withBirthDate)).toThrow(/birthDate/);
  });
});

describe('options gender, birthDate and from: birthNumber (decision 8, consistency)', () => {
  it('decodes back to the given gender and birthDate, 9 digits before 1954 and 10 digits from 1954', () => {
    fc.assert(
      fc.property(seedArb, genderArb, birthDateArb, (seed, gender, birthDate) => {
        const value = createDic({ seed, referenceDate: REFERENCE_DATE })({ gender, birthDate });
        expect(value).toMatch(birthDate < '1954-01-01' ? /^CZ[0-9]{9}$/ : /^CZ[0-9]{10}$/);
        expect(value).not.toMatch(/^CZ6/);
        const decoded = decodeOrFail(value.slice(2));
        expect(decoded.gender).toBe(gender);
        expect(decoded.date).toBe(birthDate);
        expect(oracleValidate(value, REFERENCE_DATE)).toEqual({ valid: true });
        expect(validateDic(value, { referenceDate: REFERENCE_DATE })).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('treats from omitted with gender or birthDate as from: birthNumber (same value, no form draw)', () => {
    fc.assert(
      fc.property(seedArb, genderArb, birthDateArb, (seed, gender, birthDate) => {
        const make = (): ReturnType<typeof createDic> => createDic({ seed, referenceDate: REFERENCE_DATE });
        const explicit = make()({ from: 'birthNumber', gender, birthDate });
        expect(make()({ gender, birthDate })).toBe(explicit);
        expect(make()({ from: 'birthNumber', gender })).toBe(make()({ gender }));
        expect(make()({ from: 'birthNumber', birthDate })).toBe(make()({ birthDate }));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives a birth-number DIČ without a form draw for from: birthNumber alone', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        for (const value of draw(10, () => generator({ from: 'birthNumber' }))) {
          expect(value).toMatch(/^CZ[0-9]{10}$/);
          expect(oracleValidate(value, REFERENCE_DATE)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('honours gender alone and birthDate alone', () => {
    fc.assert(
      fc.property(seedArb, genderArb, birthDateArb, (seed, gender, birthDate) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        expect(decodeOrFail(generator({ gender }).slice(2)).gender).toBe(gender);
        expect(decodeOrFail(generator({ birthDate }).slice(2)).date).toBe(birthDate);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each(['1900-01-01', '1953-12-31', '1954-01-01', REFERENCE_DATE])('accepts the boundary birthDate %s', (birthDate) => {
    const value = createDic({ seed: 5, referenceDate: REFERENCE_DATE })({ birthDate });
    expect(decodeOrFail(value.slice(2)).date).toBe(birthDate);
    expect(oracleValidate(value, REFERENCE_DATE)).toEqual({ valid: true });
  });
});

describe('options that throw RangeError naming the option (docs/rules/dic.md section 8, core.md section 3)', () => {
  const generator = createDic({ seed: 1, referenceDate: REFERENCE_DATE });

  it.each(['1899-12-31', '1869-12-31', '1860-01-01', '1854-01-01', '1853-12-31'])(
    'rejects birthDate %s before 1900-01-01 (the 1860 – 1869 overlap is never generated)',
    (birthDate) => {
      expect(() => generator({ birthDate })).toThrow(RangeError);
      expect(() => generator({ birthDate })).toThrow(/birthDate/);
      expect(() => generator({ from: 'birthNumber', birthDate })).toThrow(/birthDate/);
      expect(() => generator({ gender: 'male', birthDate })).toThrow(/birthDate/);
    },
  );

  it.each([...MALFORMED_DATES, ...IMPOSSIBLE_DATES.map(({ date }) => date), '2026-10-08', '2054-01-01'])(
    'rejects birthDate %j',
    (birthDate) => {
      expect(() => generator({ birthDate })).toThrow(RangeError);
      expect(() => generator({ birthDate })).toThrow(/birthDate/);
    },
  );

  it('rejects an invalid runtime gender naming gender', () => {
    const bad = { gender: 'other' } as unknown as DicOptions;
    expect(() => generator(bad)).toThrow(RangeError);
    expect(() => generator(bad)).toThrow(/gender/);
  });

  it.each(['phone', 'rc', 'birthnumber', 'ICO', '', 'dic'])('rejects an unknown from %j naming from', (from) => {
    const bad = { from } as unknown as DicOptions;
    expect(() => generator(bad)).toThrow(RangeError);
    expect(() => generator(bad)).toThrow(/from/);
  });
});
