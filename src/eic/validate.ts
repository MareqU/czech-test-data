// Validator of the EIC – docs/rules/eic.md sections 2.4 and 10 (decisions 1–4).
// Sources: ENTSO-E EIC Reference Manual 5.5, § 5.2 (alphabet); IG v1.2, § 5.3 (check character, never "-").
import type { ValidationResult } from '../core/types.js';
import { ALPHABET, PREFIX } from './generate.js';

/** Reason codes of the EIC validator (důvody neplatnosti EIC), in precedence order. `badFormat` has no invalid variant. */
export type EicReason = 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter' | 'badChecksum';

const NOT_EIC_CHAR = /[^0-9A-Z-]/;
const LENGTH = 16;

/** Validates the EIC; the first failing step gives the reason. Positions 5–15 are not structure-checked. */
export function validate(value: string): ValidationResult<EicReason> {
  if (NOT_EIC_CHAR.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== LENGTH) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!value.startsWith(PREFIX)) {
    return { valid: false, reason: 'wrongPrefix' };
  }
  if (value.endsWith('-')) {
    return { valid: false, reason: 'dashCheckCharacter' };
  }
  // Check character has weight 1, so the whole weighted sum must be divisible by 37.
  let sum = 0;
  for (let i = 0; i < LENGTH; i++) {
    sum += (LENGTH - i) * ALPHABET.indexOf(value.charAt(i));
  }
  if (sum % 37 !== 0) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
