// Subpath entry `czech-test-data/eic`: the EIC of a gas supply point (EIC kód odběrného místa plynu) –
// docs/rules/core.md section 5, docs/rules/eic.md sections 1, 2 and 9.
// Sources: ENTSO-E EIC Data Exchange Implementation Guide v1.2, § 5.3
// (https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/cim_based/EIC_Data_Exchange_IG_v1.2.pdf);
// vyhláška č. 349/2015 Sb., § 2 a § 5 (https://www.zakonyprolidi.cz/cs/2015-349).
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, NoOptions, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { EicEdgeVariant } from './edge.js';
import { eic } from './identifier.js';
import type { EicInvalidVariant } from './invalid.js';
import type { EicReason } from './validate.js';

export type { EicEdgeVariant, EicInvalidVariant, EicReason };

/**
 * Generator of gas supply point EICs: call it for a valid EIC, `.edge()` for a valid edge case, `.invalid()`
 * for an invalid one. It takes no options.
 */
export type EicGenerator = IdentifierGenerator<NoOptions, EicEdgeVariant, EicInvalidVariant>;

/**
 * Creates a generator of Czech gas supply point EICs (EIC kód odběrného místa plynu): 16 characters (digits,
 * capital letters and `-`), prefix `27ZG`, ENTSO-E check character. The values are test data, not allocated codes.
 *
 * Gives exactly the same values as `createCz(options).eic`.
 *
 * @example
 * ```ts
 * const eic = createEic({ seed: 42 });
 * eic();
 * eic.edge('lds');
 * eic.invalid('dashCheckCharacter');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming the variant for an unknown `edge` or `invalid` name.
 */
export function createEic(options?: SettingsOptions): EicGenerator {
  return eic.create(resolveSettings(options));
}

/**
 * Validates a gas supply point EIC: exactly 16 characters `0-9A-Z-` starting `27ZG` with a correct ENTSO-E
 * check character (never `-`), no trimming. Returns the first failing reason in the order `badFormat`,
 * `wrongLength`, `wrongPrefix`, `dashCheckCharacter`, `badChecksum`.
 *
 * @example
 * ```ts
 * validateEic('27ZG100Z0000001K'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the EIC does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateEic(value: string, options?: ValidatorOptions): ValidationResult<EicReason> {
  return eic.validate(value, options);
}
