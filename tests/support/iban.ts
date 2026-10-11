// Independent oracle for iban, written from docs/rules/iban.md only (sections 1, 2 and 9), never from src/.
// The bankAccount part of the rules is delegated to the bankAccount oracle (section 2.4 / 2.5 step 6).
import fc from 'fast-check';
import { BANK_CODES, UNKNOWN_BANK_CODES, correctLastDigit, oracleValidate, partsOf } from './bankAccount.js';
import type { OracleReason } from './bankAccount.js';

export type IbanOracleReason = OracleReason | 'wrongCountry' | 'badChecksum';

export type IbanOracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: IbanOracleReason };

const ELECTRONIC = /^[\p{L}0-9]+$/u;
const WRITTEN = /^[\p{L}0-9]{4}(?: [\p{L}0-9]{4})*(?: [\p{L}0-9]{1,4})?$/u;

/** MOD 97-10 remainder of the rearranged IBAN (EBS204 section 6.1), letters converted, any case. */
export function mod97Remainder(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged
    .split('')
    .map((ch) => String(Number.parseInt(ch, 36)))
    .join('');
  return Number(BigInt(digits) % BigInt(97));
}

/** The IBAN of a national account; `pad: false` skips the zero padding (the wrongLength shape). */
export function toIbanOracle(account: string, country: string, pad = true): string {
  const { prefix, number, code } = partsOf(account);
  const bban = pad
    ? `${code}${(prefix ?? '').padStart(6, '0')}${number.padStart(10, '0')}`
    : `${code}${prefix ?? ''}${number}`;
  const kk = 98 - mod97Remainder(`${country}00${bban}`);
  return `${country}${String(kk).padStart(2, '0')}${bban}`;
}

/** The IBAN rules of section 2.5, in precedence order. */
export function oracleIbanValidate(value: string): IbanOracleResult {
  if (!ELECTRONIC.test(value) && !WRITTEN.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  const compact = value.replaceAll(' ', '');
  if (!/^[Cc][Zz]/.test(compact)) {
    return { valid: false, reason: 'wrongCountry' };
  }
  if (/\p{L}/u.test(compact.slice(2))) {
    return { valid: false, reason: 'letters' };
  }
  if (compact.length !== 24) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (['00', '01', '99'].includes(compact.slice(2, 4)) || mod97Remainder(compact) !== 1) {
    return { valid: false, reason: 'badChecksum' };
  }
  return oracleValidate(`${compact.slice(8, 14)}-${compact.slice(14, 24)}/${compact.slice(4, 8)}`);
}

/** Splits a plain 24-character IBAN into its fields. */
export function fieldsOf(iban: string): {
  country: string;
  kk: string;
  code: string;
  prefix: string;
  number: string;
} {
  return {
    country: iban.slice(0, 2),
    kk: iban.slice(2, 4),
    code: iban.slice(4, 8),
    prefix: iban.slice(8, 14),
    number: iban.slice(14, 24),
  };
}

/** The embedded national account `prefix6-number10/code` of a plain IBAN (section 2.5 step 6). */
export function embeddedAccount(iban: string): string {
  const { code, prefix, number } = fieldsOf(iban);
  return `${prefix}-${number}/${code}`;
}

const digit = fc.constantFrom(...'0123456789'.split(''));
const digits = (length: number): fc.Arbitrary<string> =>
  fc.array(digit, { minLength: length, maxLength: length }).map((a) => a.join(''));

/** A part of `length` digits that passes mod 11 (or, one time in four, any digits). */
function partArb(length: number): fc.Arbitrary<string> {
  const passing = digits(length - 1).map((head) => `${head}${String(correctLastDigit(head) ?? 0)}`);
  return fc.oneof({ weight: 3, arbitrary: passing }, { weight: 1, arbitrary: digits(length) });
}

/** Plain CZ IBANs around the interesting boundaries: right/wrong check digits, mod 11, bank codes, case, spacing. */
export const structuredIbanArb: fc.Arbitrary<string> = fc
  .tuple(
    partArb(6),
    partArb(10),
    fc.oneof(fc.constantFrom(...BANK_CODES, ...UNKNOWN_BANK_CODES), digits(4)),
    fc.option(digits(2), { nil: undefined }),
    fc.constantFrom('CZ', 'cz', 'Cz', 'SK', 'DE'),
    fc.constantFrom('plain', 'spaced', 'doubleSpace', 'letter'),
  )
  .map(([prefix, number, code, wrongKk, country, shape]) => {
    const correct = toIbanOracle(`${prefix}-${number}/${code}`, 'CZ');
    const kk = wrongKk ?? correct.slice(2, 4);
    const base = `${country}${kk}${code}${prefix}${number}`;
    switch (shape) {
      case 'spaced':
        return base.replace(/(.{4})(?=.)/g, '$1 ');
      case 'doubleSpace':
        return `${base.slice(0, 4)}  ${base.slice(4)}`;
      case 'letter':
        return `${base.slice(0, 10)}O${base.slice(11)}`;
      default:
        return base;
    }
  });
