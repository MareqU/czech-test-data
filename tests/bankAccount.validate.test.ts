// Specification of validateBankAccount (číslo účtu) – docs/rules/bankAccount.md section 2 (algorithm and
// precedence, decision 5), section 5 (known samples) and section 8.1 (bank code snapshot, version 255).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { validateBankAccount } from '../src/bankAccount/index.js';
import { BANK_CODES, UNKNOWN_BANK_CODES, GENERATOR_BANK_CODES, oracleValidate } from './support/bankAccount.js';

const PROPERTY_RUNS = 500;
const NBSP = String.fromCharCode(0xa0);
const FULL_WIDTH = '１２３４５６７８９９/０８００';
const VALID = { valid: true } as const;

describe('accepts the known valid accounts (section 5)', () => {
  it.each([
    ['13717-77628031/0710', 'Finanční úřad Praha, official, 5-digit prefix'],
    ['13717-77628621/0710', 'Finanční úřad Jihomoravský kraj, official'],
    ['35-77628031/0710', '2-digit prefix'],
    ['748-77628031/0710', '3-digit prefix'],
    ['7704-77628031/0710', '4-digit prefix'],
    ['000035-0077628031/0710', '16-digit padded form'],
    ['1234567899/0800', 'plain 10 digits'],
    ['123457/0800', '6-digit number'],
    ['123457-1234567899/0100', 'maxLength, 22 characters'],
    ['19/0800', 'minLength'],
    ['94/0300', 'minLength'],
    ['78/2010', 'minLength'],
    ['51/0710', 'minLength'],
    ['0000000019/0800', 'leading zeros, 2 significant digits'],
    ['0000123457/5500', 'leading zeros'],
    ['0-1234567899/0800', 'zero prefix of 1 character'],
    ['000000-1234567899/0800', 'zero prefix of 6 characters'],
    ['1234567899/8620', 'code added in version 255'],
    ['1234567899/6800', 'Sberbank CZ v likvidaci, still listed'],
    ['1234567899/6600', 'CERTIS "-" is still a valid code'],
  ])('accepts %s (%s)', (value) => {
    expect(validateBankAccount(value)).toEqual(VALID);
  });
});

describe('rejects with exactly the expected reason (section 5)', () => {
  it.each([
    ['badChecksumNumber', '1234567890/0800', 'S = 255'],
    ['badChecksumNumber', '13717-77628032/0710', 'real account, last digit +1'],
    ['badChecksumNumber', '1000000000/0800', 'one non-zero digit can never pass'],
    ['badChecksumNumber', '10/0800', 'S = 2'],
    ['badChecksumNumber', '1234567890/6100', 'checksum is checked before the bank code'],
    ['badChecksumPrefix', '123456-1234567899/0800', 'prefix S = 76'],
    ['badChecksumPrefix', '13718-77628031/0710', 'real account, prefix +1'],
    ['badChecksumPrefix', '1-1234567899/0800', 'one non-zero digit'],
    ['badChecksumPrefix', '123456-1234567890/0800', 'both parts wrong, prefix first'],
    ['zeroNumber', '0000000000/0800', 'passes the weighted sum'],
    ['zeroNumber', '00/0800', '2 zeros'],
    ['unknownBankCode', '1234567899/6100', 'Equa bank, cancelled 2023'],
    ['unknownBankCode', '1234567899/4000', 'Max banka, cancelled 2025'],
    ['unknownBankCode', '1234567899/8190', 'cancelled 2026-09-01'],
    ['unknownBankCode', '1234567899/0000', 'never assigned'],
    ['unknownBankCode', '1234567899/9999', 'never assigned'],
    ['wrongLength', '0/0800', 'number of 1 character (length before zero check)'],
    ['wrongLength', '5/0800', 'number of 1 digit'],
    ['wrongLength', '12345678990/0800', 'number of 11 digits'],
    ['wrongLength', '01234567899/0800', 'zeros count as written (decision 7)'],
    ['wrongLength', '1234567-1234567899/0800', 'prefix of 7 digits'],
    ['wrongLength', '0000019-1234567899/0800', 'prefix of 7 characters'],
    ['wrongLength', '1234567899/800', '3-digit code'],
    ['wrongLength', '1234567899/08000', '5-digit code'],
    ['wrongLength', '0800/1234567899', 'code and number swapped'],
    ['letters', '1234567899/O800', 'letter O in the code'],
    ['letters', 'l9-1234567899/0800', 'lowercase L in the prefix'],
    ['letters', 'CZ00 0800 0000 0012 3456 7899', 'IBAN-like input'],
    ['letters', '1234567899 / 08O0', 'letters win over format'],
    ['badFormat', '', 'empty string'],
    ['badFormat', '1234567899', 'no bank code'],
    ['badFormat', '1234567899/', 'empty bank code'],
    ['badFormat', '/0800', 'empty number'],
    ['badFormat', '-1234567899/0800', 'empty prefix'],
    ['badFormat', '19-/0800', 'empty number after prefix'],
    ['badFormat', '19--1234567899/0800', 'double hyphen'],
    ['badFormat', '19-123-1234567899/0800', 'two hyphens'],
    ['badFormat', '1234567899/0800/0800', 'two slashes'],
    ['badFormat', '1234567899 / 0800', 'spaces around slash'],
    ['badFormat', ' 1234567899/0800', 'leading space, not trimmed'],
    ['badFormat', '1234567899/0800 ', 'trailing space'],
    ['badFormat', '19 1234567899/0800', 'space instead of hyphen'],
    ['badFormat', '19–1234567899/0800', 'en dash'],
    ['badFormat', '1234567899\\0800', 'backslash'],
    ['badFormat', `1234567899${NBSP}/0800`, 'no-break space'],
    ['badFormat', FULL_WIDTH, 'full-width digits'],
  ])('gives %s for %j (%s)', (reason, value) => {
    expect(validateBankAccount(value)).toEqual({ valid: false, reason });
  });
});

describe('precedence letters → badFormat → wrongLength → badChecksumPrefix → badChecksumNumber → zeroNumber → unknownBankCode', () => {
  it.each([
    ['letters over badFormat', ' A', 'letters'],
    ['badFormat over wrongLength', '1234567-1234567899', 'badFormat'],
    ['wrongLength over badChecksumPrefix', '1234567-1234567890/0800', 'wrongLength'],
    ['badChecksumPrefix over badChecksumNumber', '12-12/6100', 'badChecksumPrefix'],
    ['badChecksumNumber over unknownBankCode', '12/6100', 'badChecksumNumber'],
    ['zeroNumber over unknownBankCode', '0000000000/6100', 'zeroNumber'],
  ])('%s', (_name, value, reason) => {
    expect(validateBankAccount(value)).toEqual({ valid: false, reason });
  });
});

describe('bank code snapshot (section 8.1, version 255)', () => {
  it('accepts exactly the 47 listed codes and no other 4-digit code', () => {
    expect(BANK_CODES).toHaveLength(47);
    const accepted = Array.from({ length: 10000 }, (_, n) => String(n).padStart(4, '0')).filter(
      (code) => validateBankAccount(`1234567899/${code}`).valid,
    );
    expect(accepted).toEqual([...BANK_CODES].sort());
  });

  it('keeps the frozen generator codes inside the snapshot and the unknown codes outside it', () => {
    for (const code of GENERATOR_BANK_CODES) {
      expect(BANK_CODES).toContain(code);
    }
    for (const code of UNKNOWN_BANK_CODES) {
      expect(BANK_CODES).not.toContain(code);
    }
  });
});

describe('does not depend on the date', () => {
  it('ignores referenceDate', () => {
    expect(
      validateBankAccount('13717-77628031/0710', {
        referenceDate: '1900-01-01',
      }),
    ).toEqual(VALID);
    expect(validateBankAccount('1234567899/6100', { referenceDate: '2099-12-31' })).toEqual({
      valid: false,
      reason: 'unknownBankCode',
    });
  });
});

describe('agrees with the independent oracle for any input', () => {
  const charArb = fc.constantFrom(...'0123456789-/ AO'.split(''));
  const digitsArb = (min: number, max: number): fc.Arbitrary<string> =>
    fc
      .array(fc.constantFrom(...'0123456789'.split('')), {
        minLength: min,
        maxLength: max,
      })
      .map((a) => a.join(''));
  const structured = fc
    .tuple(
      fc.option(digitsArb(0, 8), { nil: undefined }),
      digitsArb(0, 12),
      fc.oneof(fc.constantFrom(...BANK_CODES, ...UNKNOWN_BANK_CODES), digitsArb(0, 6)),
    )
    .map(([prefix, number, code]) => `${prefix === undefined ? '' : `${prefix}-`}${number}/${code}`);

  it('matches on arbitrary strings, structured accounts and short-part accounts', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 24 }),
          fc.array(charArb, { maxLength: 24 }).map((a) => a.join('')),
          structured,
        ),
        (value) => {
          expect(validateBankAccount(value)).toEqual(oracleValidate(value));
        },
      ),
      { numRuns: PROPERTY_RUNS * 4 },
    );
  });
});
