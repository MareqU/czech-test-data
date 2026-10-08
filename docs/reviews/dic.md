# Review: dic (M3)

Reviewed 2026-10-08 by reviewer, branch `m3-dic` (diff vs `main`).
Rules: `docs/rules/dic.md` (APPROVED 2026-10-07; sections 9 and 10 are binding, decision 1 in its amended form).
Code: `src/dic/*`, `git diff main` of `src/birthNumber/edge.ts`, `src/birthNumber/invalid.ts`, `src/ico/invalid.ts`,
`src/cz.ts`, `tsdown.config.ts`, `package.json`, `.size-limit.ts`, `CLAUDE.md`.
Tests: `tests/dic.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/dic.ts`, and the two test
lines the main session changed in HEAD.

**Verdict: no blocker.** Every step of section 2.1, the reason mapping, the draw orders of section 4, the options and
`RangeError`s of section 8, and decisions 1–11 and the clarifications of section 10 are implemented and tested.
Reuse is fine-grained. The three should-fix items are size and duplication fixes: about 50 B of dic's own code and
about 100 B of the standalone bundle.

## 1. Tool results

The main session ran `npm run check` before this review, and I did not run it again (brief).

| Step | Result |
| --- | --- |
| `typecheck`, `lint`, `knip`, `build` (publint, attw) | pass (main session) |
| `coverage` (1326 tests, 100 % branches on `validate*.ts`) | pass (main session) |
| `size` | pass: whole 5.67 / 10 kB, core 1.91 / 2 kB, dic own code 1.25 / 2 kB, dic standalone 2.4 / 3 kB, birthNumber 1.99 / 2 kB |

The main session also verified the seed snapshots with the rules oracle and checked that the implementer did not
change the tests. I did not check those again. My own rolldown builds (min, `gzip -9`) gave dic own code 1134 B and
standalone 2288 B. The numbers below that compare sizes use this method.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2.1 step 1: `CZ` in any case; two `\p{L}` → `foreignPrefix`; empty or leading digit → `missingPrefix`; else `badFormat` | `validate.ts:24-25, 35-40, 63-65` | `validate.test.ts:90-117`, samples `:33-49` | yes |
| §2.1 steps 2–4: `letters` → `badFormat` → `wrongLength` (8–10) | `validate.ts:42-51` | `validate.test.ts:119-135`, samples | yes |
| §2.1 step 5: 8 digits → ico `validate`; 9 digits `6…` → assigned; otherwise birthNumber `validate` with `referenceDate` | `validate.ts:52-59` | `validate.test.ts:137-190` | yes |
| §2.1 mapping: only `badChecksum` → `badInnerChecksum`; the `InnerReason` type makes a new inner reason fail to compile | `validate.ts:28-33` | precedence and oracle properties `:227-270` | yes |
| §2.4: `d9 = (a + 8) mod 10` over `d2…d8`, weights 8…2, `weightedSum` from core | `generate.ts:30, 39-42` | `validate.test.ts:197-225` (all `a` = 0…10) | yes |
| §3.5 / decision 4: `6…` with 9 digits is never a birth number | `validate.ts:55-57` | `validate.test.ts:145-156` | yes |
| §5: all valid and invalid samples | – | `validate.test.ts:20-88` | yes |
| §8: plain = form draw `int(0, 1)`, then ico / birthNumber plain | `generate.ts:54-57, 79-81` | `generate.test.ts:21-85` | yes |
| §8 / §10: `from: 'ico'` makes no form draw; `from: 'birthNumber'` alone makes no form draw; `gender`/`birthDate` imply birthNumber | `generate.ts:73-89` | `generate.test.ts:87-172` | yes |
| §8: `RangeError` naming `from`, `gender`, `birthDate`; `birthDate` < 1900-01-01 throws | `generate.ts:59-70, 82-84` | `generate.test.ts:101-110, 174-205` | yes |
| §4 edge: `fromIco`, `fromBirthNumber`, `lowercasePrefix`, `pre1954`, `vatGroup`, in this order and draw order | `edge.ts:15-22` | `variants.test.ts:30-136` | yes |
| §4 invalid: `missingPrefix`, `foreignPrefix` (pick first, 26 prefixes, `EL`), `badInnerChecksum` (form draw, then ico/birthNumber `badChecksum`) | `invalid.ts:11-21` | `variants.test.ts:138-224` | yes |
| §8: `cz.dic`, `cz.validate.dic` with the instance `referenceDate`, subpath `./dic` | `cz.ts`, `tsdown.config.ts`, `package.json` | `api.test.ts:69-121` | yes |
| Decision 1 (amended): only fine-grained imports into `src/dic/` | `edge.ts:2-4`, `invalid.ts:3-5`, `generate.ts:4-9`, `validate.ts:4-7` | – (by reading the code) | yes |
| Decision 2: `lowercasePrefix` marked disputed in TSDoc | `edge.ts:7-11` | – | yes (README: see nit 6) |

**Reuse check (focus of the brief).** `src/dic/` imports only `generate`/`validate` of ico and birthNumber, plus the
named functions `pre1954` (birthNumber edge) and `badChecksum` (ico and birthNumber invalid). It never imports
another identifier's `identifier.ts` or a whole `edge`/`invalid` record. `src/dic/identifier.ts` is dic's own module,
which follows the template. In the standalone bundle, rolldown drops the `edge`/`invalid` record objects of ico and
birthNumber (see should-fix 3 for what it keeps).

**Unchanged outputs.** The `pre1954` body in `birthNumber/edge.ts:40-42` is the old inline arrow, byte for byte, and
the record now references it. `ico/invalid.ts` and `birthNumber/invalid.ts` only add `export`. The ico and
birthNumber tests and support files are unchanged against `main`, and their seed snapshots still pass.

**Test lines the main session changed (HEAD).** Both changes are correct:
- `generate.test.ts:118-119`: the old `not.toMatch(/^CZ6/)` contradicted §3.5 and decision 4. A 10-digit birth
  number from the 1960s (`CZ6…`, see the sample `CZ6006150140`) is valid. Only a 9-digit `6…` inner part is excluded.
- `determinism.test.ts:42-43`: `repeatDates` from 1954 could fall before the fixed `birthDate` `1990-05-01` used in
  `firstOutputs`, which throws. The window now matches `birthNumber.determinism.test.ts:48`.

**`.size-limit.ts`.** It follows amended decision 1. The `ignore` list comes from the subpath list, so no identifier
is hard-coded there. Only the standalone limit is per identifier (`standaloneLimits`), and it is 3 kB as approved
(not the 4 kB of the original proposal). The CLAUDE.md amendment matches.

## 3. Findings

### blocker

None.

### should-fix

1. **`src/dic/generate.ts:30, 41`: `ASSIGNED_WEIGHTS` copies the IČO weights.** `[8, 7, 6, 5, 4, 3, 2]` is the same
   array as `src/ico/generate.ts:7`, and `src/ico/generate.ts:11` already exports
   `remainderOf(base) = weightedSum(base, WEIGHTS) % 11`. The rules (§2.4) only forbid reusing IČO's *mapping*
   `(11 − a) mod 10`, not the remainder. `withAssignedCheckDigit` can be
   `` `${first8}${String((remainderOf(first8.slice(1)) + 8) % 10)}` ``, with a comment that cites §2.4. This
   removes the duplicate (CLAUDE.md "shared logic"), and ico's generate module is already in dic's bundle.
2. **`src/dic/generate.ts:85-88`: the options object is rebuilt for no reason.** After `options.from === 'ico'` is
   handled, `options` narrows to the birthNumber branch, which can be assigned to `BirthNumberOptions`.
   birthNumber's `generate` reads only `gender` and `birthDate` (`birthNumber/generate.ts:153-158`). So
   `plainBirthNumber(random, context, options)` is enough. In a scratch copy, items 1 and 2 together took dic's own
   code from 1134 B to 1083 B (min+gzip). I measured that build but did not typecheck it. This answers the brief:
   these are the only cheap cuts I found. The rest of the 1.25 kB is the required validator steps, the 26 approved
   foreign prefixes and the error messages.
3. **The standalone bundle keeps dead top-level code from birthNumber.** Importing `pre1954` from
   `birthNumber/edge.ts` and `badChecksum` from `birthNumber/invalid.ts` drops the records, but rolldown keeps
   expressions it cannot prove are pure:
   - the `LEAP_DAYS` `Array.from(…).filter(…).map(…)` chain (`birthNumber/edge.ts:35-37`);
   - the range property reads (`:29-31`) and the `MONTH_OFFSETS.additional*` reads (`:73-74`);
   - `IMPOSSIBLE_MONTHS` (`birthNumber/invalid.ts:28-31`).

   They also run at import time. Removing them takes standalone dic from 2288 B to 2190 B (~100 B). Either fix is
   cheap and leaves outputs unchanged: move `NINE_DIGIT_RANGE` and `pre1954` to `birthNumber/generate.ts`, and
   `badChecksum` next to it, or mark the array chains `/* @__PURE__ */`. Bundlers of `dist/` see the same chunks
   (`dist/validate-*.js` holds birthNumber `edge` and `invalid`), so users who import only `dic` benefit too.

### nit

1. **birthNumber own code is 1.99 / 2 kB.** It has about 10 B of headroom, so the next birthNumber change will hit
   the budget. If should-fix 3 moves code into `birthNumber/generate.ts`, measure again.
2. **`src/dic/generate.ts:68, 83` repeat the message format of birthNumber's private `optionError`**
   (`birthNumber/generate.ts:56`, `` `${name} ${JSON.stringify(value)}: ${expected}` ``). Exporting and reusing it
   would keep one format and save a few bytes.
3. **`src/dic/generate.ts:82`: a malformed `birthDate` that sorts before `1900-01-01` gets the "not before
   1900-01-01" message,** for example `'0000-00-00'` or `'18990101'`. A message about the format would fit better.
   The error still names `birthDate`, and the test checks that.
4. **`src/dic/validate.ts:26, 39`:** `NOT_DIGIT` repeats ico's `/[^0-9]/`, and `prefixFault` uses an inline
   `/^[0-9]/` while the other patterns are named constants. These are small consistency points.
5. **`src/dic/validate.ts:55`: the comment does not cite its source.** It explains why `6…` is never a birth number
   but should cite §3.5 / decision 4, as the other comments cite their sections.
6. **The README does not mark `lowercasePrefix` as disputed yet.** Decision 2 asks for this in the README as well as
   the TSDoc. The README has only 10 lines, so this belongs to M5 (documentation). Do not lose it there.

## Follow-up (branch m3-dic, 2026-10-08)

- Approved by Marek and fixed by the implementer: should-fix 1, 2, 3 (code moved to `birthNumber/generate.ts`,
  smaller than `/* @__PURE__ */`: standalone 2.26 kB vs 2.28 kB) and nits 2, 3, 4 (`hasNonDigit` exported from
  `ico/validate.ts`), 5. Outputs unchanged (seed snapshots pass), tests unchanged (checksums).
- Sizes: dic own 1.25 → 1.20 kB, dic standalone 2.40 → 2.26 kB, birthNumber own 1.99 kB, ico own 790 B.
- Nit 1 (birthNumber headroom ~10 B) stays open; nit 6 (README marks `lowercasePrefix` disputed) moves to M5.
