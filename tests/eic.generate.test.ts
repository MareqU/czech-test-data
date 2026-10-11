// Specification of the plain eic generator – docs/rules/eic.md section 1.3 (structure), section 9 (no options, frozen
// constants, draw order) and decisions 8 and 10.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEic, validateEic } from '../src/eic/index.js';
import { draw, seedArb } from './support/helpers.js';
import { ALPHABET, checkValue, oracleEic } from './support/eic.js';

const PROPERTY_RUNS = 300;

describe('every plain value is a valid 16-character Czech gas supply point EIC', () => {
  it('is 27ZG + region digit + 00 + Z + 7 digits + check character, accepted by validator and oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEic({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^27ZG[1-79]00Z[0-9]{7}[0-9A-Z]$/);
          expect(ALPHABET.charAt(checkValue(value.slice(0, 15)))).toBe(value.charAt(15));
          expect(validateEic(value)).toEqual({ valid: true });
          expect(oracleEic(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never ends with a dash (a body whose check value is 36 is redrawn)', () => {
    const generator = createEic({ seed: 2 });
    for (const value of draw(3000, () => generator())) {
      expect(value.endsWith('-')).toBe(false);
    }
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createEic({ seed, referenceDate: '1900-01-01' });
        const late = createEic({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 100 },
    );
  });

  it('reaches exactly the region digits 1-7 and 9 at position 5 (8 is unused)', () => {
    const generator = createEic({ seed: 3 });
    const found = new Set(draw(600, () => generator()).map((value) => value.charAt(4)));
    expect(found).toEqual(new Set('12345679'.split('')));
  });

  it('reaches every check character 0-9 and A-Z', () => {
    const generator = createEic({ seed: 5 });
    const found = new Set(draw(4000, () => generator()).map((value) => value.charAt(15)));
    expect(found).toEqual(new Set(ALPHABET.slice(0, 36).split('')));
  });

  it('reaches every digit at every position of the 7-digit sequence number', () => {
    const generator = createEic({ seed: 17 });
    const values = draw(600, () => generator());
    for (let position = 8; position < 15; position += 1) {
      expect(new Set(values.map((value) => value.charAt(position)))).toEqual(new Set('0123456789'.split('')));
    }
  });
});
