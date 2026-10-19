// createCz, the all-in-one entry point – docs/rules/core.md section 3.
import { validateBankAccount } from './bankAccount/index.js';
import { bankAccount } from './bankAccount/identifier.js';
import type { BankAccountGenerator, BankAccountReason } from './bankAccount/index.js';
import { validateBirthNumber } from './birthNumber/index.js';
import { birthNumber } from './birthNumber/identifier.js';
import type { BirthNumberGenerator, BirthNumberReason } from './birthNumber/index.js';
import { validateDic } from './dic/index.js';
import { dic } from './dic/identifier.js';
import type { DicGenerator, DicReason } from './dic/index.js';
import { validateEan } from './ean/index.js';
import { ean } from './ean/identifier.js';
import type { EanGenerator, EanReason } from './ean/index.js';
import { validateEic } from './eic/index.js';
import { eic } from './eic/identifier.js';
import type { EicGenerator, EicReason } from './eic/index.js';
import { validateIban } from './iban/index.js';
import { iban } from './iban/identifier.js';
import type { IbanGenerator, IbanReason } from './iban/index.js';
import { validateIco } from './ico/index.js';
import { ico } from './ico/identifier.js';
import type { IcoGenerator, IcoReason } from './ico/index.js';
import { validatePhone } from './phone/index.js';
import { phone } from './phone/identifier.js';
import type { PhoneGenerator, PhoneReason } from './phone/index.js';
import { validatePostalCode } from './postalCode/index.js';
import { postalCode } from './postalCode/identifier.js';
import type { PostalCodeGenerator, PostalCodeReason } from './postalCode/index.js';
import { resolveSettings } from './core/settings.js';
import type { SettingsOptions, ValidationResult } from './core/types.js';

/**
 * Validators of one {@link Cz} instance; date-dependent rules use the instance's `referenceDate`.
 */
export interface CzValidators {
  /** Validates a bank account number (číslo účtu); the date plays no role. Never throws. */
  readonly bankAccount: (value: string) => ValidationResult<BankAccountReason>;
  /** Validates a birth number (rodné číslo) with `referenceDate` of this instance. Never throws. */
  readonly birthNumber: (value: string) => ValidationResult<BirthNumberReason>;
  /** Validates a complete DIČ with `referenceDate` of this instance. Never throws. */
  readonly dic: (value: string) => ValidationResult<DicReason>;
  /** Validates an electricity EAN (EAN odběrného místa); the date plays no role. Never throws. */
  readonly ean: (value: string) => ValidationResult<EanReason>;
  /** Validates a gas supply point EIC (EIC kód odběrného místa plynu); the date plays no role. Never throws. */
  readonly eic: (value: string) => ValidationResult<EicReason>;
  /** Validates a Czech IBAN; the date plays no role. Never throws. */
  readonly iban: (value: string) => ValidationResult<IbanReason>;
  /** Validates an IČO; the date plays no role, `referenceDate` is only passed on. Never throws. */
  readonly ico: (value: string) => ValidationResult<IcoReason>;
  /**
   * Validates a phone number (telefonní číslo); the date plays no role, `referenceDate` is only passed on.
   * Never throws.
   */
  readonly phone: (value: string) => ValidationResult<PhoneReason>;
  /** Validates a postal code (PSČ); the date plays no role, `referenceDate` is only passed on. Never throws. */
  readonly postalCode: (value: string) => ValidationResult<PostalCodeReason>;
}

/**
 * Czech test data (české testovací údaje) for one seed, returned by {@link createCz}.
 */
export interface Cz {
  /** The seed in use; pass it back to `createCz({ seed, referenceDate })` to reproduce the same values. */
  readonly seed: number;
  /** The reference date ("today", `YYYY-MM-DD`) in use; given, or the UTC date when `createCz` ran. */
  readonly referenceDate: string;
  /** Bank account numbers (číslo účtu); the same values as `createBankAccount` with the same settings. */
  readonly bankAccount: BankAccountGenerator;
  /** Birth numbers (rodné číslo); the same values as `createBirthNumber` with the same settings. */
  readonly birthNumber: BirthNumberGenerator;
  /** DIČ (daňové identifikační číslo); the same values as `createDic` with the same settings. */
  readonly dic: DicGenerator;
  /** Electricity EANs (EAN odběrného místa); the same values as `createEan` with the same settings. */
  readonly ean: EanGenerator;
  /** Gas supply point EICs (EIC kód odběrného místa plynu); the same values as `createEic` with the same settings. */
  readonly eic: EicGenerator;
  /** Czech IBANs (číslo účtu ve formátu IBAN); the same values as `createIban` with the same settings. */
  readonly iban: IbanGenerator;
  /** IČO (identifikační číslo osoby); the same values as `createIco` with the same settings. */
  readonly ico: IcoGenerator;
  /** Phone numbers (telefonní číslo); the same values as `createPhone` with the same settings. */
  readonly phone: PhoneGenerator;
  /** Postal codes (poštovní směrovací číslo, PSČ); the same values as `createPostalCode` with the same settings. */
  readonly postalCode: PostalCodeGenerator;
  /** Validators by identifier. */
  readonly validate: CzValidators;
}

/**
 * Creates the entry point for Czech test data (české testovací údaje): valid, edge-case and invalid
 * values of Czech identifiers, all derived from one seed.
 *
 * Same package major version + same seed + same sequence of calls = same output; for date-dependent
 * variants also the same `referenceDate` (docs/rules/core.md section 2).
 * A minor version may add variants, which can change `edge()` and `invalid()` without a variant name and the
 * values after them (amendment A5); calls with a variant name stay stable.
 *
 * @example
 * ```ts
 * const cz = createCz({ seed: 42 });
 * cz.birthNumber({ gender: 'female' });
 * cz.validate.birthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }
 * ```
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC).
 * @throws RangeError if `seed` is not an integer from 0 to 2^32 − 1, or `referenceDate` is not a real
 * calendar date written as `YYYY-MM-DD`.
 */
export function createCz(options?: SettingsOptions): Cz {
  // Resolved once, so every identifier on this instance shares the same seed and date (amendment A1).
  // Each identifier has its own stream, so the order of creation does not matter (section 2).
  const settings = resolveSettings(options);
  const { seed, referenceDate } = settings;
  return {
    seed,
    referenceDate,
    bankAccount: bankAccount.create(settings),
    birthNumber: birthNumber.create(settings),
    dic: dic.create(settings),
    ean: ean.create(settings),
    eic: eic.create(settings),
    iban: iban.create(settings),
    ico: ico.create(settings),
    phone: phone.create(settings),
    postalCode: postalCode.create(settings),
    validate: Object.freeze({
      bankAccount: (value: string) => validateBankAccount(value, { referenceDate }),
      birthNumber: (value: string) => validateBirthNumber(value, { referenceDate }),
      dic: (value: string) => validateDic(value, { referenceDate }),
      ean: (value: string) => validateEan(value, { referenceDate }),
      eic: (value: string) => validateEic(value, { referenceDate }),
      iban: (value: string) => validateIban(value, { referenceDate }),
      ico: (value: string) => validateIco(value, { referenceDate }),
      phone: (value: string) => validatePhone(value, { referenceDate }),
      postalCode: (value: string) => validatePostalCode(value, { referenceDate }),
    }),
  };
}
