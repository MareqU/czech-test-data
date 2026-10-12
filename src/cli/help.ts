// Help texts. Variant names come from the generator, not from a copied list.
import { IDENTIFIERS } from './table.js';
import type { CliIdentifier } from './table.js';

/** Top-level help. */
export function topHelp(): string {
  const ids = IDENTIFIERS.map((e) => `  ${e.id.padEnd(14)}${e.czech}`).join('\n');
  return `Usage:
  czech-test-data <identifier> [options]              generate values
  czech-test-data validate <identifier> [value...]    validate values (from stdin when none are given)
  czech-test-data [<identifier>] --help | -h          help
  czech-test-data --version | -v                      version

Options:
  -n, --count N            number of values, 1-10000 (default 1)
  -s, --seed N             seed, 0-4294967295 (default random, printed to stderr)
      --reference-date D   "today" as YYYY-MM-DD (default today, UTC)
  -f, --format F           text, json or csv (default text)
      --edge VARIANT       edge case: a variant name, all or random
      --invalid VARIANT    invalid value: a variant name, all or random
  -h, --help               show help
  -v, --version            show version

Identifiers:
${ids}
`;
}

/** Help of one identifier: its options and variant names. */
export function identifierHelp(entry: CliIdentifier): string {
  const generator = entry.create({ seed: 0 });
  const options = Object.keys(entry.options).map((name) => `--${name}`);
  return `czech-test-data ${entry.id} (${entry.czech})

Generator options: ${options.length > 0 ? options.join(' ') : 'none'}
Edge variants (--edge): ${generator.edgeVariants.join(' ')}
Invalid variants (--invalid): ${generator.invalidVariants.join(' ')}
Also: all, random. Common options: see 'czech-test-data --help'.
`;
}
