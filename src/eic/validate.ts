// Validator of the EIC – docs/rules/eic.md sections 2.4 and 10 (decisions 1–4).
// Sources: ENTSO-E EIC Reference Manual 5.5, § 5.2 (alphabet),
// https://transgaz.ro/sites/default/files/users/user822/EIC_Reference_Manual_Release_5_5.pdf;
// EIC Data Exchange Implementation Guide v1.2, § 5.3 (check character, never "-"),
// https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/cim_based/EIC_Data_Exchange_IG_v1.2.pdf
import type { ValidationResult } from '../core/types.js';
import { ALPHABET, PREFIX, checkValue } from './generate.js';

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
  // Same as "whole weighted sum divisible by 37"; the dash case is already handled above.
  if (ALPHABET.indexOf(value.charAt(15)) !== checkValue(value.slice(0, 15))) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
