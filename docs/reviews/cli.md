# Review: CLI (M5)

Reviewed 2026-10-12 by reviewer, branch `m5-cli` (49ca2ca tests and clarifications, plus the uncommitted
implementation: `src/cli.ts` modified, `src/cli/` new).
Contract: `docs/rules/cli.md` (APPROVED 2026-10-12, Q1–Q7 as recommended, Clarifications binding).
Code: `src/cli.ts`, `src/cli/{run,commands,parse,format,help,table}.ts`.
Tests: `tests/cli.{generate,validate,errors,help,e2e}.test.ts`, `tests/support/cli.ts`.

**Verdict: 1 blocker.** The pure `run()` follows the contract closely. Determinism (§2.3) is tested for every
identifier, every named variant, `random` and `all`, in all three formats. The blocker is in the bin entry: it decides
whether to read stdin by looking at `args[0]`, which does not match the §4 rule.

## 1. Tool results

I did not re-run `npm run check`, as the brief asked. The main session reported it green: typecheck, lint, knip,
coverage, build, test:e2e (2234 unit + 19 e2e tests), and size (unchanged). I ran only targeted checks:

- `vitest run tests/cli.{errors,generate,help,validate}.test.ts --coverage` (src/cli only): 273 passed.
  Branches 94.6 %. Uncovered: `run.ts:35-36` and `run.ts:63`, `parse.ts:51`, `format.ts:45` (see S2, N2).
- Probes against the built `dist/cli.mjs` (built at 17:11, contains the current entry), listed under B1.

## 2. Contract → code → tests

| Contract | Code | Test | OK |
| --- | --- | --- | --- |
| §1 kebab-case ids only, no aliases | `table.ts:48-58` | `errors.test.ts:20` (camelCase rejected), all suites use the ids | yes |
| §1 `parseArgs` strict, each option once | `parse.ts:45-59` (tokens) | `errors.test.ts:23-25` | yes |
| §1 no arguments → top help, exit 0 | `run.ts:45` | `help.test.ts:21` | yes |
| §2.1 count 1–10 000, seed 0…2^32−1, digits only | `parse.ts:76-91` | `errors.test.ts:26-35`, `generate.test.ts:113-124` | yes |
| §2.1 `--edge`/`--invalid` exclusive; `all`/`random` | `commands.ts:34-49` | `errors.test.ts:40`, `generate.test.ts:41-64` | yes |
| §2.2 option mapping, omitted options not passed | `commands.ts:20-27, 72`, `table.ts:44-57` | `generate.test.ts:87-99, 126-131` (see N4) | yes |
| §2.2 option not available / combined with a variant → usage | `commands.ts:43-49` | `errors.test.ts:41-44` | yes |
| §2.2 values checked only by the library (RangeError) | no CLI checks | `errors.test.ts:78-102` | yes |
| §2.3 order: valid, named, random, all variant-major | `commands.ts:34-41, 67-75` | `generate.test.ts:20-80` vs. the oracle `support/cli.ts:151-183` | yes |
| §2.4 seed notice on stderr only without `--seed`, effective date | `commands.ts:76-80` | `generate.test.ts:180-200` | yes |
| §3 text / json key order / csv RFC 4180 | `format.ts` | `generate.test.ts:134-177` | yes (N3) |
| §4 values from args, else stdin; `\r\n`; empty lines skipped; no trimming | `commands.ts:89`; **entry `cli.ts:17`** | `validate.test.ts:65-82` (in-process only) | **no, B1** |
| §4 `validate<Id>(value, { referenceDate })` | `commands.ts:92` | `validate.test.ts:84-94` (does not discriminate, S1) | code yes |
| §4 other options → usage; no values → usage | `commands.ts:86, 90` | `errors.test.ts:45-49, 62-66` | yes |
| §4 exit 0/1, output either way | `commands.ts:98` | `validate.test.ts:33-45`, e2e | yes |
| §5 exit 2, stderr only, hint with id, no stack, nothing on stdout | `run.ts:59-67` | `errors.test.ts:17-102`, e2e | yes |
| §5 only UsageError and RangeError caught | `run.ts:63` | – (bug path, fine) | yes |
| §6 help wins, variant names read from the generator | `run.ts:41-44`, `help.ts:30-39` | `help.test.ts:29-53` | yes |
| Clarification: `--version` / `-v` prints the package version | `run.ts:2, 47` (bundle inlines only `version`) | `help.test.ts:55-65` | yes |
| §7 entry does only I/O; logic pure; public entry points only | `cli.ts`, `table.ts:2-11` (identifier `index.ts` + types from `src/index.ts`) | – | yes, except the stdin decision (B1) |

Other checks: no copied variant lists (help and `all` read `edgeVariants`/`invalidVariants`). No runtime
dependencies. Node APIs: only `node:util` (`parse.ts:3`), plus `process` in the entry. `Math.random` and `Date.now`
are not used. The ESLint override for `src/cli/**` is in place (`eslint.config.ts:71`), and the library cannot import
the CLI (`eslint.config.ts:46`).

## 3. Findings

### B1 `blocker`: the entry reads stdin by `args[0]`, not by the "no values" rule (§4)

`src/cli.ts:16-17`:

```ts
// Only `validate` reads stdin, and only when it has no values; the others must not wait for it.
const stdin = args[0] === 'validate' ? await readStdin() : undefined;
```

The comment states the §4 rule. The code does something else, with three effects (all checked on `dist/cli.mjs`):

1. It reads stdin even when values are given. `sleep 3 | node dist/cli.mjs validate ico 00177041` waits 3 s
   (verified by the main session). If stdin is a pipe that never closes, the run never ends. This happens with
   `child_process.spawn` using the default `stdio: 'pipe'` without `stdin.end()`, with execa, and in some CI or
   container runners. It also affects `validate ico --help`, although help should win at once.
2. When options come first, it does not read stdin at all. `printf '00177041\n' | node dist/cli.mjs -f json validate ico`
   exits 2 with "no values to validate". In-process, `run(['-f','csv','validate','ico'], '00177041\n')` succeeds,
   because `parseArgs` accepts options before positionals (generate accepts them too, e.g. `-n 2 ico`).
3. No test covers this decision. The in-process tests pass stdin explicitly, and the e2e suite only pipes into
   `validate ico`.

Suggested fix (keeps the `run(args, stdin?)` signature from the Clarifications and leaves the decision in `src/cli/`):

- In `src/cli/run.ts`, export a pure `needsStdin(args: readonly string[]): boolean`. It returns false when help is
  requested (same test as `dispatch`). Otherwise it uses `parse(args)` and returns
  `positionals[0] === 'validate' && positionals.length <= 2`. If `parse` throws a `UsageError`, it returns false,
  and `run` then reports that error.
- `src/cli.ts`: `const stdin = needsStdin(args) ? await readStdin() : undefined;`. The entry stays I/O only.
- Tests: an in-process table of args → boolean (`validate ico` true; `validate ico 1` false;
  `-f json validate ico` true; `validate ico --help` false; `ico` false). Add two e2e cases: positional values with
  stdin left open (spawn without ending stdin; must finish within the timeout) and `-f csv validate ico` with
  piped input.

### S1 `should-fix`: the `--reference-date` validate test does not check anything

`tests/cli.validate.test.ts:84-94` validates `995231/1234` with 2000-01-01 and 2099-01-01. Both dates return
`impossibleDate` (month 52 means February, and February has no day 31). So the test would also pass if the CLI dropped
`referenceDate`. A value that does depend on the date: `500101/4788` gives `futureDate` with `2000-01-01` and `valid`
with `2099-01-01` (from `birth-number --birth-date 2050-01-01 -s 1 --reference-date 2099-01-01`). Also assert that
the two outputs differ. This is a test change, so it is the test-writer's task.

### S2 `should-fix`: untested usage paths in `run.ts:35-36`

The usage errors "missing identifier" (`['-n', '2']`) and "unexpected argument" (`['ico', 'extra']`) are §5 usage
errors, but no test runs them. Both work today (I probed them). Add them to the `usage` table in
`tests/cli.errors.test.ts:18-50`; that is cheap. The stdin decision is the other gap in §4/§7 coverage (B1, item 3).

### N1 `nit`: help and error hints use raw `args[0]`/`args[1]`

`run.ts:18-20` (`target`) uses the raw argument positions. So `-f json validate ico --help` prints the top-level help,
not the ico help. Usage errors from an options-first command also get the generic hint. This is acceptable because
help must not parse, but a short comment would explain it.

### N2 `nit`: `ValidatedRecord.reason` is optional, so it needs an unreachable fallback

`format.ts:16-21, 45, 48` use `r.reason ?? ''`, and the `?? ''` branch in the text renderer is never covered.
A discriminated union (`{ valid: true } | { valid: false; reason: string }`), like the library's `ValidationResult`,
removes the fallback.

### N3 `nit`: one csv test only checks the fixture

`tests/cli.generate.test.ts:170-172` calls `csvRows` from `tests/support/cli.ts`, not the CLI. The quoting code is
still covered through `validate.test.ts:59-63` (`a,"b"`). The test could go through `run(['validate', …, '-f', 'csv'])`
or be moved into the support file's own sanity checks.

### N4 `nit`: smaller code-quality points

- `commands.ts:47, 65`: `generatorOptions` is computed twice (once in `checkCombination`, once in `generate`). Pass the
  result along.
- `commands.ts:37`: `names.map((name) => [name])` and the `([name])` destructuring wrap each name in an array for no
  reason. A plain `(string | undefined)[]` reads better.
- `parse.ts:10-27`: the generator option names repeat what `table.ts:44-57` already lists. The mapping tests would catch
  a mismatch, so this is a note only.
- `generate.test.ts:126-131`: "does not pass options that were not given" compares against `generate()` for `phone`.
  It would also pass if the CLI called `generator({})`, so it does not check the §2.2 "never passed as undefined" rule.
