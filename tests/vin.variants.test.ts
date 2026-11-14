// Specification of the vin edge and invalid variants – docs/rules/vin.md section 4 (definitions) and section 9 (draw
// shapes, frozen constants); docs/rules/core.md section 4 (every edge value is valid, every invalid variant fails with
// exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createVin, validateVin } from '../src/vin/index.js';
import type { VinEdgeVariant, VinInvalidVariant } from '../src/vin/index.js';
import { draw, seedArb } from './support/helpers.js';
import {
  ALPHABET_CLASS,
  CHECK,
  FORBIDDEN,
  LETTERS,
  LETTER_CLASS,
  SMALL_WMI,
  WMI,
  YEAR_CLASS,
  checkChar,
  oracleVin,
  replaceAt,
  withCheck,
} from './support/vin.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly VinEdgeVariant[] = ['checkDigitX', 'smallManufacturer', 'noModelYear'];
const INVALID_VARIANTS: readonly VinInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'forbiddenLetter',
  'nonNumericSerial',
];

/** Indexes at which two values differ. */
function differences(first: string, second: string): number[] {
  return Array.from(first, (char, index) => (char === second.charAt(index) ? -1 : index)).filter((i) => i >= 0);
}

const EDGE_CHECKS: Readonly<Record<VinEdgeVariant, (value: string) => void>> = {
  // a plain VIN whose check digit is X
  checkDigitX: (value) => {
    expect(value).toMatch(new RegExp(`^${WMI}${ALPHABET_CLASS}{5}X${YEAR_CLASS}[0-9]{7}$`));
  },
  // TM9, positions 12-13 letters, 14-17 digits, check digit recomputed
  smallManufacturer: (value) => {
    expect(value).toMatch(
      new RegExp(`^${SMALL_WMI}${ALPHABET_CLASS}{5}[0-9X]${YEAR_CLASS}[0-9]${LETTER_CLASS}{2}[0-9]{4}$`),
    );
    expect(value.charAt(8)).toBe(checkChar(value));
  },
  // a plain VIN with 0 in position 10, check digit recomputed
  noModelYear: (value) => {
    expect(value).toMatch(new RegExp(`^${WMI}${ALPHABET_CLASS}{5}[0-9X]0[0-9]{7}$`));
    expect(value.charAt(8)).toBe(checkChar(value));
  },
};

const INVALID_CHECKS: Readonly<Record<VinInvalidVariant, (value: string) => void>> = {
  // a plain VIN with another check character from 0-9 and X
  badChecksum: (value) => {
    expect(value).toMatch(new RegExp(`^${WMI}${ALPHABET_CLASS}{5}[0-9X]${YEAR_CLASS}[0-9]{7}$`));
    expect(value.charAt(8)).not.toBe(checkChar(value));
  },
  // 16 characters (last one dropped) or 18 (one digit appended), alphabet correct
  wrongLength: (value) => {
    expect(value).toMatch(new RegExp(`^${WMI}${ALPHABET_CLASS}{5}[0-9X]${YEAR_CLASS}[0-9]{6}(?:[0-9]{2})?$`));
    expect([16, 18]).toContain(value.length);
  },
  // 17 characters, exactly one of them I, O or Q
  forbiddenLetter: (value) => {
    expect(value).toHaveLength(17);
    expect(value.split('').filter((char) => FORBIDDEN.includes(char))).toHaveLength(1);
    expect(value).toMatch(/^[0-9A-Z]{17}$/);
  },
  // one of positions 14-17 is a letter (not I, O, Q), the check digit is recomputed
  nonNumericSerial: (value) => {
    expect(value).toMatch(new RegExp(`^${WMI}${ALPHABET_CLASS}{5}[0-9X]${YEAR_CLASS}[0-9]{3}[0-9A-Z]{4}$`));
    expect(value.slice(13).split('').filter((char) => LETTERS.includes(char))).toHaveLength(1);
    expect(value.charAt(8)).toBe(checkChar(value));
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createVin({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateVin(value)).toEqual({ valid: true });
          expect(oracleVin(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createVin({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateVin(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('checkDigitX is the first plain value with check digit X of the same stream (section 9)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed });
        let expected = plain();
        while (expected.charAt(8) !== 'X') {
          expected = plain();
        }
        expect(createVin({ seed }).edge('checkDigitX')).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('noModelYear is the plain value of the same stream with 0 in position 10 and the check digit recomputed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        expect(createVin({ seed }).edge('noModelYear')).toBe(withCheck(replaceAt(plain, 9, '0')));
      }),
      { numRuns: 100 },
    );
  });

  it('smallManufacturer draws the VDS and the year code of the plain value of the same stream (section 9)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        const value = createVin({ seed }).edge('smallManufacturer');
        expect(value.slice(3, 8)).toBe(plain.slice(3, 8));
        expect(value.charAt(9)).toBe(plain.charAt(9));
      }),
      { numRuns: 100 },
    );
  });

  it('smallManufacturer reaches every letter at positions 12 and 13 and every digit at 11 and 14-17', () => {
    const generator = createVin({ seed: 19 });
    const values = draw(1500, () => generator.edge('smallManufacturer'));
    for (const position of [11, 12]) {
      expect(new Set(values.map((value) => value.charAt(position)))).toEqual(new Set(LETTERS.split('')));
    }
    for (const position of [10, 13, 14, 15, 16]) {
      expect(new Set(values.map((value) => value.charAt(position)))).toEqual(new Set('0123456789'.split('')));
    }
    expect(new Set(values.map((value) => value.charAt(8)))).toEqual(new Set(CHECK.split('')));
  });
});

describe('invalid variants (section 4): each fails with exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s has its documented shape and reason for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createVin({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          const expected = { valid: false, reason: variant };
          expect(validateVin(value)).toEqual(expected);
          expect(oracleVin(value)).toEqual(expected);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and every random invalid() fails', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createVin({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          expect(validateVin(value).valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('badChecksum changes only position 9 of the plain value of the same stream (section 9 draw order)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        expect(differences(plain, createVin({ seed }).invalid('badChecksum'))).toEqual([8]);
      }),
      { numRuns: 100 },
    );
  });

  it('wrongLength drops the last character or appends one digit to the plain value of the same stream', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        const value = createVin({ seed }).invalid('wrongLength');
        expect(value.length === 16 ? value === plain.slice(0, 16) : value.startsWith(plain)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('forbiddenLetter changes exactly one position of the plain value of the same stream', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        const value = createVin({ seed }).invalid('forbiddenLetter');
        expect(differences(plain, value)).toHaveLength(1);
      }),
      { numRuns: 100 },
    );
  });

  it('nonNumericSerial changes one of positions 14-17 of the plain value and recomputes the check digit', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const plain = createVin({ seed })();
        const value = createVin({ seed }).invalid('nonNumericSerial');
        const changed = differences(plain, value).filter((index) => index !== 8);
        expect(changed).toHaveLength(1);
        expect(changed[0]).toBeGreaterThanOrEqual(13);
        expect(value.charAt(8)).toBe(checkChar(value));
      }),
      { numRuns: 100 },
    );
  });

  it('draws every other check digit, both lengths, every forbidden letter at every position and every serial letter', () => {
    const generator = createVin({ seed: 13 });
    const wrong = new Set(draw(1500, () => generator.invalid('badChecksum')).map((value) => value.charAt(8)));
    expect(wrong).toEqual(new Set(CHECK.split('')));
    const lengths = new Set(draw(100, () => generator.invalid('wrongLength')).map((value) => value.length));
    expect(lengths).toEqual(new Set([16, 18]));
    const forbidden = draw(3000, () => generator.invalid('forbiddenLetter'));
    expect(new Set(forbidden.flatMap((value) => value.split('').filter((char) => FORBIDDEN.includes(char))))).toEqual(
      new Set(FORBIDDEN.split('')),
    );
    for (let position = 0; position < 17; position += 1) {
      expect(forbidden.some((value) => FORBIDDEN.includes(value.charAt(position)))).toBe(true);
    }
    const serial = draw(3000, () => generator.invalid('nonNumericSerial'));
    expect(new Set(serial.flatMap((value) => value.slice(13).split('').filter((char) => /[A-Z]/.test(char))))).toEqual(
      new Set(LETTERS.split('')),
    );
    for (let position = 13; position < 17; position += 1) {
      expect(serial.some((value) => /[A-Z]/.test(value.charAt(position)))).toBe(true);
    }
  });
});
