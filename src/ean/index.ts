// Subpath entry `czech-test-data/ean`: the EAN of an electricity supply point (EAN odběrného místa) –
// docs/rules/core.md section 5, docs/rules/ean.md sections 1, 2 and 9.
// Source: vyhláška č. 408/2015 Sb., § 16 (https://www.zakonyprolidi.cz/cs/2015-408).
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { EanEdgeVariant } from './edge.js';
import type { EanDistributor, EanOptions } from './generate.js';
import { ean } from './identifier.js';
import type { EanInvalidVariant } from './invalid.js';
import type { EanReason } from './validate.js';

export type { EanDistributor, EanEdgeVariant, EanInvalidVariant, EanOptions, EanReason };

/**
 * Generator of electricity EANs (EAN odběrného místa): call it for a valid EAN, `.edge()` for a valid edge
 * case, `.invalid()` for an invalid one.
 */
export type EanGenerator = IdentifierGenerator<EanOptions, EanEdgeVariant, EanInvalidVariant>;

/**
 * Creates a generator of Czech electricity EANs (EAN odběrného místa, EAN OPM): 18 digits, fixed part `8591824`,
 * network and supply point digits, GS1 check digit. It identifies a supply point, it is not a product
 * EAN-13/GTIN barcode.
 *
 * Gives exactly the same values as `createCz(options).ean`.
 *
 * @example
 * ```ts
 * const ean = createEan({ seed: 42 });
 * ean({ distributor: 'cez' });
 * ean.edge('lds');
 * ean.invalid('wrongPrefix');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming `distributor` or the variant for an unknown `edge` or `invalid` name.
 */
export function createEan(options?: SettingsOptions): EanGenerator {
  return ean.create(resolveSettings(options));
}

/**
 * Validates an electricity EAN: exactly 18 ASCII digits starting `8591824` with a correct GS1 check digit,
 * no trimming. Returns the first failing reason in the order `letters`, `badFormat`, `wrongLength`,
 * `wrongPrefix`, `badChecksum`.
 *
 * @example
 * ```ts
 * validateEan('859182412340000003'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the EAN does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateEan(value: string, options?: ValidatorOptions): ValidationResult<EanReason> {
  return ean.validate(value, options);
}
