// Specification of the phone (telefonní číslo) edge and invalid variants – docs/rules/phone.md section 4
// (definitions and generator constraints) and section 8; docs/rules/core.md section 4 (every edge value is
// valid, every invalid variant fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPhone, validatePhone } from '../src/phone/index.js';
import type { PhoneEdgeVariant, PhoneInvalidVariant } from '../src/phone/index.js';
import { classify, MOBILE_PREFIXES, nationalDigits } from './support/phone.js';
import { draw, seedArb } from './support/helpers.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly PhoneEdgeVariant[] = ['withoutSpaces', 'withoutCountryCode', 'digitsOnly', 'prefix00', 'newMobileRange', 'voip'];
const INVALID_VARIANTS: readonly PhoneInvalidVariant[] = ['wrongLength', 'letters', 'wrongCountryCode', 'unknownPrefix', 'specialPrefix'];

/** What each edge variant looks like, and the leading digits it may use. */
const EDGE_SHAPES: Record<PhoneEdgeVariant, { readonly format: RegExp; readonly prefix: RegExp }> = {
  withoutSpaces: { format: /^\+420[0-9]{9}$/, prefix: new RegExp(`^(${MOBILE_PREFIXES.join('|')})`) },
  withoutCountryCode: { format: /^[0-9]{3} [0-9]{3} [0-9]{3}$/, prefix: new RegExp(`^(${MOBILE_PREFIXES.join('|')})`) },
  digitsOnly: { format: /^[0-9]{9}$/, prefix: new RegExp(`^(${MOBILE_PREFIXES.join('|')})`) },
  prefix00: { format: /^00420 [0-9]{3} [0-9]{3} [0-9]{3}$/, prefix: new RegExp(`^(${MOBILE_PREFIXES.join('|')})`) },
  newMobileRange: { format: /^\+420 [0-9]{3} [0-9]{3} [0-9]{3}$/, prefix: /^7(0[6-9]|1[0-9])/ },
  voip: { format: /^\+420 [0-9]{3} [0-9]{3} [0-9]{3}$/, prefix: /^910/ },
};

describe('edge variants (section 4): valid but unusual', () => {
  it('lists the six variants', () => {
    expect([...createPhone({ seed: 1 }).edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
  });

  it.each(EDGE_VARIANTS)('%s has its documented shape, prefix range, and passes the validator', (variant) => {
    const { format, prefix } = EDGE_SHAPES[variant];
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        for (const value of draw(5, () => generator.edge(variant))) {
          expect(value).toMatch(format);
          expect(nationalDigits(value)).toMatch(prefix);
          expect(validatePhone(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('newMobileRange reaches every prefix 706 to 719', () => {
    const generator = createPhone({ seed: 3 });
    const prefixes = new Set(draw(3000, () => nationalDigits(generator.edge('newMobileRange')).slice(0, 3)));
    expect([...prefixes].sort()).toEqual(Array.from({ length: 14 }, (_, index) => String(706 + index)));
  });

  it('a variant without a name is valid and each variant is chosen sometimes', () => {
    const generator = createPhone({ seed: 5 });
    const seen = new Set<string>();
    for (const value of draw(600, () => generator.edge())) {
      expect(validatePhone(value)).toEqual({ valid: true });
      seen.add(
        EDGE_VARIANTS.filter((variant) => EDGE_SHAPES[variant].format.test(value) && EDGE_SHAPES[variant].prefix.test(nationalDigits(value))).join('|'),
      );
    }
    for (const variant of EDGE_VARIANTS) {
      expect([...seen].some((key) => key.split('|').includes(variant))).toBe(true);
    }
  });
});

describe('invalid variants (section 4): exactly one fault, exactly its own reason', () => {
  it('lists the five variants', () => {
    expect([...createPhone({ seed: 1 }).invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it.each(INVALID_VARIANTS)('%s fails the validator with exactly that reason', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        for (const value of draw(5, () => generator.invalid(variant))) {
          expect(validatePhone(value)).toEqual({ valid: false, reason: variant });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('wrongLength is +420 and a plain mobile prefix with 8 or 10 national digits, no spaces', () => {
    const generator = createPhone({ seed: 2 });
    const lengths = new Set<number>();
    for (const value of draw(300, () => generator.invalid('wrongLength'))) {
      expect(value).toMatch(/^\+420[0-9]{8}$|^\+420[0-9]{10}$/);
      expect(value.slice(4)).toMatch(new RegExp(`^(${MOBILE_PREFIXES.join('|')})`));
      lengths.add(value.length - 4);
    }
    expect([...lengths].sort((a, b) => a - b)).toEqual([8, 10]);
  });

  it('letters is the default format with exactly one national digit replaced by a letter', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const value = createPhone({ seed }).invalid('letters');
        expect(value).toMatch(/^\+420 [\p{L}0-9]{3} [\p{L}0-9]{3} [\p{L}0-9]{3}$/u);
        expect(value.match(/\p{L}/gu)).toHaveLength(1);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('wrongCountryCode is a valid national part behind another country code', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const value = createPhone({ seed }).invalid('wrongCountryCode');
        const match = /^\+([0-9]+) ([0-9]{3} [0-9]{3} [0-9]{3})$/.exec(value);
        expect(match).not.toBeNull();
        expect(match?.[1]?.startsWith('420')).toBe(false);
        expect(validatePhone(`+420 ${match?.[2] ?? ''}`)).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('unknownPrefix and specialPrefix are nine digits in the default format with the matching range class', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPhone({ seed });
        const unknown = generator.invalid('unknownPrefix');
        const special = generator.invalid('specialPrefix');
        expect(unknown).toMatch(/^\+420 [0-9]{3} [0-9]{3} [0-9]{3}$/);
        expect(special).toMatch(/^\+420 [0-9]{3} [0-9]{3} [0-9]{3}$/);
        expect(classify(nationalDigits(unknown))).toBe('unknownPrefix');
        expect(classify(nationalDigits(special))).toBe('specialPrefix');
        expect(nationalDigits(special).slice(0, 3)).toMatch(/^(800|81[0-9]|83[0-9]|84[0-9]|900|905|906|908|909)$/);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('a variant without a name is invalid with a reason that names one of the five variants', () => {
    const generator = createPhone({ seed: 9 });
    const reasons = new Set<string>();
    for (const value of draw(600, () => generator.invalid())) {
      const result = validatePhone(value);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(INVALID_VARIANTS).toContain(result.reason);
        reasons.add(result.reason);
      }
    }
    expect([...reasons].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it.each(['badFormat', 'toString', '__proto__', 'month+20', 'wrongLength '])('throws RangeError for the unknown variant name %j', (name) => {
    const generator = createPhone({ seed: 1 });
    expect(() => generator.edge(name as PhoneEdgeVariant)).toThrow(RangeError);
    expect(() => generator.invalid(name as PhoneInvalidVariant)).toThrow(RangeError);
  });
});

describe('variant names are not interchangeable between edge and invalid', () => {
  it('rejects an invalid variant name in edge() and an edge variant name in invalid()', () => {
    const generator = createPhone({ seed: 1 });
    expect(() => generator.edge('wrongLength' as PhoneEdgeVariant)).toThrow(RangeError);
    expect(() => generator.invalid('voip' as PhoneInvalidVariant)).toThrow(RangeError);
  });
});
