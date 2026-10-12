// The `generate` and `validate` commands (contract: cli.md sections 2 to 4).
import { renderGenerated, renderValidated } from './format.js';
import type { GeneratedRecord, ValidatedRecord } from './format.js';
import { GENERATE_COMMON, UsageError, VALIDATE_OPTIONS, allowOnly, countOf, formatOf, seedOf } from './parse.js';
import type { Parsed } from './parse.js';
import type { CliIdentifier, GeneratorOptions, LooseGenerator } from './table.js';

/** What a run produces; the bin entry only forwards it. */
export interface CliResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

function stringOption(parsed: Parsed, name: string): string | undefined {
  const value = parsed.given.get(name);
  return typeof value === 'string' ? value : undefined;
}

function generatorOptions(entry: CliIdentifier, parsed: Parsed): GeneratorOptions {
  const options: Record<string, string | boolean> = {};
  for (const [name, key] of Object.entries(entry.options)) {
    const value = parsed.given.get(name);
    if (value !== undefined) options[key] = value;
  }
  return options;
}

function record(value: string, kind: 'edge' | 'invalid', variant: string | undefined): GeneratedRecord {
  return variant === undefined ? { value, kind } : { value, kind, variant };
}

// Section 2.3: `all` is variant-major, `random` is the API call without a name.
function variantRecords(generator: LooseGenerator, kind: 'edge' | 'invalid', choice: string, count: number): GeneratedRecord[] {
  const call = (name?: string): string => (kind === 'edge' ? generator.edge(name) : generator.invalid(name));
  const names = kind === 'edge' ? generator.edgeVariants : generator.invalidVariants;
  const plan: readonly (string | undefined)[] = choice === 'all' ? names : [choice === 'random' ? undefined : choice];
  return plan.flatMap((name) =>
    Array.from({ length: count }, () => record(call(name), kind, choice === 'random' ? undefined : name)),
  );
}

function checkCombination(entry: CliIdentifier, parsed: Parsed, options: GeneratorOptions): void {
  allowOnly(parsed, [...GENERATE_COMMON, ...Object.keys(entry.options)], `for ${entry.id}`);
  const hasVariant = parsed.given.has('edge') || parsed.given.has('invalid');
  if (parsed.given.has('edge') && parsed.given.has('invalid')) throw new UsageError('--edge and --invalid exclude each other');
  if (hasVariant && Object.keys(options).length > 0) {
    throw new UsageError('generator options cannot be combined with --edge or --invalid');
  }
}

/** Generates values for one identifier. */
export function generate(entry: CliIdentifier, parsed: Parsed): CliResult {
  const options = generatorOptions(entry, parsed);
  checkCombination(entry, parsed, options);
  const format = formatOf(parsed);
  const count = countOf(parsed);
  const seed = seedOf(parsed);
  const referenceDate = stringOption(parsed, 'reference-date');
  const generator = entry.create({
    ...(seed === undefined ? {} : { seed }),
    ...(referenceDate === undefined ? {} : { referenceDate }),
  });
  const edge = stringOption(parsed, 'edge');
  const invalid = stringOption(parsed, 'invalid');
  const hasOptions = Object.keys(options).length > 0;
  let records: GeneratedRecord[];
  if (edge !== undefined) records = variantRecords(generator, 'edge', edge, count);
  else if (invalid !== undefined) records = variantRecords(generator, 'invalid', invalid, count);
  else {
    records = Array.from({ length: count }, () => ({
      value: hasOptions ? generator(options) : generator(),
      kind: 'valid' as const,
    }));
  }
  const seedText = String(generator.seed);
  const notice =
    seed === undefined
      ? `czech-test-data: seed ${seedText}, reference date ${generator.referenceDate} (reproduce with --seed ${seedText} --reference-date ${generator.referenceDate})\n`
      : '';
  return { stdout: renderGenerated(records, format), stderr: notice, exitCode: 0 };
}

/** Validates values from the arguments, or from `stdin` when there are none. */
export function validate(entry: CliIdentifier, values: readonly string[], parsed: Parsed, stdin: string | undefined): CliResult {
  allowOnly(parsed, VALIDATE_OPTIONS, 'for validate');
  const format = formatOf(parsed);
  const referenceDate = stringOption(parsed, 'reference-date');
  const input = values.length > 0 ? values : (stdin ?? '').split(/\r?\n/u).filter((line) => line !== '');
  if (input.length === 0) throw new UsageError('no values to validate (pass them as arguments or on stdin)');
  const records: ValidatedRecord[] = input.map((value) => {
    const result = entry.validate(value, referenceDate === undefined ? {} : { referenceDate });
    return result.valid ? { value, valid: true } : { value, valid: false, reason: result.reason };
  });
  return {
    stdout: renderValidated(records, format),
    stderr: '',
    exitCode: records.every((r) => r.valid) ? 0 : 1,
  };
}
