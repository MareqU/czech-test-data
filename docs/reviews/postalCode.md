# Review: postalCode (M2)

Reviewed 2026-10-07 by reviewer.
Rules: `docs/rules/postalCode.md` (APPROVED 2026-10-06; sections 8 and 9 and the 2026-10-07 clarification win),
`docs/rules/core.md` incl. A1–A3.
Code: `src/postalCode/*`, `git diff main` of `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/postalCode.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/postalCode.ts`.

**Verdict: no blocker.** Every step of section 2, every decision of section 8 and the contract of section 9 are
implemented and tested. Each invalid variant has exactly one fault and returns its own reason, both edge variants
are valid, and the validator and the rest of the module have 100 % branch coverage. The should-fix items are
cheap: one `cz.ts` line that breaks a core contract, one TSDoc gap, missing source links, a small duplication and
a README sentence.

## 1. Tool results

| Check | Command | Result |
| --- | --- | --- |
| Full check | `npm run check` | not re-run on the caller's instruction; reported as passing (837 tests, `postalCode` 814 B on top of core) |
| Tests + coverage (scoped) | `CI=true npx vitest run tests/postalCode --coverage --coverage.include='src/postalCode/**'` | pass: 5 files, 104 tests. Branches **17/17**, statements 43/43, functions 20/20 across all 5 files (`validate.ts` included) |
| Probe (scratchpad, deleted) | `validatePostalCode('623 00', { referenceDate: 'x' })`; clock reads of `cz.validate.*` | throws `RangeError` naming `referenceDate`; `cz.validate.postalCode` reads the clock once per call, `cz.validate.birthNumber` 0 times (see S1); `createPostalCode({ seed: 42 })()` is `'514 24'` (see N1) |

Seed snapshots were verified independently against section 2 by the main session (per brief), so I did not
check them again.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2 step 1: any `\p{L}` → `letters` | `validate.ts:12, 26-28` | `validate.test.ts:45-47, 67-73`; oracle properties `:80-96` | yes |
| §2 step 2: anything but `0-9` and U+0020 → `badFormat` (NBSP, tab, newline, dot, hyphen, full-width) | `validate.ts:13, 29` | `validate.test.ts:50, 54-58` | yes |
| §2 step 3: at most one space, only at index 3; no trimming | `validate.ts:19-22, 29` | `validate.test.ts:44, 48-53, 66, 72` | yes |
| §2 step 4: digit count ≠ 5 → `wrongLength` (`''`, `'623 '`) | `validate.ts:32-35` | `validate.test.ts:38-43, 68` | yes |
| §2 step 5 + decision 2: first digit 0/8/9 → `foreignRange` | `validate.ts:15, 36-38` | `validate.test.ts:33-37, 98-108` | yes |
| §2 precedence `letters` → `badFormat` → `wrongLength` → `foreignRange` | order of `validate.ts:26-39` | `validate.test.ts:64-77` | yes |
| §2: no date dependence | inner validator ignores the context | `validate.test.ts:110-113`, `determinism.test.ts:69-79` | yes |
| §5 known samples (all valid and invalid rows) | – | `validate.test.ts:14-61` | yes, every row present |
| Decision 3: existence not checked, no list | no data in the module | `validate.test.ts:23-28` (`799 99`, `12345`) | yes |
| Decision 4: NBSP → `badFormat` | `validate.ts:13` | `validate.test.ts:54` | yes |
| Decision 5: edge `nonGeographic` = `2[0-4]N NN` | `edge.ts:16` | `variants.test.ts:27-29, 67-78` | yes |
| Edge `withoutSpace` = plain distribution without space | `edge.ts:14` | `variants.test.ts:24-26, 93-97` | yes |
| Decision 6 + clarification: `badFormat` variant, 7 shapes, leading/trailing space on the machine form | `invalid.ts:17-25, 44` | `variants.test.ts:56-60, 146-154` | yes |
| §4 `wrongLength`: 4 or 6 digits, d1 1–7, space only at index 3 | `invalid.ts:28-31` | `variants.test.ts:42-46, 132-138` | yes |
| §4 `letters`: one digit of a valid `NNN NN` → `A`–`Z` | `invalid.ts:34-38` | `variants.test.ts:47-55, 140-144` | yes |
| §4 `foreignRange`: `NNN NN` with d1 ∈ {0, 8, 9} | `invalid.ts:46` | `variants.test.ts:61-63, 156-160` | yes |
| Decision 7: d1 uniform 1–7, d2–d5 uniform 0–9, 20x–24x not excluded | `generate.ts:5-7` | `generate.test.ts:39-72` | yes |
| §9: `NoOptions`, stream id `postalCode`, subpath, `createPostalCode`/`validatePostalCode` | `index.ts:20-22, 41-59`, `tsdown.config.ts:7`, `package.json` exports | `api.test.ts:22-141` | yes |
| §9: CLI command `postal-code` | – | – | out of scope (known: `cli.ts` is a stub) |

Every invalid variant is checked against the validator **and** the independent oracle for 300 seeds × 10 values
(`variants.test.ts:101-113`). Every edge value passes the validator (`:67-91`).

## 3. Findings

### Blocker

None.

### Should-fix

**S1. `cz.validate.postalCode` ignores the instance's `referenceDate`.** `src/cz.ts:64` calls
`validatePostalCode(value)` without options. `docs/rules/core.md` section 3 says: "`cz.validate.<id>(value)` uses
the instance's `referenceDate`". The result is the same, because PSČ does not depend on the date. But each call
now resolves a default date and reads the clock (probe: one `toISOString` call per validation, none for
`cz.validate.birthNumber`). This line is the pattern the next identifiers will copy. Fix:
`postalCode: (value: string) => validatePostalCode(value, { referenceDate })`.

**S2. The TSDoc of `validatePostalCode` is missing `@throws`.** `src/postalCode/index.ts:55` says the options
are "Accepted for symmetry", but an invalid `referenceDate` throws `RangeError` (probe confirms it; the core
contract requires it, `docs/rules/core.md` section 3). `src/birthNumber/index.ts:64` documents this. Add the
same `@throws RangeError naming referenceDate …` line, so users know the option is still checked.

**S3. Code comments cite sources without links.** CLAUDE.md: "Every rule cites an official source (link in
`docs/rules/<id>.md` and in a code comment)". birthNumber does this (`src/birthNumber/validate.ts:3-4, 27, 32`).
postalCode names the sources but gives no URL:
- `validate.ts:2-3` and `generate.ts:9`: UPU sheet. Link:
  `https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/czeEn.pdf`.
- `validate.ts:14` and `edge.ts:15`: the official list, "checked 2026-10-06". Link:
  `https://www.ceskaposta.cz/documents/d/guest/csv_psc_a-zip`.
- `invalid.ts:45`: Poštovní podmínky, Příloha č. 3. Link:
  `https://www.ceskaposta.cz/documents/d/guest/postovni-podminky-zakladni-postovni-sluzby`.
- `edge.ts:13`: ČÚZK VFR section 3.3.20. Link from rules section 6, item 6.

**S4. `wrongLength` duplicates `formatPostalCode`.** `src/postalCode/invalid.ts:30` builds
`` `${digits.slice(0, 3)} ${digits.slice(3)}` ``. This is exactly `formatPostalCode(digits)` (`generate.ts:10-12`),
which also works for 4 and 6 digits. Use the helper so that "the space after the 3rd digit" is defined in only
one place. The output stays the same and the snapshots do not change.

**S5. The README sentence from the rules is missing.** Rules section 3.4 says the existence caveat "belongs in the
README", and the answer to open question 3 says "README: generated PSČ are well-formed, most do not exist". The
TSDoc says this (`index.ts:26`), but `README.md` does not. birthNumber added its note there (`README.md:8`). A
user who checks PSČ against the Česká pošta list will see most generated values rejected, so one sentence is enough.

### Nit

**N1.** `src/postalCode/index.ts:33`: in the example, `createPostalCode({ seed: 42 })` is followed by
`postalCode(); // '123 45'`. That looks like the real output for seed 42, but the real output is `'514 24'`. Use
`'514 24'`, or a shape such as `'NNN NN'` (birthNumber uses `'905501/XXXX'`).

**N2.** `src/postalCode/index.ts:39`: "@throws … or the variant for an unknown name". `createPostalCode` does not
throw for variant names; the returned generator does. birthNumber keeps the two cases apart
(`src/birthNumber/index.ts:31`, "The returned generator throws `RangeError` too").

**N3.** The foreign first digits appear twice: as `/^[089]/` (`validate.ts:15`) and as an inline `[0, 8, 9]`
(`invalid.ts:46`). The inline array is created on every call, unlike the named `DIGIT_POSITIONS` next to it. One
named constant, for example in `generate.ts` next to `drawDigits` (which holds the 1–7 rule), would keep zone
knowledge in one place.

**N4.** `src/postalCode/validate.ts:19-22`: in `hasValidSpace`, `!value.includes(' ')` repeats the search that
`indexOf` has already done. `first === -1 || (first === SPACE_INDEX && …)` says the same thing more directly.

**N5 (tests, for the test-writer).** `tests/postalCode.determinism.test.ts:10` imports `dateArb` from
`tests/support/birthNumber.ts`. A generic arbitrary used by several identifiers belongs in
`tests/support/helpers.ts`. `tests/support/postalCode.ts:5` exports `POSTAL_CODE_REASONS`, but only its type is
used, and only in the same file, so the export can go.

## 4. Code quality notes (no finding)

- The module follows the M1 template exactly like birthNumber: `defineIdentifier` in `index.ts`, variant
  records typed against the reason union, `PostalCodeInvalidVariant` ⊆ `PostalCodeReason` (`api.test.ts:27`),
  and `NoOptions` falls out of a `generate` without options (A2).
- No checksum, so nothing belongs in shared mod-11 utilities. The local `\p{L}` check repeats birthNumber's. This
  is known and accepted, and will move into the shared helper planned as S1 of the phone review.
- The tests read like a specification: each `describe` cites its rules section, the section 5 samples are listed
  row by row with their reasons, and an oracle written from the rules guards the validator on arbitrary strings.

## 5. Resolution (main session, 2026-10-07)

- Fixed (doc and comment only): S2, S3, S5, N1, N2.
- Open for Marek: S1, S4, N3, N4 (code, implementer) and N5 (tests, test-writer).
