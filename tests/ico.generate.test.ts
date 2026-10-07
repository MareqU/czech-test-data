// Specification of the plain IČO generator – docs/rules/ico.md section 8 (output 8 digits, d1 uniform 1–9,
// d2–d7 uniform 0–9, d8 = (11 − S mod 11) mod 10, no options) and decision 4 (plain values never start with 0).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createIco, validateIco } from '../src/ico/index.js';
import { draw, seedArb } from './support/helpers.js';
import { checkDigitOf, oracleValidate } from './support/ico.js';

const PROPERTY_RUNS = 300;
const SAMPLE = 11000;

describe('every plain value is a valid IČO of 8 digits', () => {
  it('is 8 digits, d1 from 1 to 9, d8 is the expected check digit, accepted by the validator and the oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIco({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^[1-9][0-9]{7}$/);
          expect(Number(value.charAt(7))).toBe(checkDigitOf(value));
          expect(validateIco(value)).toEqual({ valid: true });
          expect(oracleValidate(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createIco({ seed, referenceDate: '1900-01-01' });
        const late = createIco({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 50 },
    );
  });
});

describe('distribution (decision 4)', () => {
  const values = ((): string[] => {
    const generator = createIco({ seed: 20261007 });
    return draw(SAMPLE, () => generator());
  })();

  function countsAt(index: number, from: number): number[] {
    const counts = Array.from({ length: 10 }, () => 0);
    for (const value of values) {
      const digit = Number(value.charAt(index));
      counts[digit] = (counts[digit] ?? 0) + 1;
    }
    return counts.slice(from);
  }

  it('draws d1 uniformly from 1 to 9 and never 0', () => {
    const counts = countsAt(0, 0);
    expect(counts[0]).toBe(0);
    for (const count of counts.slice(1)) {
      expect(count).toBeGreaterThan(SAMPLE / 9 - 200);
      expect(count).toBeLessThan(SAMPLE / 9 + 200);
    }
  });

  it.each([1, 2, 3, 4, 5, 6])('draws every digit 0 to 9 uniformly at index %i (d2 to d7)', (index) => {
    for (const count of countsAt(index, 0)) {
      expect(count).toBeGreaterThan(SAMPLE / 10 - 200);
      expect(count).toBeLessThan(SAMPLE / 10 + 200);
    }
  });

  it('gives check digit 0 for about 1 in 11 values and 1 for about 2 in 11 (remainders 1, and 0 or 10)', () => {
    const counts = countsAt(7, 0);
    expect(counts[0]).toBeGreaterThan(SAMPLE / 11 - 200);
    expect(counts[0]).toBeLessThan(SAMPLE / 11 + 200);
    expect(counts[1]).toBeGreaterThan((2 * SAMPLE) / 11 - 250);
    expect(counts[1]).toBeLessThan((2 * SAMPLE) / 11 + 250);
    for (const count of counts.slice(2)) {
      expect(count).toBeGreaterThan(SAMPLE / 11 - 200);
      expect(count).toBeLessThan(SAMPLE / 11 + 200);
    }
  });
});
