// Subpath entry `czech-test-data/birthNumber`: the birth number (rodné číslo) – docs/rules/core.md section 5,
// docs/rules/birthNumber.md. Legal basis: § 13 zákona č. 133/2000 Sb., o evidenci obyvatel a rodných číslech.
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { BirthNumberEdgeVariant } from './edge.js';
import type { BirthNumberOptions } from './generate.js';
import type { BirthNumberInvalidVariant } from './invalid.js';
import { birthNumber } from './identifier.js';
import type { BirthNumberReason } from './validate.js';

export type { BirthNumberEdgeVariant, BirthNumberInvalidVariant, BirthNumberOptions, BirthNumberReason };

/**
 * Generator of birth numbers (rodné číslo): call it for a valid number, `.edge()` for a valid edge case,
 * `.invalid()` for an invalid one.
 */
export type BirthNumberGenerator = IdentifierGenerator<BirthNumberOptions, BirthNumberEdgeVariant, BirthNumberInvalidVariant>;

/**
 * Creates a generator of Czech birth numbers (rodné číslo), the personal identifier assigned by the
 * Ministry of the Interior under § 13 zákona č. 133/2000 Sb. It encodes the birth date and sex.
 *
 * Gives exactly the same values as `createCz(options).birthNumber` (docs/rules/core.md section 2).
 *
 * The returned generator throws `RangeError` too:
 * - naming `gender` or `birthDate` for an invalid option (see {@link BirthNumberOptions});
 * - naming `referenceDate` when `referenceDate` leaves the fixed date range of the call empty
 *   (docs/rules/birthNumber.md section 9). For example, with `referenceDate` before 1954-01-01 every plain
 *   call without `birthDate` throws; `edge('month+20')` needs 2004-04-01 or later; `invalid('futureDate')`
 *   needs a `referenceDate` before 2053-12-31;
 * - naming the variant for an unknown `edge` or `invalid` variant name.
 *
 * @example
 * ```ts
 * const birthNumber = createBirthNumber({ seed: 42 });
 * birthNumber({ gender: 'female', birthDate: '1990-05-01' }); // '905501/XXXX'
 * birthNumber.edge('month+20');
 * birthNumber.invalid('badChecksum');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value.
 */
export function createBirthNumber(options?: SettingsOptions): BirthNumberGenerator {
  return birthNumber.create(resolveSettings(options));
}

/**
 * Validates a Czech birth number (rodné číslo), with or without the slash. Returns the first failing reason
 * in the order `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `badChecksum`, `futureDate`.
 *
 * @example
 * ```ts
 * validateBirthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - `referenceDate` ("today", default the current UTC date) for the `futureDate` check.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateBirthNumber(value: string, options?: ValidatorOptions): ValidationResult<BirthNumberReason> {
  return birthNumber.validate(value, options);
}
