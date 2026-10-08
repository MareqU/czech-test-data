# czech-test-data

TypeScript library + CLI that generates valid, edge-case and invalid Czech test data
(birth number / rodné číslo, IČO, DIČ, bank account, IBAN, phone, postal code, EAN, EIC).
Full specification: `docs/spec.md`. Read it before starting any milestone.

## Commands
- `npm run build` – tsdown: library (ESM + CJS + types) and CLI (`dist/cli.mjs`, ESM only) into `dist/`,
  then publint and attw check the package
- `npm test` – Vitest (unit + property-based tests with fast-check); `npm run test:watch`
- `npm run coverage` – coverage report; fails if any `src/**/validate*.ts` is below 100 % branches
- `npm run lint` – ESLint (strict type-checked, complexity limits, TSDoc required on public API in `src/`;
  in `src/` bans `Math.random`, `Date.now`, `fetch`, `node:*` imports and importing the CLI)
- `npm run typecheck` – `tsc` twice: `tsconfig.build.json` (library, no Node types) and `tsconfig.json` (everything)
- `npm run knip` – unused files, exports and dependencies
- `npm run size` – size budget from `.size-limit.ts` (run after `build`)
- `npm run check` – all of the above, same as CI; runs before `npm publish`

Validator files must be named `validate*.ts` so the 100 % branch threshold applies to them.
New public entry points go into `tsdown.config.ts` `entry`; the build then updates `exports` in package.json
and `.size-limit.ts` gives each identifier subpath its budget automatically (measured from `src/<id>/index.ts`
with the core external).
Node.js: users ≥ 22.12 (CI tests 22, 24, 26), development on 24 (`.nvmrc`).
TypeScript stays on 6.0.x until typescript-eslint supports 7.

## Conventions
- **Naming:** English name where an established English term exists, otherwise Czech; never diacritics.
  `birthNumber`, `bankAccount`, `postalCode`, `phone`, `iban`, `ean`, `eic`, but `ico`, `dic`.
  Generic terms and reason codes are English (`edge`, `invalid`, `validate`, `badChecksum`). No aliases.
- **Zero runtime dependencies.** No Faker integration.
- **Determinism:** never use `Math.random`; always the seeded PRNG from the core. Same seed = same output
  across versions; changing that is a breaking change.
- **No network access** at runtime. Bank codes are a bundled ČNB snapshot with its download date.
- **Module layout:** `src/<id>/` with generator, validator, edge variants, invalid variants and index;
  tests in `tests/<id>.<area>.test.ts`; rules in `docs/rules/<id>.md`.
- **Validators** return `{ valid: true }` or `{ valid: false, reason }` with a specific reason code.
- **Every rule cites an official source** (link in `docs/rules/<id>.md` and in a code comment).
- Public API documented with TSDoc, including the Czech meaning of the identifier.

## Workflow (one identifier at a time)
1. `rules-researcher` writes `docs/rules/<id>.md`.
2. **Human gate:** Marek approves the rules. Nothing is tested or implemented before approval.
3. `test-writer` writes `tests/<id>.*.test.ts` from the approved rules.
4. `implementer` writes `src/<id>/` until tests pass. It never edits tests or rules.
5. `reviewer` checks correctness and code quality, writes `docs/reviews/<id>.md`.
   Only `blocker` findings go back to the implementer.
6. Marek merges, next identifier.

If tests and rules contradict each other, stop and report the conflict. Do not "fix" it silently.

## Quality bar
- TypeScript strict mode, no `any`, no suppressed errors.
- ESLint with strict TypeScript rules and complexity limits.
- No unused exports or files.
- Shared logic (e.g. weighted mod 11 sums) lives in a shared utility, not duplicated per module.
- **Lightweight is enforced, not hoped for:** size budget checked in CI, min+gzip (decided 2026-10-05):
  whole library ≤ 10 kB, shared core (`src/core/`) ≤ 2 kB, each identifier ≤ 2 kB **on top of the core**.
  Amended 2026-10-07 for identifiers that reuse others (dic): the 2 kB counts the identifier's **own code** (core and
  other identifier folders external); a reusing subpath also has a standalone budget (`dic` ≤ 3 kB on top of the core).
  Reuse via fine-grained imports (`generate`, `validate`, single variant functions), never whole `edge`/`invalid` records.
  `"sideEffects": false`, ESM first.
- CLI is a separate entry point, never loaded by library imports; use `node:util` `parseArgs`, no CLI deps.
- Large data (e.g. full postal code list) only as an optional subpath import, never in the core.
