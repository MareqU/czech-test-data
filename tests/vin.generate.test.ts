// Specification of the plain vin generator – docs/rules/vin.md section 1.2 (structure), section 9 (no options, frozen
// constants, draw order) and decisions 5 and 9.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createVin, validateVin } from '../src/vin/index.js';
import { draw, seedArb } from './support/helpers.js';
import {
  ALPHABET,
  ALPHABET_CLASS,
  CHECK,
  FORBIDDEN,
  LETTERS,
  WMI,
  YEAR_CLASS,
  YEAR_CODES,
  checkChar,
  oracleVin,
} from './support/vin.js';

const PROPERTY_RUNS = 300;
const PLAIN_SHAPE = new RegExp(`^${WMI}${ALPHABET_CLASS}{5}[0-9X]${YEAR_CLASS}[0-9]{7}$`);

describe('every plain value is a valid 17-character VIN of the Czech WMI TMB', () => {
  it('is TMB + 5 VDS characters + check digit + year code + plant digit + 6 serial digits, accepted by validator and oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createVin({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toHaveLength(17);
          expect(value).toMatch(PLAIN_SHAPE);
          expect(value.charAt(8)).toBe(checkChar(value));
          expect(validateVin(value)).toEqual({ valid: true });
          expect(oracleVin(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('never contains I, O or Q and only upper-case letters and digits', () => {
    const generator = createVin({ seed: 2 });
    for (const value of draw(2000, () => generator())) {
      expect(value).toMatch(/^[0-9A-Z]{17}$/);
      expect(value).not.toMatch(new RegExp(`[${FORBIDDEN}]`));
    }
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createVin({ seed, referenceDate: '1900-01-01' });
        const late = createVin({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 100 },
    );
  });

  it('reaches every character of the 33-character alphabet at every VDS position (4-8)', () => {
    const generator = createVin({ seed: 3 });
    const values = draw(1500, () => generator());
    for (let position = 3; position < 8; position += 1) {
      expect(new Set(values.map((value) => value.charAt(position)))).toEqual(new Set(ALPHABET.split('')));
    }
  });

  it('reaches every check digit 0-9 and X', () => {
    const generator = createVin({ seed: 5 });
    const found = new Set(draw(1500, () => generator()).map((value) => value.charAt(8)));
    expect(found).toEqual(new Set(CHECK.split('')));
  });

  it('reaches exactly the 30 model year codes at position 10 (no U, Z or 0)', () => {
    const generator = createVin({ seed: 7 });
    const found = new Set(draw(1500, () => generator()).map((value) => value.charAt(9)));
    expect(found).toEqual(new Set(YEAR_CODES.split('')));
    expect(YEAR_CODES).toHaveLength(30);
    expect(LETTERS).toHaveLength(23);
  });

  it('reaches every digit at every position of the plant digit and the serial (11-17)', () => {
    const generator = createVin({ seed: 17 });
    const values = draw(600, () => generator());
    for (let position = 10; position < 17; position += 1) {
      expect(new Set(values.map((value) => value.charAt(position)))).toEqual(new Set('0123456789'.split('')));
    }
  });
});
