// Shared test helpers (review nit N6): arbitraries, a draw helper, date fixtures and a fake clock.
import fc from 'fast-check';
import { vi } from 'vitest';
import { MAX_UINT32 } from './reference.js';

/** Every valid seed, 0 … 2^32 − 1. */
export const seedArb = fc.integer({ min: 0, max: MAX_UINT32 });

/** Calls `next` `count` times and collects the results in call order. */
export function draw<T>(count: number, next: () => T): T[] {
  return Array.from({ length: count }, next);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Formats the UTC calendar date of `date` as `YYYY-MM-DD`. */
export function utcDateOf(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/** Formats the local calendar date of `date` (in the current `process.env['TZ']`) as `YYYY-MM-DD`. */
export function localDateOf(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}`;
}

/** Adds whole days to a `YYYY-MM-DD` date in the Gregorian calendar. */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number);
  return utcDateOf(new Date(Date.UTC(year, month - 1, day + days)));
}

/** Every real calendar date 1900-01-01 … 2099-12-31 as `YYYY-MM-DD`. */
export const calendarDateArb = fc
  .date({ min: new Date('1900-01-01T00:00:00Z'), max: new Date('2099-12-31T00:00:00Z'), noInvalidDate: true })
  .map(utcDateOf);

/** Strings that are not shaped `YYYY-MM-DD`. */
export const MALFORMED_DATES: readonly string[] = [
  '',
  '2026',
  '2026-10',
  '2026-1-04',
  '2026-10-4',
  '26-10-04',
  '2026/10/04',
  '04.10.2026',
  '20261004',
  ' 2026-10-04',
  '2026-10-04 ',
  '2026-10-04T00:00:00Z',
  '+002026-10-04',
  'yyyy-mm-dd',
  '2026-1O-04',
];

/** Strings shaped `YYYY-MM-DD` that are not real Gregorian calendar dates. */
export const IMPOSSIBLE_DATES: readonly { readonly date: string; readonly why: string }[] = [
  { date: '2026-02-30', why: 'February has no 30th' },
  { date: '2025-02-29', why: '2025 is not a leap year' },
  { date: '1900-02-29', why: '1900 is not a leap year (century rule)' },
  { date: '2026-04-31', why: 'April has 30 days' },
  { date: '2026-13-01', why: 'there is no month 13' },
  { date: '2026-00-15', why: 'there is no month 0' },
  { date: '2026-01-00', why: 'there is no day 0' },
  { date: '2026-01-32', why: 'no month has 32 days' },
];

const originalTimeZone = process.env['TZ'];

/**
 * Freezes the clock at `instant` (an ISO instant with `Z`) and switches the local time zone of the
 * process to `timeZone`, so that the local calendar date can differ from the UTC one.
 */
export function setClock(instant: string, timeZone: string): void {
  process.env['TZ'] = timeZone;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(instant));
}

/** Restores the real clock and the original time zone. */
export function restoreClock(): void {
  vi.useRealTimers();
  if (originalTimeZone === undefined) {
    delete process.env['TZ'];
  } else {
    process.env['TZ'] = originalTimeZone;
  }
}
