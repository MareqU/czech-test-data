#!/usr/bin/env node
// CLI entry point (package.json "bin"). Built separately from the library entry, so importing
// 'czech-test-data' never loads it. Arguments via node:util parseArgs only: zero runtime dependencies.
import { parseArgs } from 'node:util';

const USAGE = `Usage: czech-test-data <identifier> [options]

Options:
  -h, --help  Show this help
`;

function main(args: string[]): number {
  const { values, positionals } = parseArgs({
    args,
    options: { help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
  });
  const [command] = positionals;
  if (values.help === true || command === undefined) {
    process.stdout.write(USAGE);
    return 0;
  }
  process.stderr.write(`Unknown identifier: ${command}\n\n${USAGE}`);
  return 1;
}

process.exitCode = main(process.argv.slice(2));
