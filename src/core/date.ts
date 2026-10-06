// Gregorian calendar helpers – docs/rules/core.md section 5 (src/core/date.ts).
// Plain integer arithmetic instead of Date: Date.UTC maps years 0–99 to 1900–1999 and silently rolls
// over impossible dates such as 2026-02-30. Dates are `YYYY-MM-DD` strings of the years 0000–9999; no helper
// here produces any other year, so string order is date order. Range arithmetic (cutting a range, the day
// after a date) works on day numbers instead, where 9999-12-31 + 1 day is just a larger number.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const THIRTY_DAY_MONTHS: readonly number[] = [4, 6, 9, 11];

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** `value` with leading zeros to `width` digits. */
export function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Whether `year` is a Gregorian leap year: divisible by 4, except centuries not divisible by 400. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Number of days of `month` (1–12) in `year` of the Gregorian calendar. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return THIRTY_DAY_MONTHS.includes(month) ? 30 : 31;
}

/** Formats a date of the years 0–9999 as `YYYY-MM-DD`. */
export function formatDate({ year, month, day }: DateParts): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Splits a `YYYY-MM-DD` date into year, month and day. The date must already be checked
 * ({@link isCalendarDate}).
 */
export function dateParts(date: string): DateParts {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}

/**
 * Whether `value` is a real Gregorian calendar date written as `YYYY-MM-DD` (ISO 8601 calendar date,
 * extended format), e.g. `2024-02-29` but not `2025-02-29` or `2026-1-04`.
 */
export function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const { year, month, day } = dateParts(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

// Day numbers follow Howard Hinnant's public-domain algorithms days_from_civil / civil_from_days
// (http://howardhinnant.github.io/date_algorithms.html): days since 1970-01-01 in the proleptic Gregorian
// calendar, with eras of 400 years (146 097 days). Only integers, so the result is exact in every engine.
const DAYS_PER_ERA = 146_097;
const EPOCH_SHIFT = 719_468;
// Day numbers of 0000-01-01 and 9999-12-31, the dates a `YYYY-MM-DD` string can hold.
const FIRST_DAY_NUMBER = -719_528;
const LAST_DAY_NUMBER = 2_932_896;

/** Days since 1970-01-01 of a checked `YYYY-MM-DD` date (negative before 1970). */
export function toDayNumber(date: string): number {
  const { year: calendarYear, month, day } = dateParts(date);
  // The algorithm counts years from March, so January and February belong to the previous year.
  const year = calendarYear - (month <= 2 ? 1 : 0);
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * DAYS_PER_ERA + dayOfEra - EPOCH_SHIFT;
}

/**
 * The `YYYY-MM-DD` date of a day number from {@link toDayNumber}.
 *
 * @throws RangeError for a day number outside 0000-01-01 … 9999-12-31: its year would not have 4 digits,
 * and string comparisons of such a date would be wrong.
 */
export function fromDayNumber(dayNumber: number): string {
  if (dayNumber < FIRST_DAY_NUMBER || dayNumber > LAST_DAY_NUMBER) {
    throw new RangeError(`day number ${String(dayNumber)} is outside 0000-01-01 … 9999-12-31`);
  }
  const shifted = dayNumber + EPOCH_SHIFT;
  const era = Math.floor(shifted / DAYS_PER_ERA);
  const dayOfEra = shifted - era * DAYS_PER_ERA;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36_524) - Math.floor(dayOfEra / 146_096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  return formatDate({ year: yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day });
}
