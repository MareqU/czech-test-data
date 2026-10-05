// Independent oracle for birthNumber (rodné číslo), written from docs/rules/birthNumber.md only, never from
// src/. It decodes and validates exactly as the approved algorithm of section 2 with the decisions of
// section 8, so property tests can compare the library against it and check what generated values decode to.
import fc from 'fast-check';
import { addDays, utcDateOf } from './helpers.js';

/** The reason codes of section 2 in the precedence order of decision 7. */
export const BIRTH_NUMBER_REASONS = [
  'letters',
  'badFormat',
  'wrongLength',
  'impossibleDate',
  'badChecksum',
  'futureDate',
] as const;

export type OracleReason = (typeof BIRTH_NUMBER_REASONS)[number];

export type OracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: OracleReason };

export type OracleGender = 'male' | 'female';

/** A birth number whose characters, length and date are fine (steps 1–6); the checksum is not checked. */
export interface DecodedBirthNumber {
  /** The digits without the slash, 9 or 10 of them. */
  readonly digits: string;
  readonly hasSlash: boolean;
  readonly gender: OracleGender;
  /** Month encoded with +20 (men) or +70 (women), the additional series of § 13 odst. 5. */
  readonly additionalSeries: boolean;
  /** Birth date as `YYYY-MM-DD`, a real Gregorian date. */
  readonly date: string;
  readonly year: number;
  /** The ending (koncovka): 3 digits for 9-digit numbers, 4 for 10-digit ones. */
  readonly ending: string;
}

type Decoding = { readonly ok: true; readonly decoded: DecodedBirthNumber } | { readonly ok: false; readonly reason: OracleReason };

/** Fixed date ranges of section 9 (amendment A3). */
export const RANGES = {
  plain: { from: '1954-01-01', to: '2025-12-31' },
  additionalSeries: { from: '2004-04-01', to: '2025-12-31' },
  mod11Exception: { from: '1954-01-01', to: '1985-12-31' },
  nineDigit: { from: '1900-01-01', to: '1953-12-31' },
  futureDate: { from: '2040-01-01', to: '2053-12-31' },
  birthDateOption: { from: '1854-01-01', to: '2053-12-31' },
} as const;

/** Leap years 1956 … 2024 of the 10-digit leapDay range and 1904 … 1952 of the 9-digit one. */
export const LEAP_DAY_YEARS: readonly number[] = Array.from({ length: (2024 - 1904) / 4 + 1 }, (_, i) => 1904 + 4 * i);

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Step 1: letters, then any other character, then the slash position (decision 4). */
function checkCharacters(value: string): OracleReason | undefined {
  if (/\p{L}/u.test(value)) {
    return 'letters';
  }
  if (/[^0-9/]/.test(value)) {
    return 'badFormat';
  }
  const slashes = value.split('/').length - 1;
  if (slashes > 1 || (slashes === 1 && value.indexOf('/') !== 6)) {
    return 'badFormat';
  }
  return undefined;
}

/** Step 4: month and sex. +20/+70 only for 10 digits. */
function decodeMonth(encoded: number, length: number): { month: number; gender: OracleGender; additional: boolean } | undefined {
  const series = [
    { offset: 0, gender: 'male', additional: false },
    { offset: 50, gender: 'female', additional: false },
    { offset: 20, gender: 'male', additional: true },
    { offset: 70, gender: 'female', additional: true },
  ] as const;
  for (const { offset, gender, additional } of series) {
    const month = encoded - offset;
    if (month >= 1 && month <= 12 && (!additional || length === 10)) {
      return { month, gender, additional };
    }
  }
  return undefined;
}

/** Steps 1–6 of section 2: characters, length, month, century, calendar date. */
export function decodeSteps(value: string): Decoding {
  const characterFault = checkCharacters(value);
  if (characterFault !== undefined) {
    return { ok: false, reason: characterFault };
  }
  const digits = value.replace('/', '');
  if (digits.length !== 9 && digits.length !== 10) {
    return { ok: false, reason: 'wrongLength' };
  }
  const yy = Number(digits.slice(0, 2));
  const month = decodeMonth(Number(digits.slice(2, 4)), digits.length);
  const day = Number(digits.slice(4, 6));
  if (month === undefined) {
    return { ok: false, reason: 'impossibleDate' };
  }
  // Century (section 1): 9 digits 00–53 → 1900–1953, 54–99 → 1854–1899; 10 digits 00–53 → 2000–2053, 54–99 → 1954–1999.
  const century = digits.length === 9 ? (yy <= 53 ? 1900 : 1800) : yy <= 53 ? 2000 : 1900;
  const year = century + yy;
  if (day < 1 || day > daysInMonth(year, month.month)) {
    return { ok: false, reason: 'impossibleDate' };
  }
  return {
    ok: true,
    decoded: {
      digits,
      hasSlash: value.includes('/'),
      gender: month.gender,
      additionalSeries: month.additional,
      date: `${String(year)}-${pad2(month.month)}-${pad2(day)}`,
      year,
      ending: digits.slice(6),
    },
  };
}

/** Decodes a value that passes steps 1–6, or returns undefined. The checksum is not checked. */
export function decodeBirthNumber(value: string): DecodedBirthNumber | undefined {
  const decoding = decodeSteps(value);
  return decoding.ok ? decoding.decoded : undefined;
}

/** `N mod 11` of a digit string (at most 10 digits, exact in a JS number). */
export function mod11(digits: string): number {
  return Number(digits) % 11;
}

/** Step 7: 10 digits divisible by 11, or the remainder-10 exception for birth years 1954–1985. */
export function checksumHolds(decoded: DecodedBirthNumber): boolean {
  if (decoded.digits.length === 9) {
    return true;
  }
  return mod11(decoded.digits) === 0 || isMod11Exception(decoded);
}

/** `N9 mod 11 == 10`, last digit `0`, birth year 1954–1985 (section 3.2, decision 1). */
export function isMod11Exception(decoded: DecodedBirthNumber): boolean {
  return (
    decoded.digits.length === 10 &&
    mod11(decoded.digits.slice(0, 9)) === 10 &&
    decoded.digits.endsWith('0') &&
    decoded.year >= 1954 &&
    decoded.year <= 1985
  );
}

/** The whole algorithm of section 2 with the precedence of decision 7. */
export function oracleValidate(value: string, referenceDate: string): OracleResult {
  const decoding = decodeSteps(value);
  if (!decoding.ok) {
    return { valid: false, reason: decoding.reason };
  }
  if (!checksumHolds(decoding.decoded)) {
    return { valid: false, reason: 'badChecksum' };
  }
  if (decoding.decoded.date > referenceDate) {
    return { valid: false, reason: 'futureDate' };
  }
  return { valid: true };
}

/** The ten-digit number for a nine-digit prefix with the normal check digit `N9 mod 11`; throws for remainder 10. */
export function withCheckDigit(prefix9: string): string {
  const check = mod11(prefix9);
  if (check === 10) {
    throw new Error(`oracle: ${prefix9} has remainder 10, no normal check digit`);
  }
  return `${prefix9}${String(check)}`;
}

/** `min(a, b)` and `max(a, b)` for `YYYY-MM-DD` strings (fixed width, so string order is date order). */
export function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

export function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

/** Every real calendar date `from` … `to` (inclusive) as `YYYY-MM-DD`. */
export function dateArb(from: string, to: string): fc.Arbitrary<string> {
  return fc
    .date({ min: new Date(`${from}T00:00:00Z`), max: new Date(`${to}T00:00:00Z`), noInvalidDate: true })
    .map(utcDateOf);
}

/** The day after a `YYYY-MM-DD` date. */
export function nextDay(date: string): string {
  return addDays(date, 1);
}

/** Decodes a value that must pass steps 1–6; fails the test with the value in the message otherwise. */
export function decodeOrFail(value: string): DecodedBirthNumber {
  const decoded = decodeBirthNumber(value);
  if (decoded === undefined) {
    throw new Error(`expected a decodable birth number, got ${JSON.stringify(value)}`);
  }
  return decoded;
}

/** Whether `date` lies in `from` … `to` (inclusive); all `YYYY-MM-DD`. */
export function isWithin(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/** An ending made only of zeros (`/000`, `/0000`): valid, but never generated (decision 6). */
export function isZeroEnding(decoded: DecodedBirthNumber): boolean {
  return /^0+$/.test(decoded.ending);
}
