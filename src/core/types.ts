// Shared result, settings and generator types – docs/rules/core.md sections 3, 4 and 5.
import type { Random } from './random.js';

/**
 * Result of a validator (výsledek validace).
 *
 * Every invalid variant name of an identifier is also one of its reason codes, and the validator returns
 * exactly that code for that variant (docs/rules/core.md section 4).
 *
 * @template Reason - Union of the identifier's reason codes, e.g. `'badChecksum'`.
 */
export type ValidationResult<Reason extends string> =
  | { valid: true }
  | { valid: false; reason: Reason };

/**
 * Options of `createCz` and of every standalone `create<Id>` (docs/rules/core.md section 3).
 */
export interface SettingsOptions {
  /**
   * Seed from 0 to 2^32 − 1. Omitted: a random seed, exposed as `.seed` so a failing run can be
   * reproduced.
   */
  readonly seed?: number;
  /**
   * "Today" (`YYYY-MM-DD`) for date-dependent rules such as future dates. Omitted: the current UTC date,
   * exposed as `.referenceDate`.
   *
   * Generated dates come from fixed ranges written in each identifier's rules; `referenceDate` only cuts
   * a range where it falls inside it (amendment A3). With any `referenceDate` after those ranges, the same
   * seed gives the same values on any day. An earlier one changes the values, and if it leaves a range
   * empty, generating from that range throws `RangeError` naming `referenceDate`.
   */
  readonly referenceDate?: string;
}

/**
 * Resolved and checked settings: the seed and reference date actually in use.
 */
export interface Settings {
  /** Seed from 0 to 2^32 − 1. */
  readonly seed: number;
  /** Reference date ("today") as `YYYY-MM-DD`. */
  readonly referenceDate: string;
}

/**
 * Options of a validator: the reference date for date-dependent rules, default today in UTC.
 */
export interface ValidatorOptions {
  /** Reference date ("today") as `YYYY-MM-DD`. */
  readonly referenceDate?: string;
}

/**
 * What `generate`, every variant and the inner validator of an identifier receive besides their input
 * (docs/rules/core.md section 5). Identifiers that do not need the date ignore it.
 */
export interface IdentifierContext {
  /** Reference date ("today") as `YYYY-MM-DD`, already checked. */
  readonly referenceDate: string;
}

/**
 * An edge or invalid variant of an identifier: draws from the identifier's stream and returns one value
 * (docs/rules/core.md section 5).
 */
export type IdentifierVariant = (random: Random, context: IdentifierContext) => string;

/**
 * Options type of an identifier without options: passing any option key is a type error
 * (docs/rules/core.md section 5, amendment A2).
 */
export type NoOptions = Readonly<Record<string, never>>;

// The argument may be omitted only if `{}` is valid options, i.e. no option is required (amendment A2).
type OptionsArgs<Options extends object> = NoOptions extends Options ? [options?: Options] : [options: Options];

/**
 * Generator of one identifier: call it for a valid value, `.edge()` for a valid edge case and
 * `.invalid()` for an invalid value (docs/rules/core.md sections 3 and 5).
 *
 * All calls draw from the identifier's own seeded stream, in call order.
 *
 * @template Options - Options of the valid-value generator.
 * @template EdgeVariant - Names of the edge variants.
 * @template InvalidVariant - Names of the invalid variants (each is also a reason code).
 */
export interface IdentifierGenerator<Options extends object, EdgeVariant extends string, InvalidVariant extends string> {
  /** A valid value. The options argument is required only if some option is required. */
  (...args: OptionsArgs<Options>): string;
  /** The seed in use; pass it back to reproduce the same values. */
  readonly seed: number;
  /** The reference date in use (`YYYY-MM-DD`); pass it back together with the seed. */
  readonly referenceDate: string;
  /**
   * A valid edge-case value: the named variant, or a randomly chosen one when `variant` is omitted.
   *
   * @throws RangeError for an unknown variant name.
   */
  readonly edge: (variant?: EdgeVariant) => string;
  /**
   * An invalid value: the named variant, or a randomly chosen one when `variant` is omitted.
   *
   * @throws RangeError for an unknown variant name.
   */
  readonly invalid: (variant?: InvalidVariant) => string;
  /** All edge variant names, in definition order. */
  readonly edgeVariants: readonly EdgeVariant[];
  /** All invalid variant names, in definition order. */
  readonly invalidVariants: readonly InvalidVariant[];
}
