// Specification of the birthNumber (rodné číslo) edge and invalid variants – docs/rules/birthNumber.md
// section 4 (definitions and generator constraints), section 9 (fixed date ranges, cut only by referenceDate)
// and decision 6; docs/rules/core.md section 4 (every edge value is valid, every invalid variant fails with
// exactly its own reason) and amendment A3.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBirthNumber, validateBirthNumber } from '../src/birthNumber/index.js';
import type { BirthNumberEdgeVariant, BirthNumberInvalidVariant } from '../src/birthNumber/index.js';
import { expectSameOutputForLaterReferenceDates } from './support/determinism.js';
import { addDays, draw, seedArb } from './support/helpers.js';
import {
  LEAP_DAY_YEARS,
  RANGES,
  dateArb,
  decodeBirthNumber,
  decodeOrFail,
  isWithin,
  isZeroEnding,
  maxDate,
  minDate,
  mod11,
  nextDay,
  oracleValidate,
} from './support/birthNumber.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly BirthNumberEdgeVariant[] = [
  'pre1954',
  'mod11Exception',
  'month+20',
  'month+70',
  'leapDay',
  'withoutSlash',
];

const INVALID_VARIANTS: readonly BirthNumberInvalidVariant[] = [
  'badChecksum',
  'impossibleDate',
  'wrongLength',
  'letters',
  'futureDate',
];

/** Upper end of every fixed range of valid values (section 9). */
const LAST_VALID_DAY = '2025-12-31';

interface VariantSpec {
  /** The earliest referenceDate for which the variant's range is certainly not empty (section 9). */
  readonly earliestReferenceDate: string;
  /** The latest such referenceDate (only futureDate has one). */
  readonly latestReferenceDate: string;
  readonly check: (value: string, referenceDate: string) => void;
}

function expectDateIn(date: string, from: string, to: string): void {
  expect(isWithin(date, from, to), `${date} in ${from} … ${to}`).toBe(true);
}

/** Every edge value: decodes, is never a zero ending (decision 6), and has the slash except withoutSlash. */
function decodeEdge(value: string, withSlash: boolean): ReturnType<typeof decodeOrFail> {
  const decoded = decodeOrFail(value);
  expect(isZeroEnding(decoded), `${value} has a zero ending`).toBe(false);
  expect(decoded.hasSlash, `${value} slash`).toBe(withSlash);
  return decoded;
}

const EDGE_SPECS: Readonly<Record<BirthNumberEdgeVariant, VariantSpec>> = {
  pre1954: {
    earliestReferenceDate: RANGES.nineDigit.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(/^[0-9]{6}\/[0-9]{3}$/);
      const decoded = decodeEdge(value, true);
      expectDateIn(decoded.date, RANGES.nineDigit.from, minDate(RANGES.nineDigit.to, referenceDate));
    },
  },
  mod11Exception: {
    earliestReferenceDate: RANGES.mod11Exception.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(/^[0-9]{6}\/[0-9]{3}0$/);
      const decoded = decodeEdge(value, true);
      expect(mod11(decoded.digits.slice(0, 9)), 'N9 mod 11').toBe(10);
      expect(mod11(decoded.digits), 'N10 mod 11').toBe(1);
      expectDateIn(decoded.date, RANGES.mod11Exception.from, minDate(RANGES.mod11Exception.to, referenceDate));
    },
  },
  'month+20': {
    earliestReferenceDate: RANGES.additionalSeries.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(/^[0-9]{2}(2[1-9]|3[0-2])[0-9]{2}\/[0-9]{4}$/);
      const decoded = decodeEdge(value, true);
      expect(decoded.gender).toBe('male');
      expect(decoded.additionalSeries).toBe(true);
      expectDateIn(decoded.date, RANGES.additionalSeries.from, minDate(RANGES.additionalSeries.to, referenceDate));
    },
  },
  'month+70': {
    earliestReferenceDate: RANGES.additionalSeries.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(/^[0-9]{2}(7[1-9]|8[0-2])[0-9]{2}\/[0-9]{4}$/);
      const decoded = decodeEdge(value, true);
      expect(decoded.gender).toBe('female');
      expect(decoded.additionalSeries).toBe(true);
      expectDateIn(decoded.date, RANGES.additionalSeries.from, minDate(RANGES.additionalSeries.to, referenceDate));
    },
  },
  leapDay: {
    earliestReferenceDate: '1956-02-29',
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      const decoded = decodeEdge(value, true);
      expect(decoded.date.slice(5)).toBe('02-29');
      expect(LEAP_DAY_YEARS).toContain(decoded.year);
      expect(decoded.date <= referenceDate, `${decoded.date} ≤ ${referenceDate}`).toBe(true);
      expect(decoded.digits).toHaveLength(decoded.year < 1954 ? 9 : 10);
    },
  },
  withoutSlash: {
    earliestReferenceDate: RANGES.plain.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(/^[0-9]{9,10}$/);
      const decoded = decodeEdge(value, false);
      // Every fixed range of valid values in section 9 lies within 1900-01-01 … 2025-12-31.
      expectDateIn(decoded.date, RANGES.nineDigit.from, minDate(LAST_VALID_DAY, referenceDate));
    },
  },
};

/** 10 digits, with the slash after the 6th digit or without it. */
const TEN_DIGITS = /^[0-9]{6}\/?[0-9]{4}$/;

const INVALID_SPECS: Readonly<Record<BirthNumberInvalidVariant, VariantSpec>> = {
  badChecksum: {
    earliestReferenceDate: RANGES.plain.from,
    latestReferenceDate: '2099-12-31',
    check: (value, referenceDate) => {
      expect(value).toMatch(TEN_DIGITS);
      const decoded = decodeOrFail(value);
      expectDateIn(decoded.date, RANGES.plain.from, minDate(RANGES.plain.to, referenceDate));
      // "A valid number with the last digit changed": some other last digit makes it valid again.
      const prefix = value.slice(0, -1);
      const repaired = Array.from({ length: 10 }, (_, digit) => `${prefix}${String(digit)}`).filter(
        (candidate) => oracleValidate(candidate, referenceDate).valid,
      );
      expect(repaired.length, `${value} is one changed digit away from a valid number`).toBeGreaterThan(0);
    },
  },
  impossibleDate: {
    earliestReferenceDate: RANGES.plain.from,
    latestReferenceDate: '2099-12-31',
    check: (value) => {
      expect(value).toMatch(TEN_DIGITS);
      expect(mod11(value.replace('/', '')), 'the checksum is correct, so the date is the only fault').toBe(0);
      expect(decodeBirthNumber(value)).toBeUndefined();
    },
  },
  wrongLength: {
    earliestReferenceDate: RANGES.plain.from,
    latestReferenceDate: '2099-12-31',
    check: (value) => {
      // 8 or 11 digits, never a 9-digit truncation (section 4).
      expect([8, 11]).toContain(value.replace('/', '').length);
      expect(value).toMatch(/^([0-9]{6}\/)?[0-9]+$/);
    },
  },
  letters: {
    earliestReferenceDate: RANGES.plain.from,
    latestReferenceDate: '2099-12-31',
    check: (value) => {
      // One digit replaced with a letter: same shape as a number, exactly one letter.
      expect(value).toMatch(/^[0-9\p{L}]{6}\/?[0-9\p{L}]{3,4}$/u);
      expect(value.match(/\p{L}/gu)).toHaveLength(1);
    },
  },
  futureDate: {
    earliestReferenceDate: '1854-01-01',
    latestReferenceDate: '2053-12-30',
    check: (value, referenceDate) => {
      expect(value).toMatch(TEN_DIGITS);
      const decoded = decodeOrFail(value);
      expect(mod11(decoded.digits), 'correct checksum').toBe(0);
      expectDateIn(decoded.date, maxDate(RANGES.futureDate.from, nextDay(referenceDate)), RANGES.futureDate.to);
    },
  },
};

/** Reference dates for a variant: anywhere in its allowed span, with extra weight right at its start. */
function referenceDateArb(spec: VariantSpec): fc.Arbitrary<string> {
  const { earliestReferenceDate: from, latestReferenceDate: to } = spec;
  return fc.oneof(dateArb(from, minDate(addDays(from, 400), to)), dateArb(from, to), dateArb(maxDate(from, '2026-01-01'), to));
}

describe('variant lists', () => {
  it('lists exactly the edge variants of section 4', () => {
    const generator = createBirthNumber({ seed: 42, referenceDate: '2026-10-05' });
    expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
  });

  it('lists exactly the invalid variants of section 4 (badFormat is a reason code without a variant)', () => {
    const generator = createBirthNumber({ seed: 42, referenceDate: '2026-10-05' });
    expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it.each(['badFormat', 'month+50', 'toString', '__proto__', 'pre1954 '])('throws RangeError for the unknown variant name %j', (name) => {
    const generator = createBirthNumber({ seed: 42, referenceDate: '2026-10-05' });
    expect(() => generator.edge(name as BirthNumberEdgeVariant)).toThrow(RangeError);
    expect(() => generator.invalid(name as BirthNumberInvalidVariant)).toThrow(RangeError);
  });
});

describe('edge variants – every value is valid and matches its definition (section 4, section 9 ranges)', () => {
  it.each(EDGE_VARIANTS)('%s', (variant) => {
    const spec = EDGE_SPECS[variant];
    fc.assert(
      fc.property(seedArb, referenceDateArb(spec), (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(2, () => generator.edge(variant))) {
          expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: true });
          spec.check(value, referenceDate);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('a randomly chosen edge variant is valid', () => {
    fc.assert(
      fc.property(seedArb, referenceDateArb(EDGE_SPECS['month+20']), (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(5, () => generator.edge())) {
          expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('leapDay produces both 9-digit (1904–1952) and 10-digit (1956–2024) leap days, never 1900', () => {
    const years = new Set<number>();
    for (let seed = 0; seed < 600; seed += 1) {
      years.add(decodeOrFail(createBirthNumber({ seed, referenceDate: '2026-10-05' }).edge('leapDay')).year);
    }
    expect([...years].some((year) => year < 1954)).toBe(true);
    expect([...years].some((year) => year > 1954)).toBe(true);
    expect(years.has(1900)).toBe(false);
  });

  it('withoutSlash produces both 9-digit and 10-digit numbers over many seeds ("9 or 10 digits")', () => {
    const lengths = new Set<number>();
    for (let seed = 0; seed < 300; seed += 1) {
      lengths.add(createBirthNumber({ seed, referenceDate: '2026-10-05' }).edge('withoutSlash').length);
    }
    expect(lengths).toEqual(new Set([9, 10]));
  });
});

describe('invalid variants – every value fails with exactly its own reason (docs/rules/core.md section 4)', () => {
  it.each(INVALID_VARIANTS)('%s', (variant) => {
    const spec = INVALID_SPECS[variant];
    fc.assert(
      fc.property(seedArb, referenceDateArb(spec), (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(2, () => generator.invalid(variant))) {
          expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: false, reason: variant });
          spec.check(value, referenceDate);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('a randomly chosen invalid variant fails with the reason of one of the invalid variants', () => {
    fc.assert(
      fc.property(seedArb, dateArb('1954-01-01', '2053-12-30'), (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const value of draw(5, () => generator.invalid())) {
          const result = validateBirthNumber(value, { referenceDate });
          expect(result.valid, value).toBe(false);
          expect(INVALID_VARIANTS).toContain(result.valid ? 'valid' : result.reason);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('fixed date ranges cut only by referenceDate (section 9, amendment A3)', () => {
  it.each<{ variant: BirthNumberEdgeVariant; referenceDate: string; date: string }>([
    { variant: 'month+20', referenceDate: '2004-04-01', date: '2004-04-01' },
    { variant: 'month+70', referenceDate: '2004-04-01', date: '2004-04-01' },
    { variant: 'mod11Exception', referenceDate: '1954-01-01', date: '1954-01-01' },
    { variant: 'pre1954', referenceDate: '1900-01-01', date: '1900-01-01' },
  ])('$variant gives $date when referenceDate $referenceDate leaves only that day', ({ variant, referenceDate, date }) => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate });
      for (const value of draw(5, () => generator.edge(variant))) {
        expect(decodeOrFail(value).date).toBe(date);
        expect(validateBirthNumber(value, { referenceDate })).toEqual({ valid: true });
      }
    }
  });

  it('mod11Exception never gives the zero ending 540101/0000 on 1954-01-01, although 540101000 ≡ 10 (decision 6)', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate: '1954-01-01' });
      for (const value of draw(400, () => generator.edge('mod11Exception'))) {
        expect(value).toMatch(/^54(01|51)01\/[0-9]{3}0$/);
        expect(value).not.toBe('540101/0000');
      }
    }
  });

  it('futureDate gives 2053-12-31 when referenceDate 2053-12-30 leaves only that day', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate: '2053-12-30' });
      for (const value of draw(5, () => generator.invalid('futureDate'))) {
        expect(decodeOrFail(value).date).toBe('2053-12-31');
      }
    }
  });

  it('futureDate moves its lower bound past referenceDate: born after it, not before 2040-01-01', () => {
    fc.assert(
      fc.property(seedArb, dateArb('2039-06-01', '2053-12-30'), (seed, referenceDate) => {
        const value = createBirthNumber({ seed, referenceDate }).invalid('futureDate');
        const { date } = decodeOrFail(value);
        expect(date > referenceDate, `${date} > ${referenceDate}`).toBe(true);
        expectDateIn(date, '2040-01-01', '2053-12-31');
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each<{ kind: 'edge' | 'invalid'; variant: BirthNumberEdgeVariant | BirthNumberInvalidVariant; referenceDate: string }>([
    { kind: 'edge', variant: 'month+20', referenceDate: '2004-01-01' },
    { kind: 'edge', variant: 'month+20', referenceDate: '2004-03-31' },
    { kind: 'edge', variant: 'month+70', referenceDate: '2004-03-31' },
    { kind: 'edge', variant: 'mod11Exception', referenceDate: '1953-12-31' },
    { kind: 'edge', variant: 'pre1954', referenceDate: '1899-12-31' },
    { kind: 'edge', variant: 'leapDay', referenceDate: '1904-02-28' },
    { kind: 'invalid', variant: 'futureDate', referenceDate: '2053-12-31' },
    { kind: 'invalid', variant: 'futureDate', referenceDate: '2060-01-01' },
    // Other invalid variants use the plain range 1954-01-01 … 2025-12-31 (section 9, clarification 1).
    { kind: 'invalid', variant: 'badChecksum', referenceDate: '1953-12-31' },
    { kind: 'invalid', variant: 'impossibleDate', referenceDate: '1953-12-31' },
    { kind: 'invalid', variant: 'wrongLength', referenceDate: '1953-12-31' },
    { kind: 'invalid', variant: 'letters', referenceDate: '1953-12-31' },
    { kind: 'invalid', variant: 'letters', referenceDate: '1900-01-01' },
  ])('$kind $variant throws RangeError naming referenceDate when $referenceDate leaves no date', ({ kind, variant, referenceDate }) => {
    const generator = createBirthNumber({ seed: 42, referenceDate });
    const call = (): string =>
      kind === 'edge'
        ? generator.edge(variant as BirthNumberEdgeVariant)
        : generator.invalid(variant as BirthNumberInvalidVariant);
    expect(call).toThrow(RangeError);
    expect(call).toThrow(/referenceDate/);
  });

  // Interpretation (see the test-writer report): leapDay is one variant whose range is the union of its
  // 9-digit and 10-digit leap days, so it throws only when both parts are empty.
  it('leapDay still works while only 9-digit leap days are left (referenceDate 1904-02-29 or 1955-06-01)', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      expect(createBirthNumber({ seed, referenceDate: '1904-02-29' }).edge('leapDay')).toMatch(/^04(02|52)29\/[0-9]{3}$/);
      const value = createBirthNumber({ seed, referenceDate: '1955-06-01' }).edge('leapDay');
      expect(value).toMatch(/^[0-9]{6}\/[0-9]{3}$/);
      expect(validateBirthNumber(value, { referenceDate: '1955-06-01' })).toEqual({ valid: true });
    }
  });

  it('pre1954 never passes an early referenceDate', () => {
    fc.assert(
      fc.property(seedArb, dateArb('1900-01-01', '1953-12-31'), (seed, referenceDate) => {
        const { date } = decodeOrFail(createBirthNumber({ seed, referenceDate }).edge('pre1954'));
        expectDateIn(date, '1900-01-01', referenceDate);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

// --- Far-future reference dates (review B1) -----------------------------------------------------------

/** From 2053-12-31 on, the futureDate range max(2040-01-01, referenceDate + 1) … 2053-12-31 is empty (section 9, A3). */
const FAR_FUTURE_REFERENCE_DATES = ['2053-12-31', '2054-01-01', '9999-12-30', '9999-12-31'] as const;

type Outcome = { readonly value: string } | { readonly error: unknown };

function outcomeOf(call: () => string): Outcome {
  try {
    return { value: call() };
  } catch (error) {
    return { error };
  }
}

describe('far-future referenceDates up to 9999-12-31 (review B1)', () => {
  it.each(FAR_FUTURE_REFERENCE_DATES)('invalid(futureDate) throws RangeError naming referenceDate for %s', (referenceDate) => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate });
      for (let i = 0; i < 5; i += 1) {
        expect(() => generator.invalid('futureDate')).toThrow(RangeError);
        expect(() => generator.invalid('futureDate')).toThrow(/referenceDate/);
      }
    }
  });

  it.each(FAR_FUTURE_REFERENCE_DATES)(
    'a randomly chosen invalid() for %s either throws RangeError naming referenceDate or fails with a reason other than futureDate',
    (referenceDate) => {
      let thrown = 0;
      for (const seed of [0, 1, 42, 4294967295]) {
        const generator = createBirthNumber({ seed, referenceDate });
        for (const outcome of draw(50, () => outcomeOf(() => generator.invalid()))) {
          if ('error' in outcome) {
            expect(outcome.error).toBeInstanceOf(RangeError);
            expect(String(outcome.error)).toMatch(/referenceDate/);
            thrown += 1;
          } else {
            const result = validateBirthNumber(outcome.value, { referenceDate });
            expect(result.valid, outcome.value).toBe(false);
            expect(['badChecksum', 'impossibleDate', 'wrongLength', 'letters']).toContain(result.valid ? 'valid' : result.reason);
          }
        }
      }
      expect(thrown, 'futureDate was chosen at least once in 200 random picks').toBeGreaterThan(0);
    },
  );

  it('the plain generator and every other variant work normally at 9999-12-31, because their ranges are not cut', () => {
    const referenceDate = '9999-12-31';
    for (const seed of [0, 1, 42, 4294967295]) {
      const generator = createBirthNumber({ seed, referenceDate });
      for (const value of draw(5, () => generator())) {
        expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: true });
        expectDateIn(decodeOrFail(value).date, RANGES.plain.from, RANGES.plain.to);
      }
      for (const variant of EDGE_VARIANTS) {
        const value = generator.edge(variant);
        expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: true });
        EDGE_SPECS[variant].check(value, referenceDate);
      }
      for (const variant of INVALID_VARIANTS.filter((name) => name !== 'futureDate')) {
        const value = generator.invalid(variant);
        expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: false, reason: variant });
        INVALID_SPECS[variant].check(value, referenceDate);
      }
    }
  });

  it('gives the same output at 9999-12-31 as at 2026-01-01 for everything except futureDate (A3)', () => {
    expectSameOutputForLaterReferenceDates({
      create: createBirthNumber,
      plain: (generator) => generator(),
      laterReferenceDates: fc.oneof(dateArb('2026-01-01', '9999-12-31'), dateArb('9999-01-01', '9999-12-31')),
      fixedPair: ['2026-01-01', '9999-12-31'],
      dateDependentInvalidVariants: ['futureDate'],
      numRuns: 100,
    });
  });

  it('invalid(futureDate) fails with futureDate before 2053-12-31 and throws RangeError from then on, for referenceDates 0000–9999', () => {
    const referenceDateArb = fc.oneof(
      fc.constantFrom('0000-01-01', '2039-12-31', '2040-01-01', '2053-12-30', '2053-12-31', '9999-12-30', '9999-12-31'),
      dateArb('0000-01-01', '9999-12-31'),
      dateArb('2039-12-01', '2040-01-31'),
      dateArb('2053-11-01', '2054-02-28'),
      dateArb('9999-01-01', '9999-12-31'),
    );
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const generator = createBirthNumber({ seed, referenceDate });
        if (referenceDate < RANGES.futureDate.to) {
          const value = generator.invalid('futureDate');
          expect(validateBirthNumber(value, { referenceDate }), value).toEqual({ valid: false, reason: 'futureDate' });
          expect(decodeOrFail(value).date > referenceDate, value).toBe(true);
        } else {
          expect(() => generator.invalid('futureDate')).toThrow(RangeError);
          expect(() => generator.invalid('futureDate')).toThrow(/referenceDate/);
        }
      }),
      { numRuns: 1000 },
    );
  });
});
