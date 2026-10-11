// Validator of the Czech IBAN – reason precedence from the iban rules, section 2.5.
// Format: vyhláška ČNB č. 169/2011 Sb., § 4 (https://www.zakonyprolidi.cz/cs/2011-169); written form and
// MOD 97-10: ECBS EBS204 § 5.2 and § 6.1 (https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/iban/download/EBS204.pdf).
import { validate as validateAccount } from '../bankAccount/validate.js';
import { hasLetter } from '../core/letters.js';
import type { ValidationResult } from '../core/types.js';
import { mod97 } from './generate.js';

/**
 * Reason codes of the IBAN validator (důvody neplatnosti IBAN), in precedence order. The last four are
 * the bankAccount reasons of the embedded account, passed on unchanged.
 */
export type IbanReason =
  | 'badFormat'
  | 'wrongCountry'
  | 'letters'
  | 'wrongLength'
  | 'badChecksum'
  | 'badChecksumPrefix'
  | 'badChecksumNumber'
  | 'zeroNumber'
  | 'unknownBankCode';

// Electronic form, or the written form: groups of 4 separated by one space, last group 1–4 characters.
const SHAPE = /^(?:[\p{L}0-9]+|[\p{L}0-9]{4}(?: [\p{L}0-9]{4})*(?: [\p{L}0-9]{1,4})?)$/u;
const COUNTRY = /^[cC][zZ]/;
// Never issued by EBS204 § 6.2 although their remainder can be 1 (§ 7.1: only the bank generates IBANs).
const UNISSUED_CHECK_DIGITS = ['00', '01', '99'];

// The first failing step before the embedded account.
function ibanReason(compact: string): IbanReason | undefined {
  if (!COUNTRY.test(compact)) {
    return 'wrongCountry';
  }
  if (hasLetter(compact.slice(2))) {
    return 'letters';
  }
  if (compact.length !== 24) {
    return 'wrongLength';
  }
  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  return UNISSUED_CHECK_DIGITS.includes(compact.slice(2, 4)) || mod97(rearranged) !== 1 ? 'badChecksum' : undefined;
}

/** Validates an electronic or written Czech IBAN; the first failing step gives the reason. The date plays no role. */
export function validate(value: string): ValidationResult<IbanReason> {
  if (!SHAPE.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  const compact = value.replaceAll(' ', '');
  const reason = ibanReason(compact);
  if (reason !== undefined) {
    return { valid: false, reason };
  }
  // Prefix and number must pass mod 11 and the code must be a ČKPS code (vyhláška 169/2011 Sb., § 4 d), § 5).
  return validateAccount(`${compact.slice(8, 14)}-${compact.slice(14)}/${compact.slice(4, 8)}`);
}
