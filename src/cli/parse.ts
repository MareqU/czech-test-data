// Argument parsing and the usage checks that belong to the CLI itself; values of generator options and
// reference dates are checked by the library (contract: cli.md section 2.2).
import { parseArgs } from 'node:util';
import { FORMATS } from './format.js';
import type { Format } from './format.js';

/** A usage error: reported with exit code 2 and a hint to the help. */
export class UsageError extends Error {}

const OPTIONS = {
  count: { type: 'string', short: 'n' },
  seed: { type: 'string', short: 's' },
  'reference-date': { type: 'string' },
  format: { type: 'string', short: 'f' },
  edge: { type: 'string' },
  invalid: { type: 'string' },
  gender: { type: 'string' },
  'birth-date': { type: 'string' },
  from: { type: 'string' },
  'bank-code': { type: 'string' },
  'with-prefix': { type: 'boolean' },
  account: { type: 'string' },
  type: { type: 'string' },
  distributor: { type: 'string' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
} as const;

/** Options every generation accepts; the rest are the identifier's generator options. */
export const GENERATE_COMMON = ['count', 'seed', 'reference-date', 'format', 'edge', 'invalid'];
/** Options `validate` accepts. */
export const VALIDATE_OPTIONS = ['reference-date', 'format'];

const MAX_COUNT = 10_000;
const MAX_SEED = 2 ** 32 - 1;

/** Parsed command line. */
export interface Parsed {
  readonly positionals: readonly string[];
  /** Every option given, by long name; boolean options have the value `true`. */
  readonly given: ReadonlyMap<string, string | true>;
}

/** Parses arguments strictly; each option may be given at most once. */
export function parse(args: readonly string[]): Parsed {
  let result;
  try {
    result = parseArgs({ args: [...args], options: OPTIONS, allowPositionals: true, strict: true, tokens: true });
  } catch (error) {
    if (error instanceof Error) throw new UsageError(error.message);
    throw error;
  }
  const given = new Map<string, string | true>();
  for (const token of result.tokens) {
    if (token.kind !== 'option') continue;
    if (given.has(token.name)) throw new UsageError(`option --${token.name} given more than once`);
    given.set(token.name, token.value ?? true);
  }
  return { positionals: result.positionals, given };
}

/** Rejects options the command does not take. */
export function allowOnly(parsed: Parsed, allowed: readonly string[], where: string): void {
  for (const name of parsed.given.keys()) {
    if (!allowed.includes(name)) throw new UsageError(`option --${name} is not available ${where}`);
  }
}

/** `--format`, default text. */
export function formatOf(parsed: Parsed): Format {
  const format = parsed.given.get('format') ?? 'text';
  if (typeof format === 'string' && FORMATS.includes(format)) return format as Format;
  throw new UsageError(`unknown format: ${String(format)} (use text, json or csv)`);
}

function integer(parsed: Parsed, name: string, min: number, max: number): number | undefined {
  const text = parsed.given.get(name);
  if (text === undefined) return undefined;
  const value = typeof text === 'string' && /^\d+$/u.test(text) ? Number(text) : Number.NaN;
  if (value >= min && value <= max) return value;
  throw new UsageError(`--${name} must be an integer from ${String(min)} to ${String(max)}`);
}

/** `--count`, default 1. */
export function countOf(parsed: Parsed): number {
  return integer(parsed, 'count', 1, MAX_COUNT) ?? 1;
}

/** `--seed`, undefined when not given. */
export function seedOf(parsed: Parsed): number | undefined {
  return integer(parsed, 'seed', 0, MAX_SEED);
}
