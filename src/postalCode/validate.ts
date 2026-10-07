// Validator of the postal code (PSČ) – docs/rules/postalCode.md section 2 with the decisions of section 8.
// Format: UPU "Postal addressing systems – Czech Rep." (02/2018, data from Česká pošta): 5 digits, one space
// between the 3rd and 4th digit; no checksum exists.
// https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/czeEn.pdf
import type { ValidationResult } from '../core/types.js';

/**
 * Reason codes of the postal code validator (důvody neplatnosti PSČ), in precedence order. Every code is also
 * an invalid variant name.
 */
export type PostalCodeReason = 'letters' | 'badFormat' | 'wrongLength' | 'foreignRange';

const LETTER = /\p{L}/u;
const NOT_DIGIT_OR_SPACE = /[^0-9 ]/;
// Slovak zones: Česká pošta's official list holds only first digits 1–7 (checked 2026-10-06),
// https://www.ceskaposta.cz/documents/d/guest/csv_psc_a-zip
const FOREIGN_FIRST_DIGIT = /^[089]/;
const SPACE_INDEX = 3;

/** Whether the spaces are none, or exactly one right after the 3rd character (no trimming). */
function hasValidSpace(value: string): boolean {
  const first = value.indexOf(' ');
  return !value.includes(' ') || (first === SPACE_INDEX && !value.includes(' ', first + 1));
}

/** Validates the postal code; the first failing step gives the reason. Existence is not checked. */
export function validate(value: string): ValidationResult<PostalCodeReason> {
  if (LETTER.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (NOT_DIGIT_OR_SPACE.test(value) || !hasValidSpace(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  const digits = value.replace(' ', '');
  if (digits.length !== 5) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (FOREIGN_FIRST_DIGIT.test(digits)) {
    return { valid: false, reason: 'foreignRange' };
  }
  return { valid: true };
}
