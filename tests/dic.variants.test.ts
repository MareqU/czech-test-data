// Specification of the DIČ edge and invalid variants – docs/rules/dic.md section 4 (definitions and draw order),
// section 8 (definition order) and section 9 (decisions 2, 7, 9, 11); docs/rules/core.md section 4 (every edge
// value is valid, every invalid variant fails with exactly its own reason). Expected values come from the
// independent oracle in tests/support/dic.ts.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDic, validateDic } from '../src/dic/index.js';
import type { DicEdgeVariant, DicInvalidVariant } from '../src/dic/index.js';
import { dateArb, draw, seedArb } from './support/helpers.js';
import { decodeOrFail, minDate } from './support/birthNumber.js';
import {
  FOREIGN_PREFIXES,
  assignedCheckDigit,
  oracleValidate,
  referenceDicRandom,
  referenceIco,
  referenceVatGroup,
} from './support/dic.js';

const PROPERTY_RUNS = 300;
const REFERENCE_DATE = '2026-10-07';

const EDGE_VARIANTS: readonly DicEdgeVariant[] = ['fromIco', 'fromBirthNumber', 'lowercasePrefix', 'pre1954', 'vatGroup'];
const INVALID_VARIANTS: readonly DicInvalidVariant[] = ['missingPrefix', 'foreignPrefix', 'badInnerChecksum'];

/** Reference dates between the start of the plain birth-number range and the end of its fixed range. */
const cuttingDateArb = dateArb('1954-01-01', '2025-12-31');
const referenceDateArb = fc.oneof(fc.constant(REFERENCE_DATE), cuttingDateArb, dateArb('2026-01-01', '2099-12-31'));

describe('the variant lists (section 8)', () => {
  it('has the edge variants in definition order and the three invalid variants', () => {
    const generator = createDic({ seed: 1, referenceDate: REFERENCE_DATE });
    expect(generator.edgeVariants).toEqual(EDGE_VARIANTS);
    expect(generator.invalidVariants).toEqual(INVALID_VARIANTS);
  });
});

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid for any seed and any referenceDate that leaves its range non-empty', (variant) => {
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(10, () => generator.edge(variant))) {
          expect(validateDic(value, { referenceDate })).toEqual({ valid: true });
          expect(oracleValidate(value, referenceDate)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('every random edge call (no name) is valid', () => {
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(20, () => generator.edge())) {
          expect(validateDic(value, { referenceDate })).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('fromIco is CZ + the plain IČO draws, nothing else drawn first', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        const reference = referenceDicRandom(seed);
        for (let i = 0; i < 5; i += 1) {
          expect(generator.edge('fromIco')).toBe(`CZ${referenceIco(reference)}`);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('fromBirthNumber is CZ + a 10-digit birth number without slash from the plain range 1954-01-01 … min(2025-12-31, referenceDate)', () => {
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(10, () => generator.edge('fromBirthNumber'))) {
          expect(value).toMatch(/^CZ[0-9]{10}$/);
          const { date } = decodeOrFail(value.slice(2));
          expect(date >= '1954-01-01' && date <= minDate('2025-12-31', referenceDate)).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lowercasePrefix is cz + a valid inner part; the form is the first draw int(0, 1) (0 = IČO)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const reference = referenceDicRandom(seed);
        const value = createDic({ seed, referenceDate: REFERENCE_DATE }).edge('lowercasePrefix');
        if (reference.int(0, 1) === 0) {
          expect(value).toBe(`cz${referenceIco(reference)}`);
        } else {
          expect(value).toMatch(/^cz[0-9]{10}$/);
        }
        expect(oracleValidate(`CZ${value.slice(2)}`, REFERENCE_DATE)).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('pre1954 is CZ + a 9-digit birth number born 1900-01-01 … 1953-12-31 (never starting with 6)', () => {
    fc.assert(
      fc.property(seedArb, dateArb('1900-01-01', '2099-12-31'), (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(10, () => generator.edge('pre1954'))) {
          expect(value).toMatch(/^CZ[0-5][0-9]{8}$/);
          const { date } = decodeOrFail(value.slice(2));
          expect(date >= '1900-01-01' && date <= minDate('1953-12-31', referenceDate)).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('vatGroup is CZ699 + digits(5) + the check digit (a + 8) mod 10 of section 2.4', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        const reference = referenceDicRandom(seed);
        for (let i = 0; i < 5; i += 1) {
          const value = generator.edge('vatGroup');
          expect(value).toBe(`CZ${referenceVatGroup(reference)}`);
          expect(value).toMatch(/^CZ699[0-9]{6}$/);
          expect(Number(value.charAt(10))).toBe(assignedCheckDigit(value.slice(2)));
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('invalid variants (section 4): exactly the reason named like the variant, one fault only', () => {
  it.each(INVALID_VARIANTS)('%s fails with exactly that reason for any seed and referenceDate', (variant) => {
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const generator = createDic({ seed, referenceDate });
        for (const value of draw(10, () => generator.invalid(variant))) {
          expect(validateDic(value, { referenceDate })).toEqual({ valid: false, reason: variant });
          expect(oracleValidate(value, referenceDate)).toEqual({ valid: false, reason: variant });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('every random invalid call (no name) fails with one of the three variant reasons', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDic({ seed, referenceDate: REFERENCE_DATE });
        for (const value of draw(20, () => generator.invalid())) {
          const result = validateDic(value, { referenceDate: REFERENCE_DATE });
          expect(result.valid).toBe(false);
          expect(INVALID_VARIANTS as readonly (string | undefined)[]).toContain(result.valid ? undefined : result.reason);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('missingPrefix is a valid 8-digit IČO or 10-digit birth number returned as is; form is the first draw int(0, 1)', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const reference = referenceDicRandom(seed);
        const value = createDic({ seed, referenceDate: REFERENCE_DATE }).invalid('missingPrefix');
        if (reference.int(0, 1) === 0) {
          expect(value).toBe(referenceIco(reference));
        } else {
          expect(value).toMatch(/^[0-9]{10}$/);
        }
        expect(oracleValidate(`CZ${value}`, REFERENCE_DATE)).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('foreignPrefix is pick(26 EU prefixes) first, then the plain inner part (form draw int(0, 1))', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const reference = referenceDicRandom(seed);
        const value = createDic({ seed, referenceDate: REFERENCE_DATE }).invalid('foreignPrefix');
        const prefix = reference.pick(FOREIGN_PREFIXES);
        expect(value.slice(0, 2)).toBe(prefix);
        if (reference.int(0, 1) === 0) {
          expect(value.slice(2)).toBe(referenceIco(reference));
        } else {
          expect(value.slice(2)).toMatch(/^[0-9]{10}$/);
        }
        expect(oracleValidate(`CZ${value.slice(2)}`, REFERENCE_DATE)).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('foreignPrefix uses only the 26 EU prefixes (decision 11) and all of them occur; never CZ or GR', () => {
    expect(FOREIGN_PREFIXES).toHaveLength(26);
    const generator = createDic({ seed: 20261007, referenceDate: REFERENCE_DATE });
    const prefixes = new Set(draw(3000, () => generator.invalid('foreignPrefix').slice(0, 2)));
    expect([...prefixes].sort()).toEqual([...FOREIGN_PREFIXES].sort());
    expect(prefixes.has('CZ')).toBe(false);
    expect(prefixes.has('GR')).toBe(false);
  });

  it('badInnerChecksum is CZ + an 8-digit IČO or 10-digit birth number whose only fault is the checksum; form is the first draw', () => {
    fc.assert(
      fc.property(seedArb, referenceDateArb, (seed, referenceDate) => {
        const reference = referenceDicRandom(seed);
        const value = createDic({ seed, referenceDate }).invalid('badInnerChecksum');
        const isIco = reference.int(0, 1) === 0;
        expect(value).toMatch(isIco ? /^CZ[0-9]{8}$/ : /^CZ[0-9]{10}$/);
        if (!isIco) {
          // the date is real and not in the future, so nothing but the checksum can be wrong
          expect(decodeOrFail(value.slice(2)).date <= referenceDate).toBe(true);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
