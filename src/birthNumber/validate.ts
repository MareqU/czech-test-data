// Validator of the birth number (rodné číslo) – docs/rules/birthNumber.md section 2 (check algorithm) with the
// decisions of section 8. Legal basis: § 13 zákona č. 133/2000 Sb., o evidenci obyvatel a rodných číslech
// (https://www.zakonyprolidi.cz/cs/2000-133), century mapping from the ČSSZ "Standardní kontrola rodného
// čísla" (https://www.cssz.gov.cz/standardni-kontrola-rodneho-cisla-a-evidencniho-cisla-pojistence).
import { daysInMonth, formatDate } from '../core/date.js';
import type { IdentifierContext, ValidationResult } from '../core/types.js';
import { MONTH_OFFSETS } from './generate.js';

/**
 * Reason codes of the birth number validator (důvody neplatnosti rodného čísla), in precedence order
 * (decision 7). `badFormat` has no invalid variant; every other code is also an invalid variant name.
 */
export type BirthNumberReason =
  | 'letters'
  | 'badFormat'
  | 'wrongLength'
  | 'impossibleDate'
  | 'badChecksum'
  | 'futureDate';

// Step 1 (decision 4): only Unicode letters count as letters; any other foreign character is badFormat.
const LETTER = /\p{L}/u;
// Digits only, or exactly six digits, one slash and digits. Length is checked separately (step 2).
const DIGITS_WITH_OPTIONAL_SLASH = /^(?:[0-9]*|[0-9]{6}\/[0-9]*)$/;

// Step 4: men 01–12, women +50 (§ 13 odst. 3); the additional series +20 / +70 exists only for 10-digit
// numbers (§ 13 odst. 5, added by zákon č. 53/2004 Sb., https://www.zakonyprolidi.cz/cs/2004-53).
const NINE_DIGIT_MONTH_OFFSETS: readonly number[] = [MONTH_OFFSETS.male, MONTH_OFFSETS.female];
const TEN_DIGIT_MONTH_OFFSETS: readonly number[] = Object.values(MONTH_OFFSETS);

// The remainder-10 exception was assigned only until 1985 (DASTA, FSÚ ČVK 2898/1985,
// https://dastacr.cz/dasta/hypertext/DSBET.htm; decision 1).
const LAST_MOD11_EXCEPTION_YEAR = 1985;

function formatFault(value: string): 'letters' | 'badFormat' | undefined {
  if (LETTER.test(value)) {
    return 'letters';
  }
  return DIGITS_WITH_OPTIONAL_SLASH.test(value) ? undefined : 'badFormat';
}

function decodeMonth(encoded: number, tenDigit: boolean): number | undefined {
  const offsets = tenDigit ? TEN_DIGIT_MONTH_OFFSETS : NINE_DIGIT_MONTH_OFFSETS;
  const offset = offsets.find((candidate) => encoded - candidate >= 1 && encoded - candidate <= 12);
  return offset === undefined ? undefined : encoded - offset;
}

/** Steps 3–6: the birth date, or undefined if the month or day is impossible. */
function decodeBirthDate(digits: string): { year: number; month: number; day: number } | undefined {
  const tenDigit = digits.length === 10;
  const yy = Number(digits.slice(0, 2));
  const month = decodeMonth(Number(digits.slice(2, 4)), tenDigit);
  if (month === undefined) {
    return undefined;
  }
  // Step 5, ČSSZ mapping: 9 digits 00–53 → 1900–1953, 54–99 → 1854–1899; 10 digits one century later.
  const year = yy + (yy <= 53 ? 1900 : 1800) + (tenDigit ? 100 : 0);
  const day = Number(digits.slice(4, 6));
  return day >= 1 && day <= daysInMonth(year, month) ? { year, month, day } : undefined;
}

/** Step 7 for 10 digits: divisible by 11 (§ 13 odst. 3), or the remainder-10 exception (section 3.2). */
function checksumHolds(digits: string, year: number): boolean {
  // N10 ≤ 9 999 999 999 < 2^53, so a plain number is exact.
  if (Number(digits) % 11 === 0) {
    return true;
  }
  // No lower bound needed: a 10-digit number always decodes to 1954–2053, so the exception covers 1954–1985.
  return Number(digits.slice(0, 9)) % 11 === 10 && digits.endsWith('0') && year <= LAST_MOD11_EXCEPTION_YEAR;
}

/**
 * Validates a birth number (rodné číslo) against the legal structure: `RRMMDD/XXXX` or `RRMMDD/XXX`, slash
 * optional. The first failing step gives the reason (docs/rules/birthNumber.md section 2).
 *
 * @param value - Any string; never throws.
 * @param context - `referenceDate` is "today": a later birth date gives `futureDate` (step 8).
 */
export function validate(value: string, context: IdentifierContext): ValidationResult<BirthNumberReason> {
  const fault = formatFault(value);
  if (fault !== undefined) {
    return { valid: false, reason: fault };
  }
  const digits = value.replace('/', '');
  if (digits.length !== 9 && digits.length !== 10) {
    return { valid: false, reason: 'wrongLength' };
  }
  const birthDate = decodeBirthDate(digits);
  if (birthDate === undefined) {
    return { valid: false, reason: 'impossibleDate' };
  }
  // 9-digit numbers (born before 1954) have no divisibility rule (§ 13 odst. 4).
  if (digits.length === 10 && !checksumHolds(digits, birthDate.year)) {
    return { valid: false, reason: 'badChecksum' };
  }
  // Step 8: no assigned number can carry a birth date after "today" (section 3.6); equal is valid. Both are
  // checked 4-digit `YYYY-MM-DD` dates (birth years 1854–2053), so string order is date order.
  if (formatDate(birthDate) > context.referenceDate) {
    return { valid: false, reason: 'futureDate' };
  }
  return { valid: true };
}
