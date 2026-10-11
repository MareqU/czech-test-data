// Specification of the ean edge and invalid variants – docs/rules/ean.md section 4 (definitions) and section 9
// (draw shapes, frozen constants); docs/rules/core.md section 4 (every edge value is valid, every invalid variant
// fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createEan, validateEan } from '../src/ean/index.js';
import type { EanEdgeVariant, EanInvalidVariant } from '../src/ean/index.js';
import { draw, seedArb } from './support/helpers.js';
import { PREFIX, checkDigit, oracleEan } from './support/ean.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly EanEdgeVariant[] = ['checkDigitZero', 'lds'];
const INVALID_VARIANTS: readonly EanInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters', 'wrongPrefix'];

const EDGE_CHECKS: Readonly<Record<EanEdgeVariant, (value: string) => void>> = {
  // a plain big-distributor EAN whose check digit is 0
  checkDigitZero: (value) => {
    expect(value).toMatch(/^859182400[1-8][0-9]{7}0$/);
  },
  // 8591824 + network 0300-0999 + 0 + 5 digits + check digit: positions 8-9 are not 00
  lds: (value) => {
    expect(value).toMatch(/^8591824(?:0[3-9][0-9]{2})0[0-9]{6}$/);
    expect(value.slice(7, 9)).not.toBe('00');
  },
};

const INVALID_CHECKS: Readonly<Record<EanInvalidVariant, (value: string) => void>> = {
  // a plain EAN with another check digit: prefix and length untouched
  badChecksum: (value) => {
    expect(value).toMatch(/^859182400[1-8][0-9]{8}$/);
    expect(Number(value[17])).not.toBe(checkDigit(value.slice(0, 17)));
  },
  // 17 digits (check digit dropped) or 19 digits (a digit appended), digits only, correct prefix
  wrongLength: (value) => {
    expect(value).toMatch(/^859182400[1-8][0-9]{7,9}$/);
    expect([17, 19]).toContain(value.length);
  },
  // one of the 18 characters replaced by A, O or l
  letters: (value) => {
    expect(value).toMatch(/^[0-9AOl]{18}$/);
    expect(value.match(/[AOl]/g)).toHaveLength(1);
  },
  // 859 + a block other than 1824 + plain positions 8-17 + recomputed check digit (GS1-valid)
  wrongPrefix: (value) => {
    expect(value).toMatch(/^859[0-9]{15}$/);
    expect(value.slice(3, 7)).not.toBe('1824');
    expect(value.startsWith(PREFIX)).toBe(false);
    expect(value.slice(7, 9)).toBe('00');
    expect(Number(value[17])).toBe(checkDigit(value.slice(0, 17)));
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateEan(value)).toEqual({ valid: true });
          expect(oracleEan(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateEan(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('checkDigitZero is the first plain value with check digit 0 of the same stream (section 9)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createEan({ seed });
        let expected = plain();
        while (!expected.endsWith('0')) {
          expected = plain();
        }
        expect(createEan({ seed }).edge('checkDigitZero')).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('lds equals the plain generator with distributor lds (section 9)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(createEan({ seed }).edge('lds')).toBe(createEan({ seed })({ distributor: 'lds' }));
      }),
      { numRuns: 100 },
    );
  });
});

describe('invalid variants (section 4): each fails with exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s has its documented shape and reason for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          const expected = { valid: false, reason: variant };
          expect(validateEan(value)).toEqual(expected);
          expect(oracleEan(value)).toEqual(expected);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and every random invalid() fails', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createEan({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          expect(validateEan(value).valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every variant starts from the plain value of the same stream (section 9 draw order)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createEan({ seed })();
        expect(createEan({ seed }).invalid('badChecksum').slice(0, 17)).toBe(plain.slice(0, 17));
        expect(createEan({ seed }).invalid('wrongLength').slice(0, 17)).toBe(plain.slice(0, 17));
        expect(createEan({ seed }).invalid('wrongPrefix').slice(7, 17)).toBe(plain.slice(7, 17));
        const letters = createEan({ seed }).invalid('letters');
        expect(letters.replace(/[AOl]/, '')).toHaveLength(17);
        expect(letters.split('').filter((ch, i) => ch !== plain[i])).toHaveLength(1);
      }),
      { numRuns: 100 },
    );
  });

  it('draws every other check digit, both lengths, every letter and every position', () => {
    const generator = createEan({ seed: 13 });
    const wrongDigits = draw(600, () => generator.invalid('badChecksum')).map((v) => v[17]);
    expect(new Set(wrongDigits).size).toBe(10);
    const lengths = new Set(draw(100, () => generator.invalid('wrongLength')).map((v) => v.length));
    expect(lengths).toEqual(new Set([17, 19]));
    const letters = draw(1500, () => generator.invalid('letters'));
    expect(new Set(letters.map((v) => /[AOl]/.exec(v)?.[0]))).toEqual(new Set(['A', 'O', 'l']));
    expect(new Set(letters.map((v) => v.search(/[AOl]/)))).toEqual(new Set(Array.from({ length: 18 }, (_, i) => i)));
    const blocks = new Set(draw(2000, () => generator.invalid('wrongPrefix')).map((v) => v.slice(3, 7)));
    expect(blocks.size).toBeGreaterThan(1500);
    expect(blocks.has('1824')).toBe(false);
  });
});
