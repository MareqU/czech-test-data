// Specification of the plain ean generator – docs/rules/ean.md section 1 (structure), section 9 (options, frozen
// constants, draw order) and decisions 8 and 10; docs/rules/core.md section 3 (invalid options throw RangeError).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEan, validateEan } from '../src/ean/index.js';
import { draw, seedArb } from './support/helpers.js';
import { checkDigit, oracleEan } from './support/ean.js';

const PROPERTY_RUNS = 300;

/** Allowed digits of position 10 per distributor option (section 9, frozen constants). */
const POSITION_10 = {
  egd: '12',
  pre: '3',
  cez: '45678',
} as const;

describe('every plain value is a valid 18-digit Czech electricity EAN of a big distributor', () => {
  it('is 8591824 + 00 + digit 1-8 + 7 digits, accepted by validator and oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^859182400[1-8][0-9]{8}$/);
          expect(Number(value[17])).toBe(checkDigit(value.slice(0, 17)));
          expect(validateEan(value)).toEqual({ valid: true });
          expect(oracleEan(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createEan({ seed, referenceDate: '1900-01-01' });
        const late = createEan({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 100 },
    );
  });

  it('reaches every digit 1-8 at position 10 by default', () => {
    const generator = createEan({ seed: 3 });
    const found = new Set(draw(400, () => generator()).map((value) => value[9]));
    expect(found).toEqual(new Set('12345678'.split('')));
  });

  it('reaches every final check digit 0-9', () => {
    const generator = createEan({ seed: 5 });
    expect(new Set(draw(400, () => generator()).map((value) => value[17]))).toEqual(new Set('0123456789'.split('')));
  });
});

describe('option distributor (decision 8, section 9)', () => {
  it.each(['egd', 'pre', 'cez'] as const)('%s uses its own digits at position 10 and 00 at positions 8-9', (name) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        for (const value of draw(20, () => generator({ distributor: name }))) {
          expect(value).toMatch(new RegExp(`^859182400[${POSITION_10[name]}][0-9]{8}$`));
          expect(validateEan(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it.each([
    ['egd', '12'],
    ['cez', '45678'],
  ] as const)('%s reaches every one of its digits', (name, expected) => {
    const generator = createEan({ seed: 11 });
    const found = new Set(draw(300, () => generator({ distributor: name })).map((value) => value[9]));
    expect(found).toEqual(new Set(expected.split('')));
  });

  it('lds gives a network 0300-0999 at positions 8-11, 0 at position 12 and a valid check digit', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        for (const value of draw(20, () => generator({ distributor: 'lds' }))) {
          expect(value).toMatch(/^8591824(?:0[3-9][0-9]{2})0[0-9]{6}$/);
          const network = Number(value.slice(7, 11));
          expect(network).toBeGreaterThanOrEqual(300);
          expect(network).toBeLessThanOrEqual(999);
          expect(value[11]).toBe('0');
          expect(validateEan(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('lds reaches both ends of the network range', () => {
    const generator = createEan({ seed: 19 });
    const networks = draw(20000, () => generator({ distributor: 'lds' })).map((value) => Number(value.slice(7, 11)));
    expect(Math.min(...networks)).toBeLessThan(310);
    expect(Math.max(...networks)).toBeGreaterThan(989);
  });

  it('treats an absent options object like the default and ignores other keys', () => {
    const plain = createEan({ seed: 7 });
    const withOptions = createEan({ seed: 7 });
    const withOther = createEan({ seed: 7 });
    const first = draw(5, () => plain());
    expect(draw(5, () => withOptions({}))).toEqual(first);
    expect(draw(5, () => withOther({ foo: 1 } as never))).toEqual(first);
  });
});

describe('invalid options throw RangeError naming the option (docs/rules/core.md section 3, section 9)', () => {
  it.each(['', 'CEZ', 'eon', 'gas', 'cez ', 1, {}])('rejects distributor %j', (distributor) => {
    const generator = createEan({ seed: 1 });
    const options = { distributor } as unknown as { distributor: 'cez' };
    expect(() => generator(options)).toThrow(RangeError);
    expect(() => generator(options)).toThrow(/distributor/);
  });
});
