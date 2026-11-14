// Validator of the VIN – docs/rules/vin.md sections 1.5, 2.5 and 10 (decisions 1–5).
// Sources: Commission Implementing Regulation (EU) 2021/535, Annex II, Part 2, Section A (characters, points 2.5,
// 2.7, 2.8; check digit 2.4), https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj; 49 CFR 565.13 and 565.15,
// https://www.law.cornell.edu/cfr/text/49/565.15
import { hasNonDigit } from '../core/letters.js';
import type { ValidationResult } from '../core/types.js';
import { FORBIDDEN, checkChar } from './generate.js';

/**
 * Reason codes of the VIN validator (důvody neplatnosti VIN), in precedence order. `badFormat` has no invalid
 * variant. `badChecksum` is checked last, so apps that must accept European VINs from before the check digit
 * became mandatory (2022 / 2026) may accept that one reason.
 */
export type VinReason = 'badFormat' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial' | 'badChecksum';

const NOT_VIN_CHAR = /[^0-9A-Z]/;
const FORBIDDEN_LETTER = new RegExp(`[${FORBIDDEN}]`);
const LENGTH = 17;
// 2021/535 point 2.5 and 49 CFR 565.15(d): the last four characters are digits (the stricter US "last five" rule
// for light vehicles is not checked).
const SERIAL_START = 13;

/** Validates the VIN; the first failing step gives the reason. WMI, model year and plant are not checked. */
export function validate(value: string): ValidationResult<VinReason> {
  if (NOT_VIN_CHAR.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== LENGTH) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (FORBIDDEN_LETTER.test(value)) {
    return { valid: false, reason: 'forbiddenLetter' };
  }
  if (hasNonDigit(value.slice(SERIAL_START))) {
    return { valid: false, reason: 'nonNumericSerial' };
  }
  if (value.charAt(8) !== checkChar(value)) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
