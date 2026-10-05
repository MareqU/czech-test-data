// Gregorian calendar helpers – docs/rules/core.md section 5 (src/core/date.ts).
// Plain integer arithmetic instead of Date: Date.UTC maps years 0–99 to 1900–1999 and silently rolls
// over impossible dates such as 2026-02-30.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const THIRTY_DAY_MONTHS: readonly number[] = [4, 6, 9, 11];

// Gregorian leap year rule; ISO 8601 dates use the proleptic Gregorian calendar.
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return THIRTY_DAY_MONTHS.includes(month) ? 30 : 31;
}

/**
 * Whether `value` is a real Gregorian calendar date written as `YYYY-MM-DD` (ISO 8601 calendar date,
 * extended format), e.g. `2024-02-29` but not `2025-02-29` or `2026-1-04`.
 */
export function isCalendarDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}
