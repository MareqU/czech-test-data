// Day numbers of the core calendar helpers – docs/rules/core.md amendment A3 and docs/rules/birthNumber.md
// section 9: dates are `YYYY-MM-DD`, so no core helper may produce a year outside 0000 … 9999 (review B1:
// a 5-digit year breaks string comparison of dates).
// Expected day numbers were computed independently of src/: the boundaries by hand
// (0000-01-01 = −(1970 · 365 + 478 leap days) = −719528; 9999-12-31 = 8030 · 365 + 1947 leap days − 1 = 2932896)
// and every value cross-checked with Date#setUTCFullYear (Date.UTC would map the years 0–99 to 1900–1999).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fromDayNumber, toDayNumber } from '../src/core/date.js';
import { utcDateOf } from './support/helpers.js';

/** Day number of 0000-01-01, counted from 1970-01-01. */
const FIRST_DAY_NUMBER = -719528;

/** Day number of 9999-12-31, counted from 1970-01-01. */
const LAST_DAY_NUMBER = 2932896;

const MS_PER_DAY = 86_400_000;

/** Every real calendar date 0000-01-01 … 9999-12-31 as `YYYY-MM-DD`. */
const fullRangeDateArb = fc
  .date({ min: new Date('0000-01-01T00:00:00Z'), max: new Date('9999-12-31T00:00:00Z'), noInvalidDate: true })
  .map(utcDateOf);

/** Independent reference: days since 1970-01-01 of a `YYYY-MM-DD` date, valid for the years 0 … 9999. */
function referenceDayNumber(date: string): number {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  const instant = new Date(0);
  instant.setUTCFullYear(year, month - 1, day);
  return instant.getTime() / MS_PER_DAY;
}

describe('toDayNumber / fromDayNumber – known values', () => {
  it.each([
    { date: '0000-01-01', dayNumber: -719528, why: 'first supported day' },
    { date: '0000-12-31', dayNumber: -719163, why: 'year 0 is a leap year (366 days)' },
    { date: '0001-01-01', dayNumber: -719162, why: 'day after the leap year 0' },
    { date: '0099-12-31', dayNumber: -683004, why: 'a 2-digit year, not 1999' },
    { date: '0100-03-01', dayNumber: -682944, why: '100 is not a leap year' },
    { date: '1854-01-01', dayNumber: -42368, why: 'first supported birth date' },
    { date: '1900-03-01', dayNumber: -25508, why: '1900 is not a leap year' },
    { date: '1969-12-31', dayNumber: -1, why: 'day before the epoch' },
    { date: '1970-01-01', dayNumber: 0, why: 'the epoch' },
    { date: '1971-01-01', dayNumber: 365, why: 'one common year after the epoch' },
    { date: '2000-02-29', dayNumber: 11016, why: '2000 is a leap year' },
    { date: '2026-10-05', dayNumber: 20731, why: 'a recent reference date' },
    { date: '2053-12-31', dayNumber: 30680, why: 'last supported birth date' },
    { date: '9999-12-31', dayNumber: 2932896, why: 'last supported day' },
  ])('maps $date to $dayNumber and back ($why)', ({ date, dayNumber }) => {
    expect(referenceDayNumber(date)).toBe(dayNumber);
    expect(toDayNumber(date)).toBe(dayNumber);
    expect(fromDayNumber(dayNumber)).toBe(date);
  });
});

describe('fromDayNumber – only 4-digit years (0000-01-01 … 9999-12-31)', () => {
  it('returns 0000-01-01 for the first day number and 9999-12-31 for the last one', () => {
    expect(fromDayNumber(FIRST_DAY_NUMBER)).toBe('0000-01-01');
    expect(fromDayNumber(LAST_DAY_NUMBER)).toBe('9999-12-31');
  });

  it.each([
    { dayNumber: FIRST_DAY_NUMBER - 1, why: 'the day before 0000-01-01 (year −1)' },
    { dayNumber: LAST_DAY_NUMBER + 1, why: 'the day after 9999-12-31 (year 10000, review B1)' },
    { dayNumber: FIRST_DAY_NUMBER - 366, why: 'a year before the range' },
    { dayNumber: LAST_DAY_NUMBER + 366, why: 'a year after the range' },
    { dayNumber: -100_000_000, why: 'far before the range' },
    { dayNumber: 100_000_000, why: 'far after the range' },
  ])('throws RangeError for $dayNumber, $why', ({ dayNumber }) => {
    expect(() => fromDayNumber(dayNumber)).toThrow(RangeError);
  });
});

describe('toDayNumber / fromDayNumber – round trips', () => {
  it('agrees with the reference and round-trips for every date 0000-01-01 … 9999-12-31', () => {
    const boundaryArb = fc.constantFrom('0000-01-01', '0000-02-29', '0099-12-31', '1970-01-01', '9999-12-30', '9999-12-31');
    fc.assert(
      fc.property(fc.oneof(boundaryArb, fullRangeDateArb), (date) => {
        const dayNumber = toDayNumber(date);
        expect(dayNumber).toBe(referenceDayNumber(date));
        expect(fromDayNumber(dayNumber)).toBe(date);
      }),
      { numRuns: 2000 },
    );
  });

  it('gives a 4-digit YYYY-MM-DD date for every day number in range, and round-trips it', () => {
    fc.assert(
      fc.property(fc.integer({ min: FIRST_DAY_NUMBER, max: LAST_DAY_NUMBER }), (dayNumber) => {
        const date = fromDayNumber(dayNumber);
        expect(date).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
        expect(referenceDayNumber(date)).toBe(dayNumber);
        expect(toDayNumber(date)).toBe(dayNumber);
      }),
      { numRuns: 2000 },
    );
  });

  it('throws RangeError for every day number outside the range', () => {
    const outsideArb = fc.oneof(
      fc.integer({ min: -100_000_000, max: FIRST_DAY_NUMBER - 1 }),
      fc.integer({ min: LAST_DAY_NUMBER + 1, max: 100_000_000 }),
    );
    fc.assert(
      fc.property(outsideArb, (dayNumber) => {
        expect(() => fromDayNumber(dayNumber)).toThrow(RangeError);
      }),
      { numRuns: 500 },
    );
  });
});
