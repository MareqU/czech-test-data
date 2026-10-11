// Generator of valid birth numbers (rodné číslo) – docs/rules/birthNumber.md section 9 (options, fixed date
// ranges) and docs/rules/core.md amendment A3. Structure from § 13 odst. 3 and 4 zákona č. 133/2000 Sb.
// (https://www.zakonyprolidi.cz/cs/2000-133). The helpers below are shared with the validator and with the
// edge and invalid variants.
import { dateParts, fromDayNumber, isCalendarDate, pad, toDayNumber } from '../core/date.js';
import type { Random } from '../core/random.js';
import type { IdentifierContext } from '../core/types.js';

type BirthNumberGender = 'male' | 'female';

/**
 * Options of the birth number generator (volby generátoru rodného čísla).
 *
 * The generator throws `RangeError` naming the option for an unknown `gender` or a `birthDate` that is not a
 * calendar date from 1854-01-01 to 2053-12-31 or is after `referenceDate`.
 */
export interface BirthNumberOptions {
  /** `male` or `female` (women have the month increased by 50). Omitted: chosen at random. */
  readonly gender?: BirthNumberGender;
  /**
   * Birth date `YYYY-MM-DD` from 1854-01-01 to 2053-12-31, not after `referenceDate`. Before 1954 the number
   * has 9 digits, from 1954 on 10. Omitted: a random date from 1954-01-01 to 2025-12-31, cut at
   * `referenceDate`; if `referenceDate` is before 1954-01-01, that range is empty and the call throws
   * `RangeError` naming `referenceDate`.
   */
  readonly birthDate?: string;
}

/** A fixed range of birth dates (docs/rules/birthNumber.md section 9). */
interface DateRange {
  readonly from: string;
  readonly to: string;
}

/**
 * Month offsets of the series (section 1, month encoding): women +50 (§ 13 odst. 3); the additional series
 * +20 for men and +70 for women, 10-digit numbers only (§ 13 odst. 5, added by zákon č. 53/2004 Sb.,
 * https://www.zakonyprolidi.cz/cs/2004-53).
 */
export const MONTH_OFFSETS = { male: 0, female: 50, additionalMale: 20, additionalFemale: 70 } as const;

/** Default birth dates of the plain generator and the date-independent invalid variants. */
export const PLAIN_RANGE: DateRange = { from: '1954-01-01', to: '2025-12-31' };

// Dates the format can encode (section 1, century table).
const SUPPORTED_RANGE: DateRange = { from: '1854-01-01', to: '2053-12-31' };

// § 13 odst. 4: people born before 1 January 1954 have 9-digit numbers without a checksum.
const FIRST_TEN_DIGIT_DAY = '1954-01-01';

const GENDERS: readonly BirthNumberGender[] = ['male', 'female'];

/**
 * `RangeError` naming the option and its value. Messages are short to fit the per-identifier size budget
 * (Marek's variant B); the reason behind each check lives in the comments.
 */
export function optionError(name: string, value: unknown, expected: string): RangeError {
  return new RangeError(`${name} ${JSON.stringify(value)}: ${expected}`);
}

/**
 * The error for a fixed range that `referenceDate` leaves empty (amendment A3; birthNumber rules section 9).
 * A fixed range is never empty on its own, so the error names `referenceDate`.
 */
export function emptyRangeError(referenceDate: string): RangeError {
  return optionError('referenceDate', referenceDate, 'leaves no date in range');
}

/** A random date between two day numbers, both inclusive, one draw. */
export function drawDate(random: Random, fromDay: number, toDay: number, referenceDate: string): string {
  if (fromDay > toDay) {
    throw emptyRangeError(referenceDate);
  }
  return fromDayNumber(random.int(fromDay, toDay));
}

/** A random date of `range`, cut at `referenceDate` (amendment A3: upper bound = min(end, referenceDate)). */
export function drawDateUpTo(random: Random, range: DateRange, context: IdentifierContext): string {
  const toDay = Math.min(toDayNumber(range.to), toDayNumber(context.referenceDate));
  return drawDate(random, toDayNumber(range.from), toDay, context.referenceDate);
}

function monthOffsetOf(gender: BirthNumberGender): number {
  return gender === 'female' ? MONTH_OFFSETS.female : MONTH_OFFSETS.male;
}

/** Month offset of a randomly chosen gender: 0 for men, 50 for women. */
export function drawGenderOffset(random: Random): number {
  return monthOffsetOf(random.pick(GENDERS));
}

/** `RRMMDD` from a year, an already encoded month and a day; impossible months and days are kept as given. */
export function encodePrefix(year: number, encodedMonth: number, day: number): string {
  return `${pad(year % 100, 2)}${pad(encodedMonth, 2)}${pad(day, 2)}`;
}

/** `RRMMDD` of a birth date with the month increased by `monthOffset` (a value of {@link MONTH_OFFSETS}). */
export function datePrefix(date: string, monthOffset: number): string {
  const { year, month, day } = dateParts(date);
  return encodePrefix(year, month + monthOffset, day);
}

/**
 * A uniform value from 1 to `max` that is ≡ `residue` (mod 11), one draw. 0 is left out, so no zero
 * ending (`/000`, `/0000`) is ever generated (decision 6).
 */
export function drawCongruent(random: Random, residue: number, max: number): number {
  const first = residue === 0 ? 11 : residue;
  return first + 11 * random.int(0, Math.floor((max - first) / 11));
}

/**
 * A 4-digit ending that makes `prefix` + ending divisible by 11 (§ 13 odst. 3). Valid endings of one day
 * are 11 apart, as the MV ČR registry assigns them (*Zadání funkcionalit aplikace registru rodných čísel*,
 * section 6.3, https://archiv.mv.gov.cz/soubor/zd-aiseo-priloha-1-2-4-funkcionality-rrc-pdf.aspx). The check
 * digit is then `N9 mod 11` ≤ 9, so the result is never a mod11Exception.
 */
export function drawCheckedEnding(random: Random, prefix: string): string {
  const residue = (11 - ((Number(prefix) * 10_000) % 11)) % 11;
  return pad(drawCongruent(random, residue, 9999), 4);
}

/**
 * A valid birth number `RRMMDD/XXX(X)` for `date` and month offset: 9 digits with an ending 001–999 before
 * 1954 (§ 13 odst. 4), otherwise 10 digits divisible by 11 (§ 13 odst. 3).
 */
export function formatBirthNumber(random: Random, date: string, monthOffset: number): string {
  const prefix = datePrefix(date, monthOffset);
  const ending = date < FIRST_TEN_DIGIT_DAY ? pad(random.int(1, 999), 3) : drawCheckedEnding(random, prefix);
  return `${prefix}/${ending}`;
}

function checkGender(gender: BirthNumberGender | undefined): void {
  if (gender !== undefined && !GENDERS.includes(gender)) {
    throw optionError('gender', gender, 'male or female');
  }
}

// A calendar date the format can encode (SUPPORTED_RANGE, section 1) and not after referenceDate (section 9).
// Both sides are checked 4-digit `YYYY-MM-DD` dates, so string order is date order here.
function checkBirthDate(birthDate: string, context: IdentifierContext): string {
  if (!isCalendarDate(birthDate) || birthDate < SUPPORTED_RANGE.from || birthDate > SUPPORTED_RANGE.to) {
    throw optionError('birthDate', birthDate, 'YYYY-MM-DD in 1854–2053');
  }
  if (birthDate > context.referenceDate) {
    throw optionError('birthDate', birthDate, 'after referenceDate');
  }
  return birthDate;
}

/**
 * Generates a valid birth number (rodné číslo) with the slash. Draw order: birth date, gender, ending.
 * Never uses the additional series (+20/+70), the mod11Exception or a zero ending (section 9).
 */
export function generate(random: Random, options: BirthNumberOptions, context: IdentifierContext): string {
  checkGender(options.gender);
  const date =
    options.birthDate === undefined ? drawDateUpTo(random, PLAIN_RANGE, context) : checkBirthDate(options.birthDate, context);
  const monthOffset = options.gender === undefined ? drawGenderOffset(random) : monthOffsetOf(options.gender);
  return formatBirthNumber(random, date, monthOffset);
}

/** 9-digit numbers from 1900 on: the 1854–1899 mapping is valid but debatable (section 4). */
export const NINE_DIGIT_RANGE: DateRange = { from: '1900-01-01', to: '1953-12-31' };

/** A 9-digit number born 1900-01-01 … 1953-12-31, cut at `referenceDate`. */
export function pre1954(random: Random, context: IdentifierContext): string {
  return formatBirthNumber(random, drawDateUpTo(random, NINE_DIGIT_RANGE, context), drawGenderOffset(random));
}

/** A valid plain number from the plain range, the base of the date-independent invalid variants (section 9). */
export function plainNumber(random: Random, context: IdentifierContext): string {
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
