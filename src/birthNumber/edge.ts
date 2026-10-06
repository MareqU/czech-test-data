// Edge variants of the birth number (rodné číslo): valid but unusual – docs/rules/birthNumber.md section 4,
// fixed date ranges of section 9 (amendment A3). Every value passes the validator; none has a zero ending.
import { isLeapYear, pad, toDayNumber } from '../core/date.js';
import type { Random } from '../core/random.js';
import type { IdentifierContext, IdentifierVariant } from '../core/types.js';
import {
  datePrefix,
  drawCongruent,
  drawDateUpTo,
  drawGenderOffset,
  emptyRangeError,
  formatBirthNumber,
  MONTH_OFFSETS,
  PLAIN_RANGE,
} from './generate.js';

/**
 * Names of the edge variants (okrajové případy rodného čísla): valid numbers that often break naive checks.
 */
export type BirthNumberEdgeVariant = 'pre1954' | 'mod11Exception' | 'month+20' | 'month+70' | 'leapDay' | 'withoutSlash';

// 9-digit numbers from 1900 on: the 1854–1899 mapping is valid but debatable (section 4).
const NINE_DIGIT_RANGE = { from: '1900-01-01', to: '1953-12-31' } as const;
// The remainder-10 exception was assigned only until 1985 (DASTA, FSÚ ČVK 2898/1985,
// https://dastacr.cz/dasta/hypertext/DSBET.htm; decision 1).
const MOD11_EXCEPTION_RANGE = { from: '1954-01-01', to: '1985-12-31' } as const;
// The additional series exists since 1 April 2004 (zákon č. 53/2004 Sb., https://www.zakonyprolidi.cz/cs/2004-53);
// births from then on are valid under every reading of § 13 odst. 5 (decision 2).
const ADDITIONAL_SERIES_RANGE = { from: '2004-04-01', to: PLAIN_RANGE.to } as const;
// withoutSlash covers both lengths: the 9-digit range and the plain range (section 9 clarifications).
const WITHOUT_SLASH_RANGE = { from: NINE_DIGIT_RANGE.from, to: PLAIN_RANGE.to } as const;

// 29 February of every leap year 1900–2024: 1904–1952 give 9 digits, 1956–2024 10 digits. 1900 is not a
// leap year in the Gregorian calendar, 2000 is (section 9 clarifications).
const LEAP_DAYS: readonly string[] = Array.from({ length: 2024 - 1900 + 1 }, (_, i) => 1900 + i)
  .filter((year) => isLeapYear(year))
  .map((year) => `${String(year)}-02-29`);

function additionalSeries(monthOffset: number): IdentifierVariant {
  return (random, context) => formatBirthNumber(random, drawDateUpTo(random, ADDITIONAL_SERIES_RANGE, context), monthOffset);
}

/**
 * 10 digits whose first nine have remainder 10 and whose check digit is 0, so `N10 mod 11 == 1`
 * (section 3.2, DASTA https://dastacr.cz/dasta/hypertext/DSBET.htm). N9 = prefix · 1000 + sequence, so the
 * sequence must be ≡ 10 − prefix · 1000 (mod 11).
 */
function mod11Exception(random: Random, context: IdentifierContext): string {
  const prefix = datePrefix(drawDateUpTo(random, MOD11_EXCEPTION_RANGE, context), drawGenderOffset(random));
  const residue = (10 - ((Number(prefix) * 1000) % 11) + 11) % 11;
  return `${prefix}/${pad(drawCongruent(random, residue, 999), 3)}0`;
}

/** One pick among the leap days up to `referenceDate`, both lengths together (section 9 clarifications). */
function leapDay(random: Random, context: IdentifierContext): string {
  const lastDay = toDayNumber(context.referenceDate);
  const leapDays = LEAP_DAYS.filter((date) => toDayNumber(date) <= lastDay);
  if (leapDays.length === 0) {
    throw emptyRangeError(context.referenceDate);
  }
  return formatBirthNumber(random, random.pick(leapDays), drawGenderOffset(random));
}

/** Edge variants by name; each draws its birth date from the fixed range of section 9. */
export const edge: Readonly<Record<BirthNumberEdgeVariant, IdentifierVariant>> = {
  pre1954: (random, context) =>
    formatBirthNumber(random, drawDateUpTo(random, NINE_DIGIT_RANGE, context), drawGenderOffset(random)),
  mod11Exception,
  'month+20': additionalSeries(MONTH_OFFSETS.additionalMale),
  'month+70': additionalSeries(MONTH_OFFSETS.additionalFemale),
  leapDay,
  // The slash is optional: DASTA (https://dastacr.cz/dasta/hypertext/DSBET.htm) leaves it out on technical
  // carriers, ČSSZ checks digits only (section 1).
  withoutSlash: (random, context) =>
    formatBirthNumber(random, drawDateUpTo(random, WITHOUT_SLASH_RANGE, context), drawGenderOffset(random)).replace('/', ''),
};
