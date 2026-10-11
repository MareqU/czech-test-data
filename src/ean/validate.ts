// Validator of the EAN – docs/rules/ean.md sections 2.4 and 10 (decisions 1–4).
// Sources: vyhláška č. 408/2015 Sb., § 16 odst. 2 (18 digits); OTE fixed part 8591824; GS1 check digit.
import { hasLetter } from '../core/letters.js';
import type { ValidationResult } from '../core/types.js';
import { PREFIX, checkDigitOf } from './generate.js';

/** Reason codes of the EAN validator (důvody neplatnosti EAN), in precedence order. `badFormat` has no invalid variant. */
export type EanReason = 'letters' | 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'badChecksum';

const NOT_DIGIT = /[^0-9]/;

/** Validates the EAN; the first failing step gives the reason. Positions 8–17 are not range-checked. */
export function validate(value: string): ValidationResult<EanReason> {
  if (hasLetter(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (NOT_DIGIT.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== 18) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!value.startsWith(PREFIX)) {
    return { valid: false, reason: 'wrongPrefix' };
  }
  if (Number(value.charAt(17)) !== checkDigitOf(value.slice(0, 17))) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
