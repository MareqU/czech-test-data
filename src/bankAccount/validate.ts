// Validator of the bank account – docs/rules/bankAccount.md section 2 (algorithm and reason precedence).
// Format and check: vyhláška ČNB č. 169/2011 Sb., § 5, § 6 and Příloha (https://www.zakonyprolidi.cz/cs/2011-169);
// bank codes: ČNB Číselník ČKPS (https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/).
import { hasLetter } from '../core/letters.js';
import type { ValidationResult } from '../core/types.js';
import { isKnownBankCode, isValidPart } from './generate.js';

/**
 * Reason codes of the bank account validator (důvody neplatnosti čísla účtu), in precedence order.
 * `badFormat` has no invalid variant; the other codes are also invalid variant names.
 */
export type BankAccountReason =
  | 'letters'
  | 'badFormat'
  | 'wrongLength'
  | 'badChecksumPrefix'
  | 'badChecksumNumber'
  | 'zeroNumber'
  | 'unknownBankCode';

// Only `-` and `/` separate the parts: the decree names no characters, this is the convention.
const ACCOUNT = /^(?:([0-9]+)-)?([0-9]+)\/([0-9]+)$/;
const NON_ZERO = /[1-9]/;

// Written length, zeros included (decree § 5 odst. 1, § 6).
function hasWrongLength(prefix: string, number: string, code: string): boolean {
  return prefix.length > 6 || number.length < 2 || number.length > 10 || code.length !== 4;
}

// Prefix and number are checked separately (decree § 5 odst. 2); an absent prefix is '' and passes with sum 0.
function checksumReason(prefix: string, number: string): BankAccountReason | undefined {
  if (!isValidPart(prefix)) {
    return 'badChecksumPrefix';
  }
  if (!isValidPart(number)) {
    return 'badChecksumNumber';
  }
  // Only the all-zero number is left here: one non-zero digit never passes mod 11.
  return NON_ZERO.test(number) ? undefined : 'zeroNumber';
}

/** Validates `[prefix-]number/code`; the first failing step gives the reason. The date plays no role. */
export function validate(value: string): ValidationResult<BankAccountReason> {
  if (hasLetter(value)) {
    return { valid: false, reason: 'letters' };
  }
  const match = ACCOUNT.exec(value);
  if (match === null) {
    return { valid: false, reason: 'badFormat' };
  }
  const [, prefix = '', number = '', code = ''] = match;
  if (hasWrongLength(prefix, number, code)) {
    return { valid: false, reason: 'wrongLength' };
  }
  const reason = checksumReason(prefix, number) ?? (isKnownBankCode(code) ? undefined : 'unknownBankCode');
  return reason === undefined ? { valid: true } : { valid: false, reason };
}
