// Specification of the plain postalCode (PSČ) generator – docs/rules/postalCode.md section 9 (output `NNN NN`,
// d1 uniform 1–7, d2–d5 uniform 0–9, no options) and decision 7 (20x–24x not excluded).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPostalCode, validatePostalCode } from '../src/postalCode/index.js';
import { draw, seedArb } from './support/helpers.js';
import { oracleValidate } from './support/postalCode.js';

const PROPERTY_RUNS = 300;
const SAMPLE = 7000;

describe('every plain value is a valid postal code of the form NNN NN', () => {
  it('is 6 characters, d1 from 1 to 7, one space after the 3rd digit, accepted by the validator and the oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPostalCode({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^[1-7][0-9]{2} [0-9]{2}$/);
          expect(validatePostalCode(value)).toEqual({ valid: true });
          expect(oracleValidate(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createPostalCode({ seed, referenceDate: '1900-01-01' });
        const late = createPostalCode({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 50 },
    );
  });
});

describe('distribution (decision 7)', () => {
  const values = ((): string[] => {
    const generator = createPostalCode({ seed: 20261006 });
    return draw(SAMPLE, () => generator());
  })();

  it('draws d1 uniformly from 1 to 7 and never 0, 8 or 9', () => {
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value.charAt(0), (counts.get(value.charAt(0)) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(SAMPLE / 7 - 200);
      expect(count).toBeLessThan(SAMPLE / 7 + 200);
    }
  });

  it.each([1, 2, 4, 5])('draws every digit 0 to 9 uniformly at index %i (d2 to d5)', (index) => {
    const counts = Array.from({ length: 10 }, () => 0);
    for (const value of values) {
      const digit = Number(value.charAt(index));
      counts[digit] = (counts[digit] ?? 0) + 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(SAMPLE / 10 - 150);
      expect(count).toBeLessThan(SAMPLE / 10 + 150);
    }
  });

  it('does not exclude the non-geographic range 20x to 24x', () => {
    const inRange = values.filter((value) => /^2[0-4]/.test(value));
    expect(inRange.length).toBeGreaterThan(SAMPLE * 0.04);
  });
});
