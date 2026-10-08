// Subpath entry `czech-test-data/bankAccount`: the bank account number (číslo účtu).
// Source: vyhláška ČNB č. 169/2011 Sb. (https://www.zakonyprolidi.cz/cs/2011-169); bank codes: ČNB Číselník ČKPS.
import { resolveSettings } from '../core/settings.js';
import type { IdentifierGenerator, SettingsOptions, ValidationResult, ValidatorOptions } from '../core/types.js';
import type { BankAccountEdgeVariant } from './edge.js';
import type { BankAccountOptions } from './generate.js';
import { bankAccount } from './identifier.js';
import type { BankAccountInvalidVariant } from './invalid.js';
import type { BankAccountReason } from './validate.js';

export type { BankAccountEdgeVariant, BankAccountInvalidVariant, BankAccountOptions, BankAccountReason };

/**
 * Generator of bank account numbers (číslo účtu): call it for a valid number, `.edge()` for a valid edge
 * case, `.invalid()` for an invalid one.
 */
export type BankAccountGenerator = IdentifierGenerator<BankAccountOptions, BankAccountEdgeVariant, BankAccountInvalidVariant>;

/**
 * Creates a generator of Czech bank account numbers (číslo účtu) in the national format
 * `[prefix-]number/bankCode`; prefix (předčíslí) and number (základní část) pass the mod 11 check of
 * vyhláška 169/2011 Sb., the bank code (kód platebního styku) comes from a bundled ČNB snapshot.
 *
 * Gives exactly the same values as `createCz(options).bankAccount`.
 *
 * @example
 * ```ts
 * const account = createBankAccount({ seed: 42 });
 * account({ bankCode: '0800', withPrefix: true }); // e.g. '35-1234567899/0800'
 * account.edge('minLength');
 * account.invalid('unknownBankCode');
 * ```
 *
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC; unused).
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value. The returned generator throws
 * `RangeError` too, naming `bankCode` (unknown code), `withPrefix` (not a boolean) or the variant for an
 * unknown `edge` or `invalid` name.
 */
export function createBankAccount(options?: SettingsOptions): BankAccountGenerator {
  return bankAccount.create(resolveSettings(options));
}

/**
 * Validates a Czech bank account number (číslo účtu) written `[prefix-]number/bankCode`: strict separators
 * `-` and `/`, no trimming, both parts mod 11, bank code in the bundled ČNB snapshot. Returns the first failing
 * reason in the order `letters`, `badFormat`, `wrongLength`, `badChecksumPrefix`, `badChecksumNumber`,
 * `zeroNumber`, `unknownBankCode`.
 *
 * @example
 * ```ts
 * validateBankAccount('13717-77628031/0710'); // { valid: true }
 * ```
 * @param value - Any string; never throws because of it.
 * @param options - Accepted for symmetry with other validators; the account does not depend on the date.
 * @throws RangeError naming `referenceDate` if that option is not a calendar date `YYYY-MM-DD`.
 */
export function validateBankAccount(value: string, options?: ValidatorOptions): ValidationResult<BankAccountReason> {
  return bankAccount.validate(value, options);
}
