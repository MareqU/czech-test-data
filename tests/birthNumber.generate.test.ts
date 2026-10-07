// Specification of the plain birthNumber generator (rodné číslo) and its options –
// docs/rules/birthNumber.md section 9 (generator options, fixed date ranges), decisions 2, 5, 6 and 10;
// docs/rules/core.md section 3 (invalid options throw RangeError naming the option, amendment A3).
// Expected properties are checked with the independent oracle in tests/support/birthNumber.ts.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBirthNumber, validateBirthNumber } from '../src/birthNumber/index.js';
import type { BirthNumberOptions } from '../src/birthNumber/index.js';
import { IMPOSSIBLE_DATES, MALFORMED_DATES, addDays, dateArb, draw, seedArb } from './support/helpers.js';
import {
  RANGES,
  decodeOrFail,
  isWithin,
  isZeroEnding,
  minDate,
  mod11,
} from './support/birthNumber.js';
import type { DecodedBirthNumber, OracleGender } from './support/birthNumber.js';

const PROPERTY_RUNS = 300;

/** A reference date after every fixed range of the plain generator (section 9): no cut. */
const LATER_REFERENCE_DATE = '2026-10-05';

const genderArb = fc.constantFrom<OracleGender>('male', 'female');

/** Reference dates after the plain range (2025-12-31), so nothing is cut. */
const laterReferenceDateArb = dateArb('2026-01-01', '2099-12-31');

/** Reference dates that cut the plain range 1954-01-01 … 2025-12-31, biased towards the very start. */
const cuttingReferenceDateArb = fc.oneof(dateArb('1954-01-01', '1955-12-31'), dateArb('1954-01-01', '2025-12-31'));

/** What every plain value from 1954 on looks like (section 9, decisions 2 and 6). */
function expectPlainTenDigit(value: string, decoded: DecodedBirthNumber): void {
  expect(value, 'RRMMDD/XXXX with the slash').toMatch(/^[0-9]{6}\/[0-9]{4}$/);
  expect(decoded.additionalSeries, 'the plain generator never uses +20/+70').toBe(false);
  expect(mod11(decoded.digits), 'divisible by 11, never the mod11Exception').toBe(0);
  expect(isZeroEnding(decoded), 'never a zero ending').toBe(false);
}

/** What every plain value before 1954 looks like (section 9: 9 digits, ending 001–999). */
function expectPlainNineDigit(value: string, decoded: DecodedBirthNumber): void {
  expect(value, 'RRMMDD/XXX with the slash').toMatch(/^[0-9]{6}\/[0-9]{3}$/);
  expect(decoded.additionalSeries, 'no +20/+70 on 9 digits').toBe(false);
  expect(isZeroEnding(decoded), 'ending 001–999').toBe(false);
}

function expectPlainShape(value: string, decoded: DecodedBirthNumber): void {
  if (decoded.date < '1954-01-01') {
    expectPlainNineDigit(value, decoded);
  } else {
    expectPlainTenDigit(value, decoded);
  }
}

describe('plain values without options', () => {
  it('are valid, 10-digit, slashed, never +20/+70, never the exception, never a zero ending, born 1954-01-01 … 2025-12-31', () => {
    fc.assert(
      fc.property(seedArb, laterReferenceDateArb, (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(3, () => generator())) {
          expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
          const decoded = decodeOrFail(value);
          expectPlainTenDigit(value, decoded);
          expect(isWithin(decoded.date, RANGES.plain.from, RANGES.plain.to), decoded.date).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never pass an earlier referenceDate: the range is cut to 1954-01-01 … referenceDate (A3)', () => {
    fc.assert(
      fc.property(seedArb, cuttingReferenceDateArb, (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(3, () => generator())) {
          expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
          const decoded = decodeOrFail(value);
          expectPlainTenDigit(value, decoded);
          expect(isWithin(decoded.date, RANGES.plain.from, referenceDate), `${decoded.date} ≤ ${referenceDate}`).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('are born on 1954-01-01 when referenceDate is 1954-01-01, the only day left in the range', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate: '1954-01-01' });
      for (const value of draw(10, () => generator())) {
        expect(decodeOrFail(value).date).toBe('1954-01-01');
        expect(value).toMatch(/^54(01|51)01\/[0-9]{4}$/);
      }
    }
  });

  it('pick the gender and the date from the stream: both genders and the whole range occur', () => {
    const decoded = Array.from({ length: 500 }, (_, seed) =>
      decodeOrFail(createBirthNumber({ seed, referenceDate: LATER_REFERENCE_DATE })()),
    );
    expect(new Set(decoded.map(({ gender }) => gender))).toEqual(new Set(['male', 'female']));
    const years = decoded.map(({ year }) => year);
    expect(Math.min(...years)).toBeLessThanOrEqual(1960);
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2019);
    expect(new Set(decoded.map(({ date }) => date)).size).toBeGreaterThan(400);
  });
});

describe('gender option', () => {
  it('decodes back to exactly the requested gender, with or without a birthDate', () => {
    fc.assert(
      fc.property(seedArb, genderArb, fc.option(dateArb('1854-01-01', LATER_REFERENCE_DATE)), (seed, gender, birthDate) => {
        const generator = createBirthNumber({ seed, referenceDate: LATER_REFERENCE_DATE });
        const options: BirthNumberOptions = birthDate === null ? { gender } : { gender, birthDate };
        const value = generator(options);
        const decoded = decodeOrFail(value);
        expect(decoded.gender).toBe(gender);
        expectPlainShape(value, decoded);
        expect(validateBirthNumber(value, { referenceDate: LATER_REFERENCE_DATE })).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('adds 50 to the month for a woman and nothing for a man', () => {
    const generator = createBirthNumber({ seed: 42, referenceDate: LATER_REFERENCE_DATE });
    for (let i = 0; i < 20; i += 1) {
      expect(generator({ gender: 'female', birthDate: '1990-05-01' })).toMatch(/^905501\/[0-9]{4}$/);
      expect(generator({ gender: 'male', birthDate: '1990-05-01' })).toMatch(/^900501\/[0-9]{4}$/);
      expect(generator({ gender: 'female', birthDate: '1950-12-31' })).toMatch(/^506231\/[0-9]{3}$/);
      expect(generator({ gender: 'male', birthDate: '1950-12-31' })).toMatch(/^501231\/[0-9]{3}$/);
    }
  });

  it('chooses the gender from the stream when omitted: both occur for a fixed birthDate', () => {
    const genders = Array.from({ length: 200 }, (_, seed) =>
      decodeOrFail(createBirthNumber({ seed, referenceDate: LATER_REFERENCE_DATE })({ birthDate: '1990-05-01' })).gender,
    );
    expect(new Set(genders)).toEqual(new Set(['male', 'female']));
  });
});

describe('birthDate option', () => {
  it('decodes back to exactly the birthDate: 9 digits before 1954, 10 digits from 1954 (whole range 1854–2053)', () => {
    fc.assert(
      fc.property(
        seedArb,
        dateArb(RANGES.birthDateOption.from, RANGES.birthDateOption.to),
        fc.option(genderArb),
        fc.integer({ min: 0, max: 20000 }),
        (seed, birthDate, gender, daysLater) => {
          const referenceDate = minDate(addDays(birthDate, daysLater), '2099-12-31');
          const generator = createBirthNumber({ seed, referenceDate });
          const value = generator(gender === null ? { birthDate } : { birthDate, gender });
          const decoded = decodeOrFail(value);
          expect(decoded.date).toBe(birthDate);
          expect(decoded.digits).toHaveLength(birthDate < '1954-01-01' ? 9 : 10);
          if (gender !== null) {
            expect(decoded.gender).toBe(gender);
          }
          expectPlainShape(value, decoded);
          expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
        },
      ),
      { numRuns: PROPERTY_RUNS * 3 },
    );
  });

  it.each<{ options: BirthNumberOptions; referenceDate: string; pattern: RegExp; why: string }>([
    { options: { gender: 'female', birthDate: '1990-05-01' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^905501\/[0-9]{4}$/, why: 'spec example' },
    { options: { gender: 'male', birthDate: '1953-12-31' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^531231\/[0-9]{3}$/, why: 'last 9-digit day' },
    { options: { gender: 'female', birthDate: '1953-12-31' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^536231\/[0-9]{3}$/, why: 'last 9-digit day, woman' },
    { options: { gender: 'male', birthDate: '1954-01-01' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^540101\/[0-9]{4}$/, why: 'first 10-digit day' },
    { options: { gender: 'female', birthDate: '1854-01-01' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^545101\/[0-9]{3}$/, why: 'first supported day' },
    { options: { gender: 'male', birthDate: '1899-12-31' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^991231\/[0-9]{3}$/, why: '9-digit RR 99 = 1899' },
    { options: { gender: 'male', birthDate: '1900-02-28' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^000228\/[0-9]{3}$/, why: '9-digit RR 00 = 1900' },
    { options: { gender: 'female', birthDate: '2000-02-29' }, referenceDate: LATER_REFERENCE_DATE, pattern: /^005229\/[0-9]{4}$/, why: '10-digit leap day 2000' },
    { options: { gender: 'male', birthDate: '2053-12-31' }, referenceDate: '2053-12-31', pattern: /^531231\/[0-9]{4}$/, why: 'last supported day' },
    { options: { gender: 'female', birthDate: '2026-10-05' }, referenceDate: '2026-10-05', pattern: /^266005\/[0-9]{4}$/, why: 'birthDate equal to referenceDate' },
    { options: { gender: 'male', birthDate: '1950-01-01' }, referenceDate: '1953-12-31', pattern: /^500101\/[0-9]{3}$/, why: 'explicit birthDate is not limited by the default range' },
    { options: { gender: 'male', birthDate: '1854-01-01' }, referenceDate: '1854-01-01', pattern: /^540101\/[0-9]{3}$/, why: 'referenceDate equal to the first supported day' },
  ])('gives $pattern for $options.birthDate ($why)', ({ options, referenceDate, pattern }) => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate });
      for (const value of draw(10, () => generator(options))) {
        expect(value).toMatch(pattern);
        expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
        expectPlainShape(value, decodeOrFail(value));
      }
    }
  });
});

describe('zero endings are never generated (decision 6)', () => {
  it('never gives /0000 for 1954-01-11, where 540111/0000 would be valid (540111 = 11 × 49101)', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate: LATER_REFERENCE_DATE });
      for (const value of draw(1500, () => generator({ gender: 'male', birthDate: '1954-01-11' }))) {
        expect(value).not.toBe('540111/0000');
      }
    }
  });

  it('never gives /000 for a 9-digit birth date', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate: LATER_REFERENCE_DATE });
      for (const value of draw(1500, () => generator({ gender: 'male', birthDate: '1950-07-15' }))) {
        expect(value).not.toBe('500715/000');
      }
    }
  });
});

describe('options that throw RangeError naming the option', () => {
  const generator = createBirthNumber({ seed: 42, referenceDate: LATER_REFERENCE_DATE });

  it.each(MALFORMED_DATES)('rejects the malformed birthDate %j', (birthDate) => {
    expect(() => generator({ birthDate })).toThrow(RangeError);
    expect(() => generator({ birthDate })).toThrow(/birthDate/);
  });

  it.each(IMPOSSIBLE_DATES)('rejects the impossible birthDate $date ($why)', ({ date }) => {
    expect(() => generator({ birthDate: date })).toThrow(RangeError);
    expect(() => generator({ birthDate: date })).toThrow(/birthDate/);
  });

  it.each(['1853-12-31', '1800-01-01', '0001-01-01'])('rejects the birthDate %s before 1854-01-01', (birthDate) => {
    expect(() => generator({ birthDate })).toThrow(RangeError);
    expect(() => generator({ birthDate })).toThrow(/birthDate/);
  });

  it.each(['2054-01-01', '2099-12-31'])('rejects the birthDate %s after 2053-12-31, even with a later referenceDate', (birthDate) => {
    const late = createBirthNumber({ seed: 42, referenceDate: '2099-12-31' });
    expect(() => late({ birthDate })).toThrow(RangeError);
    expect(() => late({ birthDate })).toThrow(/birthDate/);
  });

  it('rejects a birthDate one day after referenceDate, with and without a gender', () => {
    expect(() => generator({ birthDate: '2026-10-06' })).toThrow(RangeError);
    expect(() => generator({ birthDate: '2026-10-06' })).toThrow(/birthDate/);
    expect(() => generator({ birthDate: '2026-10-06', gender: 'female' })).toThrow(/birthDate/);
  });

  it('rejects any birthDate after referenceDate', () => {
    fc.assert(
      fc.property(dateArb('1854-01-01', '2053-12-30'), fc.integer({ min: 1, max: 3650 }), (referenceDate, days) => {
        const birthDate = minDate(addDays(referenceDate, days), '2053-12-31');
        const cut = createBirthNumber({ seed: 42, referenceDate });
        expect(() => cut({ birthDate })).toThrow(RangeError);
        expect(() => cut({ birthDate })).toThrow(/birthDate/);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each(['other', 'Male', 'F', ''])('rejects the gender %j (docs/rules/core.md section 3: invalid options throw)', (gender) => {
    const options = { gender } as unknown as BirthNumberOptions;
    expect(() => generator(options)).toThrow(RangeError);
    expect(() => generator(options)).toThrow(/gender/);
  });

  it.each(['1953-12-31', '1900-01-01', '1853-12-31'])(
    'throws naming referenceDate when no default date is left: no birthDate and referenceDate %s (A3)',
    (referenceDate) => {
      const early = createBirthNumber({ seed: 42, referenceDate });
      expect(() => early()).toThrow(RangeError);
      expect(() => early()).toThrow(/referenceDate/);
      expect(() => early({ gender: 'female' })).toThrow(/referenceDate/);
    },
  );
});
