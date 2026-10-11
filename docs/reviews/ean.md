# Review: ean (M4)

Reviewed 2026-10-11 by reviewer, branch `m4-ean` (diff vs `main`: 08a2a0b draft rules, 8596222 rules approved,
f34dd71 tests, 8349e15 test regex fix, a5ab933 implementation and seed snapshots).
Rules: `docs/rules/ean.md` (APPROVED 2026-10-11; sections 9 and 10 are binding), `docs/rules/core.md`.
Code: `src/ean/*`, `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/ean.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/ean.ts`.

**Verdict: one blocker.** The validator follows section 2.4 step by step, with the approved precedence. The GS1 check
digit reuses the core `weightedSum` (decision 9), so the core is unchanged. Every invalid variant returns its own
reason and every edge variant is valid. The blocker is in the generator's option check: `distributor: 'default'` and
`distributor: null` do not throw, but section 9 says they must.

## 1. Tool results

I did not re-run `npm run check`, as the brief asked. The main session reported it green: typecheck, lint, knip,
coverage (100 % branches on `src/ean/validate.ts`), build, and size (ean own code 986 B / 2 kB, whole library
7.6 / 10 kB, core unchanged). The main session also checked these points, so I did not redo them: the seed snapshots
match an independent oracle (core.md §1–2 and ean.md §9), the pinned samples were recomputed independently, and the
implementer did not change the tests (shasum).

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2.4 step 1: `\p{L}` → `letters` (shared `hasLetter`) | `validate.ts:14-16` | `validate.test.ts:49-53, 100-101`; oracle properties `:122-148` | yes |
| §2.4 step 2 / decision 3: anything not `0-9` → `badFormat`, no trimming | `validate.ts:10, 17-19` | `validate.test.ts:54-61, 102-103` (NBSP, full-width, leading/trailing space) | yes |
| §2.4 step 3: length ≠ 18 → `wrongLength`, including `''` | `validate.ts:20-22` | `validate.test.ts:44-48, 104` | yes |
| §2.4 step 4 / decision 1: prefix exactly `8591824` → `wrongPrefix` | `validate.ts:23-25`, `generate.ts:18` | `validate.test.ts:41-43, 105`, `api.test.ts:68` | yes |
| §2.1 / §2.4 step 5: GS1 weights 3,1 from position 1, `(10 − S mod 10) mod 10` | `generate.ts:21, 32-34`, `validate.ts:26-28` | `validate.test.ts:78-96` (exactly one accepted last digit per body; shortcut §2.2 as a second oracle) | yes |
| Decision 4: positions 8–17 not range-checked | `validate.ts:12` | `validate.test.ts:29-32` (`…0000000005`, network `9999`, `0↔5` swap) | yes |
| `referenceDate` ignored | `validate.ts:13` (no options) | `validate.test.ts:112-120`, `generate.test.ts:34-43`, A3 in `determinism.test.ts` | yes |
| §5: 15 valid and 26 invalid samples | – | `validate.test.ts:17-76` (all of them, in rules order) | yes |
| §9 / decision 8: default position 10 from `[1…8]`, `egd [1,2]`, `pre [3]` (one draw), `cez [4…8]`, `'00'` at 8–9 | `generate.ts:24-29, 48-53` | `generate.test.ts:18-78`; draw order through the seed snapshots | yes |
| §9 / decision 10: `lds` = network `int(300, 999)` padded + `0` + `digits(5)` | `generate.ts:44-47` | `generate.test.ts:80-102` | yes |
| §9: unknown `distributor` → `RangeError` naming `distributor` | `generate.ts:48-51` | `generate.test.ts:114-121` | **no**, see B1 |
| §9: other keys ignored | `generate.ts:43` | `generate.test.ts:104-111` | yes |
| §4 / §9 `checkDigitZero`: first plain value ending in `0` (rejection sampling) | `edge.ts:14-20` | `variants.test.ts:18-20, 82-94` | yes |
| §4 / §9 `lds` = `generate({ distributor: 'lds' })` | `edge.ts:22` | `variants.test.ts:21-25, 96-103` | yes |
| §9 `badChecksum`: `int(0, 8)` mapped past the correct digit | `invalid.ts:16-21` | `variants.test.ts:30-33, 139, 152-153` (all 10 last digits reached) | yes |
| §9 `wrongLength`: `int(0, 1)` → 17 digits / 19 digits | `invalid.ts:23-26` | `variants.test.ts:35-38, 140, 154-155` | yes |
| §9 `letters`: `replaceDigitWithLetter` over positions 0–17, `AOl` | `invalid.ts:11-12, 27` | `variants.test.ts:40-43, 142-144, 156-158` | yes |
| §9 / decision 7 `wrongPrefix`: `859` + block `int(0, 9998)` skipping `1824` + positions 8–17 + recomputed check | `invalid.ts:28-34` | `variants.test.ts:45-51, 141, 159-161` | yes |
| §9 public API: `createEan`, `validateEan`, six types, stream id `ean`, `createCz().ean` / `.validate.ean` | `index.ts`, `identifier.ts`, `cz.ts` | `api.test.ts` (types and shared contract) | yes |

## 3. Findings

### Blockers

**B1. `distributor: 'default'` and `distributor: null` are accepted silently (`src/ean/generate.ts:24-29, 48-52`).**
Section 9 says "Unknown value → `RangeError` naming `distributor`". The lookup table `DIGITS` holds the internal
fallback under the key `default`, and the guard is `Object.hasOwn(DIGITS, distributor ?? 'default')`. As a result:

- `generator({ distributor: 'default' })` returns a plain EAN, because `'default'` is an own key;
- `generator({ distributor: null })` returns a plain EAN, because `??` maps `null` to `'default'`.

I confirmed both: with seed 1, each returns `859182400299065433`. `'toString'` and `'__proto__'` throw correctly.
This matters because the rule is broken. Also, every other option check in the library rejects `null` from untyped
callers: `phone/generate.ts:73` explains this in a comment, and bankAccount and iban have `null` test cases. A
JavaScript or CLI (M5) user who mistypes the value would get default output and no error. TS callers cannot reach
either input.
Fix (code only): keep the default list out of the record that validates user input. For example, type the record as
`Record<'cez' | 'egd' | 'pre', readonly number[]>`, keep a separate `DEFAULT_DIGITS` constant, and use `undefined`
(not `??`) to choose the default. The `?? []` fallback on line 52 then becomes unnecessary. The values and the draw
order do not change, so the snapshots stay valid.
Test gap, for the test-writer, not the implementer: the list in `tests/ean.generate.test.ts:115` has neither
`null` nor `'default'`. Add both so this cannot regress.

### Should-fix

**S1. Some rules are cited without a link, and `index.ts` does not cite `core.md` (`src/ean/generate.ts:2-4`,
`src/ean/validate.ts:1-2`, `src/ean/index.ts:1-2`).** CLAUDE.md requires every rule to have a link in a code comment.
The 18-digit rule links to zakonyprolidi.cz. Two rules are cited by title only: the fixed part `8591824`, which is
the only Czech-specific rule of the validator, and the GS1 check digit. Rules §6 has the URLs (OTE
`podklady_k_seminari.pdf`, GS1 `lint_csum.c`). `validate.ts` cites neither URL. The iban review S1 resolution also
set the pattern that `index.ts` cites `docs/rules/core.md` section 5. The ico, bankAccount and iban index headers do,
but `ean/index.ts` does not. `edge.ts:1` and `invalid.ts:1` cite only section 4, although the draw shapes they
implement are in section 9. These are comment-only changes and cost no bytes.

### Nits

**N1. The non-digit test duplicates the one in ico (`src/ean/validate.ts:10, 17`).** `NOT_DIGIT = /[^0-9]/` is the
same as `hasNonDigit` in `src/ico/validate.ts:14-19`, which dic already reuses. Importing it from ico would make ean
depend on another identifier folder for a one-line regex, which is not worth it. The proper home would be next to
`hasLetter` in `src/core/letters.ts`, if the core budget allows. Note only.

**N2. The "draw a different value" step and `LETTERS = 'AOl'` are copied again (follows iban N2).** ean adds two more
`drawn >= x ? drawn + 1 : drawn` (`invalid.ts:20, 32`; now five in `src/`) and a sixth `LETTERS = 'AOl'`
(`invalid.ts:11`). iban N2 asked to revisit this "with EAN/EIC". The core is still unchanged and close to its 2 kB
budget, so moving them is still not cheap. Decide before or with EIC.

**N3. Constant names differ from the frozen constants in rules §9.** The rules name `DISTRIBUTOR_DIGITS` and
`BIG_DSO = '00'`. The code uses `DIGITS` (`generate.ts:24`) and an inline `'00'` (`generate.ts:53`). The values are
identical. Matching names would make it easier to grep from a rule to its code. B1's fix touches the same lines, so
this can be done at the same time.

## 4. Code quality notes (no action)

- The module follows the M1 template: `generate`, `validate`, `edge`, `invalid`, `identifier`, `index`.
  `identifier.ts` is identical in shape to ico/iban. `validate.ts` imports `PREFIX` and `checkDigitOf` from
  `generate.ts`, the same pattern as ico's `checkDigitOf`. The GS1 rule stays in `src/ean/` on top of the core
  `weightedSum`, as decision 9 asks. There is no new core code and no cross-identifier import, so ean needs only the
  flat 2 kB budget row.
- The comments explain why. They name the bug each edge variant catches (`edge.ts:13, 21`), the GS1 direction of
  the weights (`generate.ts:20`), why `lds` uses `0300–0999` (`generate.ts:45`), and why `wrongPrefix` passes pure GS1
  checks (`invalid.ts:28`).
- The TSDoc gives the Czech meaning (*EAN odběrného místa*, *EAN OPM*), warns that this is not an EAN-13/GTIN (rules
  §7 item 6), states the reason precedence and the `RangeError` contract, and uses OTE's own example
  `859182412340000003`. The API matches `docs/spec.md` line 77 (`cz.ean()`); the optional `{ distributor }` follows
  approved decision 8.
- The tests read like a specification. Each sample carries its reason. Each precedence pair is named after
  decision 2. Each variant gets a shape check, its reason, and a check that it is derived from the plain value of the
  same stream. The oracle in `tests/support/ean.ts` is independent of `src/` and also checks the §2.2 shortcut.
