// Validator of the DIČ, rules for dic section 2. Composition: § 130 zákona č. 280/2009 Sb., daňový řád
// (https://www.zakonyprolidi.cz/cs/2009-280); prefix: Directive 2006/112/EC art. 215. The assigned-number check
// digit has no official text (python-stdnum, confirmed by ARES records, UNVERIFIED).
import { validate as validateBirthNumber } from '../birthNumber/validate.js';
import { hasLetter } from '../core/letters.js';
import type { IdentifierContext, ValidationResult } from '../core/types.js';
import { validate as validateIco } from '../ico/validate.js';
import { withAssignedCheckDigit } from './generate.js';

/**
 * Reason codes of the DIČ validator (důvody neplatnosti DIČ), in precedence order. `letters`, `badFormat`,
 * `wrongLength`, `impossibleDate` and `futureDate` have no invalid variant.
 */
export type DicReason =
  | 'missingPrefix'
  | 'foreignPrefix'
  | 'letters'
  | 'badFormat'
  | 'wrongLength'
  | 'impossibleDate'
  | 'badInnerChecksum'
  | 'futureDate';

const CZ_PREFIX = /^[Cc][Zz]/;
const TWO_LETTERS = /^\p{L}\p{L}/u;
const NOT_DIGIT = /[^0-9]/;

type InnerReason = Exclude<DicReason, 'missingPrefix' | 'foreignPrefix' | 'badInnerChecksum'> | 'badChecksum';

// Only badChecksum is renamed; the other inner reasons keep their meaning.
function mapInner(result: ValidationResult<InnerReason>): ValidationResult<DicReason> {
  return result.valid ? result : { valid: false, reason: result.reason === 'badChecksum' ? 'badInnerChecksum' : result.reason };
}

function prefixFault(value: string): ValidationResult<DicReason> {
  if (TWO_LETTERS.test(value)) {
    return { valid: false, reason: 'foreignPrefix' };
  }
  return { valid: false, reason: value === '' || /^[0-9]/.test(value) ? 'missingPrefix' : 'badFormat' };
}

function validateInner(inner: string, context: IdentifierContext): ValidationResult<DicReason> {
  if (hasLetter(inner)) {
    return { valid: false, reason: 'letters' };
  }
  if (NOT_DIGIT.test(inner)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (inner.length < 8 || inner.length > 10) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (inner.length === 8) {
    return mapInner(validateIco(inner));
  }
  // 9 digits starting with 6 are always an assigned number, never a birth number.
  if (inner.length === 9 && inner.startsWith('6')) {
    return withAssignedCheckDigit(inner.slice(0, 8)) === inner ? { valid: true } : { valid: false, reason: 'badInnerChecksum' };
  }
  return mapInner(validateBirthNumber(inner, context));
}

/** Validates a complete DIČ (`CZ` + 8–10 digits); the first failing step gives the reason. Registration is not checked. */
export function validate(value: string, context: IdentifierContext): ValidationResult<DicReason> {
  return CZ_PREFIX.test(value) ? validateInner(value.slice(2), context) : prefixFault(value);
}
