// Invalid variants of the bank account (one fault each) – docs/rules/bankAccount.md sections 4 and 9.
// Each variant name is the reason code the validator returns for its values.
import { replaceDigitWithLetter } from '../core/letters.js';
import { intExcept } from '../core/random.js';
import type { Random } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { drawCode, generate, part } from './generate.js';

/** Names of the invalid variants (neplatné varianty čísla účtu); each is also a reason code of the validator. */
export type BankAccountInvalidVariant =
  | 'badChecksumPrefix'
  | 'badChecksumNumber'
  | 'unknownBankCode'
  | 'wrongLength'
  | 'letters'
  | 'zeroNumber';

// Never assigned (0000, 9999) or cancelled by ČNB in 2022–2025 (2020, 4000, 6100).
const UNKNOWN_BANK_CODES: readonly string[] = ['0000', '2020', '4000', '6100', '9999'];

// The digit before `separator` has weight 1, so any different digit breaks divisibility by 11.
function replaceDigitBefore(random: Random, value: string, separator: string): string {
  const at = value.indexOf(separator) - 1;
  const correct = Number(value.charAt(at));
  return `${value.slice(0, at)}${String(intExcept(random, 0, 9, correct))}${value.slice(at + 1)}`;
}

/** Invalid variant `badChecksumPrefix`; also reused by iban. */
export const badChecksumPrefix: IdentifierVariant = (random) =>
  replaceDigitBefore(random, generate(random, { withPrefix: true }), '-');

/** Invalid variant `badChecksumNumber`; also reused by iban. */
export const badChecksumNumber: IdentifierVariant = (random) => replaceDigitBefore(random, generate(random, {}), '/');

/** Invalid variant `unknownBankCode`; also reused by iban. */
export const unknownBankCode: IdentifierVariant = (random) =>
  `${generate(random, {}).slice(0, -4)}${random.pick(UNKNOWN_BANK_CODES)}`;

/** Invalid variant `zeroNumber`; also reused by iban. */
export const zeroNumber: IdentifierVariant = (random) => `0000000000/${drawCode(random)}`;

/** Invalid variants by name. */
export const invalid: Readonly<Record<BankAccountInvalidVariant, IdentifierVariant>> = {
  badChecksumPrefix,
  badChecksumNumber,
  unknownBankCode,
  // A 1-digit number or an 11-digit one.
  wrongLength: (random) => {
    const number = random.int(0, 1) === 0 ? String(random.int(1, 9)) : `${part(random, 10)}${random.digits(1)}`;
    return `${number}/${drawCode(random)}`;
  },
  letters: (random) => {
    const value = generate(random, {});
    const positions = Array.from(value, (_, i) => i).filter((i) => value.charAt(i) !== '/');
    return replaceDigitWithLetter(random, value, positions);
  },
  zeroNumber,
};
