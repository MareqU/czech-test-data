// The agent skill (skills/czech-test-data/SKILL.md) is copied into other projects, so its commands must keep
// working: every `npx czech-test-data …` line runs against the built dist/cli.mjs.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createCz } from '../src/index.js';

const CLI = fileURLToPath(new URL('../dist/cli.mjs', import.meta.url));
const SKILL = readFileSync(new URL('../skills/czech-test-data/SKILL.md', import.meta.url), 'utf8');

/** The CLI commands of the skill, without the `npx czech-test-data` prefix and trailing comments. */
const COMMANDS = [...SKILL.matchAll(/^npx czech-test-data (.+?)(?:\s+#.*)?$/gmu)].map(([, args = '']) => args.trim());

describe('agent skill', () => {
  it('has a name and a description for the agent to pick it', () => {
    expect(SKILL).toMatch(/^---\nname: czech-test-data\ndescription: .{100,}\n---\n/u);
  });

  it('lists commands', () => {
    expect(COMMANDS.length).toBeGreaterThanOrEqual(6);
  });

  it.each(COMMANDS)('runs: %s', (args) => {
    const result = spawnSync('node', [CLI, ...args.split(' ')], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).not.toBe('');
  });

  it('names the disputed variants the library has', () => {
    const cz = createCz();
    expect(cz.dic.edgeVariants).toContain('lowercasePrefix');
    expect(cz.iban.edgeVariants).toContain('lowercase');
    expect(SKILL).toContain('`dic` `lowercasePrefix`');
    expect(SKILL).toContain('`iban` `lowercase`');
  });
});
