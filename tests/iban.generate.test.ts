// Specification of the plain iban generator – docs/rules/iban.md section 1.1 (structure), section 9 (options,
// conversion, consistency tests) and decisions 7 and 15; docs/rules/core.md section 3 (invalid options throw
// RangeError).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createBankAccount } from '../src/bankAccount/index.js';
import { createIban, validateIban } from '../src/iban/index.js';
import { draw, seedArb } from './support/helpers.js';
import { BANK_CODES, GENERATOR_BANK_CODES, oracleValidate } from './support/bankAccount.js';
import { embeddedAccount, fieldsOf, oracleIbanValidate, toIbanOracle } from './support/iban.js';

const PROPERTY_RUNS = 300;

describe('every plain value is a valid electronic upper-case Czech IBAN of an account without prefix', () => {
  it('is CZ + 22 digits with check digits 02-98, accepted by validator and oracle, embedded account valid', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        for (const value of draw(20, () => generator())) {
          expect(value).toMatch(/^CZ(?:0[2-9]|[1-8][0-9]|9[0-8])[0-9]{20}$/);
          const { prefix, number, code } = fieldsOf(value);
          expect(prefix).toBe('000000');
          expect(number).toMatch(/^0{0,4}[1-9][0-9]{5,9}$/);
          expect(GENERATOR_BANK_CODES).toContain(code);
          expect(validateIban(value)).toEqual({ valid: true });
          expect(oracleIbanValidate(value)).toEqual({ valid: true });
          expect(oracleValidate(embeddedAccount(value))).toEqual({
            valid: true,
          });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('does not depend on referenceDate', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const early = createIban({ seed, referenceDate: '1900-01-01' });
        const late = createIban({ seed, referenceDate: '2099-12-31' });
        expect(draw(5, () => early())).toEqual(draw(5, () => late()));
      }),
      { numRuns: 50 },
    );
  });
});

describe('withPrefix: true puts a 2-6 digit prefix, zero-padded to 6, into characters 9-14', () => {
  it('is valid and its embedded account is valid', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createIban({ seed });
        for (const value of draw(20, () => generator({ withPrefix: true }))) {
          const { prefix } = fieldsOf(value);
          expect(prefix.replace(/^0+/, '')).toMatch(/^[1-9][0-9]{1,5}$/);
          expect(value).toHaveLength(24);
          expect(validateIban(value)).toEqual({ valid: true });
          expect(oracleValidate(embeddedAccount(value))).toEqual({
            valid: true,
          });
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('withPrefix: false (and omitted) gives the prefix field 000000', () => {
    const generator = createIban({ seed: 5 });
    for (const value of draw(50, () => generator({ withPrefix: false }))) {
      expect(fieldsOf(value).prefix).toBe('000000');
    }
  });
});

describe('coverage of the documented ranges', () => {
  const generator = createIban({ seed: 20261011 });
  const plain = draw(3000, () => generator()).map(fieldsOf);

  it('draws exactly the nine frozen generator codes (reused from bankAccount)', () => {
    expect(new Set(plain.map((f) => f.code))).toEqual(new Set(GENERATOR_BANK_CODES));
  });

  it('draws number lengths 6-10 and many different check digits', () => {
    expect(new Set(plain.map((f) => f.number.replace(/^0+/, '').length))).toEqual(new Set([6, 7, 8, 9, 10]));
    expect(new Set(plain.map((f) => f.kk)).size).toBeGreaterThan(90);
  });
});

describe('bankCode option is passed on to bankAccount (decision 7, section 9)', () => {
  it.each(BANK_CODES)('uses the snapshot code %s as given', (bankCode) => {
    const generator = createIban({ seed: 3 });
    expect(fieldsOf(generator({ bankCode })).code).toBe(bankCode);
    expect(validateIban(generator({ bankCode }))).toEqual({ valid: true });
    expect(validateIban(generator({ bankCode, withPrefix: true }))).toEqual({
      valid: true,
    });
  });
});

describe('account option converts a national account (consistency IBAN ↔ bankAccount, section 9)', () => {
  it.each([
    ['19-2000145399/0800', 'CZ6508000000192000145399'],
    ['178124-4159/0710', 'CZ6907101781240000004159'],
    ['13717-77628031/0710', 'CZ7907100137170077628031'],
    ['1234567899/0800', 'CZ5508000000001234567899'],
    ['123457-1234567899/0100', 'CZ3101001234571234567899'],
    ['19/5500', 'CZ9755000000000000000019'],
  ])('converts %s to %s', (account, expected) => {
    expect(createIban({ seed: 1 })({ account })).toBe(expected);
  });

  it('gives a valid IBAN whose digits 5-24 are code + prefix padded to 6 + number padded to 10', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const bankAccount = createBankAccount({ seed });
        const iban = createIban({ seed });
        const accounts = [
          bankAccount(),
          bankAccount({ withPrefix: true }),
          ...bankAccount.edgeVariants.map((variant) => bankAccount.edge(variant)),
        ];
        for (const account of accounts) {
          const value = iban({ account });
          const [, prefix = '', number = '', code = ''] = /^(?:([0-9]+)-)?([0-9]+)\/([0-9]+)$/.exec(account) ?? [];
          expect(value.slice(4)).toBe(`${code}${prefix.padStart(6, '0')}${number.padStart(10, '0')}`);
          expect(value).toBe(toIbanOracle(account, 'CZ'));
          expect(validateIban(value)).toEqual({ valid: true });
        }
      }),
      { numRuns: 100 },
    );
  });

  it('draws nothing, so the account result does not depend on the seed', () => {
    expect(createIban({ seed: 1 })({ account: '19-2000145399/0800' })).toBe(
      createIban({ seed: 999 })({ account: '19-2000145399/0800' }),
    );
  });
});

describe('invalid options throw RangeError naming the option (docs/rules/core.md section 3, section 9)', () => {
  it.each(['6100', '0000', '800', '08000', '', 'abcd', '0800 ', '0100 0300'])('rejects bankCode %j', (bankCode) => {
    const generator = createIban({ seed: 1 });
    expect(() => generator({ bankCode })).toThrow(RangeError);
    expect(() => generator({ bankCode })).toThrow(/bankCode/);
  });

  it.each(['true', 1, 0, null, {}])('rejects the non-boolean withPrefix %j', (withPrefix) => {
    const generator = createIban({ seed: 1 });
    expect(() => generator({ withPrefix: withPrefix as unknown as boolean })).toThrow(RangeError);
    expect(() => generator({ withPrefix: withPrefix as unknown as boolean })).toThrow(/withPrefix/);
  });

  it.each([
    '',
    'abc',
    '1234567890/0800',
    '12-1234567899/0800',
    '1234567899/6100',
    '1234567899',
    '0000000000/0800',
    'CZ6508000000192000145399',
  ])('rejects the account %j that bankAccount does not accept', (account) => {
    const generator = createIban({ seed: 1 });
    expect(() => generator({ account })).toThrow(RangeError);
    expect(() => generator({ account })).toThrow(/account/);
  });

  it.each([800, null, {}])('rejects the non-string account %j', (account) => {
    const generator = createIban({ seed: 1 });
    expect(() => generator({ account: account as unknown as string })).toThrow(/account/);
  });

  // Clarification 2026-10-11 (rules section 9): any given value counts as combined, also withPrefix: false.
  it.each([{ bankCode: '0800' }, { withPrefix: true }, { bankCode: '0800', withPrefix: true }, { withPrefix: false }])(
    'rejects account combined with %j',
    (others) => {
      const generator = createIban({ seed: 1 });
      expect(() => generator({ account: '19-2000145399/0800', ...others })).toThrow(RangeError);
      expect(() => generator({ account: '19-2000145399/0800', ...others })).toThrow(/account/);
    },
  );
});
