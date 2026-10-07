// Invalid variants of the birth number (rodné číslo) – docs/rules/birthNumber.md section 4 (one fault each)
// and section 9 (date ranges). Each variant name is the reason code the validator returns for its values.
import { replaceDigitWithLetter } from '../core/letters.js';
import { dateParts, daysInMonth, toDayNumber } from '../core/date.js';
import type { Random } from '../core/random.js';
import type { IdentifierContext, IdentifierVariant } from '../core/types.js';
import {
  drawCheckedEnding,
  drawDate,
  drawDateUpTo,
  drawGenderOffset,
  encodePrefix,
  formatBirthNumber,
  generate,
  MONTH_OFFSETS,
  PLAIN_RANGE,
} from './generate.js';

/**
 * Names of the invalid variants (neplatné varianty rodného čísla); each is also a reason code of the validator.
 */
export type BirthNumberInvalidVariant = 'badChecksum' | 'impossibleDate' | 'wrongLength' | 'letters' | 'futureDate';

// futureDate draws from a fixed range after every valid range; its lower bound moves past referenceDate.
const FUTURE_RANGE = { from: '2040-01-01', to: '2053-12-31' } as const;

// Encoded months that are no month in any series (section 4): 00, 13–20, 33–50, 63–70, 83–99.
const ALL_MONTH_OFFSETS: readonly number[] = Object.values(MONTH_OFFSETS);
const IMPOSSIBLE_MONTHS: readonly number[] = Array.from({ length: 100 }, (_, month) => month).filter(
  (month) => !ALL_MONTH_OFFSETS.some((offset) => month - offset >= 1 && month - offset <= 12),
);

type DateFault = 'month' | 'dayZero' | 'dayAfterMonthEnd';
const DATE_FAULTS: readonly DateFault[] = ['month', 'dayZero', 'dayAfterMonthEnd'];

// Letters typed instead of digits: O for 0, l for 1, and a plain A (section 4).
const LETTERS = 'AOl';
// Character positions of the digits in `RRMMDD/XXXX` (the slash is at index 6).
const DIGIT_POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10];

/** A valid plain number from the plain range, the base of the date-independent variants (section 9). */
function plainNumber(random: Random, context: IdentifierContext): string {
  return generate(random, {}, context);
}

/**
 * The last digit of a plain number is the normal check digit `N9 mod 11` ≤ 9, so `N9 mod 11 ≠ 10` and no
 * other last digit can make it a valid mod11Exception (section 4).
 */
export function badChecksum(random: Random, context: IdentifierContext): string {
  const value = plainNumber(random, context);
  const changed = (Number(value.slice(-1)) + random.int(1, 9)) % 10;
  return `${value.slice(0, -1)}${String(changed)}`;
}

/** 10 digits with a correct checksum, so the impossible month or day is the only fault (section 4). */
function impossibleDate(random: Random, context: IdentifierContext): string {
  const date = drawDateUpTo(random, PLAIN_RANGE, context);
  const genderOffset = drawGenderOffset(random);
  const { year, month, day } = dateParts(date);
  const fault = random.pick(DATE_FAULTS);
  const encodedMonth = fault === 'month' ? random.pick(IMPOSSIBLE_MONTHS) : month + genderOffset;
  const faultyDays: Record<DateFault, number> = { month: day, dayZero: 0, dayAfterMonthEnd: daysInMonth(year, month) + 1 };
  const prefix = encodePrefix(year, encodedMonth, faultyDays[fault]);
  return `${prefix}/${drawCheckedEnding(random, prefix)}`;
}

/**
 * 8 or 11 digits. Never 9: a 10-digit number cut to 9 digits is usually a valid pre-1954 number (section 4).
 */
function wrongLength(random: Random, context: IdentifierContext): string {
  const value = plainNumber(random, context);
  return random.int(0, 1) === 0 ? value.slice(0, -2) : `${value}${String(random.int(0, 9))}`;
}

/** Exactly one digit of a valid number replaced with a letter (section 9 clarifications). */
function letters(random: Random, context: IdentifierContext): string {
  const value = plainNumber(random, context);
  return replaceDigitWithLetter(random, value, DIGIT_POSITIONS, LETTERS);
}

/**
 * Correct checksum, birth date after referenceDate: from max(2040-01-01, referenceDate + 1 day) to
 * 2053-12-31 (section 9). Day numbers, not strings: the day after 9999-12-31 has no 4-digit year.
 */
function futureDate(random: Random, context: IdentifierContext): string {
  const fromDay = Math.max(toDayNumber(FUTURE_RANGE.from), toDayNumber(context.referenceDate) + 1);
  const date = drawDate(random, fromDay, toDayNumber(FUTURE_RANGE.to), context.referenceDate);
  return formatBirthNumber(random, date, drawGenderOffset(random));
}

/** Invalid variants by name; each value has exactly one fault. */
export const invalid: Readonly<Record<BirthNumberInvalidVariant, IdentifierVariant>> = {
  badChecksum,
  impossibleDate,
  wrongLength,
  letters,
  futureDate,
};
