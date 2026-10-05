// createCz, the all-in-one entry point – docs/rules/core.md section 3.
import { createBirthNumber, validateBirthNumber } from './birthNumber/index.js';
import type { BirthNumberGenerator, BirthNumberReason } from './birthNumber/index.js';
import { resolveSettings } from './core/settings.js';
import type { SettingsOptions, ValidationResult } from './core/types.js';

/**
 * Validators of one {@link Cz} instance; date-dependent rules use the instance's `referenceDate`.
 */
export interface CzValidators {
  /** Validates a birth number (rodné číslo) with `referenceDate` of this instance. Never throws. */
  readonly birthNumber: (value: string) => ValidationResult<BirthNumberReason>;
}

/**
 * Czech test data (české testovací údaje) for one seed, returned by {@link createCz}.
 */
export interface Cz {
  /** The seed in use; pass it back to `createCz({ seed, referenceDate })` to reproduce the same values. */
  readonly seed: number;
  /** The reference date ("today", `YYYY-MM-DD`) in use; given, or the UTC date when `createCz` ran. */
  readonly referenceDate: string;
  /** Birth numbers (rodné číslo); the same values as `createBirthNumber` with the same settings. */
  readonly birthNumber: BirthNumberGenerator;
  /** Validators by identifier. */
  readonly validate: CzValidators;
}

/**
 * Creates the entry point for Czech test data (české testovací údaje): valid, edge-case and invalid
 * values of Czech identifiers, all derived from one seed.
 *
 * Same package major version + same seed + same sequence of calls = same output; for date-dependent
 * variants also the same `referenceDate` (docs/rules/core.md section 2).
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
    birthNumber: createBirthNumber(settings),
    validate: Object.freeze({
      birthNumber: (value: string) => validateBirthNumber(value, { referenceDate }),
    }),
  };
}
