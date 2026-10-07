// Subpath entry `czech-test-data/phone`: the phone number (telefonní číslo) – docs/rules/core.md section 5,
// docs/rules/phone.md. Legal basis: vyhláška č. 117/2007 Sb., o číslovacích plánech sítí a služeb
// elektronických komunikací. Generated valid numbers may belong to real subscribers: never call or text them.
import { defineIdentifier } from '../core/identifier.js';
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import { edge } from './edge.js';
import type { PhoneEdgeVariant } from './edge.js';
import { generate } from './generate.js';
import type { PhoneOptions } from './generate.js';
import { invalid } from './invalid.js';
import type { PhoneInvalidVariant } from './invalid.js';
import { validate } from './validate.js';
import type { PhoneReason } from './validate.js';

export type { PhoneEdgeVariant, PhoneInvalidVariant, PhoneOptions, PhoneReason };

/**
 * Generator of phone numbers (telefonní číslo): call it for a valid number, `.edge()` for a valid edge case,
 * `.invalid()` for an invalid one.
 */
export type PhoneGenerator = IdentifierGenerator<PhoneOptions, PhoneEdgeVariant, PhoneInvalidVariant>;

const phone = defineIdentifier({ id: 'phone', generate, validate, edge, invalid });

/**
 * Creates a generator of Czech phone numbers (telefonní číslo) from the national numbering plan set by the
 * Czech Telecommunication Office (ČTÚ). Plain calls give mobile numbers `+420 ddd ddd ddd`; pass
 * `{ type: 'fixed' }` for fixed lines. The numbering plan has no range reserved for tests, so a valid number
 * may belong to a real subscriber.
 *
 * Gives exactly the same values as `createCz(options).phone` (docs/rules/core.md section 2).
 *
 * @example
 * ```ts
 * const phone = createPhone({ seed: 42 });
 * phone(); // '+420 606 367 819'
 * phone({ type: 'fixed' });
 * phone.edge('withoutSpaces');
 * phone.invalid('unknownPrefix');
 * ```
 * @param options - Optional `seed` (default: random) and `referenceDate` (ignored by phone).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value; the generator throws naming
 * `type` for an invalid option and naming the variant for an unknown variant name.
 */
export function createPhone(options?: SettingsOptions): PhoneGenerator {
  return phone.create(resolveSettings(options));
}

/**
 * Validates a Czech phone number in the forms `+420 601 123 456`, `+420601123456`, `00420…` and the national
 * `601 123 456` / `601123456`. Returns the first failing reason in the order `letters`, `badFormat`,
 * `wrongCountryCode`, `wrongLength`, `badFormat`, `specialPrefix` / `unknownPrefix`.
 *
 * @example
 * ```ts
 * validatePhone('+420 900 123 456'); // { valid: false, reason: 'specialPrefix' }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - `referenceDate` is accepted and ignored: phone numbers do not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validatePhone(value: string, options?: ValidatorOptions): ValidationResult<PhoneReason> {
  return phone.validate(value, options);
}
