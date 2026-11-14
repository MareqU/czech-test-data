// What an identifier page shows before its script runs: the values of the default state (valid values, seed 1)
// written into the HTML, so an agent or a search engine that does not run JavaScript sees real data. The script
// replaces all of it on load with values of its own seed. Also the kit as static JSON (/data/<id>.json).
import type { IdentifierInfo } from '../src/catalog.js';
import { generateRows } from '../src/generate.js';
import { buildKit, toJson } from '../src/kit.js';
import { cliSnippet, codeSnippet, oneCall } from '../src/snippet.js';
import { parseState } from '../src/state.js';
import type { State } from '../src/state.js';

/** The seed of every value written at build time: the home table, the identifier pages and /data/*.json. */
export const PRERENDER_SEED = 1;

export interface Prerendered {
  readonly value: string;
  readonly valid: boolean;
  /** The library call under the big value. */
  readonly call: string;
  /** All values of the default state; the first one is the big value. */
  readonly values: readonly { readonly value: string; readonly valid: boolean }[];
  readonly code: string;
  readonly cli: string;
}

function defaultState(info: IdentifierInfo, referenceDate: string): State {
  return parseState('', { seed: PRERENDER_SEED, referenceDate }, info.id);
}

/** The values of an identifier page's default state; `undefined` when the library cannot generate them. */
export function prerender(info: IdentifierInfo, referenceDate: string): Prerendered | undefined {
  const state = defaultState(info, referenceDate);
  const outcome = generateRows(state);
  const [first] = 'error' in outcome ? [] : outcome.rows;
  if ('error' in outcome || first === undefined) {
    return undefined;
  }
  return {
    value: first.value,
    valid: first.valid,
    call: oneCall(state, first.variant),
    values: outcome.rows.map((row) => ({ value: row.value, valid: row.valid })),
    code: codeSnippet(state),
    cli: cliSnippet(state),
  };
}

/** Path of an identifier's static kit, relative to the site root, e.g. `data/ico.json`. */
export function dataPath(info: IdentifierInfo): string {
  return `data/${info.id}.json`;
}

/** /data/<id>.json: the identifier's form-check kit, the same JSON as the page's "Stáhnout JSON". */
export function renderData(info: IdentifierInfo, referenceDate: string): string {
  const state: State = { ...defaultState(info, referenceDate), kit: true };
  const outcome = buildKit(state);
  return toJson(state, 'error' in outcome ? [] : outcome.rows);
}
