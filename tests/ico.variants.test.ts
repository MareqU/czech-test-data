// Specification of the IČO edge and invalid variants – docs/rules/ico.md section 4 (definitions and generator
// constraints) and section 9 (decisions 1, 5, 6, 7, 8); docs/rules/core.md section 4 (every edge value is
// valid, every invalid variant fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createIco, validateIco } from '../src/ico/index.js';
import type { IcoEdgeVariant, IcoInvalidVariant } from '../src/ico/index.js';
import { draw, seedArb } from './support/helpers.js';
import { checkDigitOf, oracleValidate, remainderOf } from './support/ico.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly IcoEdgeVariant[] = ['leadingZeros', 'checkDigitZero', 'checkDigitOne'];
const INVALID_VARIANTS: readonly IcoInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters'];

const EDGE_CHECKS: Readonly<Record<IcoEdgeVariant, (value: string) => void>> = {
  // k = 1…4 zeros, then a non-zero digit (decision 5)
  leadingZeros: (value) => {
    expect(value).toMatch(/^0{1,4}[1-9][0-9]*$/);
    expect(value).toHaveLength(8);
  },
  // remainder a = 1, so d8 = 0 (decision 8: redraw a plain base)
  checkDigitZero: (value) => {
    expect(value).toMatch(/^[1-9][0-9]{6}0$/);
    expect(remainderOf(value)).toBe(1);
  },
  // remainder a = 0 only, not a = 10 (decision 1), so d8 = 1
  checkDigitOne: (value) => {
    expect(value).toMatch(/^[1-9][0-9]{6}1$/);
    expect(remainderOf(value)).toBe(0);
  },
};

const INVALID_CHECKS: Readonly<Record<IcoInvalidVariant, (value: string) => void>> = {
  // a plain valid IČO with d8 replaced by a different digit
  badChecksum: (value) => {
    expect(value).toMatch(/^[1-9][0-9]{7}$/);
    expect(Number(value.charAt(7))).not.toBe(checkDigitOf(value));
  },
  // 7 digits (a valid IČO with its one leading zero removed, k = 1) or 9 digits (a valid IČO plus one digit), section 10
  wrongLength: (value) => {
    expect(value).toMatch(/^(?:[1-9][0-9]{6}|[0-9]{9})$/);
    if (value.length === 7) {
      expect(validateIco(`0${value}`)).toEqual({ valid: true });
    } else {
      expect(validateIco(value.slice(0, 8))).toEqual({ valid: true });
    }
  },
  // exactly one of the 8 positions is a letter from A, O, l (decision 7)
  letters: (value) => {
    expect(value).toMatch(/^[0-9]*[AOl][0-9]*$/);
    expect(value).toHaveLength(8);
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIco({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateIco(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIco({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateIco(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('leadingZeros reaches 1, 2, 3 and 4 zeros in front', () => {
    const generator = createIco({ seed: 7 });
    const values = draw(400, () => generator.edge('leadingZeros'));
    expect(new Set(values.map((v) => /^0*/.exec(v)?.[0].length))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('checkDigitZero and checkDigitOne draw varied bases', () => {
    const generator = createIco({ seed: 7 });
    for (const variant of ['checkDigitZero', 'checkDigitOne'] as const) {
      const values = draw(200, () => generator.edge(variant));
      expect(new Set(values).size).toBeGreaterThan(190);
      expect(new Set(values.map((v) => v.charAt(0))).size).toBeGreaterThan(5);
    }
  });
});

describe('invalid variants (section 4): exactly one fault, exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s fails with reason %s and matches its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIco({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          expect(validateIco(value)).toEqual({ valid: false, reason: variant });
          expect(oracleValidate(value)).toEqual({ valid: false, reason: variant });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and the random invalid() fails with one of their reasons', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIco({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          const result = validateIco(value);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(INVALID_VARIANTS).toContain(result.reason);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('badChecksum reaches every wrong check digit, including 0 and 1', () => {
    const generator = createIco({ seed: 11 });
    const values = draw(600, () => generator.invalid('badChecksum'));
    expect(new Set(values.map((v) => v.charAt(7))).size).toBe(10);
  });

  it('wrongLength reaches both 7 and 9 digits', () => {
    const generator = createIco({ seed: 11 });
    const values = draw(200, () => generator.invalid('wrongLength'));
    expect(new Set(values.map((v) => v.length))).toEqual(new Set([7, 9]));
  });

  it('letters reaches all 8 positions and all of A, O, l', () => {
    const generator = createIco({ seed: 11 });
    const values = draw(600, () => generator.invalid('letters'));
    expect(new Set(values.map((v) => v.search(/[AOl]/)))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(new Set(values.map((v) => /[AOl]/.exec(v)?.[0]))).toEqual(new Set(['A', 'O', 'l']));
  });
});
