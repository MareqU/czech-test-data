// Specification of the seeded PRNG and stream seeds – docs/rules/core.md sections 1, 2 and 6.
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createRandom, streamSeed } from '../src/core/random.js';
import type { Random } from '../src/core/random.js';
import {
  MAX_UINT32,
  createReferenceRandom,
  referenceFnv1a32,
  referenceStreamSeed,
  referenceUint32s,
} from './support/reference.js';
import type { ReferenceRandom } from './support/reference.js';
import { draw, seedArb } from './support/helpers.js';

const PROPERTY_RUNS = 1000;

function countOccurrences<T>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

type Operation =
  | { kind: 'uint32' }
  | { kind: 'int'; min: number; max: number }
  | { kind: 'pick'; items: readonly number[] }
  | { kind: 'digits'; length: number };

const operationArb: fc.Arbitrary<Operation> = fc.oneof(
  fc.constant({ kind: 'uint32' as const }),
  fc
    .tuple(fc.integer({ min: -(2 ** 40), max: 2 ** 40 }), fc.integer({ min: 0, max: MAX_UINT32 }))
    .map(([min, span]) => ({ kind: 'int' as const, min, max: min + span })),
  fc
    .tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 20 }))
    .map(([min, span]) => ({ kind: 'int' as const, min, max: min + span })),
  fc.array(fc.integer(), { minLength: 1, maxLength: 20 }).map((items) => ({ kind: 'pick' as const, items })),
  fc.integer({ min: 0, max: 12 }).map((length) => ({ kind: 'digits' as const, length })),
);

function apply(random: Random | ReferenceRandom, operation: Operation): number | string {
  switch (operation.kind) {
    case 'uint32':
      return random.uint32();
    case 'int':
      return random.int(operation.min, operation.max);
    case 'pick':
      return random.pick(operation.items);
    case 'digits':
      return random.digits(operation.length);
  }
}

describe('createRandom – SplitMix32 PRNG', () => {
  // Determinism snapshot (breaking change if it changes). Computed independently from the reference
  // algorithm in docs/rules/core.md section 1 and cross-checked against a C build of the gist code.
  it.each([
    { seed: 0, first: [1684164658, 3653269916, 2939563536, 2141751570, 3295091513] },
    { seed: 1, first: [1580013426, 350525680, 3524174333, 3011703609, 643872864] },
    { seed: 42, first: [551831576, 144025891, 322543647, 3034809370, 908029994] },
    { seed: 4294967295, first: [3950124170, 4293442868, 1302505678, 2762329221, 3361369063] },
  ])('produces the pinned first five uint32 outputs for seed $seed', ({ seed, first }) => {
    const random = createRandom(seed);
    expect(draw(5, () => random.uint32())).toEqual(first);
  });

  it('matches the SplitMix32 reference algorithm for any seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const random = createRandom(seed);
        expect(draw(20, () => random.uint32())).toEqual(referenceUint32s(seed, 20));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('always returns an integer between 0 and 2^32 − 1 from uint32()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const random = createRandom(seed);
        for (const value of draw(20, () => random.uint32())) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(MAX_UINT32);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('produces the same sequence for the same seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const first = createRandom(seed);
        const second = createRandom(seed);
        expect(draw(10, () => first.uint32())).toEqual(draw(10, () => second.uint32()));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('produces a different first output for different seeds (the SplitMix32 step is a bijection)', () => {
    fc.assert(
      fc.property(seedArb, seedArb, (a, b) => {
        fc.pre(a !== b);
        expect(createRandom(a).uint32()).not.toBe(createRandom(b).uint32());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('keeps two instances created from the same seed independent of each other', () => {
    const advanced = createRandom(42);
    const untouched = createRandom(42);
    draw(100, () => advanced.uint32());
    expect(untouched.uint32()).toBe(551831576);
  });
});

describe('createRandom – seed validation', () => {
  it.each([0, 1, 42, MAX_UINT32])('accepts the integer seed %d', (seed) => {
    expect(() => createRandom(seed)).not.toThrow();
  });

  it.each([
    { name: 'a negative seed', seed: -1 },
    { name: 'a fractional seed', seed: 1.5 },
    { name: 'NaN', seed: Number.NaN },
    { name: '2^32', seed: 2 ** 32 },
    { name: 'Infinity', seed: Number.POSITIVE_INFINITY },
    { name: '-Infinity', seed: Number.NEGATIVE_INFINITY },
  ])('throws RangeError for $name', ({ seed }) => {
    expect(() => createRandom(seed)).toThrow(RangeError);
  });

  it('accepts every integer from 0 to 2^32 − 1', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(() => createRandom(seed)).not.toThrow();
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('throws RangeError for every integer outside 0 … 2^32 − 1', () => {
    const outOfRange = fc.oneof(
      fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1 }),
      fc.integer({ min: 2 ** 32, max: Number.MAX_SAFE_INTEGER }),
    );
    fc.assert(
      fc.property(outOfRange, (seed) => {
        expect(() => createRandom(seed)).toThrow(RangeError);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('throws RangeError for every non-integer number', () => {
    const nonInteger = fc.double().filter((value) => !Number.isInteger(value));
    fc.assert(
      fc.property(nonInteger, (seed) => {
        expect(() => createRandom(seed)).toThrow(RangeError);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('Random.int(min, max)', () => {
  // Every range whose size (max − min + 1) is at most 2^32, with bounds anywhere in the safe integers.
  const rangeArb = fc
    .tuple(fc.maxSafeInteger(), fc.integer({ min: 0, max: MAX_UINT32 }))
    .filter(([min, span]) => min + span <= Number.MAX_SAFE_INTEGER)
    .map(([min, span]) => ({ min, max: min + span }));

  it('always returns an integer within the inclusive bounds', () => {
    fc.assert(
      fc.property(seedArb, rangeArb, (seed, { min, max }) => {
        const random = createRandom(seed);
        for (const value of draw(20, () => random.int(min, max))) {
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('reaches both bounds and every value in between for small ranges', () => {
    const smallRange = fc
      .tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 9 }))
      .map(([min, span]) => ({ min, max: min + span }));
    fc.assert(
      fc.property(seedArb, smallRange, (seed, { min, max }) => {
        const random = createRandom(seed);
        const seen = new Set(draw(1000, () => random.int(min, max)));
        expect(seen.has(min)).toBe(true);
        expect(seen.has(max)).toBe(true);
        expect(seen.size).toBe(max - min + 1);
      }),
      { numRuns: 200 },
    );
  });

  it('returns the bound when min equals max: int(5, 5) === 5', () => {
    const random = createRandom(42);
    expect(random.int(5, 5)).toBe(5);
    expect(random.int(-3, -3)).toBe(-3);
  });

  it('is deterministic for the same seed and the same calls', () => {
    fc.assert(
      fc.property(seedArb, rangeArb, (seed, { min, max }) => {
        const first = createRandom(seed);
        const second = createRandom(seed);
        expect(draw(10, () => first.int(min, max))).toEqual(draw(10, () => second.int(min, max)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('accepts ranges of exactly 2^32 values', () => {
    const random = createRandom(42);
    const unsigned = random.int(0, MAX_UINT32);
    expect(unsigned).toBeGreaterThanOrEqual(0);
    expect(unsigned).toBeLessThanOrEqual(MAX_UINT32);
    const signed = random.int(-(2 ** 31), 2 ** 31 - 1);
    expect(signed).toBeGreaterThanOrEqual(-(2 ** 31));
    expect(signed).toBeLessThanOrEqual(2 ** 31 - 1);
  });

  // Determinism snapshot of the frozen int algorithm (docs/rules/core.md section 1), computed independently
  // with tests/support/reference.ts and a Python implementation.
  it.each([
    { seed: 0, oneToSix: [5, 3, 1, 1, 6], aroundZero: [-3, -806, -511, 230, -209] },
    { seed: 42, oneToSix: [3, 2, 4, 5, 3], aroundZero: [799, 915, -544, -276, -794] },
    { seed: 4294967295, oneToSix: [3, 3, 5, 4, 2], aroundZero: [-905, 220, -249, -253, 219] },
  ])('produces the pinned values of int(1, 6) and int(-1000, 1000) for seed $seed', ({ seed, oneToSix, aroundZero }) => {
    const dice = createRandom(seed);
    expect(draw(5, () => dice.int(1, 6))).toEqual(oneToSix);
    const symmetric = createRandom(seed);
    expect(draw(5, () => symmetric.int(-1000, 1000))).toEqual(aroundZero);
  });

  // For n = 3·2^30 the limit is 2^32 − (2^32 mod n) = 3221225472, so every draw at or above it is redrawn.
  // Seed 0 rejects 3653269916 (2nd draw), seed 4294967295 rejects 3950124170, 4293442868 (1st, 2nd) and
  // 3361369063 (5th); seed 42 rejects nothing. The following uint32() shows how many draws were consumed.
  it.each([
    { seed: 0, values: [1684164658, 2939563536, 2141751570], nextUint32: 3295091513 },
    { seed: 42, values: [551831576, 144025891, 322543647], nextUint32: 3034809370 },
    { seed: 4294967295, values: [1302505678, 2762329221, 1522821371], nextUint32: 2702171692 },
  ])('redraws while uint32() ≥ 2^32 − (2^32 mod n): int(0, 3·2^30 − 1) for seed $seed', ({ seed, values, nextUint32 }) => {
    const random = createRandom(seed);
    expect(draw(3, () => random.int(0, 3 * 2 ** 30 - 1))).toEqual(values);
    expect(random.uint32()).toBe(nextUint32);
  });

  it.each([
    { seed: 0, values: [1684164658, 3653269916, 792079888] },
    { seed: 42, values: [551831576, 144025891, -1824940001] },
    { seed: 4294967295, values: [3950124170, 4293442868, -844977970] },
  ])('returns min + uint32() from a single draw when n = 2^32 (seed $seed)', ({ seed, values }) => {
    const random = createRandom(seed);
    expect([random.int(0, MAX_UINT32), random.int(0, MAX_UINT32), random.int(-(2 ** 31), 2 ** 31 - 1)]).toEqual(
      values,
    );
  });

  it('matches the frozen int algorithm for any seed and range', () => {
    fc.assert(
      fc.property(seedArb, rangeArb, (seed, { min, max }) => {
        const random = createRandom(seed);
        const reference = createReferenceRandom(seed);
        expect(draw(10, () => random.int(min, max))).toEqual(draw(10, () => reference.int(min, max)));
        expect(random.uint32()).toBe(reference.uint32());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('accepts bounds at the edge of the safe integers', () => {
    const random = createRandom(42);
    const high = random.int(Number.MAX_SAFE_INTEGER - 3, Number.MAX_SAFE_INTEGER);
    expect(high).toBeGreaterThanOrEqual(Number.MAX_SAFE_INTEGER - 3);
    const low = random.int(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER + 3);
    expect(low).toBeLessThanOrEqual(Number.MIN_SAFE_INTEGER + 3);
  });

  it('draws a small range uniformly', () => {
    const random = createRandom(42);
    const counts = countOccurrences(draw(60_000, () => random.int(1, 6)));
    // Expected 10 000 per face, standard deviation about 91: the window is more than 10 sigma wide.
    for (let face = 1; face <= 6; face += 1) {
      expect(counts.get(face)).toBeGreaterThan(9_000);
      expect(counts.get(face)).toBeLessThan(11_000);
    }
  });

  it('has no modulo bias: int(0, 3·2^30 − 1) falls below 2^30 in one third of draws, not one half', () => {
    // With `uint32 % n` and n = 3·2^30 the values below 2^30 would be hit twice as often (probability 1/2).
    const random = createRandom(7);
    const draws = draw(6_000, () => random.int(0, 3 * 2 ** 30 - 1));
    const lowShare = draws.filter((value) => value < 2 ** 30).length / draws.length;
    expect(lowShare).toBeGreaterThan(0.29);
    expect(lowShare).toBeLessThan(0.38);
  });

  it.each([
    { name: 'min is greater than max', min: 2, max: 1 },
    { name: 'max is fractional', min: 0, max: 1.5 },
    { name: 'min is fractional', min: 0.5, max: 2 },
    { name: 'min is NaN', min: Number.NaN, max: 1 },
    { name: 'max is NaN', min: 0, max: Number.NaN },
    { name: 'min is -Infinity', min: Number.NEGATIVE_INFINITY, max: 0 },
    { name: 'max is Infinity', min: 0, max: Number.POSITIVE_INFINITY },
    { name: 'both bounds are above the safe integers', min: 2 ** 53, max: 2 ** 53 + 2 },
    { name: 'min is below the safe integers', min: -(2 ** 53), max: -(2 ** 53) + 2 },
    { name: 'the range has 2^32 + 1 values: int(0, 2^32)', min: 0, max: 2 ** 32 },
    { name: 'the range has 2^32 + 1 values: int(-1, 2^32 − 1)', min: -1, max: MAX_UINT32 },
    { name: 'the range has 2^33 + 1 values', min: 0, max: 2 ** 33 },
    { name: 'the range spans −2^32 … 2^32', min: -(2 ** 32), max: 2 ** 32 },
    { name: 'the range spans all safe integers', min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  ])('throws RangeError when $name', ({ min, max }) => {
    const random = createRandom(42);
    expect(() => random.int(min, max)).toThrow(RangeError);
  });

  it('throws RangeError whenever min is greater than max', () => {
    const inverted = fc
      .tuple(fc.integer(), fc.integer())
      .filter(([a, b]) => a !== b)
      .map(([a, b]) => ({ min: Math.max(a, b), max: Math.min(a, b) }));
    fc.assert(
      fc.property(seedArb, inverted, (seed, { min, max }) => {
        expect(() => createRandom(seed).int(min, max)).toThrow(RangeError);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('Random.pick(items)', () => {
  it('always returns an element of the list', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { minLength: 1, maxLength: 50 }), (seed, items) => {
        const random = createRandom(seed);
        for (const value of draw(10, () => random.pick(items))) {
          expect(items).toContain(value);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('returns the element itself, not a copy', () => {
    const items = [{ name: 'a' }, { name: 'b' }];
    const picked = createRandom(42).pick(items);
    expect(items.some((item) => item === picked)).toBe(true);
  });

  it('reaches the first, the last and every other element', () => {
    const distinctItems = fc.uniqueArray(fc.string(), { minLength: 1, maxLength: 10 });
    fc.assert(
      fc.property(seedArb, distinctItems, (seed, items) => {
        const random = createRandom(seed);
        const seen = new Set(draw(1000, () => random.pick(items)));
        expect([...seen]).toContain(items[0]);
        expect([...seen]).toContain(items.at(-1));
        expect(seen.size).toBe(items.length);
      }),
      { numRuns: 200 },
    );
  });

  it.each([
    { seed: 0, picks: ['b', 'c', 'a', 'a', 'a'] },
    { seed: 42, picks: ['c', 'c', 'g', 'f', 'e'] },
    { seed: 4294967295, picks: ['g', 'b', 'f', 'b', 'd'] },
  ])('produces the pinned picks from a..g for seed $seed', ({ seed, picks }) => {
    const random = createRandom(seed);
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    expect(draw(5, () => random.pick(items))).toEqual(picks);
  });

  it('is exactly items[int(0, items.length − 1)]', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { minLength: 1, maxLength: 50 }), (seed, items) => {
        const picking = createRandom(seed);
        const indexing = createRandom(seed);
        for (let i = 0; i < 10; i += 1) {
          expect(picking.pick(items)).toBe(items[indexing.int(0, items.length - 1)]);
        }
        expect(picking.uint32()).toBe(indexing.uint32());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('returns the only element of a one-element list', () => {
    expect(createRandom(42).pick(['only'])).toBe('only');
  });

  it('is deterministic for the same seed and the same calls', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.integer(), { minLength: 1, maxLength: 50 }), (seed, items) => {
        const first = createRandom(seed);
        const second = createRandom(seed);
        expect(draw(10, () => first.pick(items))).toEqual(draw(10, () => second.pick(items)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('picks uniformly', () => {
    const random = createRandom(42);
    const counts = countOccurrences(draw(30_000, () => random.pick(['a', 'b', 'c'] as const)));
    // Expected 10 000 each, standard deviation about 82.
    for (const item of ['a', 'b', 'c'] as const) {
      expect(counts.get(item)).toBeGreaterThan(9_000);
      expect(counts.get(item)).toBeLessThan(11_000);
    }
  });

  it('throws RangeError for an empty list', () => {
    expect(() => createRandom(42).pick([])).toThrow(RangeError);
  });

  it('accepts a readonly list and keeps its element type', () => {
    const random: Random = createRandom(42);
    const items = ['male', 'female'] as const;
    expectTypeOf(random.pick(items)).toEqualTypeOf<'male' | 'female'>();
  });
});

describe('Random.digits(length)', () => {
  it('returns exactly `length` decimal digits', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 64 }), (seed, length) => {
        const value = createRandom(seed).digits(length);
        expect(value).toMatch(new RegExp(`^[0-9]{${String(length)}}$`));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('returns an empty string for digits(0)', () => {
    expect(createRandom(42).digits(0)).toBe('');
  });

  it.each([
    { seed: 0, values: ['8660321588', '9892354540', '5888147846'] },
    { seed: 42, values: ['6170432560', '6916184389', '2340202876'] },
    { seed: 4294967295, values: ['0881312461', '9867504662', '0845223507'] },
  ])('produces the pinned values of digits(10) for seed $seed', ({ seed, values }) => {
    const random = createRandom(seed);
    expect(draw(3, () => random.digits(10))).toEqual(values);
  });

  it('draws nothing for digits(0)', () => {
    const random = createRandom(42);
    random.digits(0);
    expect(random.uint32()).toBe(551831576);
  });

  it('is exactly one int(0, 9) per digit, left to right', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 30 }), (seed, length) => {
        const random = createRandom(seed);
        const digitByDigit = createRandom(seed);
        expect(random.digits(length)).toBe(draw(length, () => String(digitByDigit.int(0, 9))).join(''));
        expect(random.uint32()).toBe(digitByDigit.uint32());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('handles long strings', () => {
    expect(createRandom(42).digits(1000)).toMatch(/^[0-9]{1000}$/);
  });

  it('allows leading zeros', () => {
    const random = createRandom(42);
    const values = draw(200, () => random.digits(3));
    expect(values.some((value) => value.startsWith('0'))).toBe(true);
  });

  it('uses every decimal digit uniformly', () => {
    const random = createRandom(42);
    const counts = countOccurrences(Array.from(draw(10_000, () => random.digits(10)).join('')));
    // 100 000 digits, expected 10 000 per digit, standard deviation about 95.
    for (const digit of '0123456789') {
      expect(counts.get(digit)).toBeGreaterThan(9_000);
      expect(counts.get(digit)).toBeLessThan(11_000);
    }
  });

  it('is deterministic for the same seed and the same calls', () => {
    fc.assert(
      fc.property(seedArb, fc.integer({ min: 0, max: 20 }), (seed, length) => {
        const first = createRandom(seed);
        const second = createRandom(seed);
        expect(draw(5, () => first.digits(length))).toEqual(draw(5, () => second.digits(length)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each([
    { name: 'a negative length', length: -1 },
    { name: 'a fractional length', length: 1.5 },
    { name: 'NaN', length: Number.NaN },
    { name: 'Infinity', length: Number.POSITIVE_INFINITY },
  ])('throws RangeError for $name', ({ length }) => {
    expect(() => createRandom(42).digits(length)).toThrow(RangeError);
  });

  it('throws RangeError for every negative or non-integer length', () => {
    const badLength = fc.oneof(
      fc.integer({ min: Number.MIN_SAFE_INTEGER, max: -1 }),
      fc.double().filter((value) => !Number.isInteger(value)),
    );
    fc.assert(
      fc.property(badLength, (length) => {
        expect(() => createRandom(42).digits(length)).toThrow(RangeError);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('Random – frozen algorithms', () => {
  it('matches the reference for any sequence of uint32, int, pick and digits calls', () => {
    fc.assert(
      fc.property(seedArb, fc.array(operationArb, { maxLength: 40 }), (seed, operations) => {
        const random = createRandom(seed);
        const reference = createReferenceRandom(seed);
        for (const operation of operations) {
          expect(apply(random, operation)).toEqual(apply(reference, operation));
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('streamSeed(seed, id) = (seed XOR fnv1a32(id)) >>> 0', () => {
  // fnv1a32('birthNumber') = 2113962923, fnv1a32('ico') = 2095122494, computed independently
  // (reference in tests/support/reference.ts, cross-checked in C).
  it.each([
    { seed: 0, id: 'birthNumber', expected: 2113962923 },
    { seed: 1, id: 'birthNumber', expected: 2113962922 },
    { seed: 42, id: 'birthNumber', expected: 2113962881 },
    { seed: 4294967295, id: 'birthNumber', expected: 2181004372 },
    { seed: 0, id: 'ico', expected: 2095122494 },
    { seed: 1, id: 'ico', expected: 2095122495 },
    { seed: 42, id: 'ico', expected: 2095122452 },
    { seed: 4294967295, id: 'ico', expected: 2199844801 },
  ])('streamSeed($seed, $id) is $expected', ({ seed, id, expected }) => {
    expect(streamSeed(seed, id)).toBe(expected);
  });

  // Published FNV-1a 32-bit test vectors: '' → 0x811c9dc5, 'a' → 0xe40c292c, 'foobar' → 0xbf9cf968.
  it.each([
    { id: '', expected: 0x811c9dc5 },
    { id: 'a', expected: 0xe40c292c },
    { id: 'foobar', expected: 0xbf9cf968 },
  ])('uses the standard FNV-1a offset basis and prime (seed 0, id "$id")', ({ id, expected }) => {
    expect(streamSeed(0, id)).toBe(expected);
  });

  it('hashes UTF-16 code units, not UTF-8 bytes', () => {
    // 'ž' is the single code unit 0x017E (→ 4211784289); its UTF-8 bytes C5 BE would give 2408550426.
    expect(streamSeed(0, 'ž')).toBe(4211784289);
  });

  it('matches the FNV-1a + XOR reference for any seed and id', () => {
    fc.assert(
      fc.property(seedArb, fc.string({ unit: 'binary', maxLength: 30 }), (seed, id) => {
        expect(streamSeed(seed, id)).toBe(referenceStreamSeed(seed, id));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('equals fnv1a32(id) for seed 0', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (id) => {
        expect(streamSeed(0, id)).toBe(referenceFnv1a32(id));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('always returns a uint32', () => {
    fc.assert(
      fc.property(seedArb, fc.string({ maxLength: 30 }), (seed, id) => {
        const value = streamSeed(seed, id);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(MAX_UINT32);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('XORs the seed: streamSeed(a, id) XOR streamSeed(b, id) equals a XOR b', () => {
    fc.assert(
      fc.property(seedArb, seedArb, fc.string({ maxLength: 30 }), (a, b, id) => {
        expect((streamSeed(a, id) ^ streamSeed(b, id)) >>> 0).toBe((a ^ b) >>> 0);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives different identifiers different streams for the same seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(streamSeed(seed, 'birthNumber')).not.toBe(streamSeed(seed, 'ico'));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
