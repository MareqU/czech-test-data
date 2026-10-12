#!/usr/bin/env node
// CLI entry point (package.json "bin"). Built separately from the library entry, so importing
// 'czech-test-data' never loads it. All logic lives in src/cli/; this file only does the I/O.
import { needsStdin, run } from './cli/run.js';

// Read stdin only when it is piped; an interactive terminal must not block.
async function readStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) return undefined;
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += String(chunk);
  return text;
}

const args = process.argv.slice(2);
// Only `validate` without values reads stdin; everything else must not wait for it.
const stdin = needsStdin(args) ? await readStdin() : undefined;
const { stdout, stderr, exitCode } = run(args, stdin);
process.stdout.write(stdout);
process.stderr.write(stderr);
process.exitCode = exitCode;
