// PreToolUse hook: keeps each pipeline agent inside its write scope from docs/spec.md
// ("Architektura agentů"). The `tools` frontmatter of an agent cannot restrict paths, so this does.
// The main session (no agent_type) is never restricted.
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

interface HookInput {
  agent_type?: string;
  cwd: string;
  tool_input: { file_path?: string; notebook_path?: string; command?: string };
}

const WRITE_SCOPE: Readonly<Record<string, readonly string[]>> = {
  'rules-researcher': ['docs/rules/'],
  'test-writer': ['tests/'],
  implementer: ['src/'],
  reviewer: ['docs/reviews/'],
};

// The implementer has Bash, so also catch shell writes to tests and rules (CLAUDE.md, workflow step 4).
// A heuristic, not a sandbox: it stops accidents, the reviewer and git diff catch the rest.
const PROTECTED_FROM_IMPLEMENTER = /(^|[\s'"=:/(])(tests|docs)\//;
const SHELL_WRITE =
  /(>|\btee\b|\bsed\b[^|;&]*\s-i|\bperl\b[^|;&]*\s-i|\b(rm|mv|cp|touch|truncate|ln|install)\b|\bgit\s+(checkout|restore|reset|stash|apply|rm|mv)\b|writeFile|appendFile)/;
const HARMLESS_REDIRECTS = /\d?>&\d|\d?>\s*\/dev\/null/g;
// `vitest -u` would rewrite the seed snapshots in tests/ without naming the folder.
const SNAPSHOT_UPDATE = /\b(vitest|npm\s+(run\s+)?(test|coverage))\b[^|;&]*\s(-u|--update)\b/;

function deny(reason: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
}

function checkPath(agent: string, scope: readonly string[], input: HookInput): void {
  const target = input.tool_input.file_path ?? input.tool_input.notebook_path;
  if (target === undefined) return;
  const projectDir = process.env['CLAUDE_PROJECT_DIR'] ?? input.cwd;
  const path = relative(projectDir, resolve(input.cwd, target));
  // Outside the project (e.g. a scratchpad in /tmp) is not part of the pipeline.
  if (path.startsWith('..') || isAbsolute(path)) return;
  if (!scope.some((prefix) => path.startsWith(prefix))) {
    deny(`${agent} may only write inside ${scope.join(', ')} (docs/spec.md); refused: ${path}`);
  }
}

function checkCommand(agent: string, command: string | undefined): void {
  if (agent !== 'implementer' || command === undefined) return;
  const stripped = command.replace(HARMLESS_REDIRECTS, '');
  const writesProtected = PROTECTED_FROM_IMPLEMENTER.test(stripped) && SHELL_WRITE.test(stripped);
  if (writesProtected || SNAPSHOT_UPDATE.test(stripped)) {
    deny('The implementer never changes tests/ or docs/ (CLAUDE.md). If a test looks wrong, stop and report it.');
  }
}

const input = JSON.parse(readFileSync(0, 'utf8')) as HookInput;
const agent = input.agent_type;
const scope = agent === undefined ? undefined : WRITE_SCOPE[agent];
if (agent !== undefined && scope !== undefined) {
  checkPath(agent, scope, input);
  checkCommand(agent, input.tool_input.command);
}
