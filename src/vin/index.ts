// Subpath entry `czech-test-data/vin`: the VIN (identifikační číslo vozidla) – docs/rules/core.md section 5,
// docs/rules/vin.md sections 1, 2 and 9.
// Sources: Commission Implementing Regulation (EU) 2021/535, Annex II, Part 2 (https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj);
// 49 CFR Part 565 (https://www.law.cornell.edu/cfr/text/49/565.15).
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, NoOptions, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { VinEdgeVariant } from './edge.js';
import { vin } from './identifier.js';
import type { VinInvalidVariant } from './invalid.js';
import type { VinReason } from './validate.js';

export type { VinEdgeVariant, VinInvalidVariant, VinReason };

/**
 * Generator of VINs: call it for a valid VIN, `.edge()` for a valid edge case, `.invalid()` for an invalid one.
 * It takes no options.
 */
export type VinGenerator = IdentifierGenerator<NoOptions, VinEdgeVariant, VinInvalidVariant>;

/**
 * Creates a generator of VINs (identifikační číslo vozidla, vehicle identification number): 17 upper-case
 * letters and digits without `I`, `O`, `Q`, ISO 3779 structure, valid check digit in position 9 (the EU requires
 * it for every new registration from 7 July 2026). Plain values start with `TMB` (Škoda Auto); they are
 * test data and can coincide with the VIN of a real vehicle.
 *
 * Gives exactly the same values as `createCz(options).vin`.
 *
 * @example
 * ```ts
 * const vin = createVin({ seed: 42 });
 * vin();
 * vin.edge('checkDigitX');
 * vin.invalid('forbiddenLetter');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming the variant for an unknown `edge` or `invalid` name.
 */
export function createVin(options?: SettingsOptions): VinGenerator {
  return vin.create(resolveSettings(options));
}

/**
 * Validates a VIN: exactly 17 characters `0-9A-Z` without `I`, `O`, `Q`, the last four digits, a correct check
 * digit at position 9 (`0`-`9` or `X`), no trimming. The WMI, the model year and the plant are not checked.
 * Returns the first failing reason in the order `badFormat`, `wrongLength`, `forbiddenLetter`,
 * `nonNumericSerial`, `badChecksum`.
 *
 * The check digit is strict. A European VIN from before the check digit became mandatory (new types 2022, every
 * new registration 7 July 2026) can fail with `badChecksum` only, because that is the last check; an app that
 * must accept such VINs may accept that one reason.
 *
 * @example
 * ```ts
 * validateVin('1G4AH59H45G118341'); // { valid: true }
 * validateVin('TMBJR8NX4PY123456'); // { valid: false, reason: 'badChecksum' }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the VIN does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateVin(value: string, options?: ValidatorOptions): ValidationResult<VinReason> {
  return vin.validate(value, options);
}
