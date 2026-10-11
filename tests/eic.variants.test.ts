// Specification of the eic edge and invalid variants – docs/rules/eic.md section 4 (definitions) and section 9
// (draw shapes, frozen constants); docs/rules/core.md section 4 (every edge value is valid, every invalid variant
// fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEic, validateEic } from '../src/eic/index.js';
import type { EicEdgeVariant, EicInvalidVariant } from '../src/eic/index.js';
import { draw, seedArb } from './support/helpers.js';
import { ALPHABET, OTHER_TYPES, checkValue, isEntsoeValid, oracleEic } from './support/eic.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly EicEdgeVariant[] = ['checkCharacterDigit', 'lds'];
const INVALID_VARIANTS: readonly EicInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'wrongPrefix',
  'dashCheckCharacter',
];

const EDGE_CHECKS: Readonly<Record<EicEdgeVariant, (value: string) => void>> = {
  // a plain EIC whose check character is a digit
  checkCharacterDigit: (value) => {
    expect(value).toMatch(/^27ZG[1-79]00Z[0-9]{7}[0-9]$/);
  },
  // region digit + LDS number 01-99 at positions 6-7 (never 00)
  lds: (value) => {
    expect(value).toMatch(/^27ZG[1-79](?:0[1-9]|[1-9][0-9])Z[0-9]{7}[0-9A-Z]$/);
  },
};

const INVALID_CHECKS: Readonly<Record<EicInvalidVariant, (value: string) => void>> = {
  // a plain EIC with another check character from 0-9A-Z, never a dash
  badChecksum: (value) => {
    expect(value).toMatch(/^27ZG[1-79]00Z[0-9]{7}[0-9A-Z]$/);
    expect(value.charAt(15)).not.toBe(ALPHABET.charAt(checkValue(value.slice(0, 15))));
  },
  // 15 characters (check character dropped) or 17 (one digit appended), prefix and alphabet correct
  wrongLength: (value) => {
    expect(value).toMatch(/^27ZG[1-79]00Z[0-9]{7}(?:[0-9A-Z]?[0-9])?$/);
    expect([15, 17]).toContain(value.length);
  },
  // 27 + object type other than Z + G + plain positions 5-15 + recomputed check character (ENTSO-E-valid)
  wrongPrefix: (value) => {
    expect(value).toMatch(/^27[XYWTVA]G[1-79]00Z[0-9]{7}[0-9A-Z]$/);
    expect(isEntsoeValid(value)).toBe(true);
  },
  // a 27ZG body whose check value is 36, followed by the forbidden dash
  dashCheckCharacter: (value) => {
    expect(value).toMatch(/^27ZG[1-79]00Z[0-9]{7}-$/);
    expect(checkValue(value.slice(0, 15))).toBe(36);
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEic({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateEic(value)).toEqual({ valid: true });
          expect(oracleEic(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEic({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateEic(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('checkCharacterDigit is the first plain value with a digit check character of the same stream (section 9)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createEic({ seed });
        let expected = plain();
        while (!/[0-9]$/.test(expected)) {
          expected = plain();
        }
        expect(createEic({ seed }).edge('checkCharacterDigit')).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('lds reaches both ends of the LDS number range 01-99 and every region digit', () => {
    const generator = createEic({ seed: 19 });
    const values = draw(3000, () => generator.edge('lds'));
    const numbers = values.map((value) => Number(value.slice(5, 7)));
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(99);
    expect(new Set(values.map((value) => value.charAt(4)))).toEqual(new Set('12345679'.split('')));
  });
});

describe('invalid variants (section 4): each fails with exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s has its documented shape and reason for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEic({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          const expected = { valid: false, reason: variant };
          expect(validateEic(value)).toEqual(expected);
          expect(oracleEic(value)).toEqual(expected);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and every random invalid() fails', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEic({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          expect(validateEic(value).valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('badChecksum and wrongLength start from the plain value of the same stream (section 9 draw order)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createEic({ seed })();
        expect(createEic({ seed }).invalid('badChecksum').slice(0, 15)).toBe(plain.slice(0, 15));
        expect(createEic({ seed }).invalid('wrongLength').slice(0, 15)).toBe(plain.slice(0, 15));
      }),
      { numRuns: 100 },
    );
  });

  it('wrongPrefix keeps positions 4-15 of the plain value, unless the drawn type gave check value 36 and it redrew', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createEic({ seed })();
        const value = createEic({ seed }).invalid('wrongPrefix');
        if (value.slice(3, 15) !== plain.slice(3, 15)) {
          const redrawn = OTHER_TYPES.some((type) => checkValue(`27${type}${plain.slice(3, 15)}`) === 36);
          expect(redrawn).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('draws every other check character, both lengths, every object type and a dash after every region digit', () => {
    const generator = createEic({ seed: 13 });
    const wrong = draw(3000, () => generator.invalid('badChecksum')).map((value) => value.charAt(15));
    expect(new Set(wrong)).toEqual(new Set(ALPHABET.slice(0, 36).split('')));
    const lengths = new Set(draw(100, () => generator.invalid('wrongLength')).map((value) => value.length));
    expect(lengths).toEqual(new Set([15, 17]));
    const types = new Set(draw(300, () => generator.invalid('wrongPrefix')).map((value) => value.charAt(2)));
    expect(types).toEqual(new Set(OTHER_TYPES));
    const dashes = draw(300, () => generator.invalid('dashCheckCharacter'));
    expect(new Set(dashes.map((value) => value.charAt(4)))).toEqual(new Set('12345679'.split('')));
  });
});
