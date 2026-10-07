// Generator of valid DIČ (rules for dic, sections 1, 2.4 and 8). Law: § 130 zákona č. 280/2009 Sb., daňový řád
// (https://www.zakonyprolidi.cz/cs/2009-280): "CZ" + IČO, birth number or an assigned number.
// Inner values come from ico and birthNumber (fine-grained imports, decision 1) and the dic stream.
import { generate as generateBirthNumber } from '../birthNumber/generate.js';
import type { BirthNumberOptions } from '../birthNumber/generate.js';
import { weightedSum } from '../core/checksum.js';
import type { Random } from '../core/random.js';
import type { IdentifierContext } from '../core/types.js';
import { generate as generateIco } from '../ico/generate.js';

/**
 * Options of the DIČ generator (volby generátoru DIČ): `from: 'ico'` alone, or a birth number DIČ with an
 * optional `gender` and `birthDate` (which imply `from: 'birthNumber'`). `birthDate` must be from 1900-01-01,
 * because 9-digit birth numbers of the 1860s would read as assigned numbers. Omitted entirely: IČO or birth
 * number, chosen at random. The generator throws `RangeError` naming the option for an unknown `from`,
 * `gender` or `birthDate`, or for `gender` / `birthDate` combined with `from: 'ico'`.
 */
export type DicOptions =
  | { readonly from: 'ico'; readonly gender?: never; readonly birthDate?: never }
  | {
      readonly from?: 'birthNumber';
      readonly gender?: 'male' | 'female';
      readonly birthDate?: string;
    };

/** Prefix of a complete DIČ (§ 130 odst. 1 daňového řádu; Directive 2006/112/EC art. 215: ISO 3166 alpha-2). */
export const PREFIX = 'CZ';

// d2–d8 of an assigned number; the leading 6 is not weighted (python-stdnum, confirmed by ARES records).
const ASSIGNED_WEIGHTS: readonly number[] = [8, 7, 6, 5, 4, 3, 2];
const MIN_BIRTH_DATE = '1900-01-01';

interface WideOptions {
  readonly from?: string;
  readonly gender?: unknown;
  readonly birthDate?: string;
}

/** Appends the check digit `(a + 8) mod 10` (a = S mod 11) to the first 8 digits of an assigned number. */
export function withAssignedCheckDigit(first8: string): string {
  return `${first8}${String(((weightedSum(first8.slice(1), ASSIGNED_WEIGHTS) % 11) + 8) % 10)}`;
}

/** Removes the slash of a birth number; a DIČ never contains one. */
export function withoutSlash(birthNumber: string): string {
  return birthNumber.replace('/', '');
}

/** A generated birth number without slash. */
export function plainBirthNumber(random: Random, context: IdentifierContext, options: BirthNumberOptions = {}): string {
  return withoutSlash(generateBirthNumber(random, options, context));
}

/** The plain inner part: form draw `int(0, 1)` (0 = IČO, 1 = birth number), then that generator. */
export function plainInner(random: Random, context: IdentifierContext): string {
  return random.int(0, 1) === 0 ? generateIco(random) : plainBirthNumber(random, context);
}

function checkFrom({ from, gender, birthDate }: WideOptions): void {
  if (from === 'ico') {
    if (gender !== undefined) {
      throw new RangeError('gender is not allowed with from "ico"');
    }
    if (birthDate !== undefined) {
      throw new RangeError('birthDate is not allowed with from "ico"');
    }
  } else if (from !== undefined && from !== 'birthNumber') {
    throw new RangeError(`from ${JSON.stringify(from)}: ico or birthNumber`);
  }
}

/** Generates a valid DIČ: `CZ` + IČO or birth number, no separators. */
export function generate(random: Random, options: DicOptions, context: IdentifierContext): string {
  checkFrom(options);
  if (options.from === 'ico') {
    return `${PREFIX}${generateIco(random)}`;
  }
  const { gender, birthDate } = options;
  if (options.from === undefined && gender === undefined && birthDate === undefined) {
    return `${PREFIX}${plainInner(random, context)}`;
  }
  if (birthDate !== undefined && birthDate < MIN_BIRTH_DATE) {
    throw new RangeError(`birthDate ${JSON.stringify(birthDate)}: not before ${MIN_BIRTH_DATE}`);
  }
  return `${PREFIX}${plainBirthNumber(random, context, {
    ...(gender === undefined ? {} : { gender }),
    ...(birthDate === undefined ? {} : { birthDate }),
  })}`;
}
