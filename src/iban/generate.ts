// Generator of the Czech IBAN (číslo účtu ve formátu IBAN), draw order fixed by docs/rules/iban.md section 9.
// Structure: vyhláška ČNB č. 169/2011 Sb., § 4 (https://www.zakonyprolidi.cz/cs/2011-169); check digits:
// ISO 7064 MOD 97-10 as in ECBS EBS204 § 6 (https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/iban/download/EBS204.pdf).
import { generate as generateAccount } from '../bankAccount/generate.js';
import { validate as validateAccount } from '../bankAccount/validate.js';
import type { Random } from '../core/random.js';

/**
 * Options of the IBAN generator: either draw an account (`bankCode`, `withPrefix`) or convert a given one
 * (`account`); the two modes are exclusive.
 */
export type IbanOptions =
  | {
      /** A valid national account `[prefix-]number/code` to convert; nothing is drawn. */
      readonly account: string;
      readonly bankCode?: never;
      readonly withPrefix?: never;
    }
  | {
      readonly account?: undefined;
      /** A bank code from the bundled ČNB snapshot, as in bankAccount. */
      readonly bankCode?: string;
      /** Adds a prefix (předčíslí) of 2–6 digits, as in bankAccount. */
      readonly withPrefix?: boolean;
    };

/** Remainder modulo 97 of digits and letters (A = 10 … Z = 35), digit by digit: no BigInt, no 26-digit Number. */
export function mod97(value: string): number {
  let remainder = 0;
  for (const char of value) {
    const digit = parseInt(char, 36);
    remainder = (remainder * (digit < 10 ? 10 : 100) + digit) % 97;
  }
  return remainder;
}

/**
 * Converts a national account to an IBAN of `country`; `padded: false` keeps prefix and number unpadded
 * (the converter bug of the `wrongLength` variant). Accepts any digits, so it also converts invalid accounts.
 */
export function toIban(account: string, country: string, padded = true): string {
  const [rest = '', code = ''] = account.split('/');
  const [prefix = '', number = ''] = rest.includes('-') ? rest.split('-') : ['', rest];
  const bban = `${code}${padded ? prefix.padStart(6, '0') : prefix}${padded ? number.padStart(10, '0') : number}`;
  // Check digits are 98 minus the remainder with `00`, always 02–98 (EBS204 § 6.2).
  return `${country}${String(98 - mod97(`${bban}${country}00`)).padStart(2, '0')}${bban}`;
}

/** Generates a plain IBAN: electronic form, upper case, 24 characters. */
export function generate(random: Random, options: IbanOptions): string {
  const { account } = options;
  if (account === undefined) {
    return toIban(generateAccount(random, options), 'CZ');
  }
  // Widened view: JavaScript callers can pass both, which the union forbids. Other keys are ignored; only these
  // two conflict (docs/rules/iban.md section 9).
  const conflicting: { bankCode?: unknown; withPrefix?: unknown } = options;
  if (conflicting.bankCode !== undefined || conflicting.withPrefix !== undefined) {
    throw new RangeError('account cannot be combined with bankCode or withPrefix');
  }
  // JavaScript callers may pass a non-string.
  const given: unknown = account;
  if (typeof given !== 'string' || !validateAccount(given).valid) {
    throw new RangeError(`account must be a valid bank account number, got ${JSON.stringify(account)}`);
  }
  return toIban(account, 'CZ');
}
