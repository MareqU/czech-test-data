// Subpath entry `czech-test-data/dic`: the DIČ (daňové identifikační číslo).
// Source: § 130 zákona č. 280/2009 Sb., daňový řád (https://www.zakonyprolidi.cz/cs/2009-280).
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { DicEdgeVariant } from './edge.js';
import { dic } from './identifier.js';
import type { DicOptions } from './generate.js';
import type { DicInvalidVariant } from './invalid.js';
import type { DicReason } from './validate.js';

export type { DicEdgeVariant, DicInvalidVariant, DicOptions, DicReason };

/**
 * Generator of DIČ (daňové identifikační číslo): call it for a valid number, `.edge()` for a valid edge
 * case, `.invalid()` for an invalid one.
 */
export type DicGenerator = IdentifierGenerator<DicOptions, DicEdgeVariant, DicInvalidVariant>;

/**
 * Creates a generator of Czech DIČ (daňové identifikační číslo), the tax identification number: `CZ` and
 * 8 digits (IČO of a legal person), 10 digits (birth number of a natural person, no slash) or 9 digits
 * (older birth number, or an assigned number starting with 6, e.g. a VAT group). Generated numbers are
 * well-formed, but not registered. Plain values are IČO or birth number DIČ only.
 *
 * Gives exactly the same values as `createCz(options).dic`.
 *
 * @example
 * ```ts
 * const dic = createDic({ seed: 42 });
 * dic({ from: 'ico' }); // 'CZ' + 8 digits
 * dic({ gender: 'female', birthDate: '1990-05-01' }); // 'CZ' + birth number
 * dic.edge('vatGroup');
 * dic.invalid('foreignPrefix');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming `from`, `gender` or `birthDate` for an invalid option, or the variant for an unknown name.
 */
export function createDic(options?: SettingsOptions): DicGenerator {
  return dic.create(resolveSettings(options));
}

/**
 * Validates a complete Czech DIČ (daňové identifikační číslo): `CZ` (any letter case) and 8–10 digits, no
 * trimming. Returns the first failing reason in the order `missingPrefix` / `foreignPrefix` / `badFormat`
 * (prefix), `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `badInnerChecksum`, `futureDate`.
 * A value without `CZ` (as in the kontrolní hlášení) is `missingPrefix`; validate such a kmenová část
 * with the IČO or birth number validator. Registration is not checked.
 *
 * @example
 * ```ts
 * validateDic('CZ00177041'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - `referenceDate` ("today", default the current UTC date) for the `futureDate` check.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateDic(value: string, options?: ValidatorOptions): ValidationResult<DicReason> {
  return dic.validate(value, options);
}
