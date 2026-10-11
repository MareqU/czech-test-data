// Subpath entry `czech-test-data/iban`: the Czech account number in the international format (číslo účtu ve
// formátu IBAN) – iban rules, sections 1, 2 and 9.
// Source: vyhláška ČNB č. 169/2011 Sb., § 4 (https://www.zakonyprolidi.cz/cs/2011-169); ISO 13616 via ECBS EBS204.
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { IbanEdgeVariant } from './edge.js';
import type { IbanOptions } from './generate.js';
import { iban } from './identifier.js';
import type { IbanInvalidVariant } from './invalid.js';
import type { IbanReason } from './validate.js';

export type { IbanEdgeVariant, IbanInvalidVariant, IbanOptions, IbanReason };

/**
 * Generator of Czech IBANs (číslo účtu ve formátu IBAN): call it for a valid IBAN, `.edge()` for a valid
 * edge case, `.invalid()` for an invalid one.
 */
export type IbanGenerator = IdentifierGenerator<IbanOptions, IbanEdgeVariant, IbanInvalidVariant>;

/**
 * Creates a generator of Czech IBANs (číslo účtu ve formátu IBAN): `CZ`, two check digits (ISO 7064 MOD 97-10),
 * the 4-digit bank code, a 6-digit prefix and a 10-digit number, zero-padded, 24 characters, upper case. The
 * embedded account is a valid bankAccount value. The `lowercase` edge variant is disputed: official sources
 * require upper case.
 *
 * Gives exactly the same values as `createCz(options).iban`.
 *
 * @example
 * ```ts
 * const iban = createIban({ seed: 42 });
 * iban({ account: '19-2000145399/0800' }); // 'CZ6508000000192000145399'
 * iban.edge('withSpaces');
 * iban.invalid('wrongCountry');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming `bankCode`, `withPrefix`, `account` (invalid, or combined with another option) or
 * the variant for an unknown `edge` or `invalid` name.
 */
export function createIban(options?: SettingsOptions): IbanGenerator {
  return iban.create(resolveSettings(options));
}

/**
 * Validates a Czech IBAN, electronic (`CZ6508000000192000145399`) or written (groups of 4, one space), no
 * trimming. Returns the first failing reason in the order `badFormat`, `wrongCountry`, `letters`, `wrongLength`,
 * `badChecksum`, then the bankAccount reasons of the embedded account (`badChecksumPrefix`, `badChecksumNumber`,
 * `zeroNumber`, `unknownBankCode`). The country code is case-insensitive.
 *
 * @example
 * ```ts
 * validateIban('CZ65 0800 0000 1920 0014 5399'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the IBAN does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateIban(value: string, options?: ValidatorOptions): ValidationResult<IbanReason> {
  return iban.validate(value, options);
}
