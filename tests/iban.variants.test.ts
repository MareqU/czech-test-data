// Specification of the iban edge and invalid variants – docs/rules/iban.md section 4 (definitions) and section 9
// (draw shapes, frozen constants); docs/rules/core.md section 4 (every edge value is valid, every invalid variant
// fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createIban, validateIban } from '../src/iban/index.js';
import type { IbanEdgeVariant, IbanInvalidVariant } from '../src/iban/index.js';
import { draw, seedArb } from './support/helpers.js';
import { GENERATOR_BANK_CODES, UNKNOWN_BANK_CODES, oracleValidate, partsOf } from './support/bankAccount.js';
import { embeddedAccount, fieldsOf, mod97Remainder, oracleIbanValidate, toIbanOracle } from './support/iban.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly IbanEdgeVariant[] = ['withSpaces', 'lowercase', 'withPrefix', 'checkDigitsLeadingZero'];
const INVALID_VARIANTS: readonly IbanInvalidVariant[] = [
  'badChecksum',
  'wrongCountry',
  'wrongLength',
  'letters',
  'badChecksumPrefix',
  'badChecksumNumber',
  'zeroNumber',
  'unknownBankCode',
];

const KK = /^(?:0[2-9]|[1-8][0-9]|9[0-8])$/;

/** A plain, correctly padded Czech IBAN of an account (the account is untouched, only the check digits differ). */
function expectValidBban(value: string, country: string): void {
  expect(value.slice(0, 2)).toBe(country);
  expect(value).toHaveLength(24);
  expect(value.slice(2, 4)).toMatch(KK);
  expect(mod97Remainder(value)).toBe(1);
  expect(oracleValidate(embeddedAccount(value))).toEqual({ valid: true });
  expect(GENERATOR_BANK_CODES).toContain(fieldsOf(value).code);
}

/** Expectations on an account variant: correct check digits (a pure ISO validator accepts it), bad account. */
function expectIsoValidWithBadAccount(value: string, reason: string): void {
  expect(value).toMatch(/^CZ[0-9]{22}$/);
  expect(value.slice(2, 4)).toMatch(KK);
  expect(mod97Remainder(value)).toBe(1);
  expect(oracleValidate(embeddedAccount(value))).toEqual({
    valid: false,
    reason,
  });
  expect(value).toBe(toIbanOracle(embeddedAccount(value), 'CZ'));
}

const EDGE_CHECKS: Readonly<Record<IbanEdgeVariant, (value: string) => void>> = {
  withSpaces: (value) => {
    expect(value).toMatch(/^CZ[0-9]{2}(?: [0-9]{4}){5}$/);
    expect(value).toHaveLength(29);
    expectValidBban(value.replaceAll(' ', ''), 'CZ');
  },
  lowercase: (value) => {
    expect(value).toMatch(/^cz[0-9]{22}$/);
    expectValidBban(value.toUpperCase(), 'CZ');
  },
  withPrefix: (value) => {
    expect(value).toMatch(/^CZ[0-9]{22}$/);
    expect(fieldsOf(value).prefix.replace(/^0+/, '')).toMatch(/^[1-9][0-9]{1,5}$/);
    expectValidBban(value, 'CZ');
  },
  checkDigitsLeadingZero: (value) => {
    expect(value).toMatch(/^CZ0[2-9][0-9]{20}$/);
    expectValidBban(value, 'CZ');
  },
};

const INVALID_CHECKS: Readonly<Record<IbanInvalidVariant, (value: string) => void>> = {
  // the plain account with other check digits from 02-98
  badChecksum: (value) => {
    expect(value).toMatch(/^CZ[0-9]{22}$/);
    expect(value.slice(2, 4)).toMatch(KK);
    const correct = toIbanOracle(embeddedAccount(value), 'CZ');
    expect(value.slice(2, 4)).not.toBe(correct.slice(2, 4));
    expect(value.slice(4)).toBe(correct.slice(4));
    expect(oracleValidate(embeddedAccount(value))).toEqual({ valid: true });
    expect(GENERATOR_BANK_CODES).toContain(fieldsOf(value).code);
  },
  // a valid Slovak IBAN of the plain account
  wrongCountry: (value) => {
    expectValidBban(value, 'SK');
    expect(value).toBe(toIbanOracle(embeddedAccount(value), 'SK'));
    expect(fieldsOf(value).prefix).toBe('000000');
  },
  // the unpadded Czech IBAN with correct check digits: CZ kk code prefix number, 14-18 characters
  wrongLength: (value) => {
    expect(value).toMatch(/^CZ[0-9]{12,16}$/);
    expect(value.length).toBeGreaterThanOrEqual(14);
    expect(value.length).toBeLessThanOrEqual(18);
    expect(value.slice(2, 4)).toMatch(KK);
    expect(mod97Remainder(value)).toBe(1);
    const number = value.slice(8);
    expect(oracleValidate(`${number}/${value.slice(4, 8)}`)).toEqual({
      valid: true,
    });
    expect(GENERATOR_BANK_CODES).toContain(value.slice(4, 8));
    expect(value).toBe(toIbanOracle(`${number}/${value.slice(4, 8)}`, 'CZ', false));
  },
  // one character of positions 3-24 replaced by A, O or l
  letters: (value) => {
    expect(value).toMatch(/^CZ[0-9AOl]{22}$/);
    expect(value.slice(2).match(/[AOl]/g)).toHaveLength(1);
  },
  badChecksumPrefix: (value) => {
    expectIsoValidWithBadAccount(value, 'badChecksumPrefix');
    expect(partsOf(embeddedAccount(value)).code).toSatisfy((code: string) => GENERATOR_BANK_CODES.includes(code));
  },
  badChecksumNumber: (value) => {
    expectIsoValidWithBadAccount(value, 'badChecksumNumber');
    expect(GENERATOR_BANK_CODES).toContain(fieldsOf(value).code);
  },
  zeroNumber: (value) => {
    expectIsoValidWithBadAccount(value, 'zeroNumber');
    expect(fieldsOf(value).number).toBe('0000000000');
    expect(GENERATOR_BANK_CODES).toContain(fieldsOf(value).code);
  },
  unknownBankCode: (value) => {
    expectIsoValidWithBadAccount(value, 'unknownBankCode');
    expect(UNKNOWN_BANK_CODES).toContain(fieldsOf(value).code);
  },
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateIban(value)).toEqual({ valid: true });
          expect(oracleIbanValidate(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateIban(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('checkDigitsLeadingZero reaches all check digits 02-09', () => {
    const generator = createIban({ seed: 7 });
    const digits = draw(400, () => generator.edge('checkDigitsLeadingZero')).map((v) => v.slice(2, 4));
    expect(new Set(digits)).toEqual(new Set(['02', '03', '04', '05', '06', '07', '08', '09']));
  });
});

describe('invalid variants (section 4): each fails with exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s has its documented shape and reason for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          const expected = { valid: false, reason: variant };
          expect(validateIban(value)).toEqual(expected);
          expect(oracleIbanValidate(value)).toEqual(expected);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and every random invalid() fails', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          expect(validateIban(value).valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('draws every other check digit pair, every unknown code, every letter and every position', () => {
    const generator = createIban({ seed: 13 });
    const pairs = new Set(draw(3000, () => generator.invalid('badChecksum')).map((v) => v.slice(2, 4)));
    expect(pairs.size).toBeGreaterThan(90);
    const codes = new Set(draw(300, () => generator.invalid('unknownBankCode')).map((v) => fieldsOf(v).code));
    expect(codes).toEqual(new Set(UNKNOWN_BANK_CODES));
    const letters = draw(1500, () => generator.invalid('letters'));
    expect(new Set(letters.map((v) => /[AOl]/.exec(v)?.[0]))).toEqual(new Set(['A', 'O', 'l']));
    expect(new Set(letters.map((v) => v.search(/[AOl]/)))).toEqual(
      new Set(Array.from({ length: 22 }, (_, i) => i + 2)),
    );
  });

  it('wrongLength reaches the lengths 14-18 (number of 6-10 digits, no prefix)', () => {
    const generator = createIban({ seed: 17 });
    const lengths = new Set(draw(300, () => generator.invalid('wrongLength')).map((v) => v.length));
    expect(lengths).toEqual(new Set([14, 15, 16, 17, 18]));
  });
});
