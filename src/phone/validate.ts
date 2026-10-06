// Validator of the phone number (telefonní číslo) – docs/rules/phone.md section 2 (check algorithm) with the
// decisions of section 9 and the clarifications of section 10. Numbering plan: příloha č. 1 and § 4 of
// vyhláška č. 117/2007 Sb. (https://www.zakonyprolidi.cz/cs/2007-117), ČTÚ communication to the ITU of
// 5. 1. 2023 (https://www.itu.int/oth/T0202000035/en). Phone numbers have no checksum.
import type { ValidationResult } from '../core/types.js';
import { EMERGENCY_SMS } from './generate.js';

/**
 * Reason codes of the phone validator (důvody neplatnosti telefonního čísla), in precedence order.
 * `badFormat` has no invalid variant; every other code is also an invalid variant name.
 */
export type PhoneReason = 'letters' | 'badFormat' | 'wrongCountryCode' | 'wrongLength' | 'unknownPrefix' | 'specialPrefix';

const LETTER = /\p{L}/u;
// Step 2: digits, a leading `+`, single ASCII spaces between digit groups; the empty string is left to step 5.
const ALLOWED_CHARACTERS = /^(?:\+?[0-9]+(?: [0-9]+)*)?$/;
const NATIONAL_SHAPE = /^(?:[0-9]{9}|[0-9]{3} [0-9]{3} [0-9]{3})$/;
const COUNTRY_CODE = '420';
const NATIONAL_LENGTH = 9;

// Step 7. Valid: fixed areas (`20` excluded, decision 9), mobile 601–608, 702–719, 72, 73, 77, 79, VoIP 910.
const VALID_RANGE = /^(?:2[1-9]|3[125789]|4[16789]|5[13-9]|60[1-8]|7(?:0[2-9]|1[0-9]|[2379])|910)/;
// Designated for other uses (section 3.2); `975`, `978`, `979`, `981`, `982` stay unknown.
const SPECIAL_RANGE = /^(?:61[0-4]|700|800|8[1-4][0-9]|90[05689]|9[356]|97[0-467]|98[039])/;

/** Step 3: the part after `+` or `00`, or undefined when the value has no international prefix. */
function afterPrefix(value: string): string | undefined {
  if (value.startsWith('+')) {
    return value.slice(1);
  }
  return value.startsWith('00') ? value.slice(2) : undefined;
}

function rangeReason(national: string): PhoneReason | undefined {
  if (national === EMERGENCY_SMS) {
    return 'specialPrefix';
  }
  if (VALID_RANGE.test(national)) {
    return undefined;
  }
  return SPECIAL_RANGE.test(national) ? 'specialPrefix' : 'unknownPrefix';
}

/** Steps 3 and 4: the national part, or the reason the country code is wrong. */
function nationalPart(value: string): { national: string } | { reason: PhoneReason } {
  const rest = afterPrefix(value);
  if (rest === undefined) {
    return { national: value };
  }
  // The group G of step 3 is empty exactly when the rest is empty or starts with a space; G starts with
  // 420 exactly when the rest does.
  if (rest === '' || rest.startsWith(' ')) {
    return { reason: 'badFormat' };
  }
  if (!rest.startsWith(COUNTRY_CODE)) {
    return { reason: 'wrongCountryCode' };
  }
  // One optional space may separate the country code from the number.
  return { national: rest.slice(COUNTRY_CODE.length).replace(/^ /, '') };
}

/**
 * Validates a phone number; the first failing step gives the reason. The date plays no role.
 */
export function validate(value: string): ValidationResult<PhoneReason> {
  if (LETTER.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (!ALLOWED_CHARACTERS.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  const part = nationalPart(value);
  if ('reason' in part) {
    return { valid: false, reason: part.reason };
  }
  const { national } = part;
  if (national.replaceAll(' ', '').length !== NATIONAL_LENGTH) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!NATIONAL_SHAPE.test(national)) {
    return { valid: false, reason: 'badFormat' };
  }
  const reason = rangeReason(national.replaceAll(' ', ''));
  return reason === undefined ? { valid: true } : { valid: false, reason };
}
