// CLI logic as a pure function (contract: cli.md sections 1, 5 and 7); src/cli.ts only does the I/O.
import pkg from '../../package.json' with { type: 'json' };
import { generate, validate } from './commands.js';
import type { CliResult } from './commands.js';
import { identifierHelp, topHelp } from './help.js';
import { UsageError, parse } from './parse.js';
import type { Parsed } from './parse.js';
import { IDENTIFIERS } from './table.js';
import type { CliIdentifier } from './table.js';

export type { CliResult };

function find(id: string | undefined): CliIdentifier | undefined {
  return IDENTIFIERS.find((entry) => entry.id === id);
}

// The identifier the arguments are about, for help and for the error hint.
function target(args: readonly string[]): CliIdentifier | undefined {
  return find(args[0] === 'validate' ? args[1] : args[0]);
}

function out(stdout: string): CliResult {
  return { stdout, stderr: '', exitCode: 0 };
}

function validateCommand(rest: readonly string[], parsed: Parsed, stdin: string | undefined): CliResult {
  const [id, ...values] = rest;
  const entry = find(id);
  if (entry === undefined) throw new UsageError(`unknown identifier: ${id ?? '(missing)'}`);
  return validate(entry, values, parsed, stdin);
}

function generateCommand(command: string | undefined, rest: readonly string[], parsed: Parsed): CliResult {
  const entry = find(command);
  if (entry === undefined) throw new UsageError(command === undefined ? 'missing identifier' : `unknown identifier: ${command}`);
  if (rest.length > 0) throw new UsageError(`unexpected argument: ${rest[0] ?? ''}`);
  return generate(entry, parsed);
}

function dispatch(args: readonly string[], stdin: string | undefined): CliResult {
  if (args.includes('--help') || args.includes('-h')) {
    const entry = target(args);
    return out(entry === undefined ? topHelp() : identifierHelp(entry));
  }
  if (args.length === 0) return out(topHelp());
  const parsed = parse(args);
  if (parsed.given.has('version')) return out(`${pkg.version}\n`);
  const [command, ...rest] = parsed.positionals;
  return command === 'validate' ? validateCommand(rest, parsed, stdin) : generateCommand(command, rest, parsed);
}

/**
 * Runs the CLI on `args` (without node and script) and returns what to print and the exit code:
 * 0 success, 1 `validate` found an invalid value, 2 usage error or a library `RangeError`.
 *
 * @param args - Command line arguments.
 * @param stdin - Whole piped input, `undefined` when stdin is not piped (a TTY).
 */
export function run(args: readonly string[], stdin?: string): CliResult {
  try {
    return dispatch(args, stdin);
  } catch (error) {
    if (!(error instanceof UsageError || error instanceof RangeError)) throw error;
    const entry = target(args);
    const hint = `Run 'czech-test-data${entry === undefined ? '' : ` ${entry.id}`} --help' for usage.`;
    return { stdout: '', stderr: `czech-test-data: ${error.message}\n${hint}\n`, exitCode: 2 };
  }
}
