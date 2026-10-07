// Identifier module template – docs/rules/core.md sections 2 and 5 (amendments A1, A2).
import { createRandom, streamSeed } from './random.js';
import type { Random } from './random.js';
import { resolveReferenceDate } from './settings.js';
import type {
  IdentifierContext,
  IdentifierGenerator,
  IdentifierVariant,
  NoOptions,
  Settings,
  ValidationResult,
  ValidatorOptions,
} from './types.js';

interface IdentifierDefinition<
  Reason extends string,
  EdgeVariant extends string,
  InvalidVariant extends Reason,
  Options extends object,
> {
  /** camelCase identifier id; it also selects the PRNG stream (docs/rules/core.md section 2). */
  readonly id: string;
  /** Generates a valid value; always receives an options object, `{}` when the caller passes none. */
  readonly generate: (random: Random, options: Options, context: IdentifierContext) => string;
  /**
   * Inner validator. Its reason codes bound `InvalidVariant`, so an invalid variant that is not a
   * reason code fails to compile (docs/rules/core.md section 4).
   */
  readonly validate: (value: string, context: IdentifierContext) => ValidationResult<Reason>;
  readonly edge: Readonly<Record<EdgeVariant, IdentifierVariant>>;
  readonly invalid: Readonly<Record<InvalidVariant, IdentifierVariant>>;
}

/**
 * `create` and `validate` of one identifier, built by {@link defineIdentifier}; internal, shared by the
 * identifier's subpath entry and `createCz`.
 */
export interface Identifier<Reason extends string, EdgeVariant extends string, InvalidVariant extends string, Options extends object> {
  /** Generator for resolved settings; throws `RangeError` naming `seed` or `referenceDate`. */
  readonly create: (settings: Settings) => IdentifierGenerator<Options, EdgeVariant, InvalidVariant>;
  /** Public validator; throws `RangeError` only for an invalid `referenceDate` option, never for `value`. */
  readonly validate: (value: string, options?: ValidatorOptions) => ValidationResult<Reason>;
}

interface VariantRunner<Name extends string> {
  readonly names: readonly Name[];
  readonly run: (random: Random, context: IdentifierContext, name: Name | undefined) => string;
}

function createVariantRunner<Name extends string>(
  kind: 'edge' | 'invalid',
  variants: Readonly<Record<Name, IdentifierVariant>>,
): VariantRunner<Name> {
  // Names come from the keys, so a variant cannot be missing from the list (docs/rules/core.md section 5).
  const names = Object.freeze(Object.keys(variants)) as readonly Name[];
  const run = (random: Random, context: IdentifierContext, name: Name | undefined): string => {
    if (name === undefined) {
      return variants[random.pick(names)](random, context);
    }
    // Own keys only, so inherited names such as `toString` or `__proto__` count as unknown.
    if (!Object.hasOwn(variants, name)) {
      throw new RangeError(`Unknown ${kind} variant "${name}"; expected one of: ${names.join(', ')}`);
    }
    return variants[name](random, context);
  };
  return { names, run };
}

/**
 * Builds `create` and `validate` of one identifier from its generator, validator and variants.
 *
 * `create(settings)` returns a generator backed by the identifier's own PRNG stream, seeded with
 * `streamSeed(seed, id)`, so calls of other identifiers never change its values. `generate`, every variant
 * and the inner validator receive the context `{ referenceDate }` (docs/rules/core.md sections 2 and 5).
 *
 * @param definition - `id`, `generate`, `validate`, `edge` and `invalid` of the identifier.
 * @returns The identifier's `create` and public `validate`.
 */
export function defineIdentifier<
  Reason extends string,
  EdgeVariant extends string,
  InvalidVariant extends Reason,
  // A generate without an options parameter has no inference source, so it falls back to NoOptions (A2).
  Options extends object = NoOptions,
>(
  definition: IdentifierDefinition<Reason, EdgeVariant, InvalidVariant, Options>,
): Identifier<Reason, EdgeVariant, InvalidVariant, Options> {
  const { id, generate, validate } = definition;
  const edge = createVariantRunner('edge', definition.edge);
  const invalid = createVariantRunner('invalid', definition.invalid);

  const create = (settings: Settings): IdentifierGenerator<Options, EdgeVariant, InvalidVariant> => {
    const random = createRandom(streamSeed(settings.seed, id));
    const referenceDate = resolveReferenceDate(settings.referenceDate);
    // Exactly { referenceDate }, not the whole settings (docs/rules/core.md section 5).
    const context: IdentifierContext = Object.freeze({ referenceDate });
    // The argument can be omitted only when NoOptions extends Options (see IdentifierGenerator), so
    // the fresh `{}` is a valid Options whenever it is used (amendment A2).
    const generator = (options?: Options): string => generate(random, options ?? ({} as Options), context);
    return Object.assign(generator, {
      seed: settings.seed,
      referenceDate,
      edge: (variant?: EdgeVariant): string => edge.run(random, context, variant),
      invalid: (variant?: InvalidVariant): string => invalid.run(random, context, variant),
      edgeVariants: edge.names,
      invalidVariants: invalid.names,
    });
  };

  return {
    create,
    validate: (value, options) => validate(value, { referenceDate: resolveReferenceDate(options?.referenceDate) }),
  };
}
