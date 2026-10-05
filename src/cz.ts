// createCz, the all-in-one entry point – docs/rules/core.md section 3.
import { resolveSettings } from './core/settings.js';
import type { SettingsOptions } from './core/types.js';

/**
 * Czech test data (české testovací údaje) for one seed, returned by {@link createCz}.
 */
export interface Cz {
  /** The seed in use; pass it back to `createCz({ seed, referenceDate })` to reproduce the same values. */
  readonly seed: number;
  /** The reference date ("today", `YYYY-MM-DD`) in use; given, or the UTC date when `createCz` ran. */
  readonly referenceDate: string;
  /** Validators by identifier. Empty until the first identifiers arrive (M2). */
  readonly validate: Readonly<Record<string, never>>;
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
 * cz.seed; // 42
 * ```
 * @param options - Optional `seed` (default: random) and `referenceDate` (default: today in UTC).
 * @throws RangeError if `seed` is not an integer from 0 to 2^32 − 1, or `referenceDate` is not a real
 * calendar date written as `YYYY-MM-DD`.
 */
export function createCz(options?: SettingsOptions): Cz {
  // Resolved once, so every identifier on this instance shares the same seed and date (amendment A1).
  const { seed, referenceDate } = resolveSettings(options);
  return { seed, referenceDate, validate: Object.freeze({}) };
}
