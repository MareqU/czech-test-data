# Review: bankAccount (M3)

Reviewed 2026-10-08 by reviewer, branch `m3-bank-account` (commits 2742e1b rules, 5ba06f6 tests, 50142ba
implementation; diff vs `origin/main`).
Rules: `docs/rules/bankAccount.md` (APPROVED 2026-10-08; sections 9 and 10 are binding), `docs/rules/core.md` §5
(`weightedSum` right-aligned).
Code: `src/bankAccount/*`, `src/core/checksum.ts`, `src/cz.ts`, `tsdown.config.ts`, `package.json`,
`scripts/update-bank-codes.ts`.
Tests: `tests/bankAccount.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/bankAccount.ts`,
`tests/core.checksum.test.ts`.

**Verdict: one blocker (B1).** The `bankCode` option accepts a string of several snapshot codes separated by spaces,
and the generator then returns an invalid value instead of throwing `RangeError`. Everything else in sections 2, 4
and 9 is implemented and tested. Every invalid variant returns its own reason, every edge variant is valid, and the
validator has 100 % branch coverage.

## 1. Tool results

`npm run check`, one run:

| Step | Result |
| --- | --- |
| `typecheck` (both tsconfigs) | pass |
| `lint` | pass |
| `knip` | pass |
| `coverage` | **fail in that run, environment only**: 7 tests in 7 unrelated files (birthNumber, core.context, core.random, ico, postalCode, bankAccount) all timed out at the same wall-clock mark of about 615 s. The timeout is 5 s and the whole suite normally takes 2.5 s, so the machine stalled; the code did not fail. A single re-run of `vitest run --coverage`: 33 files, 1299 tests pass, threshold met, all `src/bankAccount/*` files and `src/core/checksum.ts` at 100 % (hidden by `skipFull`). |
| `build` (tsdown + publint + attw) | not reached in that run; run separately: pass |
| `size` | not reached in that run; run separately: pass. Whole 5.84 / 10 kB, core 1.93 / 2 kB, bankAccount 1.41 / 2 kB on top of the core |

The brief says the main session already checked these points, so I did not redo them: the tests are unchanged by
the implementer, the seed snapshots match an independent draw-order oracle, and the 47 codes match the live ČNB CSV.

The main-session test edits in 50142ba are **lint/structure only (confirmed)**. In
`tests/bankAccount.determinism.test.ts`, `it.each` over the same four seeds became one `it` per seed with its inline
snapshot filled. In `tests/bankAccount.variants.test.ts:197, 202, 216`, `${fixed}` became `${String(fixed)}` and
`v.match(...)` became `/.../.exec(v)`. No assertion changed.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2 step 1: `\p{L}` → `letters` (shared `hasLetter`) | `validate.ts:44-46` | `validate.test.ts:67-70, 95`; oracle `:139-171` | yes |
| §2 step 2 / decision 3: strict `-` and `/`, no trimming → `badFormat` | `validate.ts:22, 47-50` | `validate.test.ts:71-87, 96` | yes |
| §2 step 3 / decision 7: written lengths, prefix ≤ 6, number 2–10, code 4 | `validate.ts:25-28, 52-54` | `validate.test.ts:58-66, 97` | yes |
| §2 steps 4–5: each part mod 11, weights right-aligned, absent prefix passes | `generate.ts:19-25`, `validate.ts:30-37` | `validate.test.ts:42-50, 98-99` | yes |
| §2 step 6 / decision 6: all-zero number → `zeroNumber` after the checksum | `validate.ts:38-39` | `validate.test.ts:51-52, 100` | yes |
| §2 step 7 / decision 5: bank code last, whole-token lookup in the snapshot | `validate.ts:55`, `generate.ts:28-30` | `validate.test.ts:53-57, 106-113` (all 10 000 codes) | yes (validator); see B1 for the option |
| §4 decision 4: zero prefix `0-` / `000000-` valid | `validate.ts:31-33` | `validate.test.ts:30-31` | yes |
| §8.1/8.2: snapshot of 47 codes, generated header, codes only | `bankCodes.ts:1-6` | `validate.test.ts:107-122` | yes |
| §9 `part(n)`: `int(1, 9)`, `digits(n − 2)`, last digit completes the sum, redraw on 10 | `generate.ts:37-47` | `generate.test.ts:12-28`, snapshots | yes |
| §9 plain `generate`: P, prefix, L, number, code; decisions 2 and 15 | `generate.ts:17-18, 50-61` | `generate.test.ts:42-81` | yes |
| §9 options: `bankCode` in the snapshot, else `RangeError`; `withPrefix` boolean; nothing drawn for a given code | `generate.ts:52-57, 60` | `generate.test.ts:83-118`, `determinism.test.ts:62-72` | **no, B1** |
| §4/§9 edge `withPrefix`, `maxLength`, `minLength`, `withLeadingZeros`, `zeroPrefix` (decision 8) | `edge.ts:13-20` | `variants.test.ts:43-68, 126-161` | yes |
| §4/§9 invalid `badChecksumPrefix`, `badChecksumNumber`: uniform different last digit | `invalid.ts:22-28, 32-33` | `variants.test.ts:75-90, 192-211` | yes |
| §4/§9 `unknownBankCode` from the frozen list (decision 9) | `invalid.ts:19-20, 34` | `variants.test.ts:91-96, 212-213` | yes |
| §4/§9 `wrongLength`: branch first, `int(1, 9)` or `part(10)` + digit (decision 10) | `invalid.ts:35-39` | `variants.test.ts:97-105, 214-215` | yes |
| §4/§9 `letters`: all positions except `/`, letters `AOl` | `invalid.ts:18, 40-44` | `variants.test.ts:106-110, 216-217` | yes |
| §4/§9 `zeroNumber` | `invalid.ts:45` | `variants.test.ts:111-114` | yes |
| §9 stream id, subpath, `createBankAccount` / `validateBankAccount`, `cz.bankAccount`, `cz.validate.bankAccount` | `identifier.ts`, `index.ts`, `cz.ts`, `tsdown.config.ts`, `package.json` | `api.test.ts` | yes |
| core.md §5 / decision 1: `weightedSum` right-aligned | `src/core/checksum.ts:10-13` | `core.checksum.test.ts:10-45` | yes |

The draw order matches §9 in every function. Template literals are evaluated left to right, so `maxLength` draws
`part(6)`, `part(10)` and then the code. `withLeadingZeros` and `zeroPrefix` draw the length before the part.

**`weightedSum` and IČO compatibility: confirmed.** IČO always passes exactly 7 digits for 7 weights
(`src/ico/generate.ts:12`, `src/ico/validate.ts:24-27` checks length 8 before `slice(0, 7)`), so the `padStart` is a
no-op for it. The IČO seed snapshots and properties pass unchanged. bankAccount checks the lengths before it calls
`weightedSum` (`validate.ts:52-55`), so the precondition `digits.length ≤ weights.length` always holds.

## 3. Findings

### Blockers

**B1. `bankCode` option: a string of several snapshot codes passes the check, and the generator returns an invalid
value.** `src/bankAccount/generate.ts:28-30` tests `` ` ${BANK_CODES} `.includes(` ${code} `) ``. That is token-safe
only for inputs without spaces. Any run of consecutive snapshot codes separated by single spaces is found too.
Reproduced on the built package with seed 1:

```
generator({ bankCode: '0100 0300' })      // '389466/0100 0300'       -> validate: badFormat
generator({ bankCode: '8620 8660' })      // '1695674435/8620 8660'  -> validate: badFormat
```

§9 requires a `RangeError` naming `bankCode` for anything that is not a snapshot code. §8.2 requires the lookup to
"match whole tokens". This also breaks the core contract that a plain generator call returns a valid value. The
validator is not affected, because its regex limits `code` to `[0-9]+` of length 4 first. IBAN will reuse
`isKnownBankCode` (§9), so fix it inside the helper, not only in `generate`. Cheap fix: also require
`/^[0-9]{4}$/` in `isKnownBankCode`, or compare against `BANK_CODES.split(' ')`. Seeds do not change.
Test gap for the test-writer: `tests/bankAccount.generate.test.ts:102` has `'0800 '` but no multi-code string such as
`'0100 0300'`.

### Should-fix

**S1. Rule citations do not name `docs/rules/bankAccount.md` (repeat of ico review S2).** After the ico fixes, every
module header cites `docs/rules/<id>.md section N`, and `index.ts` also cites `docs/rules/core.md section 5`
(`src/ico/index.ts:1-2`). bankAccount cites only the decree or "the approved rules": `edge.ts:1`, `invalid.ts:1`,
`generate.ts:1` ("draw order fixed by the approved rules"), `validate.ts:1`, `index.ts:1-2`. Only `bankCodes.ts:4`
names the file. Without the path, a reader cannot grep from a rule to its code, and the next identifiers copy the
inconsistency. The fix is a text-only change, for example `edge.ts` → section 4, `generate.ts` → section 9,
`validate.ts` → section 2.

### Nits

**N1. Small duplicated variant logic across modules.** `replaceDigitBefore` (`src/bankAccount/invalid.ts:23-28`) uses
the same "uniformly drawn different digit" step as ico `badChecksum` (`src/ico/invalid.ts:18-20`:
`drawn >= correct ? drawn + 1 : drawn`). `LETTERS = 'AOl'` is now defined in four modules (birthNumber, phone, ico,
bankAccount). A shared helper in `src/core/letters.ts` would cost core bytes, and the core is at 1.93 / 2 kB, so
this is a note only. Revisit if the core budget is raised or EAN/EIC need the same step.

**N2. `scripts/update-bank-codes.ts`, small gaps against §8.4.**
(a) `:69` uses the CLI override only when both `--version` and `--valid-from` are given. Passing one of them is
silently ignored, and the script fetches the page instead. Neither value is format-checked (`YYYY-MM-DD`, integer
version), so a typo goes straight into the header comment.
(b) `:13` `VERSION_TEXT` matches `\s`, but the page might write `1.&nbsp;10.&nbsp;2026` with entities. That case
fails safely (error plus a hint to use the flags), so it is not wrong.
(c) §8.4 says "only global `fetch` and `node:fs`". The script also imports `node:util` `parseArgs`. That is a
built-in module, not a dependency, so this is acceptable.
Otherwise the contract is met:
- step 1: BOM is stripped, LF and CRLF are handled.
- step 2: header, 4 fields, `^[0-9]{4}$`, unique codes and ≥ 30 rows are checked before anything is written.
- step 3: the version comes from the page, with the flag fallback.
- step 4: the output has the exact shape of 8.2, is sorted and uses the UTC download date. It matches the committed
  file byte for byte, including the trailing newline.
- step 5: added and removed codes are printed.
- The script is not part of `check` or CI.
Optional: print a reminder to update the oracle copy in `tests/support/bankAccount.ts`, as §8.4 asks.

**N3. "A given bankCode does not draw" is tested only up to the number.** `tests/bankAccount.determinism.test.ts:62-72`
compares only the first value without its code. That test would not catch an extra draw after the number. The
`withBankCode` entries in the seed snapshots pin the behaviour, so this is a test-precision note only.

## 4. Code quality notes (no action)

- The module follows the M1 template: `generate`, `validate`, `edge`, `invalid`, `identifier`, `index`, plus the
  generated `bankCodes.ts`. Shared building blocks (`part`, `drawCode`, `isValidPart`, `isKnownBankCode`) live in
  `generate.ts`, as the ico review S1 fix asked. `identifier.ts` and `index.ts` have the same shape as ico.
- No duplicated checksum code. The divisibility rule stays in `src/bankAccount/`, the weighted sum is in the core.
  IBAN can reuse `part`, `isValidPart`, `isKnownBankCode` and `BANK_CODES` through fine-grained imports.
- The comments explain why: weight 1 makes every different last digit fail (`invalid.ts:22`), the rejection on 10
  (`generate.ts:41`), the frozen generator list (`generate.ts:17`), and why one non-zero digit is already rejected
  (`validate.ts:38`).
- The TSDoc has the Czech meaning (*číslo účtu*, *předčíslí*, *základní část*, *kód platebního styku*), the reason
  precedence and the `RangeError` contract. The example `35-1234567899/0800` is a valid account. The API matches
  `docs/spec.md` line 75.
- The tests read like a specification. Samples carry their source and sum, the precedence pairs are named, and
  the oracle in `tests/support/bankAccount.ts` is written from the rules only.

## 5. Resolution (Marek, 2026-10-08)

- B1 fixed: `isKnownBankCode` requires `^\d{4}$` before the token lookup; test rows `'0100 0300'`, `'8620 8660'`
  added to `tests/bankAccount.generate.test.ts`. Outputs unchanged (seed snapshots pass).
- S1 fixed: every module header cites `docs/rules/bankAccount.md` (section), `index.ts` also `docs/rules/core.md`
  section 5.
- N2 fixed: `--version` and `--valid-from` are both-or-neither and format-checked; the script reminds to update the
  test oracle and the CHANGELOG after a change.
- N1 (shared "different digit" step, `LETTERS`) and N3 (no-draw test precision): accepted as is.
