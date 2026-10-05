// Settings resolution and the clock – docs/rules/core.md section 3 (amendment A1).
import { isCalendarDate } from './date.js';
import { assertSeed } from './random.js';
import type { Settings, SettingsOptions } from './types.js';

// src/ has no DOM or Node.js types; this is the one Web Crypto function the core uses
// (docs/rules/core.md section 3). It is a global in Node.js >= 19 and in browsers.
interface WebCrypto {
  getRandomValues(array: Uint8Array): Uint8Array;
}

function randomSeed(): number {
  // Looked up on every call, not at module load, and never Math.random (decision Q1).
  const { crypto } = globalThis as typeof globalThis & { readonly crypto: WebCrypto };
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
}

/**
 * The current date in UTC as `YYYY-MM-DD`.
 *
 * The only clock read in `src/` (docs/rules/core.md section 3). UTC, so the default reference date does
 * not depend on the machine's time zone (amendment A1).
 */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Checks a `referenceDate` option, or defaults it to {@link todayUtc} when omitted.
 *
 * @throws RangeError naming `referenceDate` if it is not a real calendar date written as `YYYY-MM-DD`.
 */
export function resolveReferenceDate(referenceDate: string | undefined): string {
  if (referenceDate === undefined) {
    return todayUtc();
  }
  if (!isCalendarDate(referenceDate)) {
    throw new RangeError(
      `referenceDate must be a calendar date written as YYYY-MM-DD, got ${JSON.stringify(referenceDate)}`,
    );
  }
  return referenceDate;
}

/**
 * Resolves the options of `createCz` and every `create<Id>` into {@link Settings}: a missing seed comes
 * from `crypto.getRandomValues`, a missing reference date is today in UTC (docs/rules/core.md section 3).
 *
 * @param options - Optional `seed` and `referenceDate`.
 * @throws RangeError naming `seed` or `referenceDate` for an invalid value.
 */
export function resolveSettings(options: SettingsOptions = {}): Settings {
  const seed = options.seed ?? randomSeed();
  assertSeed(seed);
  return { seed, referenceDate: resolveReferenceDate(options.referenceDate) };
}
