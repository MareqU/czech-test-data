# Review: phone (M2)

Reviewed 2026-10-06 by reviewer.
Rules: `docs/rules/phone.md` (APPROVED 2026-10-06; section 9 decisions and section 10 clarifications win).
Code: `src/phone/*`, the working-tree diff of `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/phone.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/phone.ts`.

**Verdict: one blocker (B1).** It is documentation, not code: approved decision 8 asks for a README warning,
and the README does not have it. The validator, generator and variants match the rules. The validator
implements every step of section 2, the precedence of section 8 and all six clarifications of section 10.
I checked every three-digit prefix 000–999 by hand against sections 3.1–3.3 (see section 3). The
should-fix items are a cross-module duplication and a misleading TSDoc example.

## 1. Tool results

I did not re-run `npm run check`; the main session had already run it, and the brief said to skip it.
The main session reported:

| Check | Result |
| --- | --- |
| `npm run check` (lint, typecheck, test, coverage, knip, build, size) | pass |
| Tests | 880 pass |
| Coverage | `src/phone/validate.ts` 100 % branches |
| Size | phone 1.44 kB on top of the core (budget 2 kB) |
| Tests untouched by the implementer | yes (shasum) |
| Seed snapshots (124 values) | each value checked against the rules by an independent script |

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2 step 1 `letters` (`\p{L}`), wins over everything (cl. 3) | `validate.ts:14, 66-68` | `validate.test.ts:59-63, 106-108, 203-218` | yes |
| §2 step 2 characters: digits, leading `+`, single ASCII spaces, no trim | `validate.ts:16, 69-71` | `validate.test.ts:64-83, 220-234` | yes |
| §2 step 3 prefix `+` / `00`; `G` empty → `badFormat`; not `420` → `wrongCountryCode` (cl. 1, 2) | `validate.ts:27-32, 45-57` | `validate.test.ts:50-58, 74-77, 114-116, 179-192` | yes |
| §2 step 4 one optional space after `420` | `validate.ts:58-59` | `validate.test.ts:24-27`, `support/phone.ts:78-86` | yes |
| §2 step 5 length before grouping | `validate.ts:77-79` | `validate.test.ts:43-52, 118-121, 165-201` | yes |
| §2 step 6 `ddddddddd` / `ddd ddd ddd` | `validate.ts:17, 80-82` | `validate.test.ts:78-80, 123-125` | yes |
| §2 step 7 / §3.1–3.3 ranges, `20…` unknown (dec. 9), `910` valid (dec. 3), `610`–`614` special, `720000112` special (dec. 6) | `validate.ts:22-24, 34-42` | `validate.test.ts:84-99, 140-163` (all 1000 three-digit prefixes against an independent oracle) | yes |
| §8 generator: mobile prefixes, redraw of `720000112`; fixed prefixes, redraw of `20…`; default format; `type` → `RangeError` | `generate.ts:18-27, 51-79` | `generate.test.ts` throughout | yes |
| §4 edge variants (six) incl. cl. 4 format of `newMobileRange` | `edge.ts:20-27` | `variants.test.ts:17-64` | yes |
| §4 invalid variants (five), one fault each, cl. 4/5 formats | `invalid.ts:14-49` | `variants.test.ts:72-147` | yes |
| cl. 6 / §2: `referenceDate` accepted and ignored | `index.ts:63-65`, `validate.ts:65` | `api.test.ts:69-76`, `determinism.test.ts:67-77` | yes |
| core §3: `cz.phone`, `cz.validate.phone`, independent PRNG stream | `cz.ts` diff | `api.test.ts:101-135` | yes |
| Decision 8: README warns that valid numbers may be real | **missing** | (doc) | **no → B1** |

## 3. Correctness notes (no finding)

- **Range regexes.** I expanded `VALID_RANGE` and `SPECIAL_RANGE` (`validate.ts:22-24`) prefix by prefix and
  compared them with sections 3.1–3.3. 0x, 1x, 2x, 3x, 4x, 5x, 60x, 61x, 62–69, 70x, 71x, 72–79, 80x,
  81x–84x, 85–89, 90x, 91x, 92–99 all agree with the rules. The rules' 3.3 list is exactly what
  falls through to `unknownPrefix`. The `720000112` check runs before `VALID_RANGE`, so the number inside `72`
  becomes `specialPrefix`.
- **Step 3 shortcut.** The comment at `validate.ts:50-51` claims that "G is empty" equals "rest is empty or starts with a
  space" and that "G starts with 420" equals "rest starts with 420". Both hold because `420` contains no space. `+ 420…`
  is already rejected by `ALLOWED_CHARACTERS` at step 2 with the same reason, so the result is the same.
- **ReDoS.** `ALLOWED_CHARACTERS` needs a space before every repeated group, so it cannot backtrack
  catastrophically.
- **Invalid variants have one fault.** `wrongLength` uses a plain mobile prefix and no spaces. `letters` replaces only
  national digit positions (`invalid.ts:23` matches `+420 ddd ddd ddd`). `wrongCountryCode` uses a valid
  national part. `unknownPrefix` uses exactly the look-alikes from section 4. `specialPrefix` excludes `82x` and the
  contested ranges, as section 4 says.
- **Rules ↔ tests.** No contradiction found. Every sample of section 5 and every clarification of section 10 has a test.

## 4. Findings

### Blocker

**B1 – The README warning from decision 8 is missing.** `docs/rules/phone.md:403` (decision 8) and `:202-203`
say: "Valid output may be a real number; the README warns about it" / "never send SMS or call generated
numbers". `README.md` has only the birth-number warning (`README.md:6`). The TSDoc of `createPhone`
(`src/phone/index.ts:29-30`) and the file comment (`index.ts:3`) mention it, but the approved decision names
the README. For phone the harm is concrete: a tester who sends SMS to generated numbers reaches strangers. Fix:
one sentence next to the existing warning, for example extend it to "…birth number or phone number may
belong to a real person; never call or text generated phone numbers". The birthNumber review counted its README
sentence as a rule (`docs/reviews/birthNumber.md:43`), so this follows the same standard.

### Should-fix

**S1 – The `letters` mutation is duplicated across identifiers.** `src/phone/invalid.ts:21, 32-36` and
`src/birthNumber/invalid.ts:36, 76-80` share the `LETTERS = ['A', 'O', 'l']` list and the "pick a digit position,
splice in a picked letter" code. `src/phone/validate.ts:14` and `src/birthNumber/validate.ts:22` both define
`LETTER = /\p{L}/u`. CLAUDE.md says shared logic belongs in a shared utility. Every later identifier with a `letters`
variant (IČO, DIČ, bank account, …) would copy it again. A core helper `replaceWithLetter(random, value,
positions)` plus the regex keeps the draw order (position, then letter), so no seed snapshot changes. It is cheap
now and gets more expensive with each identifier. If it touches too much merged birthNumber code for this
branch, do it with IČO at the latest.

**S2 – The TSDoc example misdescribes the output.** `src/phone/index.ts:37`: `phone(); // '+420 7xx xxx xxx'`
with `createPhone({ seed: 42 })`. The plain generator picks `6xx` prefixes for 8 of its 16 prefixes, and seed 42
actually gives `'+420 606 367 819'` (`tests/phone.determinism.test.ts:218`). Readers will think plain numbers
always start with 7. Use `'+420 ddd ddd ddd'` (the placeholder style of the birthNumber example) or the real
value.

### Nit

**N1 – `range()` is a generic helper inside the phone generator.** `src/phone/generate.ts:29-32` is exported
only for `invalid.ts:14, 17`. It has nothing to do with generating phones. Either keep it local to `invalid.ts`, or
move it to core when a second identifier needs it.

**N2 – The numbering plan has two representations.** The valid ranges are written as regexes in `validate.ts:22`
and again as prefix lists and constants in `generate.ts:18-24` and `edge.ts:14-17`. If the plan changes (as it did in 2022 and
2024), all three places must be edited. The tests catch a mismatch (every generated value must validate), and the
regex is the smaller form for the size budget. This is acceptable; it is noted here so it stays a conscious choice.

**N3 – `cz.validate.phone` reads the clock for nothing.** `src/cz.ts` (diff): `phone: (value) =>
validatePhone(value)` lets the core resolve the default `referenceDate` through `todayUtc()` on every call, although
phone ignores it. `validatePhone(value, { referenceDate })` would match the birthNumber line and skip the
`Date` call. There is no observable difference.

**N4 – Amendments are cited without links.** `src/phone/edge.ts:13` (vyhláška č. 22/2022 Sb.) and `:16`
(267/2009 Sb.) name the decree but give no URL. The rules link both (`docs/rules/phone.md:316-320`), and
birthNumber links its amendment inline (`src/birthNumber/edge.ts`, zákon 53/2004 Sb.).

**N5 – (tests, for the test-writer) The non-breaking spaces are invisible.** `tests/phone.validate.test.ts:72-73, 225`
contain literal U+00A0 characters. A reader sees an ordinary space, so `'+420 601 123 456' → badFormat` looks
wrong. `' '` would make the intent visible. The variant name lists are also repeated in
`phone.api.test.ts:14-15`, `phone.variants.test.ts:13-14` and `phone.determinism.test.ts:18-19`; they could live in
`tests/support/phone.ts`.

## 5. Code quality summary

The module follows the M1 template exactly like birthNumber: `generate`/`validate`/`edge`/`invalid`/`index`,
`defineIdentifier`, the same TSDoc shape, the subpath entry in `tsdown.config.ts` and `package.json`, and the
`cz.ts` wiring. The validator reads step by step against section 2, and each comment cites the step or decision.
The tests read like a specification. Section 5 samples are copied verbatim, the precedence has its own
`describe`, and the 1000-prefix sweep against an independent oracle is the strongest check of the range table.

## 6. Resolution (main session, 2026-10-06)

- B1 fixed: `README.md` warning now covers phone numbers (decision 8).
- S2 fixed: `createPhone` example shows the real seed-42 value `'+420 606 367 819'`.
- N4 fixed: links to 22/2022 Sb. and 267/2009 Sb. added in `src/phone/edge.ts`.
- Open for Marek: S1 (shared `letters` helper in core, together with N3 of birthNumber before IČO), N1–N3, N5.

## Follow-up (branch core-shared-helpers, 2026-10-07)

- S1 resolved: `src/core/letters.ts` (`hasLetter`, `replaceDigitWithLetter`) is used by birthNumber, phone and
  postalCode. Draw order is unchanged, so no seed snapshot changed.
