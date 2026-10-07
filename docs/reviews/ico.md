# Review: ico (M3)

Reviewed 2026-10-07 by reviewer, branch `m3-ico` (diff vs `main`).
Rules: `docs/rules/ico.md` (APPROVED 2026-10-07; sections 9 and 10 are binding), `docs/rules/core.md`.
Code: `src/ico/*`, new `src/core/checksum.ts`, `git diff main` of `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/ico.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/ico.ts`.

**Verdict: no blocker.** Every step of section 2, every decision of section 9 and the clarification of section 10
are implemented and tested. Each invalid variant has exactly one fault and returns its own reason. All three edge
variants are valid. The validator has 100 % branch coverage. The two should-fix items are small consistency fixes
inside `src/ico/`.

## 1. Tool results

| Step | Result |
| --- | --- |
| `typecheck` (both tsconfigs) | pass |
| `lint` | pass |
| `knip` | pass |
| `coverage` (27 files, 1085 tests; 100 % branch threshold on `validate*.ts`) | pass |
| `build` (tsdown + publint + attw) | pass |
| `size` | pass: whole 4.97 / 10 kB, core 1.91 / 2 kB, ico 782 B / 2 kB on top of core |

The brief says the main session already verified the seed snapshots with an independent oracle and confirmed that
the implementer left the tests unchanged. I did not check those again.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2 step 1: `\p{L}` → `letters` (shared `hasLetter`) | `validate.ts:18-20` | `validate.test.ts:55-58, 75, 78`; oracle properties `:86-102` | yes |
| §2 step 2: anything not `0-9` → `badFormat`, no trimming (decision 3) | `validate.ts:14, 21-23` | `validate.test.ts:59-67, 76, 79` | yes |
| §2 step 3: length ≠ 8 → `wrongLength`, no padding (decision 2) | `validate.ts:24-26` | `validate.test.ts:51-54, 77` | yes |
| §2 step 4: `d8 = (11 − S mod 11) mod 10`, weights 8…2 | `generate.ts:7-18`, `validate.ts:27-29` | `validate.test.ts:104-129` (all 10 digits for each base; wrap-around 0→1, 1→0, 10→1) | yes |
| §2: `referenceDate` is ignored | `validate.ts:17` (no options) | `validate.test.ts:131-134`, `generate.test.ts:28-37`, shared A3 check in `determinism.test.ts` | yes |
| §5: 12 ARES samples and 6 constructed samples valid (incl. `00000001`, decision 10) | – | `validate.test.ts:16-40` | yes |
| §5: all 22 invalid samples with their reason | – | `validate.test.ts:42-71` | yes |
| §8 / decision 4: plain `d1` 1–9, `d2`–`d7` uniform, 8 digits | `generate.ts:26-33` | `generate.test.ts:12-26, 55-81` | yes |
| §4 / decision 5: `leadingZeros` k = int(1, 4), then 1–9, then digits(6 − k) | `edge.ts:13-15, 31` | `variants.test.ts:18-21, 83-87` | yes |
| §4 / decisions 1 and 8: `checkDigitZero` a = 1, `checkDigitOne` a = 0 only, rejection sampling over a plain base | `edge.ts:18-26, 33-35` | `variants.test.ts:22-31, 89-96` | yes |
| §4: `badChecksum` uniform different digit (`int(0, 8)`, skip the correct one) | `invalid.ts:17-22` | `variants.test.ts:36-39, 131-135` | yes |
| §4 / decision 6 / §10: `wrongLength` branch first; 7 digits = k = 1 base with its `0` dropped, 9 digits = plain + 1 digit | `invalid.ts:25-30` | `variants.test.ts:41-48, 137-141` | yes (see N3) |
| §4 / decision 7: `letters` from `AOl`, any of 8 positions, shared `replaceDigitWithLetter` | `invalid.ts:13-14, 36` | `variants.test.ts:50-53, 143-148` | yes |
| §8: stream id `ico`, subpath, `createIco` / `validateIco`, `cz.ico`, `cz.validate.ico` | `identifier.ts`, `index.ts`, `cz.ts`, `tsdown.config.ts`, `package.json` | `api.test.ts` | yes |
| §8 / decision 9: `weightedSum(digits, weights)` in `src/core/` | `src/core/checksum.ts:9-11` | indirectly, through the oracle properties | yes (see N1, N2) |

The draw order matches the rules. In `leadingZeros`, `random.int(1, 4)` is an argument, so it is evaluated before
`leadingZerosBase` draws (`edge.ts:31`). In `wrongLength`, the branch draw comes before the base (`invalid.ts:26`),
as section 10 requires.

## 3. Findings

### Blockers

None.

### Should-fix

**S1. `invalid.ts` imports a helper from `edge.ts`; the other modules put shared helpers in `generate.ts`.**
`src/ico/invalid.ts:6` imports `leadingZerosBase` from `./edge.js`. In birthNumber, phone and postalCode, edge and
invalid only import from `generate.ts`, which holds the shared building blocks (see `src/birthNumber/generate.ts`
header and `src/postalCode/generate.ts` `drawDigits`). `ico` is the only module where one variant file depends on
the other. This makes the module layout less predictable for the next identifiers, which copy it. The fix is cheap:
move `leadingZerosBase` (`edge.ts:12-15`) next to `drawBase` in `generate.ts`. Behaviour and seeds do not change.

**S2. Rule citations do not use the file path that every other module uses.** The headers say "rules for ico section
4" (`edge.ts:1`, `invalid.ts:1`, `generate.ts:1, 6`, `validate.ts:1, 3`). birthNumber, phone and postalCode write
`docs/rules/<id>.md section N`, and their `index.ts` also cites `docs/rules/core.md section 5` and the rules file
(`src/phone/index.ts:1-2`). `src/ico/index.ts:1-3` names neither. With the path, a reader can grep from a rule to
its code, and the citation style stays the same across modules. Cheap text-only change.

### Nits

**N1. `weightedSum` does not enforce its "same length" contract** (`src/core/checksum.ts:4, 10`). It iterates over
`weights`. A shorter `digits` reads `charAt(i) === ''`, and `Number('')` is `0`, so missing digits silently count as
zeros. A longer `digits` silently drops the extra digits. For IČO the base is always 7 digits, so this is not a bug
today. bankAccount uses right-aligned weights on a prefix (up to 6 digits) and a number (up to 10 digits). If its
caller forgets to left-pad, the sum is wrong without any error. Before bankAccount, decide either "caller pads"
(state it in the TSDoc) or "right-align inside `weightedSum`".

**N2. The shared core helper has no core-level spec or test.** `docs/rules/core.md` section 5 (file table and export
table, lines 133-200) does not list `src/core/checksum.ts` / `weightedSum`. No `tests/core.*` test pins it. Today it
is covered only indirectly by the IČO oracle. This is for the rules-researcher and test-writer when bankAccount
starts, not for the implementer. Related: the core is at 1.91 / 2 kB, so about 90 B remain for the mod 97 (IBAN)
and GS1 (EAN) helpers that core rules section 5 also sends to `src/core/`.

**N3. The test of the 7-digit `wrongLength` branch is looser than section 10.** `tests/ico.variants.test.ts:43-44`
checks only that `0` + value is valid. A 7-digit value that starts with `0` (k ≥ 2) would pass too, although
section 10 fixes k = 1, so the first digit must be 1–9. The seed snapshots pin today's behaviour, so this is a
test-precision note for the test-writer, not a code issue.

**N4. Order of `tsdown.config.ts` `entry`.** `src/ico/index.ts` is appended at the end. The existing entries were
alphabetical (`birthNumber`, `phone`, `postalCode`), and `package.json` `exports` is alphabetical. Cosmetic only.

## 4. Code quality notes (no action)

- The module follows the M1 template: `generate`, `validate`, `edge`, `invalid`, `identifier`, `index`, with the same
  `identifier.ts` / `index.ts` shape as postalCode. `NoOptions`, `ValidatorOptions` and the `RangeError` contract of
  the core are reused unchanged.
- No duplication. Letters come from `src/core/letters.ts`, the weighted sum from `src/core/checksum.ts`. The
  modulus rule stays in `src/ico/`, as section 8 asks, so `dic` can reuse it through `validateIco`.
- Names read well (`remainderOf`, `checkDigitOf`, `withCheckDigit`, `withRemainder`). The comments explain why:
  decision 8 for the rejection loop, `a = 10` not being a wrap-around, and the missing official text for the check
  digit.
- TSDoc includes the Czech meaning (*identifikační číslo osoby*) and states "no trimming, no padding" and the reason
  precedence. The examples match the spec (`createIco({ seed: 42 })`, `cz.ico()`).
- The tests read like a specification. Section numbers sit in the describe names, the samples carry their ARES
  subject and remainder, and `tests/support/ico.ts` is an oracle written only from the rules.
