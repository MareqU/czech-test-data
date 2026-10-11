// Specification of the plain bankAccount generator – docs/rules/bankAccount.md section 9 (options, frozen
// generator codes, part(n) and plain generate) and decisions 2, 11 and 15; docs/rules/core.md section 3
// (invalid options throw RangeError).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBankAccount, validateBankAccount } from '../src/bankAccount/index.js';
import { draw, seedArb } from './support/helpers.js';
import { BANK_CODES, GENERATOR_BANK_CODES, oracleValidate, partPasses, partsOf } from './support/bankAccount.js';

const PROPERTY_RUNS = 300;

describe('every plain value is a valid account without prefix, no leading zeros', () => {
  it('is number/code with a 6-10 digit number that passes mod 11, accepted by validator and oracle', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^[1-9][0-9]{5,9}\/[0-9]{4}$/);
          const { number, code } = partsOf(value);
          expect(partPasses(number)).toBe(true);
          expect(GENERATOR_BANK_CODES).toContain(code);
          expect(validateBankAccount(value)).toEqual({ valid: true });
          expect(oracleValidate(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createBankAccount({ seed, referenceDate: '1900-01-01' });
        const late = createBankAccount({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 50 },
    );
  });
});

describe('withPrefix: true adds a 2-6 digit prefix that passes mod 11', () => {
  it('is prefix-number/code, both parts valid, no leading zeros', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createBankAccount({ seed });
        for (const value of draw(20, () => generator({ withPrefix: true }))) {
          expect(value).toMatch(/^[1-9][0-9]{1,5}-[1-9][0-9]{5,9}\/[0-9]{4}$/);
          const { prefix, number } = partsOf(value);
          expect(partPasses(prefix ?? '')).toBe(true);
          expect(partPasses(number)).toBe(true);
          expect(validateBankAccount(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('withPrefix: false (and omitted) gives no prefix', () => {
    const generator = createBankAccount({ seed: 5 });
    for (const value of draw(50, () => generator({ withPrefix: false }))) {
      expect(value).not.toContain('-');
    }
  });
});

describe('lengths and codes cover their whole documented ranges (decisions 2 and 15)', () => {
  const generator = createBankAccount({ seed: 20261008 });
  const plain = draw(3000, () => generator()).map(partsOf);
  const prefixed = draw(3000, () => generator({ withPrefix: true })).map(partsOf);

  it('draws number lengths 6-10 and prefix lengths 2-6, nothing else', () => {
    expect(new Set(plain.map((p) => p.number.length))).toEqual(new Set([6, 7, 8, 9, 10]));
    expect(new Set(prefixed.map((p) => p.number.length))).toEqual(new Set([6, 7, 8, 9, 10]));
    expect(new Set(prefixed.map((p) => p.prefix?.length))).toEqual(new Set([2, 3, 4, 5, 6]));
  });

  it('draws exactly the nine frozen generator codes', () => {
    expect(new Set(plain.map((p) => p.code))).toEqual(new Set(GENERATOR_BANK_CODES));
  });
});

describe('bankCode option (decision 11)', () => {
  it.each(BANK_CODES)('uses the snapshot code %s as given', (bankCode) => {
    const generator = createBankAccount({ seed: 3 });
    const value = generator({ bankCode });
    expect(value.endsWith(`/${bankCode}`)).toBe(true);
    expect(validateBankAccount(value)).toEqual({ valid: true });
    expect(validateBankAccount(generator({ bankCode, withPrefix: true }))).toEqual({ valid: true });
  });

  it('combines with withPrefix as in the specification example', () => {
    const value = createBankAccount({ seed: 1 })({
      bankCode: '0800',
      withPrefix: true,
    });
    expect(value).toMatch(/^[1-9][0-9]{1,5}-[1-9][0-9]{5,9}\/0800$/);
  });
});

describe('invalid options throw RangeError naming the option (docs/rules/core.md section 3)', () => {
  // '0100 0300' and '8620 8660': runs of snapshot codes must not pass a substring lookup (review B1, section 8.2).
  it.each(['6100', '0000', '9999', '800', '08000', '', 'abcd', '0800 ', '0100 0300', '8620 8660'])(
    'rejects bankCode %j',
    (bankCode) => {
      const generator = createBankAccount({ seed: 1 });
      expect(() => generator({ bankCode })).toThrow(RangeError);
      expect(() => generator({ bankCode })).toThrow(/bankCode/);
    },
  );

  it.each([800, null])('rejects the non-string bankCode %j', (bankCode) => {
    const generator = createBankAccount({ seed: 1 });
    expect(() => generator({ bankCode: bankCode as unknown as string })).toThrow(/bankCode/);
  });

  it.each(['true', 1, 0, null, {}])('rejects the non-boolean withPrefix %j', (withPrefix) => {
    const generator = createBankAccount({ seed: 1 });
    expect(() => generator({ withPrefix: withPrefix as unknown as boolean })).toThrow(RangeError);
    expect(() => generator({ withPrefix: withPrefix as unknown as boolean })).toThrow(/withPrefix/);
  });
});
