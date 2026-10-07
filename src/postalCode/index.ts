// Subpath entry `czech-test-data/postalCode`: the postal code (PSČ) – docs/rules/postalCode.md.
// Source: Česká pošta, s.p.; format from the UPU sheet for the Czech Republic (02/2018):
// https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/czeEn.pdf
import { defineIdentifier } from '../core/identifier.js';
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, NoOptions, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { PostalCodeEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import { invalid } from './invalid.js';
import type { PostalCodeInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { PostalCodeReason } from './validate.js';

export type { PostalCodeEdgeVariant, PostalCodeInvalidVariant, PostalCodeReason };

/**
 * Generator of postal codes (poštovní směrovací číslo, PSČ): call it for a valid code, `.edge()` for a valid
 * edge case, `.invalid()` for an invalid one. It takes no options.
 */
export type PostalCodeGenerator = IdentifierGenerator<NoOptions, PostalCodeEdgeVariant, PostalCodeInvalidVariant>;

const postalCode = defineIdentifier({ id: 'postalCode', generate, validate, edge, invalid });

/**
 * Creates a generator of Czech postal codes (poštovní směrovací číslo, PSČ), the five-digit routing code
 * assigned by Česká pošta, written `NNN NN`. Generated codes are well-formed, but most do not exist.
 *
 * Gives exactly the same values as `createCz(options).postalCode`.
 *
 * @example
 * ```ts
 * const postalCode = createPostalCode({ seed: 42 });
 * postalCode(); // '514 24'
 * postalCode.edge('withoutSpace');
 * postalCode.invalid('foreignRange');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming the variant for an unknown `edge` or `invalid` name.
 */
export function createPostalCode(options?: SettingsOptions): PostalCodeGenerator {
  return postalCode.create(resolveSettings(options));
}

/**
 * Validates a Czech postal code (PSČ), with or without the space after the third digit. Checks the format
 * only, not whether Česká pošta assigned the code. Returns the first failing reason in the order `letters`,
 * `badFormat`, `wrongLength`, `foreignRange` (first digit 0, 8 or 9 is Slovak).
 *
 * @example
 * ```ts
 * validatePostalCode('948 01'); // { valid: false, reason: 'foreignRange' }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the PSČ does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validatePostalCode(value: string, options?: ValidatorOptions): ValidationResult<PostalCodeReason> {
  return postalCode.validate(value, options);
}
