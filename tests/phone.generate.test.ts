// Specification of the phone (telefonní číslo) generator – docs/rules/phone.md section 8 (generator contract)
// and decisions 1, 2, 5, 6 and 9 of section 9; docs/rules/core.md section 3 (invalid options throw RangeError).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPhone, validatePhone } from '../src/phone/index.js';
import { EMERGENCY_SMS, FIXED_PREFIXES, MOBILE_PREFIXES, classify, nationalDigits } from './support/phone.js';
import { draw, seedArb } from './support/helpers.js';

const PROPERTY_RUNS = 500;
const DEFAULT_FORMAT = /^\+420 [0-9]{3} [0-9]{3} [0-9]{3}$/;

function startsWithAny(national: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => national.startsWith(prefix));
}

describe('plain cz.phone() (decisions 1 and 2)', () => {
  it('is a mobile number in the format +420 ddd ddd ddd that passes the validator', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        for (const value of draw(5, () => generator())) {
          expect(value).toMatch(DEFAULT_FORMAT);
          expect(validatePhone(value)).toEqual({ valid: true });
          expect(startsWithAny(nationalDigits(value), MOBILE_PREFIXES)).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it("equals type 'mobile' for the same seed", () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(createPhone({ seed })()).toBe(createPhone({ seed })({ type: 'mobile' }));
      }),
      { numRuns: 100 },
    );
  });

  it('never produces 706-719 (edge variant only, decision 5) or the emergency SMS number (decision 6)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        for (const value of draw(20, () => generator())) {
          expect(nationalDigits(value)).not.toMatch(/^7(0[6-9]|1[0-9])/);
          expect(nationalDigits(value)).not.toBe(EMERGENCY_SMS);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('uses every mobile prefix and keeps the digits after it free', () => {
    const generator = createPhone({ seed: 7 });
    const values = draw(4000, () => nationalDigits(generator()));
    for (const prefix of MOBILE_PREFIXES) {
      expect(values.some((national) => national.startsWith(prefix))).toBe(true);
    }
    expect(new Set(values).size).toBeGreaterThan(3990);
  });
});

describe("cz.phone({ type: 'fixed' }) (decisions 1 and 9)", () => {
  it('is a fixed-line number in the default format, valid, never starting with 20', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        for (const value of draw(5, () => generator({ type: 'fixed' }))) {
          const national = nationalDigits(value);
          expect(value).toMatch(DEFAULT_FORMAT);
          expect(validatePhone(value)).toEqual({ valid: true });
          expect(startsWithAny(national, FIXED_PREFIXES)).toBe(true);
          expect(national.startsWith('20')).toBe(false);
          expect(classify(national)).toBe('valid');
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('uses every fixed-line prefix', () => {
    const generator = createPhone({ seed: 11 });
    const values = draw(4000, () => nationalDigits(generator({ type: 'fixed' })));
    for (const prefix of FIXED_PREFIXES) {
      expect(values.some((national) => national.startsWith(prefix))).toBe(true);
    }
  });
});

describe('invalid options throw RangeError naming the option (docs/rules/core.md section 3)', () => {
  it.each(['voip', 'Mobile', '', 'landline'])('rejects type %j', (type) => {
    const generator = createPhone({ seed: 1 });
    expect(() => generator({ type: type as 'mobile' })).toThrow(RangeError);
    expect(() => generator({ type: type as 'mobile' })).toThrow(/type/);
  });

  it.each<unknown>([null, 1, true])('rejects the non-string type %j', (type) => {
    const generator = createPhone({ seed: 1 });
    expect(() => generator({ type: type as 'mobile' })).toThrow(/type/);
  });
});
