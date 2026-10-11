# Review: eic (M4)

Reviewed 2026-10-11 by reviewer, branch `m4-eic` (diff vs `main`: 653ee11 draft rules, ecefed9 decision 10,
e48b3b5 rules approved, 536bba4 tests, 5e611dd implementation and seed snapshots).
Rules: `docs/rules/eic.md` (APPROVED 2026-10-11, decisions 1–9 as recommended, 10 = (a); sections 9 and 10 are
binding), `docs/rules/core.md`.
Code: `src/eic/*`, `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/eic.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/eic.ts`.

**Verdict: no blocker.** The validator follows section 2.4 step by step, in the approved precedence, and uses the
closed form from section 2.1, which handles the forbidden `-`. The generator, both edge variants and all four invalid
variants match the section 9 draw shapes and frozen constants exactly. Every invalid variant returns its own reason and
every edge variant is valid. The mod-37 rule stays in `src/eic/` (decision 9), so the core does not change. There are
two cheap should-fix findings: the weighted sum is implemented twice inside the module, and some source links are
missing. The README note that decision 10(a) promised is also missing.

## 1. Tool results

I did not re-run `npm run check`, as the brief asked. The main session reported it green: typecheck, lint, knip,
coverage (100 % branches on `src/eic/validate.ts`), build, and size (eic own code 912 B / 2 kB, whole library
8.02 / 10 kB, core unchanged). The main session also checked these points, so I did not redo them: the implementer
did not change the tests (shasum), the four seed snapshots match an independent generator written from rules §9 and
core §1–2, and all §5 samples were recomputed. The oracle `tests/support/eic.ts` imports nothing from `src/`.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §1.5 / §2.4 step 1 / decision 3: anything outside `0-9A-Z-` → `badFormat`, no trimming, `''` passes this step | `validate.ts:9, 14-16` | `validate.test.ts:50-59` (lower case, spaces, NBSP, full-width, `_`, `*`, label) | yes |
| §2.4 step 2: length ≠ 16 → `wrongLength`, including `''` | `validate.ts:10, 17-19` | `validate.test.ts:46-49, 115-116` | yes |
| §2.4 step 3 / decision 1: prefix exactly `27ZG` → `wrongPrefix` | `validate.ts:20-22`, `generate.ts:10` | `validate.test.ts:37-45, 117-118` (ENTSO-E-valid foreign codes) | yes |
| §2.4 step 4: trailing `-` → `dashCheckCharacter` before the sum | `validate.ts:23-25` | `validate.test.ts:35-36, 101-108, 119` (property: any 27ZG body + `-`) | yes |
| §2.1 / §2.4 step 5: `Σ (17 − i) · value ≡ 0 (mod 37)` → else `badChecksum` | `validate.ts:26-33` | `validate.test.ts:76-99` (exactly one accepted last character, none when the value is 36; ENTSO-E formula as a second oracle) | yes |
| Decision 4: positions 5–15 not structure-checked | `validate.ts:12` | `validate.test.ts:21-25` (`V`, `N`, LDS, `27ZG---VPB-----V`) | yes |
| `referenceDate` ignored | `validate.ts:13` (no options) | `validate.test.ts:126-134`, `generate.test.ts:34-43` | yes |
| §5: 8 valid and 31 invalid samples | – | `validate.test.ts:17-74` | yes |
| §9 frozen constants `PREFIX`, `POINT_TYPE`, `BIG_DSO_SUFFIX`, `REGION_DIGITS`, LDS 1–99, `ALPHABET`, `DASH`, `OTHER_TYPES` | `generate.ts:10-20`, `invalid.ts:10` | shapes in `generate.test.ts:45-63`, `variants.test.ts:97-104, 161-171`; order through the seed snapshots | yes |
| §9 `checkValue` = `(37 − S mod 37) mod 37`, weights 16..2 | `generate.ts:23-29` | `validate.test.ts:77-88` | yes |
| §9 `drawBody`: `pick(REGION_DIGITS)`, then `int(1, 99)` padded (lds) or `00`, `Z`, `digits(7)` | `generate.ts:37-41` | seed snapshots | yes |
| §9 plain: redraw the body while the check value is 36 | `generate.ts:44-50` | `generate.test.ts:27-32` | yes |
| §9 `checkCharacterDigit`: first plain value ending in a digit | `edge.ts:14-20` | `variants.test.ts:83-95` | yes |
| §9 `lds` = plain with `drawBody(true)` | `edge.ts:22` | `variants.test.ts:27-29, 97-104` | yes |
| §9 `badChecksum`: `int(0, 34)` mapped past the correct value | `invalid.ts:14-19` | `variants.test.ts:34-37, 136-145, 163-164` (all 35 other characters reached) | yes |
| §9 `wrongLength`: `int(0, 1)` → 15 characters / 16 + `digits(1)` | `invalid.ts:21-24` | `variants.test.ts:39-42, 165-166` | yes |
| §9 / decision 7 `wrongPrefix`: `27` + `pick(OTHER_TYPES)` + `v.slice(3, 15)`, redraw on 36, recomputed check | `invalid.ts:26-33` | `variants.test.ts:44-47, 147-159, 167-168` | yes |
| §9 `dashCheckCharacter`: `drawBody(false)` until the value is 36, then `-` | `invalid.ts:35-41` | `variants.test.ts:49-52, 169-170` | yes |
| §9 public API: no options, `createEic`, `validateEic`, four types, stream id `eic`, `createCz().eic` / `.validate.eic`, subpath entry | `index.ts`, `identifier.ts`, `cz.ts`, `tsdown.config.ts`, `package.json` | `api.test.ts` (types and shared contract) | yes |
| Decision 10(a): "the README states that generated EICs are test data, not allocated codes" | TSDoc `index.ts:21` only | – | **no**, see S3 |

## 3. Findings

### Blockers

None.

### Should-fix

**S1. The weighted mod-37 sum is implemented twice in the module (`src/eic/generate.ts:23-29`,
`src/eic/validate.ts:26-33`).** `checkValue` loops over the 15-character body with weights `16 − i`. The validator
has its own loop over 16 characters with weights `16 − i`, in the closed form. Both are correct, and both are tested
against the oracle, but this is the same rule written twice. ean's validator reuses `checkDigitOf` from its
`generate.ts`, and ico does the same. After step 4 the last character is never `-`, so this one line is equivalent:
`checkValue(value.slice(0, 15)) !== ALPHABET.indexOf(value.charAt(15))`. When the computed value is 36, no character
0–35 matches, so the sample `27ZG100Z00000370` still gets `badChecksum`. The fix is cheap: one loop in one place, a
few bytes less, and the module matches ean. Branch coverage stays at 100 %, because the validator loses a loop but no
branch.

**S2. Some rules are cited without a link (`src/eic/validate.ts:2`, `src/eic/index.ts:3`,
`src/eic/generate.ts:9-12`).** CLAUDE.md requires a link in a code comment for every rule. This is the same issue as
ean S1. `validate.ts:2` cites the ENTSO-E Reference Manual 5.5 § 5.2 (alphabet, upper case) and IG v1.2 § 5.3 by title
only. `index.ts:3` cites vyhláška 349/2015 Sb. without the zakonyprolidi.cz URL. The Czech-specific rules are the
`27ZG` prefix (`generate.ts:9-10`), which is the validator's only Czech check, and `REGION_DIGITS` without `8`
(`generate.ts:12`). They come from the ERÚ appendix that is already linked on line 6. But the comment on line 5
attributes that link only to the never-`-` rule, and the `PREFIX` TSDoc gives no source. The URLs are in rules §6.
These are comment-only changes and cost no bytes.

**S3. The README note from decision 10(a) is missing (`README.md`).** Rules §10 records Marek's decision: *"Proceed
with the generator; the README states that generated EICs are test data, not allocated codes."* The `createEic` TSDoc
says this (`index.ts:21`), but the README has no EIC note. The README already has notes of the same kind for birth
numbers, phones and postal codes. This is outside `src/`, so the implementer does not own it, and it is not a code
blocker. But the decision was approved on the condition of this note. It should exist before the branch is merged,
or before v1 at the latest.

### Nits

**N1. `generate(random, lds = false)` is a positional boolean flag (`src/eic/generate.ts:44`, `src/eic/edge.ts:22`,
`src/eic/identifier.ts:16`).** `generate(random, true)` does not say what `true` means at the call site. Because of
the extra parameter, `identifier.ts` must wrap `generate` (`(random) => generate(random)`), while ico and postalCode
pass it directly. TypeScript stops anyone from passing `generate` directly, because `NoOptions` is not `boolean`, so
nothing is broken. A short comment at `identifier.ts:16` would be enough, or so would a named helper such as
`generateLds`, or the same loop with a predicate. Note only.

**N2. The "draw a different value" step has a sixth copy (`src/eic/invalid.ts:18`; follows ean N2 / iban N2).** Rules
§8.1 predicted this. eic adds no `LETTERS` copy and no non-digit regex, because EIC has no `letters` reason, so the
picture for ean N1 is unchanged. The core is still untouched, with about 70 B left. iban N2 asked to revisit this
"with EAN/EIC", and EIC is now here, so this is the point to decide. Moving the step costs more than it saves, unless
a later identifier (SPZ/VIN in v1.1) adds more copies.

## 4. Code quality notes (no action)

- The module follows the M1 template: `generate`, `validate`, `edge`, `invalid`, `identifier`, `index`.
  `identifier.ts` and `index.ts` have the same shape as ean/ico. There is no cross-identifier import and no new core
  code, so eic needs only the flat 2 kB budget row.
- The comments explain why. They name the bug each variant catches (`edge.ts:13, 21`, `invalid.ts:25, 34`), why the
  validator tests the whole sum against 0 (`validate.ts:26`), why `8` is missing from the region digits
  (`generate.ts:12`), and why the generator retries on `-` (`generate.ts:43`, "like OTE skipping a sequence number").
  The rejection-sampling average "3.6 draws" (`edge.ts:13`) is correct: 36 possible check characters, 10 of them
  digits.
- The TSDoc gives the Czech meaning (*EIC kód odběrného místa plynu*). It says the code has 16 characters made of
  digits, capital letters and `-`, as rules §7 item 7 asks. It also states the reason precedence, the `RangeError`
  contract and that the values are test data. Its example is worked example 2 (`27ZG100Z0000001K`). The API matches
  `docs/spec.md` line 78 (`cz.eic()`) and has no options (decision 8).
- The tests read like a specification. Each sample carries its reason and a short why. Precedence pairs are named
  after decision 2. A property test checks that exactly one last character is accepted per body, and none when the
  value would be 36. Each variant gets a shape check, its reason, and a check that it derives from the plain value of
  the same stream. The `wrongPrefix` redraw case is handled explicitly (`variants.test.ts:147-159`).

## 5. Resolution (main session, 2026-10-11; open nits for Marek)

- S1 fixed (implementer): the validator reuses `checkValue` from `generate.ts`; the duplicated loop is gone. eic own
  size 912 B → 907 B. Tests unchanged, `npm run check` green.
- S2 fixed (main session, comments only): source links added in `validate.ts` (ENTSO-E RM 5.5, IG v1.2), `index.ts`
  (IG v1.2, vyhláška 349/2015 Sb.) and at `PREFIX` / `REGION_DIGITS` in `generate.ts` (ERÚ appendix "EIC kódy").
- S3 deferred to M5: the README is still a stub; the note "generated EICs are test data, not allocated codes"
  (decision 10) is recorded for the M5 README together with the disputed-variant notes.
- N1, N2: not changed; left for Marek (N2 together with ean N2 / iban N2).
