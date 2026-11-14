# Review: vin (v1.1)

Reviewed 2026-11-14 by reviewer. Branch `m7-vin`, diff vs `main`: 7da8042 (draft rules), 5fc3fe5 (rules approved),
4bdf130 (tests, plus two corrected sample notes in the rules), 840a83e (implementation, wiring, seed snapshots).
Rules: `docs/rules/vin.md` (§10 approved 2026-11-14: decisions 1–10 as recommended, 3 = (a) strict; answers A–F), and
`docs/rules/core.md`.
Code: `src/vin/*`, `src/cz.ts`, `src/cli/table.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/vin.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/vin.ts`, `tests/support/cli.ts`.

**Verdict: no blocker.** The validator follows §2.5 step by step, in the approved precedence. The check digit uses the
core `weightedSum` on the transliterated string, as decision 8 says, so the core does not change. The generator, all
three edge variants and all four invalid variants match the §9 draw shapes and frozen constants. Every invalid variant
returns its own reason, and every edge variant is valid. The module follows the M1 template and matches `eic` almost
line for line. The open findings are about documentation: the README note that decision 3 promised is missing, and
the user-facing identifier lists do not include vin yet. There are also a few nits.

## 1. Tool results

`npm run check`, one run, exit 0:

| Step | Result |
| --- | --- |
| typecheck (build + full) | pass |
| lint | pass |
| knip | pass |
| coverage | pass: 63 files, 2429 tests. Every `src/vin/*` file is at 100 % on all four metrics (none is in the uncovered list) |
| build (tsdown + publint + attw) | pass; `vin` entry built for ESM and CJS |
| test:e2e | pass (32 tests) |
| size | pass: **vin own code 1 kB / 2 kB**, whole library **8.5 kB / 10 kB**, core 2.02 kB / 2.5 kB (unchanged) |

Other checks:
- `tests/support/vin.ts` imports only `fast-check`, nothing from `src/`, so the oracle is independent.
- Between 4bdf130 and 840a83e, `tests/vin.determinism.test.ts` changed only in the four inline snapshots, which the
  main session filled. No other test file changed.
- An independent script recomputed the check digits of the samples changed in 4bdf130 (`TMBJR8NX3PY123465` → 7,
  `TMBJR8NX?PY1234S6` → 8, `TM1VM11233A000001` → 7), `TMBZZZ5JZ8B012345` (→ 0, so `Z` is `badChecksum`) and
  several snapshot values (plain, `smallManufacturer` → `X`, the source of `forbiddenLetter`, `badChecksum`,
  `nonNumericSerial`). All agree with the rules and the tests. 4bdf130 corrected only arithmetic notes in §5, not
  rule content, and its commit message says so.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §1.5 / §2.5 step 1 / decision 2: anything outside ASCII `0-9A-Z` → `badFormat`, no trimming, `''` passes this step | `validate.ts:16, 25-27` | `validate.test.ts:66-76` (samples), `245-265` (10 character classes at every position) | yes |
| §2.5 step 2 / decisions 1 and 3.5: length ≠ 17 → `wrongLength`, `''` included | `validate.ts:18, 28-30` | `validate.test.ts:61-65, 233-243` | yes |
| §2.5 step 3: `I`, `O`, `Q` anywhere → `forbiddenLetter` | `validate.ts:17, 31-33` | `validate.test.ts:57-60, 217-231` | yes |
| §2.5 step 4: positions 14–17 not all digits → `nonNumericSerial`; 12–13 may be letters | `validate.ts:21, 34-36` (core `hasNonDigit`) | `validate.test.ts:54-56, 194-215` | yes |
| §2.1 transliteration, weights, mod 11, `X` for 10; any letter other than `X` in position 9 → `badChecksum` | `generate.ts:28-39`, `validate.ts:37-39` | `validate.test.ts:93-151` (each letter row, each weight, exactly one accepted character) | yes |
| §2.6 what the check digit detects | — (property of the algorithm) | `validate.test.ts:153-192` | yes |
| Decision 4: precedence | order of the `if`s in `validate.ts:25-39` | `validate.test.ts:267-284`, oracle agreement `293-320` | yes |
| Decision 5: WMI, year, plant not checked; `referenceDate` ignored | no such checks | `validate.test.ts:142-150, 286-291` (`11111111111111111`, `00000000000000000` in samples) | yes |
| §9 plain: `TMB`, VDS 5 × `ALPHABET[int(0,32)]`, `YEAR_CODES[int(0,29)]`, `digits(7)`, check digit | `generate.ts:56-60` | `generate.test.ts:23-87`, snapshots | yes |
| §9 `checkDigitX`: repeat `generate()` until position 9 is `X` | `edge.ts:14-20` | `variants.test.ts:111-123` | yes |
| §9 `smallManufacturer`: VDS, year, plant, 2 letters + 1 digit, 3 digits, `TM9` | `generate.ts:63-69` | `variants.test.ts:135-157` | yes |
| §9 `noModelYear`: plain value, position 10 = `0`, check digit recomputed | `edge.ts:24-27` | `variants.test.ts:125-133` | yes |
| §9 `badChecksum`: `intExcept(0, 10, current)` | `invalid.ts:16-20` | `variants.test.ts:189-197, 235-238` | yes |
| §9 `wrongLength`: `int(0,1)`, drop the last character or append `digits(1)` | `invalid.ts:22-25` | `variants.test.ts:199-208` | yes |
| §9 `forbiddenLetter`: `replaceDigitWithLetter(positions 0–16, 'IOQ')` | `invalid.ts:11, 27` | `variants.test.ts:210-219, 241-247` | yes |
| §9 `nonNumericSerial`: `replaceDigitWithLetter(13–16, LETTERS)`, then `withCheck` | `invalid.ts:12, 29-30` | `variants.test.ts:221-233, 248-254` | yes |
| §9 API: `createVin`, `validateVin`, `VinReason`, `VinEdgeVariant`, `VinInvalidVariant`, `VinGenerator`, stream id `vin`, no options, CLI `vin` | `index.ts`, `identifier.ts:15`, `cz.ts`, `cli/table.ts:59`, `package.json` `./vin`, `tsdown.config.ts` | `api.test.ts`, `tests/support/cli.ts:139-144` | yes |
| Determinism (core §2, A3) | one stream, no date use | `determinism.test.ts` (contract + 4 seed snapshots) | yes |

## 3. Findings

### Blocker

None.

### Should-fix

1. **Decision 3 promises a README note, and the user-facing docs do not list vin yet.** This is not the
   implementer's scope; it belongs to the main session before the merge.
   - Decision 3(a) and §2.5 say: "README explains that `badChecksum` is the last check, so apps that must accept
     pre-2022/2026 European VINs can accept that one reason." Only the TSDoc of `validateVin`
     (`src/vin/index.ts:50-52`) says this. The README says nothing about it. The eic review had the same gap.
   - Out of date with vin merged: `README.md:22` ("SPZ and VIN are planned for v1.1"), `README.md:217-218` (the list
     of entry points has no `/vin`; "all nine identifiers"), the matching lines in `README.cs.md`, `CHANGELOG.md`
     (no entry), `skills/czech-test-data/SKILL.md:3, 22` (identifier lists), `site/src/catalog.ts` (no vin page),
     and `docs/spec.md:166, 222` (checkboxes).
   - Why it matters: users and agents learn about identifiers from the README and SKILL.md, and the policy for
     legacy European VINs is the most important thing to know when using this validator.

2. **The rules header still says DRAFT.** `docs/rules/vin.md:3` reads "Status: **DRAFT**, waiting for Marek's
   approval". §10 says the rules are approved, and the other rules files say "APPROVED by Marek on …" in this
   line. §8 and §9 are also still titled "(proposal)". Someone who reads only the header can think the rules are not
   binding. The fix is one line, by the main session (the implementer does not edit rules).

### Nit

3. **`src/vin/identifier.ts:16`: `generate: (random) => generate(random)` is an unnecessary wrapper.** It was copied
   from `eic`, where `generate` has a second parameter (`lds`). vin's `generate` takes only `random`, so it can be
   passed directly, as `src/postalCode/identifier.ts` does.

4. **`checkChar` silently gives a wrong result for characters outside the alphabet, and the rules text uses one.**
   `src/vin/generate.ts:37` maps each character to `TRANSLITERATION.indexOf(char) % 10`. For a character that is
   not in the string (for example `?`, `I`), this gives `-1`, which joins as the two characters `"-1"`. The string
   then shifts every weight, and no error is raised. The TSDoc limits the input to allowed characters, and the
   validator calls `checkChar` only after `badFormat` and `forbiddenLetter`, so nothing is wrong today. However,
   §9 of the rules builds the input with a `'?'` placeholder (`withCheck(WMI + vds + '?' + y + tail)`). The
   implementation correctly uses `'0'` (`generate.ts:59, 68`), which gives the same output because position 9 has
   weight 0. A maintainer who copies the rules literally would break the check digit. A short comment at
   `generate.ts:59` would prevent that: "placeholder must be an alphabet character; any one works, weight 0".

5. **Frozen-order markers are incomplete.** Only `LETTERS` (`generate.ts:16`) says "Order frozen". `ALPHABET`,
   `YEAR_CODES` and `CHECK` (`generate.ts:18, 21, 24`) and `ALL_POSITIONS` / `SERIAL_POSITIONS`
   (`invalid.ts:11-12`) are equally part of the determinism contract (§9 "Frozen constants"); `eic` marks its arrays.

6. **`tests/vin.validate.test.ts:54`: the sample `TMBJR8NX5PY1234S6` is labelled only "S in position 16".** Its
   check digit `5` is also wrong (the correct one is `8`). The value is the one from the uncorrected rules note
   that 4bdf130 fixed. The test is correct (serial comes before checksum), but the label hides the second fault.
   Line 56 already covers "same with a wrong check digit", so this row is redundant or needs that label.
