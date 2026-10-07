// Subpath entry `czech-test-data/ico`: the IČO (identifikační číslo osoby) – docs/rules/core.md section 5,
// docs/rules/ico.md.
// Source: zákon č. 111/2009 Sb. § 24–26 (no format); format from ARES, check digit confirmed by ARES records:
// https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/v3/api-docs
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, NoOptions, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { IcoEdgeVariant } from './edge.js';
import { ico } from './identifier.js';
import type { IcoInvalidVariant } from './invalid.js';
import type { IcoReason } from './validate.js';

export type { IcoEdgeVariant, IcoInvalidVariant, IcoReason };

/**
 * Generator of IČO (identifikační číslo osoby): call it for a valid number, `.edge()` for a valid edge
 * case, `.invalid()` for an invalid one. It takes no options.
 */
export type IcoGenerator = IdentifierGenerator<NoOptions, IcoEdgeVariant, IcoInvalidVariant>;

/**
 * Creates a generator of Czech IČO (identifikační číslo osoby), the 8-digit identification number of a
 * legal person or entrepreneur: 7 digits and a check digit, no separators. Generated numbers are
 * well-formed, but most are not registered in ARES.
 *
 * Gives exactly the same values as `createCz(options).ico`.
 *
 * @example
 * ```ts
 * const ico = createIco({ seed: 42 });
 * ico(); // 8 digits
 * ico.edge('leadingZeros');
 * ico.invalid('badChecksum');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming the variant for an unknown `edge` or `invalid` name.
 */
export function createIco(options?: SettingsOptions): IcoGenerator {
  return ico.create(resolveSettings(options));
}

/**
 * Validates a Czech IČO (identifikační číslo osoby): exactly 8 digits with the right check digit; no
 * trimming, no padding. Returns the first failing reason in the order `letters`, `badFormat`,
 * `wrongLength`, `badChecksum`.
 *
 * @example
 * ```ts
 * validateIco('00177041'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the IČO does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateIco(value: string, options?: ValidatorOptions): ValidationResult<IcoReason> {
  return ico.validate(value, options);
}
