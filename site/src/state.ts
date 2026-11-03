// Page state and its URL form: a shared link reproduces the same values (same seed and reference date).
import { IDENTIFIERS, infoOf } from './catalog.js';
import type { IdentifierId, IdentifierInfo } from './catalog.js';

export type Mode = 'valid' | 'edge' | 'invalid';

/** `all`, `random` or a variant name; only used in the `edge` and `invalid` modes. */
export type VariantChoice = string;

export interface State {
  readonly id: IdentifierId;
  readonly mode: Mode;
  readonly variant: VariantChoice;
  readonly count: number;
  /** Which of the generated values the big display shows (0-based). */
  readonly index: number;
  /** Whether the form-check kit is shown (identifier pages only). */
  readonly kit: boolean;
  readonly seed: number;
  readonly referenceDate: string;
  /** Generator options of `id` that are set; values as in the URL (`'true'` for a checkbox). */
  readonly options: Readonly<Record<string, string>>;
}

/** What the page uses when the URL does not say. */
export interface Defaults {
  readonly seed: number;
  readonly referenceDate: string;
}

export const MAX_COUNT = 100;

/** Valid values come in a handful; edge and invalid ones once per variant, so "next" walks through the variants. */
export function defaultCount(mode: Mode): number {
  return mode === 'valid' ? 5 : 1;
}

const MAX_SEED = 0xffffffff;
const MODES: readonly Mode[] = ['valid', 'edge', 'invalid'];
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

function idOf(value: string | null): IdentifierId {
  return IDENTIFIERS.find((info) => info.id === value)?.id ?? 'birthNumber';
}

function modeOf(value: string | null): Mode {
  return MODES.find((mode) => mode === value) ?? 'valid';
}

function variantOf(info: IdentifierInfo, mode: Mode, value: string | null): VariantChoice {
  const names = mode === 'edge' ? Object.keys(info.edge) : Object.keys(info.invalid);
  return value !== null && (value === 'random' || names.includes(value)) ? value : 'all';
}

function integerOf(value: string | null, max: number): number | undefined {
  if (value === null || !/^\d{1,10}$/u.test(value)) {
    return undefined;
  }
  const number = Number(value);
  return number <= max ? number : undefined;
}

function optionsOf(info: IdentifierInfo, params: URLSearchParams): Record<string, string> {
  const options: Record<string, string> = {};
  for (const option of info.options) {
    const value = params.get(option.key);
    if (value !== null && value !== '') {
      options[option.key] = value;
    }
  }
  return options;
}

/**
 * Reads the state from a query string; anything missing or malformed falls back to `defaults`. On an identifier's
 * own page `fixedId` gives the identifier and the URL has no `id`.
 */
export function parseState(search: string, defaults: Defaults, fixedId?: IdentifierId): State {
  const params = new URLSearchParams(search);
  const id = fixedId ?? idOf(params.get('id'));
  const info = infoOf(id);
  const mode = modeOf(params.get('mode'));
  const count = integerOf(params.get('n'), MAX_COUNT);
  const date = params.get('date');
  return {
    id,
    mode,
    variant: variantOf(info, mode, params.get('variant')),
    count: count === undefined || count === 0 ? defaultCount(mode) : count,
    index: integerOf(params.get('i'), MAX_COUNT * 100) ?? 0,
    kit: params.get('kit') === '1',
    seed: integerOf(params.get('seed'), MAX_SEED) ?? defaults.seed,
    referenceDate: date !== null && DATE.test(date) ? date : defaults.referenceDate,
    options: optionsOf(info, params),
  };
}

/** The query string (without `?`) of a state; `parseState` reads it back to the same state. */
export function serializeState(state: State, withId = true): string {
  const params = new URLSearchParams(withId ? { id: state.id } : {});
  params.set('mode', state.mode);
  if (state.mode !== 'valid') {
    params.set('variant', state.variant);
  }
  params.set('n', String(state.count));
  if (state.index > 0) {
    params.set('i', String(state.index));
  }
  if (state.kit) {
    params.set('kit', '1');
  }
  params.set('seed', String(state.seed));
  params.set('date', state.referenceDate);
  if (state.mode === 'valid') {
    for (const [key, value] of Object.entries(state.options)) {
      params.set(key, value);
    }
  }
  return params.toString();
}

/** A state switched to another mode; the variant resets to `all` unless it exists there, the count to the mode's default. */
export function withMode(state: State, mode: Mode): State {
  return { ...state, mode, variant: variantOf(infoOf(state.id), mode, state.variant), count: defaultCount(mode), index: 0 };
}

/** The options that are set and not disabled by another option (see `OptionInfo.excludes`). */
export function activeOptions(info: IdentifierInfo, options: Readonly<Record<string, string>>): Record<string, string> {
  const disabled = new Set(disabledOptions(info, options));
  return Object.fromEntries(Object.entries(options).filter(([key]) => !disabled.has(key)));
}

/** Keys of options disabled by the value of another option. */
export function disabledOptions(info: IdentifierInfo, options: Readonly<Record<string, string>>): string[] {
  return info.options.flatMap((option) => {
    const value = options[option.key];
    const excludes = option.excludes;
    if (value === undefined || excludes === undefined) {
      return [];
    }
    return excludes.onlyFor === undefined || excludes.onlyFor === value ? [...excludes.keys] : [];
  });
}

/**
 * The counter next to "next": only while walking through all variants ("varianta 2 z 6"), where it tells which
 * variant of how many is shown. With `count` values per variant, values 1…count belong to the first variant.
 * Elsewhere (valid values, one chosen variant) the position in the batch means nothing to a tester: empty.
 */
export function variantPosition(state: State, total: number): string {
  if (state.mode === 'valid' || state.variant !== 'all' || total === 0) {
    return '';
  }
  const variants = Math.ceil(total / state.count);
  const current = Math.floor(Math.min(state.index, total - 1) / state.count) + 1;
  return `varianta ${String(current)} z ${String(variants)}`;
}
