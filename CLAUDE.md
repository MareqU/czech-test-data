# czech-test-data

TypeScript library + CLI that generates valid, edge-case and invalid Czech test data
(birth number / rodné číslo, IČO, DIČ, bank account, IBAN, phone, postal code, EAN, EIC).
Full specification: `docs/spec.md`. Read it before starting any milestone.

## Commands
Filled in during M0. Expected:
- `npm run build` – build ESM + CJS + types
- `npm test` – Vitest (unit + property-based tests with fast-check)
- `npm run coverage` – coverage report (validators must have 100 % branch coverage)
- `npm run lint` / `npm run typecheck`

## Conventions
- **Naming:** English name where an established English term exists, otherwise Czech; never diacritics.
  `birthNumber`, `bankAccount`, `postalCode`, `phone`, `iban`, `ean`, `eic`, but `ico`, `dic`.
  Generic terms and reason codes are English (`edge`, `invalid`, `validate`, `badChecksum`). No aliases.
- **Zero runtime dependencies.** No Faker integration.
- **Determinism:** never use `Math.random`; always the seeded PRNG from the core. Same seed = same output
  across versions; changing that is a breaking change.
- **No network access** at runtime. Bank codes are a bundled ČNB snapshot with its download date.
- **Module layout:** `src/<id>/` with generator, validator, edge variants, invalid variants and index;
  tests in `tests/<id>.test.ts`; rules in `docs/rules/<id>.md`.
- **Validators** return `{ valid: true }` or `{ valid: false, reason }` with a specific reason code.
- **Every rule cites an official source** (link in `docs/rules/<id>.md` and in a code comment).
- Public API documented with TSDoc, including the Czech meaning of the identifier.

## Workflow (one identifier at a time)
1. `rules-researcher` writes `docs/rules/<id>.md`.
2. **Human gate:** Marek approves the rules. Nothing is tested or implemented before approval.
3. `test-writer` writes `tests/<id>.test.ts` from the approved rules.
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
