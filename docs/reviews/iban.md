# Review: iban (M3)

Reviewed 2026-10-11 by reviewer, branch `m3-iban` (`git log m3-bank-account..m3-iban`: 8f9f99b draft rules, 3a6104f
rules approved, 08be85f tests and clarification, e479f15 implementation and seed snapshots).
Rules: `docs/rules/iban.md` (APPROVED 2026-10-11; section 10 is binding, plus the clarification in section 9 that
`withPrefix: false` together with `account` throws).
Code: `src/iban/*`, `src/bankAccount/invalid.ts` (new named exports), `src/cz.ts`, `tsdown.config.ts`, `package.json`.
Tests: `tests/iban.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/iban.ts`.

**Verdict: no blockers.** The validator follows section 2.5 step by step, with the approved precedence and the
`00`/`01`/`99` rule. The written-form regex is exactly the one in the rules. MOD 97-10 runs digit by digit without
BigInt. bankAccount is reused only through fine-grained imports, and its outputs are unchanged. Every invalid variant
returns its own reason and every edge variant is valid. One should-fix (rule citations in the module headers) and a
few nits.

## 1. Tool results

`npm run check`, one run, exit code 0:

| Step | Result |
| --- | --- |
| `typecheck` (both tsconfigs) | pass |
| `lint` | pass |
| `knip` | pass |
| `coverage` | pass: 38 files, 1506 tests. Threshold met. No `src/iban/*` file appears in the table (`skipFull`), so all are at 100 % |
| `build` (tsdown + publint + attw) | pass |
| `size` | pass. Whole library 6.55 / 10 kB, core 1.93 / 2 kB, iban subpath 1.98 / 2 kB (flat row, bankAccount included), bankAccount 1.42 / 2 kB |

The brief says the main session already checked these points, so I did not redo them: the tests are unchanged by
the implementer, the seed snapshots match an independent draw-order oracle, the section 5 samples and conversions
match an independent validator, and the test reformatting was formatting only. The diff contains no change to
`tests/bankAccount*` or `tests/support/bankAccount.ts`. The bankAccount seed snapshots still pass, so the bankAccount
refactor did not change any output.

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2.5 step 1 / decision 4: electronic or exact written form (`\p{L}`, U+0020 only), no trimming → `badFormat` | `validate.ts:24-25, 47-49` (regex identical to the rule text) | `validate.test.ts:70-80, 99` | yes |
| §2.5 step 2 / decision 5: `CZ` ASCII case-insensitive → `wrongCountry` | `validate.ts:26, 32-34` | `validate.test.ts:32-35, 53-60, 100-101` | yes |
| §2.5 step 3: Unicode letter after position 2 → `letters` (shared `hasLetter`) | `validate.ts:35-37` | `validate.test.ts:61-64, 102` | yes |
| §2.5 step 4: compact length ≠ 24 → `wrongLength` | `validate.ts:38-40` | `validate.test.ts:65-69, 103` | yes |
| §2.5 step 5 / decision 3: `00`, `01`, `99` or remainder ≠ 1 → `badChecksum` | `validate.ts:27-28, 41-42` | `validate.test.ts:42-47, 104` | yes |
| §2.1 / decision 6: MOD 97-10 digit by digit, `parseInt(ch, 36)`, no BigInt, in `src/iban/` | `generate.ts:20-28` (largest intermediate value 9 635) | samples, oracle `validate.test.ts:124-151` | yes |
| §2.4, §2.5 step 6 / decision 2: bankAccount `validate` on `prefix6-number10/code`, reason passed on unchanged | `validate.ts:55-56` | `validate.test.ts:48-52, 105-107` | yes |
| §9 conversion `toIban` (pad 6 + 10, `98 − mod97(bban + country + 00)`, 2 digits) | `generate.ts:30-40` | `generate.test.ts:100-132` | yes |
| §9 plain `generate` = IBAN of the bankAccount draw; decision 15 electronic upper case | `generate.ts:43-47` | `generate.test.ts:14-98` | yes |
| §9 / decision 7 `account`: valid bankAccount string, nothing drawn, any non-`undefined` `bankCode`/`withPrefix` → `RangeError` naming `account` | `generate.ts:48-56` | `generate.test.ts:134-138, 154-182` | yes |
| §4/§9 edge `withSpaces`, `lowercase`, `withPrefix`, `checkDigitsLeadingZero` (repeat until `charAt(2) === '0'`) | `edge.ts:13-26` | `variants.test.ts:126-159` | yes |
| §4/§9 / decision 13 `badChecksum`: `int(2, 97)`, skip the correct value, pad | `invalid.ts:25-30` | `variants.test.ts:73-81, 192-193` | yes |
| §4/§9 / decisions 11, 12 `wrongCountry` (SK, recomputed), `wrongLength` (unpadded) | `invalid.ts:31-34` | `variants.test.ts:83-101, 203-207` | yes |
| §4/§9 `letters`: positions 2–23, `AOl` | `invalid.ts:13-16, 35` | `variants.test.ts:103-106, 196-200` | yes |
| §9 / decisions 9, 10: four account variants = `toIban(bankAccount variant)`; named exports in bankAccount, record references them | `invalid.ts:18-21, 36-39`; `src/bankAccount/invalid.ts:30-42, 45-60` | `variants.test.ts:107-123`; bankAccount snapshots unchanged | yes |
| §9 API: stream id `iban`, subpath, `createIban` / `validateIban`, exported types, `cz.iban`, `cz.validate.iban` | `identifier.ts`, `index.ts`, `cz.ts:8-10, 31-32, 56-57, 95, 102`, `tsdown.config.ts:7`, `package.json` | `api.test.ts` | yes |
| §8.2 / decision 14: own ≤ 2 kB, standalone ≤ 3 kB | the flat 2 kB row only; the rows are deferred to the rebase onto the dic amendment | `size` | see N3 |

**Precedence.** `validate` checks the shape first. `ibanReason` then runs country, letters, length and check digits,
and the bankAccount validator finally checks prefix, number, `zeroNumber` and bank code in its own order. Together
this is exactly decision 1. bankAccount `validate` never sees `letters`, `badFormat` or `wrongLength`, because the
reconstructed account always has 6 + 10 + 4 digits. So the union of its reasons stays within `IbanReason`, as §2.4
expects.

**Reuse.** iban imports only `generate` and `validate` from bankAccount, plus the four single variant functions. It
never imports the `edge` or `invalid` records. The extraction in `src/bankAccount/invalid.ts` is pure: the function
bodies are unchanged and the record references the same functions. The "one fault only" claim holds: `weightedSum`
is right-aligned, so zero padding does not change the mod 11 sum, and the IBAN reason equals the bankAccount reason.

## 3. Findings

### Blockers

None.

### Should-fix

**S1. The module headers do not cite `docs/rules/iban.md` by path (this repeats bankAccount S1 and ico S2).** Since
those fixes, every module header names its rules file. bankAccount, for example, has
`// … – docs/rules/bankAccount.md sections 4 and 9.`, and its `index.ts` also cites `docs/rules/core.md section 5`.
The iban headers say only "iban rules":
- `src/iban/edge.ts:1` ("iban rules, sections 4 and 9")
- `src/iban/invalid.ts:1` (same)
- `src/iban/generate.ts:1` ("iban rules, section 9")
- `src/iban/validate.ts:1` ("iban rules, section 2.5")
- `src/iban/index.ts:1-2` ("iban rules, sections 1, 2 and 9"; no `docs/rules/core.md section 5`)

Without the path, a reader cannot grep from a rule to its code, and the next identifiers will copy the
inconsistency. The fix changes comments only, so it costs no bytes. Two inline comments would also benefit from
naming their decision: `validate.ts:27` (decision 3) and `generate.ts:48` (the clarification of 2026-10-11).

### Nits

**N1. The `account` check in `generate.ts:48` rejects any extra key, not just `bankCode`/`withPrefix`.**
`Object.values(rest)` covers every other own property. A JavaScript caller who passes
`{ account, foo: 1 }` therefore gets "account cannot be combined with bankCode or withPrefix", and that message is
wrong for this input. Without `account`, unknown keys are ignored. The behaviour is inconsistent but harmless: TS
callers cannot reach it, and the error still names `account`. An explicit
`options.bankCode !== undefined || options.withPrefix !== undefined` would say exactly what the rule says and would
not need the `as unknown[]` cast.
Test gap for the test-writer: the clarification allows `{ account, bankCode: undefined }`. Nothing tests that case,
although the code handles it correctly.

**N2. The same small variant logic is copied across modules again (follows bankAccount N1).** The "uniformly drawn
different value" step `drawn >= correct ? drawn + 1 : drawn` now appears three times (`src/ico/invalid.ts:20`,
`src/bankAccount/invalid.ts:27`, `src/iban/invalid.ts:29`). `LETTERS = 'AOl'` now appears five times. The core is
still at 1.93 / 2 kB, so moving either into the core is not cheap yet. This is a note only. Revisit it with
EAN/EIC or when the core budget changes.

**N3. Size rows of decision 14 are still pending.** Until the rebase onto the dic amendment, the iban subpath is
checked against the flat 2 kB row (1.98 kB, about 20 B of headroom), and nothing checks the "own code ≤ 2 kB" figure
(1.29 kB per the main session). When rebasing, add the own and standalone rows the same way as for dic, and the
CLAUDE.md amendment line. Nothing is wrong today, because the stricter flat row passes. The whole library is at
6.55 / 10 kB before dic, EAN and EIC (rules §8.2 risk).

**N4. Optional type-level guard for `account`.** `IbanOptions` (`generate.ts:11-18`) allows
`{ account, bankCode }` at compile time, and the generator then throws at run time. A union
(`{ account: string; bankCode?: never; withPrefix?: never } | { account?: undefined; bankCode?: string; withPrefix?: boolean }`)
would turn that misuse into a type error in user tests. The cost is a more complex type in the TSDoc. This is a
convenience only; the run-time check is what the rules require.

## 4. Code quality notes (no action)

- The module follows the M1 template: `generate`, `validate`, `edge`, `invalid`, `identifier`, `index`. `identifier.ts`
  and `index.ts` have the same shape as bankAccount. Shared helpers (`mod97`, `toIban`) live in `generate.ts` and
  `validate.ts` imports them, the same pattern as `isValidPart` in bankAccount. MOD 97-10 stays in `src/iban/` as
  §8.1 and decision 6 ask.
- The comments explain why. They cover the unissued check digits (`validate.ts:27`), why there is no BigInt
  (`generate.ts:20`), the "converter bug" shape of `wrongLength` (`invalid.ts:33`), and why the account variants pass
  pure ISO validators (`invalid.ts:18`).
- The TSDoc gives the Czech meaning (*číslo účtu ve formátu IBAN*), the reason precedence, the case-insensitive
  country code, the disputed `lowercase` edge and the `RangeError` contract. The `@example` conversion
  `19-2000145399/0800` → `CZ6508000000192000145399` is ČNB's own. The API matches `docs/spec.md` line 76 (`cz.iban()`).
  The README "disputed" marking of `lowercase` (rules §4) is not in this branch, but the README has not been updated
  per identifier since M2 either.
- The tests read like a specification. The samples carry their source, the precedence pairs are named after the
  decision, every variant has a shape check plus its reason, and the oracle in `tests/support/iban.ts` computes
  MOD 97 with BigInt (fine in tests), independently of the implementation's digit-by-digit loop.
