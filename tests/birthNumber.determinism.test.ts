// Determinism of birthNumber (rodné číslo) – docs/rules/core.md section 2 (same seed + same calls = same
// output; snapshot seeds 0, 1, 42, 4294967295) and amendment A3 (fixed date ranges, shared check);
// docs/rules/birthNumber.md section 9.
//
// The rules fix only the core algorithms, not how birthNumber spends its draws, so snapshot values cannot be
// derived from the rules. The four seed snapshots (referenceDate 2026-10-05, no range cut) were filled by
// Marek after the implementation passed every other test and checked with an independent script.
// The cut-range snapshot (review S6) was filled the same way after the B1 fix. vitest.config.ts sets
// `update: 'none'`, so Vitest never writes a missing snapshot on its own; values are recorded only with -u.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBirthNumber } from '../src/birthNumber/index.js';
import type { BirthNumberEdgeVariant, BirthNumberInvalidVariant } from '../src/birthNumber/index.js';
import { expectSameOutputForLaterReferenceDates } from './support/determinism.js';
import { dateArb, draw, restoreClock, seedArb, setClock } from './support/helpers.js';

const PROPERTY_RUNS = 200;

/** The reference date of the snapshots: after every fixed range of valid values, before 2040. */
const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly BirthNumberEdgeVariant[] = ['pre1954', 'mod11Exception', 'month+20', 'month+70', 'leapDay', 'withoutSlash'];
const INVALID_VARIANTS: readonly BirthNumberInvalidVariant[] = ['badChecksum', 'impossibleDate', 'wrongLength', 'letters', 'futureDate'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createBirthNumber({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    options: [
      generator({ gender: 'female' }),
      generator({ gender: 'male', birthDate: '1990-05-01' }),
      generator({ birthDate: '1950-07-15' }),
    ],
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

afterEach(() => {
  restoreClock();
  vi.restoreAllMocks();
});

describe('same seed + same calls + same referenceDate = same output (docs/rules/core.md section 2)', () => {
  it('repeats the whole call sequence for every seed and referenceDate', () => {
    fc.assert(
      fc.property(seedArb, dateArb('2004-04-01', '2053-12-30'), (seed, referenceDate) => {
        expect(firstOutputs(seed, referenceDate)).toEqual(firstOutputs(seed, referenceDate));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives different values for different seeds', () => {
    const firstValues = new Set(Array.from({ length: 100 }, (_, seed) => createBirthNumber({ seed, referenceDate: SNAPSHOT_REFERENCE_DATE })()));
    expect(firstValues.size).toBeGreaterThan(95);
  });

  it('does not read the clock when referenceDate is given', () => {
    setClock('2026-10-05T12:00:00Z', 'Europe/Prague');
    const before = firstOutputs(42);
    setClock('2045-03-01T23:59:59Z', 'America/Los_Angeles');
    expect(firstOutputs(42)).toEqual(before);
  });

  it('never uses Math.random', () => {
    const mathRandom = vi.spyOn(Math, 'random');
    firstOutputs(42);
    firstOutputs(7, '2010-01-01');
    expect(mathRandom).not.toHaveBeenCalled();
  });
});

describe('shared A3 check: referenceDates after the fixed ranges do not change the output', () => {
  it('gives the same plain values, edge values and date-independent invalid values for two later referenceDates', () => {
    expectSameOutputForLaterReferenceDates({
      create: createBirthNumber,
      plain: (generator) => generator(),
      // After 2025-12-31, the end of every fixed range of valid values and of the other invalid variants.
      laterReferenceDates: dateArb('2026-01-01', '2099-12-31'),
      fixedPair: ['2026-01-01', '2099-12-31'],
      dateDependentInvalidVariants: ['futureDate'],
    });
  });

  it('also keeps futureDate unchanged while referenceDate stays before 2039-12-31 (its range starts 2040-01-01)', () => {
    fc.assert(
      fc.property(seedArb, dateArb('2026-01-01', '2039-12-31'), dateArb('2026-01-01', '2039-12-31'), (seed, a, b) => {
        expect(firstOutputs(seed, a)).toEqual(firstOutputs(seed, b));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('seed snapshots (referenceDate 2026-10-05) – filled by Marek after the implementation passes', () => {
  it('pins the first outputs for seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "pre1954: 480602/122",
          "mod11Exception: 560302/6760",
          "month+20: 102405/8431",
          "month+70: 168221/4204",
          "leapDay: 120229/635",
          "withoutSlash: 8662061672",
        ],
        "invalid": [
          "badChecksum: 570129/8927",
          "impossibleDate: 815732/8949",
          "wrongLength: 195329/90",
          "letters: 98010O/3094",
          "futureDate: 490528/2811",
        ],
        "options": [
          "045823/4810",
          "900501/3963",
          "505715/414",
        ],
        "plain": [
          "225709/9647",
          "671113/1295",
          "620208/6693",
          "585209/7295",
          "741231/5570",
        ],
        "plainAgain": [
          "935512/1303",
          "650119/8737",
        ],
        "randomEdge": [
          "115927/606",
          "466218/033",
          "255624/514",
        ],
        "randomInvalid": [
          "546014/A525",
          "530120/6834",
          "144924/7437",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "pre1954: 525916/840",
          "mod11Exception: 820825/5980",
          "month+20: 102919/8126",
          "month+70: 107929/5283",
          "leapDay: 400229/976",
          "withoutSlash: 8706089348",
        ],
        "invalid": [
          "badChecksum: 855114/8952",
          "impossibleDate: 821808/4875",
          "wrongLength: 871215/83235",
          "letters: 790908/A349",
          "futureDate: 530510/0999",
        ],
        "options": [
          "785701/5408",
          "900501/2874",
          "500715/977",
        ],
        "plain": [
          "690315/3631",
          "700816/1149",
          "945618/8632",
          "666229/0151",
          "665929/5368",
        ],
        "plainAgain": [
          "180528/3040",
          "180131/8959",
        ],
        "randomEdge": [
          "7161082500",
          "516206921",
          "7959266073",
        ],
        "randomInvalid": [
          "431123/7920",
          "770708/02274",
          "625320/69",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "pre1954: 215225/557",
          "mod11Exception: 655403/4620",
          "month+20: 132110/6710",
          "month+70: 258027/6259",
          "leapDay: 245229/1820",
          "withoutSlash: 050821434",
        ],
        "invalid": [
          "badChecksum: 001224/3819",
          "impossibleDate: 780600/7220",
          "wrongLength: 716109/05",
          "letters: 0753A7/5676",
          "futureDate: 475630/3915",
        ],
        "options": [
          "965116/3709",
          "900501/6735",
          "500715/701",
        ],
        "plain": [
          "715120/4236",
          "241129/4996",
          "080323/5961",
          "850316/3097",
          "090822/4295",
        ],
        "plainAgain": [
          "220704/4763",
          "735605/5751",
        ],
        "randomEdge": [
          "285802/312",
          "052128/6513",
          "142504/1475",
        ],
        "randomInvalid": [
          "930201/20055",
          "125204/0684",
          "775223/30A8",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "pre1954: 175517/483",
          "mod11Exception: 635729/6760",
          "month+20: 242219/8427",
          "month+70: 107623/3708",
          "leapDay: 885229/2614",
          "withoutSlash: 8906265346",
        ],
        "invalid": [
          "badChecksum: 245131/0085",
          "impossibleDate: 210431/5994",
          "wrongLength: 720902/80685",
          "letters: 716128/763A",
          "futureDate: 535731/1245",
        ],
        "options": [
          "906211/4655",
          "900501/7879",
          "505715/588",
        ],
        "plain": [
          "765115/9978",
          "250510/8496",
          "725303/7462",
          "121024/3485",
          "625310/6233",
        ],
        "plainAgain": [
          "685411/1891",
          "011118/1686",
        ],
        "randomEdge": [
          "320229/771",
          "291205955",
          "690708/6660",
        ],
        "randomInvalid": [
          "185631/6671",
          "550200/5938",
          "446125/1872",
        ],
      }
    `);
  });
});

// --- Cut ranges (review S6) ------------------------------------------------------------------------------

/** Cuts plain, mod11Exception, withoutSlash, leapDay and the plain-range invalid variants; empties month+20/+70. */
const EARLY_CUT_REFERENCE_DATE = '1970-06-15';

/** Moves the futureDate lower bound from 2040-01-01 to 2045-06-16. */
const LATE_CUT_REFERENCE_DATE = '2045-06-15';

const EARLY_EDGE_VARIANTS: readonly BirthNumberEdgeVariant[] = ['pre1954', 'mod11Exception', 'leapDay', 'withoutSlash'];

/** Only calls that do not throw for their reference date; the throwing ones are asserted separately. */
function cutOutputs(seed: number): Record<string, readonly string[]> {
  const early = createBirthNumber({ seed, referenceDate: EARLY_CUT_REFERENCE_DATE });
  const late = createBirthNumber({ seed, referenceDate: LATE_CUT_REFERENCE_DATE });
  return {
    earlyPlain: draw(3, () => early()),
    earlyOptions: [early({ gender: 'female' }), early({ birthDate: '1950-07-15' })],
    earlyEdge: EARLY_EDGE_VARIANTS.flatMap((variant) => draw(2, () => `${variant}: ${early.edge(variant)}`)),
    earlyInvalid: INVALID_VARIANTS.map((variant) => `${variant}: ${early.invalid(variant)}`),
    lateFutureDate: draw(3, () => late.invalid('futureDate')),
    latePlain: draw(2, () => late()),
  };
}

describe('cut-range snapshot (review S6) – filled by Marek after the B1 fix', () => {
  it('pins the outputs of seed 42 where referenceDate cuts the ranges (1970-06-15 and 2045-06-15)', () => {
    expect(cutOutputs(42)).toMatchInlineSnapshot(`
      {
        "earlyEdge": [
          "pre1954: 041022/452",
          "pre1954: 240518/906",
          "mod11Exception: 670116/1490",
          "mod11Exception: 690817/5660",
          "leapDay: 520229/682",
          "leapDay: 565229/1634",
          "withoutSlash: 205121933",
          "withoutSlash: 071222484",
        ],
        "earlyInvalid": [
          "badChecksum: 586123/9652",
          "impossibleDate: 600431/6615",
          "wrongLength: 565315/45515",
          "letters: 670l28/1406",
          "futureDate: 430713/9650",
        ],
        "earlyOptions": [
          "595319/5028",
          "505715/559",
        ],
        "earlyPlain": [
          "695627/4237",
          "610822/5002",
          "540629/5961",
        ],
        "lateFutureDate": [
          "475425/4241",
          "520925/4996",
          "500718/5953",
        ],
        "latePlain": [
          "850316/3097",
          "090822/4295",
        ],
      }
    `);
  });

  it.each<BirthNumberEdgeVariant>(['month+20', 'month+70'])(
    '%s throws RangeError naming referenceDate at 1970-06-15, so it is not part of the snapshot',
    (variant) => {
      const generator = createBirthNumber({ seed: 42, referenceDate: EARLY_CUT_REFERENCE_DATE });
      expect(() => generator.edge(variant)).toThrow(RangeError);
      expect(() => generator.edge(variant)).toThrow(/referenceDate/);
    },
  );
});
