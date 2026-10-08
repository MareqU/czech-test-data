// Specification of the bankAccount edge and invalid variants – docs/rules/bankAccount.md section 4 (definitions)
// and section 9 (draw shapes, frozen lists); docs/rules/core.md section 4 (every edge value is valid, every
// invalid variant fails with exactly its own reason).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBankAccount, validateBankAccount } from '../src/bankAccount/index.js';
import type { BankAccountEdgeVariant, BankAccountInvalidVariant } from '../src/bankAccount/index.js';
import { draw, seedArb } from './support/helpers.js';
import {
  GENERATOR_BANK_CODES,
  UNKNOWN_BANK_CODES,
  correctLastDigit,
  oracleValidate,
  partPasses,
  partsOf,
} from './support/bankAccount.js';

const PROPERTY_RUNS = 300;

const EDGE_VARIANTS: readonly BankAccountEdgeVariant[] = [
  'withPrefix',
  'maxLength',
  'minLength',
  'withLeadingZeros',
  'zeroPrefix',
];
const INVALID_VARIANTS: readonly BankAccountInvalidVariant[] = [
  'badChecksumPrefix',
  'badChecksumNumber',
  'unknownBankCode',
  'wrongLength',
  'letters',
  'zeroNumber',
];

const CODE = '[0-9]{4}';

/** Both parts valid, code from the generator list (the value of a plain account). */
function expectGeneratorCode(value: string): void {
  expect(GENERATOR_BANK_CODES).toContain(partsOf(value).code);
}

const EDGE_CHECKS: Readonly<Record<BankAccountEdgeVariant, (value: string) => void>> = {
  withPrefix: (value) => {
    expect(value).toMatch(new RegExp(`^[1-9][0-9]{1,5}-[1-9][0-9]{5,9}/${CODE}$`));
    expectGeneratorCode(value);
  },
  maxLength: (value) => {
    expect(value).toMatch(new RegExp(`^[1-9][0-9]{5}-[1-9][0-9]{9}/${CODE}$`));
    expect(value).toHaveLength(22);
    expectGeneratorCode(value);
  },
  minLength: (value) => {
    expect(value).toMatch(new RegExp(`^(?:19|27|35|43|51|78|86|94)/${CODE}$`));
    expect(value).toHaveLength(7);
    expectGeneratorCode(value);
  },
  withLeadingZeros: (value) => {
    expect(value).toMatch(new RegExp(`^0{1,8}[1-9][0-9]*/${CODE}$`));
    expect(partsOf(value).number).toHaveLength(10);
    expect(value).not.toContain('-');
    expectGeneratorCode(value);
  },
  zeroPrefix: (value) => {
    expect(value).toMatch(new RegExp(`^000000-[1-9][0-9]{5,9}/${CODE}$`));
    expectGeneratorCode(value);
  },
};

/** The value with the last character before `/` (or the last prefix character) replaced. */
function lastDigitOf(part: string): number {
  return Number(part.slice(-1));
}

const INVALID_CHECKS: Readonly<Record<BankAccountInvalidVariant, (value: string) => void>> = {
  // a plain withPrefix value whose prefix's last digit is replaced by a different digit
  badChecksumPrefix: (value) => {
    expect(value).toMatch(new RegExp(`^[1-9][0-9]{1,5}-[1-9][0-9]{5,9}/${CODE}$`));
    const { prefix, number } = partsOf(value);
    expect(partPasses(number)).toBe(true);
    expect(lastDigitOf(prefix ?? '')).not.toBe(correctLastDigit((prefix ?? '').slice(0, -1)));
    expectGeneratorCode(value);
  },
  // a plain value whose number's last digit is replaced by a different digit
  badChecksumNumber: (value) => {
    expect(value).toMatch(new RegExp(`^[1-9][0-9]{5,9}/${CODE}$`));
    const { number } = partsOf(value);
    expect(lastDigitOf(number)).not.toBe(correctLastDigit(number.slice(0, -1)));
    expectGeneratorCode(value);
  },
  // a valid prefix-less account with a code from the frozen unknown list
  unknownBankCode: (value) => {
    expect(value).toMatch(new RegExp(`^[1-9][0-9]{5,9}/${CODE}$`));
    expect(partPasses(partsOf(value).number)).toBe(true);
    expect(UNKNOWN_BANK_CODES).toContain(partsOf(value).code);
  },
  // a 1-digit number or a valid 10-digit number plus one digit; no prefix
  wrongLength: (value) => {
    expect(value).toMatch(new RegExp(`^(?:[1-9]|[1-9][0-9]{10})/${CODE}$`));
    const { number } = partsOf(value);
    if (number.length === 11) {
      expect(partPasses(number.slice(0, 10))).toBe(true);
    }
    expectGeneratorCode(value);
  },
  // one digit (any position except the slash) replaced by A, O or l
  letters: (value) => {
    expect(value).toMatch(/^[0-9AOl]{6,10}\/[0-9AOl]{4}$/);
    expect(value.match(/[AOl]/g)).toHaveLength(1);
  },
  zeroNumber: (value) => {
    expect(value).toMatch(new RegExp(`^0000000000/${CODE}$`));
    expectGeneratorCode(value);
  },
};

const EXPECTED_REASON: Readonly<Record<BankAccountInvalidVariant, string>> = {
  badChecksumPrefix: 'badChecksumPrefix',
  badChecksumNumber: 'badChecksumNumber',
  unknownBankCode: 'unknownBankCode',
  wrongLength: 'wrongLength',
  letters: 'letters',
  zeroNumber: 'zeroNumber',
};

describe('edge variants (section 4): all valid, each of its own shape', () => {
  it.each(EDGE_VARIANTS)('%s is valid and has its documented shape for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        for (const value of draw(10, () => generator.edge(variant))) {
          EDGE_CHECKS[variant](value);
          expect(validateBankAccount(value)).toEqual({ valid: true });
          expect(oracleValidate(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the edge variants and draws only valid values from the random edge()', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        expect([...generator.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
        for (const value of draw(20, () => generator.edge())) {
          expect(validateBankAccount(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('withLeadingZeros reaches 1 to 8 zeros in front and minLength reaches all eight numbers', () => {
    const generator = createBankAccount({ seed: 7 });
    const zeros = draw(600, () => generator.edge('withLeadingZeros')).map((v) => /^0*/.exec(v)?.[0].length);
    expect(new Set(zeros)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    const numbers = draw(400, () => generator.edge('minLength')).map((v) => partsOf(v).number);
    expect(new Set(numbers)).toEqual(new Set(['19', '27', '35', '43', '51', '78', '86', '94']));
  });
});

describe('invalid variants (section 4): each fails with exactly its own reason', () => {
  it.each(INVALID_VARIANTS)('%s has its documented shape and reason for any seed', (variant) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        for (const value of draw(10, () => generator.invalid(variant))) {
          INVALID_CHECKS[variant](value);
          const expected = { valid: false, reason: EXPECTED_REASON[variant] };
          expect(validateBankAccount(value)).toEqual(expected);
          expect(oracleValidate(value)).toEqual(expected);
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('lists the invalid variants and every random invalid() fails', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        expect([...generator.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
        for (const value of draw(20, () => generator.invalid())) {
          expect(validateBankAccount(value).valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('the broken last digit can be repaired to a valid account (only that digit is wrong)', () => {
    const generator = createBankAccount({ seed: 11 });
    for (const value of draw(100, () => generator.invalid('badChecksumNumber'))) {
      const { number, code } = partsOf(value);
      const fixed = correctLastDigit(number.slice(0, -1)) ?? 0;
      expect(validateBankAccount(`${number.slice(0, -1)}${String(fixed)}/${code}`)).toEqual({ valid: true });
    }
    for (const value of draw(100, () => generator.invalid('badChecksumPrefix'))) {
      const { prefix, number, code } = partsOf(value);
      const fixed = correctLastDigit((prefix ?? '').slice(0, -1)) ?? 0;
      expect(validateBankAccount(`${(prefix ?? '').slice(0, -1)}${String(fixed)}-${number}/${code}`)).toEqual({ valid: true });
    }
  });

  it('draws every different digit for the broken check digit, every unknown code and both wrongLength shapes', () => {
    const generator = createBankAccount({ seed: 13 });
    const wrongDigits = new Set(
      draw(900, () => generator.invalid('badChecksumNumber')).map((v) => partsOf(v).number.slice(-1)),
    );
    expect(wrongDigits.size).toBeGreaterThanOrEqual(9);
    const codes = new Set(draw(300, () => generator.invalid('unknownBankCode')).map((v) => partsOf(v).code));
    expect(codes).toEqual(new Set(UNKNOWN_BANK_CODES));
    const lengths = new Set(draw(100, () => generator.invalid('wrongLength')).map((v) => partsOf(v).number.length));
    expect(lengths).toEqual(new Set([1, 11]));
    const letters = new Set(draw(600, () => generator.invalid('letters')).map((v) => /[AOl]/.exec(v)?.[0]));
    expect(letters).toEqual(new Set(['A', 'O', 'l']));
  });
});
