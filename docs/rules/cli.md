# CLI (M5) – design proposal

Status: **DRAFT**, waiting for Marek's approval (questions Q1–Q7 at the end).

The CLI has no official source, so this document is the contract the test-writer tests against and the implementer
implements, like `docs/rules/core.md` for M1. It only exposes the library; every value comes from the public API.

## 1. Invocation

```
czech-test-data <identifier> [options]              generate values
czech-test-data validate <identifier> [value...]    validate values (Q2)
czech-test-data [<identifier>] --help | -h          help
czech-test-data --version | -v                      package version
```

- Identifier names are the API ids in **kebab-case** (Q1): `birth-number`, `ico`, `dic`, `bank-account`, `iban`,
  `phone`, `postal-code`, `ean`, `eic`. No other spellings (no aliases, CLAUDE.md).
- Option names are kebab-case of the API option names. Option **values** and variant names are exactly the API
  strings (`--from birthNumber`, `--edge month+20`, `--invalid badChecksum`).
- Arguments are parsed with `node:util` `parseArgs`, `strict: true`. Each option at most once.
- No arguments at all: top-level help on stdout, exit 0.

## 2. Generating values

### 2.1 Common options

| Option | Value | Default |
| --- | --- | --- |
| `--count`, `-n` | integer 1–10 000 | `1` |
| `--seed`, `-s` | integer 0 … 2^32 − 1 (decimal digits only) | random, as in the library |
| `--reference-date` | `YYYY-MM-DD` | library default (today, UTC) |
| `--format`, `-f` | `text`, `json`, `csv` | `text` |
| `--edge` | edge variant name, `all` or `random` | – |
| `--invalid` | invalid variant name, `all` or `random` | – |

- `--edge` and `--invalid` are mutually exclusive.
- Variant `random` = the API call without a name (`edge()` / `invalid()`), the library picks the variant.
- Variant `all` = every variant of that kind, in definition order (`edgeVariants` / `invalidVariants`).

### 2.2 Generator options (valid values only)

| Identifier | Options → API option |
| --- | --- |
| `birth-number` | `--gender male\|female` → `gender`, `--birth-date YYYY-MM-DD` → `birthDate` |
| `dic` | `--from ico\|birthNumber` → `from`, `--gender`, `--birth-date` (as above) |
| `bank-account` | `--bank-code CODE` → `bankCode`, `--with-prefix` (flag) → `withPrefix: true` |
| `iban` | `--account ACCOUNT` → `account`, `--bank-code`, `--with-prefix` (as above) |
| `phone` | `--type mobile\|fixed` → `type` |
| `ean` | `--distributor cez\|egd\|pre\|lds` → `distributor` |
| `ico`, `postal-code`, `eic` | none |

- Only the options given are passed; an omitted option is never passed as `undefined` or `false`.
- An option the identifier does not have, or a generator option together with `--edge`/`--invalid`: usage error.
- Values and combinations are checked by the library only (e.g. `--from ico --gender male`, unknown bank code);
  its `RangeError` message is printed as an error (section 5). The CLI does not duplicate those checks.

### 2.3 Determinism

Output for the same arguments with `--seed S --reference-date D` equals, value for value, a fresh
`create<Id>({ seed: S, referenceDate: D })` called in this order:

- valid: `count` × `generator(options)` (no options: `generator()`);
- named variant: `count` × `generator.edge(name)` / `generator.invalid(name)`;
- `random`: `count` × `generator.edge()` / `generator.invalid()`;
- `all`: for each variant in definition order, `count` × that variant (variant-major).

So a value seen in the CLI can be reproduced in a test with the library, and vice versa.

### 2.4 Seed notice (Q3)

If `--seed` is not given, the CLI writes one line to **stderr** after a successful run:
`czech-test-data: seed <S>, reference date <D> (reproduce with --seed <S> --reference-date <D>)`.
Stdout stays pure data. Nothing is written when `--seed` is given.

## 3. Output formats

Each value is one record. `kind` is `valid`, `edge` or `invalid`; `variant` is the variant name when it is known
(named variant or `all`), otherwise absent (valid values, `random`).

- **text**: one value per line, nothing else (Q4). Every line ends with `\n`, including the last.
- **json**: one JSON array of objects `{ "value", "kind", "variant"? }` in this key order,
  `JSON.stringify(records, null, 2)` + `\n`.
- **csv** (RFC 4180): header `value,kind,variant`, then one row per record, `variant` empty when absent. A field is
  quoted only if it contains `,`, `"`, CR or LF (`"` doubled inside). Line ending `\n`, also after the last row.

Example: `czech-test-data ico --invalid all -f csv -s 42` → header + 3 rows `…,invalid,badChecksum` etc.

## 4. Validating values (Q2)

```
czech-test-data validate <identifier> [value...] [--reference-date D] [--format F]
```

- Values come from the positional arguments; with none, from stdin: one value per line, `\r\n` or `\n`,
  empty lines skipped. No trimming otherwise (a value with a trailing space is validated as given).
- Each value goes through the identifier's validator (`validate<Id>(value, { referenceDate })`).
- Other options (`--count`, `--seed`, `--edge`, generator options …): usage error.
- Output, one record per value in input order:
  - **text**: `<value>\tvalid` or `<value>\tinvalid\t<reason>`;
  - **json**: array of `{ "value", "valid": true }` / `{ "value", "valid": false, "reason" }`;
  - **csv**: header `value,valid,reason`, `valid` is `true`/`false`, `reason` empty when valid.
- Exit code 0 if every value is valid, 1 if at least one is invalid (output is printed either way).
  No values at all (empty stdin): usage error.

## 5. Errors and exit codes

| Exit | When | Output |
| --- | --- | --- |
| 0 | success, help, version | stdout |
| 1 | `validate`: at least one value invalid | stdout (records) |
| 2 | usage error: unknown identifier, command, option, variant or format; bad `--count`/`--seed`; option not allowed here; `RangeError` from the library | stderr only |

- Error line: `czech-test-data: <message>` + `\n`; usage errors add `Run 'czech-test-data --help' for usage.`
  (or `'czech-test-data <identifier> --help'` when the identifier is known). Never a stack trace.
- On an error nothing is written to stdout (all values are generated before printing).
- Any other exception is a bug: it is not caught.

## 6. Help

- Top-level help: the commands, common options and the list of identifiers with their Czech names.
- `<identifier> --help`: its generator options and the edge and invalid variant names (read from
  `edgeVariants` / `invalidVariants`, not a copied list). `--help` wins over every other argument and never errors
  on other invalid arguments.
- Exact wording is not part of the contract; tests check only that each listed name appears.

## 7. Structure and tests (Q5)

- `src/cli.ts` stays the `bin` entry: only reads `process.argv`, stdin, writes stdout/stderr, sets the exit code.
- The logic is a pure function in `src/cli/` (e.g. `run(args, stdin) → { stdout, stderr, exitCode }`), tested
  in-process (`tests/cli.*.test.ts`), so it counts toward coverage. Imports the library through the public
  entry points (`src/index.ts` / identifier `index.ts`), never internals.
- End-to-end smoke tests spawn the built `dist/cli.mjs` (`tests/cli.e2e.test.ts`): every format once, stdin,
  exit codes 0/1/2. They need a build, so they are excluded from `npm test` and run by a new `npm run test:e2e`
  that `npm run check` and CI call after `build`.
- Tooling follow-ups (main session): ESLint/tsconfig exceptions for `src/cli/`, knip entry, vitest exclude.

## 8. Not in v1 (Q6)

Shell completion, colours, `--output FILE`, config files, NDJSON, `--list` commands (help covers it).

## Open questions for Marek

1. **Q1 Identifier names:** kebab-case only (`birth-number`), as in the spec examples, while values and variant
   names stay API strings (`--from birthNumber`). Recommendation: yes.
2. **Q2 `validate` command:** not in the spec, but cheap and useful for testers (pipe CLI output or a CSV column
   in, get reasons out). Recommendation: include in v1.
3. **Q3 Seed notice on stderr** when `--seed` is omitted. Recommendation: yes; stdout stays clean.
4. **Q4 text format = values only**, even with `--invalid all` (variant names only in json/csv).
   Alternative: `<variant>\t<value>` for `all`. Recommendation: values only (simple for piping).
5. **Q5 E2E tests** as a separate `npm run test:e2e` after build (in `check` and CI), logic tested in-process.
   Recommendation: yes.
6. **Q6 Scope:** section 8 stays out of v1. Recommendation: yes.
7. **Q7 Limits:** `--count` max 10 000. Recommendation: yes.
