// Validator of the IČO – docs/rules/ico.md section 2 with the decisions of section 9.
// Format: ARES REST API, `ico` pattern ^\d{8}$ (https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/v3/api-docs);
// the check digit has no official text, it is confirmed by ARES records (see the caveat in the rules).
import { hasLetter } from '../core/letters.js';
import type { ValidationResult } from '../core/types.js';
import { checkDigitOf } from './generate.js';

/**
 * Reason codes of the IČO validator (důvody neplatnosti IČO), in precedence order. `badFormat` has no
 * invalid variant; the other codes are also invalid variant names.
 */
export type IcoReason = 'letters' | 'badFormat' | 'wrongLength' | 'badChecksum';

const NOT_DIGIT = /[^0-9]/;

/** True if `value` contains anything but a digit; shared with the DIČ validator. */
export function hasNonDigit(value: string): boolean {
  return NOT_DIGIT.test(value);
}

/** Validates the IČO; the first failing step gives the reason. Existence in ARES is not checked. */
export function validate(value: string): ValidationResult<IcoReason> {
  if (hasLetter(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (hasNonDigit(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== 8) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (Number(value.charAt(7)) !== checkDigitOf(value.slice(0, 7))) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
