// Specification of the postalCode (PSČ) edge and invalid variants – docs/rules/postalCode.md section 4
// (definitions and generator constraints) and section 9; docs/rules/core.md section 4 (every edge value is
// valid, every invalid variant fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createPostalCode, validatePostalCode } from '../src/postalCode/index.js';
import type { PostalCodeEdgeVariant, PostalCodeInvalidVariant } from '../src/postalCode/index.js';
import { draw, seedArb } from './support/helpers.js';
import { oracleValidate } from './support/postalCode.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly PostalCodeEdgeVariant[] = ['withoutSpace', 'nonGeographic'];
const INVALID_VARIANTS: readonly PostalCodeInvalidVariant[] = ['wrongLength', 'letters', 'badFormat', 'foreignRange'];

/** The one-fault shapes of the `badFormat` variant (section 4). */
const BAD_FORMAT_SHAPES: readonly RegExp[] = [/^\d{4} \d$/, /^\d{2} \d{3}$/, /^\d \d{4}$/, /^\d{3}-\d{2}$/, /^\d{3} {2}\d{2}$/];

function digitCount(value: string): number {
  return value.replace(/[^0-9]/g, '').length;
}

const EDGE_CHECKS: Readonly<Record<PostalCodeEdgeVariant, (value: string) => void>> = {
  withoutSpace: (value) => {
    expect(value).toMatch(/^[1-7][0-9]{4}$/);
  },
  nonGeographic: (value) => {
    expect(value).toMatch(/^2[0-4][0-9] [0-9]{2}$/);
  },
};

/** Whether `value` is a legal `badFormat` variant output: a valid 5-digit code with one formatting fault. */
function isBadFormatShape(value: string): boolean {
  if (BAD_FORMAT_SHAPES.some((shape) => shape.test(value))) {
    return true;
  }
  const trimmed = value.trim();
  return trimmed !== value && /^(\d{5}|\d{3} \d{2})$/.test(trimmed) && value.replace(/^ +| +$/g, '') === trimmed;
}

const INVALID_CHECKS: Readonly<Record<PostalCodeInvalidVariant, (value: string) => void>> = {
  wrongLength: (value) => {
    expect([4, 6], `digits of ${JSON.stringify(value)}`).toContain(digitCount(value));
    expect(value).toMatch(/^[1-7][0-9]{2}(?: |)[0-9]+$/);
    expect(!value.includes(' ') || value.indexOf(' ') === 3).toBe(true);
  },
  letters: (value) => {
    expect(value).toHaveLength(6);
    expect(value.charAt(3)).toBe(' ');
    expect(value.match(/[A-Z]/g)).toHaveLength(1);
    expect(value.replace(/[A-Z]/, '1')).toMatch(/^[0-9]{3} [0-9]{2}$/);
    if (/^[0-9]/.test(value)) {
      expect(value.charAt(0)).toMatch(/[1-7]/);
    }
  },
  badFormat: (value) => {
    expect(isBadFormatShape(value), `${JSON.stringify(value)} is a one-fault shape`).toBe(true);
    expect(digitCount(value)).toBe(5);
    expect(value.replace(/[^0-9]/g, '')).toMatch(/^[1-7]/);
  },
  foreignRange: (value) => {
    expect(value).toMatch(/^[089][0-9]{2} [0-9]{2}$/);
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPostalCode({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validatePostalCode(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPostalCode({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validatePostalCode(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('withoutSpace is the machine form of a plain value: same digit distribution, no space', () => {
    const generator = createPostalCode({ seed: 7 });
    const values = draw(500, () => generator.edge('withoutSpace'));
    expect(new Set(values.map((v) => v.charAt(0)))).toEqual(new Set(['1', '2', '3', '4', '5', '6', '7']));
  });
});

describe('invalid variants (section 4): exactly one fault, exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s fails with reason %s and matches its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPostalCode({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          expect(validatePostalCode(value)).toEqual({ valid: false, reason: variant });
          expect(oracleValidate(value)).toEqual({ valid: false, reason: variant });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and the random invalid() fails with one of their reasons', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createPostalCode({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          const result = validatePostalCode(value);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(INVALID_VARIANTS).toContain(result.reason);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('wrongLength reaches 4 and 6 digits, with and without the space', () => {
    const generator = createPostalCode({ seed: 11 });
    const values = draw(400, () => generator.invalid('wrongLength'));
    expect(new Set(values.map(digitCount))).toEqual(new Set([4, 6]));
    expect(values.some((v) => v.includes(' '))).toBe(true);
    expect(values.some((v) => !v.includes(' '))).toBe(true);
  });

  it('letters replaces digits at several positions with letters A to Z', () => {
    const generator = createPostalCode({ seed: 11 });
    const values = draw(400, () => generator.invalid('letters'));
    expect(new Set(values.map((v) => v.search(/[A-Z]/))).size).toBeGreaterThan(3);
  });

  it('badFormat reaches every shape of section 4', () => {
    const generator = createPostalCode({ seed: 11 });
    const values = draw(1000, () => generator.invalid('badFormat'));
    for (const shape of BAD_FORMAT_SHAPES) {
      expect(values.some((v) => shape.test(v)), String(shape)).toBe(true);
    }
    expect(values.some((v) => v.startsWith(' '))).toBe(true);
    expect(values.some((v) => v.endsWith(' '))).toBe(true);
  });

  it('foreignRange reaches the first digits 0, 8 and 9', () => {
    const generator = createPostalCode({ seed: 11 });
    const values = draw(200, () => generator.invalid('foreignRange'));
    expect(new Set(values.map((v) => v.charAt(0)))).toEqual(new Set(['0', '8', '9']));
  });
});
