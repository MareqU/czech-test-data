// Values for a state, from the public API only, in the same order as the CLI: `all` gives `count` values per
// variant in definition order (src/cli/commands.ts), so the code and CLI snippets reproduce the page exactly.
import { createCz } from 'czech-test-data';
import { infoOf } from './catalog.js';
import type { IdentifierId, IdentifierInfo } from './catalog.js';
import { activeOptions } from './state.js';
import type { State } from './state.js';

type GeneratorOptions = Readonly<Record<string, string | boolean>>;

/** One generator of `createCz`, loosely typed so a single code path serves every identifier. */
interface LooseGenerator {
  (options?: GeneratorOptions): string;
  readonly edge: (variant?: string) => string;
  readonly invalid: (variant?: string) => string;
  readonly edgeVariants: readonly string[];
  readonly invalidVariants: readonly string[];
}

export interface Row {
  readonly value: string;
  /** The variant name; absent for valid values and for the `random` choice (the library does not report it). */
  readonly variant?: string;
  /** What the validator says about the value. */
  readonly reason?: string;
  readonly valid: boolean;
}

export type Outcome = { readonly rows: readonly Row[] } | { readonly error: string };

type Validator = (value: string) => { valid: true } | { valid: false; reason: string };

/** Checkbox options are `'true'` in the state; the library expects a boolean. */
export function libraryOptions(info: IdentifierInfo, options: Readonly<Record<string, string>>): GeneratorOptions {
  const result: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(activeOptions(info, options))) {
    const option = info.options.find((candidate) => candidate.key === key);
    result[key] = option?.kind === 'checkbox' ? value === 'true' : value;
  }
  return result;
}

function draw(generator: LooseGenerator, state: State, info: IdentifierInfo): { value: string; variant?: string }[] {
  const times = <T>(make: () => T): T[] => Array.from({ length: state.count }, make);
  if (state.mode === 'valid') {
    const options = libraryOptions(info, state.options);
    const hasOptions = Object.keys(options).length > 0;
    return times(() => ({ value: hasOptions ? generator(options) : generator() }));
  }
  const call = (name?: string): string => (state.mode === 'edge' ? generator.edge(name) : generator.invalid(name));
  if (state.variant === 'random') {
    return times(() => ({ value: call() }));
  }
  const names = state.mode === 'edge' ? generator.edgeVariants : generator.invalidVariants;
  const plan = state.variant === 'all' ? names : [state.variant];
  return plan.flatMap((name) => times(() => ({ value: call(name), variant: name })));
}

function parts(id: IdentifierId, state: State): { generator: LooseGenerator; validate: Validator } {
  const cz = createCz({ seed: state.seed, referenceDate: state.referenceDate });
  // The library types are precise per identifier; the page passes options it built from the catalog.
  return { generator: cz[id] as unknown as LooseGenerator, validate: cz.validate[id] };
}

/** Generates the values of a state; a library `RangeError` (bad option, date or seed) becomes `error`. */
export function generateRows(state: State): Outcome {
  try {
    const { generator, validate } = parts(state.id, state);
    const rows = draw(generator, state, infoOf(state.id)).map(({ value, variant }): Row => {
      const result = validate(value);
      const verdict = result.valid ? { valid: true } : { valid: false, reason: result.reason };
      return variant === undefined ? { value, ...verdict } : { value, variant, ...verdict };
    });
    return { rows };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Validates each non-empty line with the validator of `id` and the state's reference date. Lines are not trimmed,
 * as in the library and the CLI: a stray space is a finding for a tester, not noise.
 */
export function validateLines(state: State, text: string): Row[] | { error: string } {
  try {
    const { validate } = parts(state.id, state);
    return text
      .split(/\r?\n/u)
      .filter((line) => line !== '')
      .map((value) => {
        const result = validate(value);
        return result.valid ? { value, valid: true } : { value, valid: false, reason: result.reason };
      });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/** A random seed for "new values"; the page needs no reproducibility here, so the browser's crypto is fine. */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
