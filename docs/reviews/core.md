# Review: core (M1)

Reviewed 2026-10-04 by reviewer.
Contract: `docs/rules/core.md` (APPROVED, including clarifications).
Code: `src/core/random.ts`, `src/core/types.ts`, `src/core/identifier.ts`, `src/cz.ts`, `src/index.ts`.
Tests: `tests/core.random.test.ts`, `tests/core.identifier.test.ts`, `tests/core.cz.test.ts`, `tests/support/reference.ts`.

**Verdict: no blockers.** The implementation follows the contract exactly in every determinism-critical
detail, and all tools pass. One should-fix concerns the contract, not the code: the template has no way
to pass `referenceDate` to validators and variants, and `birthNumber` will need one (finding S1). Marek
should decide on it before the `birthNumber` tests are written.

## 1. Tool results

| Check | Command | Result |
| --- | --- | --- |
| Tests | `npm test` | pass: 3 files, 201 tests |
| Coverage | `npm run coverage` | pass. Branch coverage is 100 % in `src/core/random.ts` (20/20), `src/core/identifier.ts` (6/6) and `src/cz.ts` (22/22). `src/cli.ts` (M0 stub) is at 0 %, which is expected. No `validate*.ts` exists yet, so the 100 % branch threshold has no files to check |
| Typecheck | `npm run typecheck` | pass (build and full tsconfig) |
| Lint | `npm run lint` | pass, no warnings |
| Unused code | `npm run knip` | pass, nothing reported |
| Build | `npm run build` | pass, attw and publint clean |
| Size | `npm run size` | pass: whole library is **605 B** min+gzip against a 10 kB budget |

## 2. Determinism-critical details vs. the contract

| Detail | Contract | Code | Match |
| --- | --- | --- | --- |
| SplitMix32 step | §1 C reference | `random.ts:76-85`: `(state + 0x9e3779b9) >>> 0`, then `>>> 16`, `Math.imul(0x21f0aaad)`, `>>> 15`, `Math.imul(0x735a2d97)`, `>>> 15`, `>>> 0`. Initial state = seed | yes |
| Stream seed | §2: `(seed XOR fnv1a32(id)) >>> 0`, FNV-1a over UTF-16 code units, basis 2166136261, prime 16777619 | `random.ts:125-146` | yes. The tests check the published FNV vectors and UTF-16 versus UTF-8 |
| `int` | §1 steps 1–3. Arguments are validated before any draw | `random.ts:56-64, 88-100`. All checks run before the first `uint32()`, the `n = 2^32` case makes one draw, and the rejection limit is `2^32 − (2^32 mod n)` | yes |
| `int` range limit | counts values, `int(0, 2^32 − 1)` OK, `int(0, 2^32)` throws | `random.ts:61` | yes |
| `pick` | exactly `items[int(0, len − 1)]`, `RangeError` on an empty list | `random.ts:102-108`. The empty check runs before any draw | yes |
| `digits` | one `int(0, 9)` per digit, left to right. `digits(0)` is `''` and draws nothing | `random.ts:110-119` | yes |
| Explicit variant name | draws nothing for the choice | `identifier.ts:43-46`: the `hasOwn` check, then a direct call. An unknown name throws before any draw | yes |
| Random variant | `pick(variantList)` on the same stream, then call it | `identifier.ts:39-41` | yes |
| Variant lists | `Object.keys` order, frozen, own keys only | `identifier.ts:37, 43` | yes |
| `generate` options | `{}` when omitted, never `undefined` | `identifier.ts:77` | yes (see N1 for the type side) |
| Seed check | `createRandom`, `defineIdentifier` factory, `createCz`. The message names `seed` | `random.ts:50-54`. The factory checks via `streamSeed`, and `cz.ts:87` checks too | yes |
| Default seed | `globalThis.crypto.getRandomValues`, looked up at call time, never `Math.random` | `cz.ts:36-41` | yes |
| Clock | `src/` reads the clock nowhere, except the deferred default in `createCz` | `grep` finds no `Date`, `Date.now`, `performance` or `Math.random` call anywhere in `src/`. The only `Date` is in the comment at `cz.ts:58` | yes |

The oracle in `tests/support/reference.ts` is independent of `src/`: it was written from the contract and
cross-checked in C and Python according to its header. The property test "matches the reference for any
sequence of uint32, int, pick and digits calls" pins how the four methods interleave, not just each one
in isolation. That is the right guard for a frozen stream.

## 3. The implementer's two questions

### 3.1 `referenceDate` default not read yet: acceptable deferral, `nit`

Contract §3 says that when `referenceDate` is omitted, `createCz` reads the current date once. It also says
(§3, line 76) that in M1 `createCz` returns only `seed` and `validate`. Since `Cz` does not expose the
date, the default cannot be observed in M1. No test could tell "read and dropped" from "not read". Reading
the clock now would add dead code and a clock read with no purpose, and nothing would check either. The
deferral is documented at `src/cz.ts:89-90` and cites decision Q2. I accept it and record it as a nit so
the M2 implementer remembers it.

The real issue lies elsewhere. The contract does not yet say **where** the date goes once it is read; see S1.

### 3.2 `IdentifierGenerator` instead of `Generator`: fine, `nit` on the contract wording

`Generator<T, TReturn, TNext>` is a global type in TypeScript's `lib.es2015.generator`. Exporting a type
with the same name would hide the global in every file that imports it, and it would read as the wrong
thing in TSDoc and editor tooltips. `IdentifierGenerator` is clear, follows the naming convention (an
English term, no alias), and lives in `src/core/types.ts` as the template says. The contract still uses
`Generator` in §5 (`docs/rules/core.md:125-127, 135`). Marek should update that wording so the contract
and the code use the same name (N2).

## 4. Findings

### Blockers

None.

### Should-fix

**S1 – The template cannot pass `referenceDate` to `futureDate` (contract gap, needs Marek, not the
implementer).**
`docs/rules/core.md` §3 says `referenceDate` is "today" for date-dependent rules "such as `futureDate`".
But the template it then defines has no channel for that date:

- `defineIdentifier` returns `(seed: number) => IdentifierGenerator` (`src/core/identifier.ts:68`, as
  specified in contract §5).
- Variants are `(random: Random) => string` (`src/core/identifier.ts:6`, contract §5 `edge.ts` /
  `invalid.ts`).
- Validators are `(value: string) => ValidationResult` (contract §4 and §5).

The `birthNumber` draft needs the date in three places. The `futureDate` validator (step 8) needs it. The
`invalid('futureDate')` generator needs it to produce a date after the reference date. The `month+20` and
`month+70` edge variants need it as their upper bound. Because of contract §4, the property
`validate(invalid('futureDate'))` → `futureDate` must hold with **the same** reference date on both
sides, and the core cannot thread one date to both today. The contract also conflicts with itself and
with the draft:

- "The only place in `src/` that reads the clock" is `createCz` (§3). But
  `validateBirthNumber(value)` from the subpath and `createBirthNumber({ seed })` never go through
  `createCz`. The draft (§3.6) proposes `validate.birthNumber(value, { referenceDate })` defaulting to
  the current date.
- The contract does not say whether "current date" means the local date or UTC. The draft says local.

The implementation is correct against the contract as written, so this is **not** a blocker. Fixing it
now is cheap: the core has 3 small files and no identifiers. After `tests/birthNumber.test.ts` is written
against the current shape, it costs much more. One possible shape, for Marek to decide: the factory takes
`{ seed, referenceDate }` instead of a bare seed. Variants get `(random, context)`. Validators may take an
optional `{ referenceDate }`. One core helper resolves the default date, so there is one clock read per
entry point (`createCz` or `create<Id>`), not one per call. This decision belongs in
`docs/rules/core.md` before the `birthNumber` tests are written.

### Nits

**N1 – `{} as Options` hides required options at the type level** (`src/core/identifier.ts:77`, and
`Options extends object` at lines 9 and 62).
I checked this with a scratch type probe. An identifier whose `generate` takes `{ bankCode: string }`
(a required option) compiles, and `generator()` with no options also compiles; at runtime that call
crashes. An identifier whose `generate` takes no options gets `Options` inferred as `object`, so
`cz.ico({ typo: true })` would compile without error. No identifier in the spec has a required option,
so this is not a bug today. But the template will be copied for every identifier. A cheap fix would be to
reject `Options` types with required keys in `defineIdentifier`, and to default `Options` to
`Record<string, never>` when `generate` takes none.

**N2 – The contract says `Generator`, the code says `IdentifierGenerator`** (`docs/rules/core.md:125-127,
135` vs. `src/core/types.ts:25`). The code's name is the better one (see 3.2). Marek should update the
contract text.

**N3 – The `referenceDate` default is deferred** (`src/cz.ts:89-90`). This is acceptable (see 3.1). It
must be implemented together with S1 in the first date-dependent identifier. When it is, the `CzOptions`
TSDoc (`src/cz.ts:13-17`) should document the default.

**N4 – The default-seed and date helpers will be needed outside `cz.ts` in M2.** `randomSeed`
(`src/cz.ts:36-41`) and `isCalendarDate`, `isLeapYear` and `daysInMonth` (`src/cz.ts:43-67`) are private
to `cz.ts`. In M2, `createBirthNumber({ seed?, referenceDate? })` needs the same default seed and date
check, and the `birthNumber` validator needs leap years and days per month (draft step 6). Following the
"shared logic in `src/core/`" rule, the M2 implementer should **move** them into a core module, not copy
them. Keeping them private now is correct, because knip forbids exports that nothing uses yet.

**N5 – The "looked up at call time" test only proves it for the method, not for the `crypto` object**
(`tests/core.cz.test.ts:34-41, 94-100`). `vi.spyOn(globalThis.crypto, 'getRandomValues')` replaces the
method on the existing object. An implementation that captured `globalThis.crypto` at module load would
still pass. The code is correct (`src/cz.ts:38` reads `globalThis` on every call). A test using
`vi.stubGlobal('crypto', …)` would pin the contract wording exactly.

**N6 – Test helpers are repeated across files.** `seedArb` is defined in all three test files
(`core.random.test.ts:15`, `core.identifier.test.ts:20`, `core.cz.test.ts:12`). `draw` is defined twice
(`core.random.test.ts:18`, `core.identifier.test.ts:95`). These could move to `tests/support/` before
each identifier's test file adds another copy.

**N7 – The size budget is due for review.** `docs/spec.md` (Technická rozhodnutí) and `.size-limit.ts:1`
both say to revisit the numbers after M1. The whole library is 605 B against 10 kB. This is Marek's call;
it needs no change in the core.

## 5. Code quality (judgement items from the checklist)

- **Template:** the layout matches contract §5 (`random.ts`, `types.ts`, `identifier.ts`, `cz.ts`,
  `index.ts`). Variant lists come from the record keys, so a variant cannot be missing from its list.
  `InvalidVariant extends Reason` is enforced at compile time. The scratch probe confirmed that an invalid
  variant which is not a reason code fails to compile.
- **Convenience for `birthNumber`:** apart from S1 and N1, the shape suits it.
  `edge('month+20')`, typed variant names, and readonly frozen `edgeVariants` / `invalidVariants` all
  work in `it.each(...)`. `createBirthNumber({ seed: 42 })` and `cz.birthNumber` can share one factory,
  which gives the identical-stream guarantee of §2 for free.
- **Duplication:** none in `src/`. The constants that appear in both `src/core/random.ts` and
  `tests/support/reference.ts` are repeated on purpose, so the oracle stays independent.
- **Naming and comments:** names are clear. Comments explain why (for example the rejection-loop
  guard at `random.ts:60`, the reason for avoiding `Date` at `cz.ts:58-59`, and the type-only `validate` at
  `identifier.ts:18-21`), and they cite contract sections and the official algorithm sources.
- **Public API:** `createCz`, `Cz`, `CzOptions` and `ValidationResult` are exported and documented in
  TSDoc, including the Czech meaning (*české testovací údaje*, *výsledek validace*).
- **Tests as a specification:** they are good. Test names state the rule. Every pinned value comes with
  a note on how it was computed independently. The statistical checks use fixed seeds, so they cannot
  flake. The dummy identifiers make the template's stream behaviour testable without any real identifier.

---

# Round 2 (amendments A1/A2)

Reviewed 2026-10-05 by reviewer, against `docs/rules/core.md` with amendments A1 and A2 and the
"A1/A2 clarifications" (approved 2026-10-05). New files: `src/core/settings.ts`, `src/core/date.ts`,
`tests/core.context.test.ts`, `tests/core.options.test.ts`, `tests/core.settings.test.ts` and
`tests/support/helpers.ts`. The round 1 text above is unchanged.

**Verdict: no blockers.** A1 and A2 are implemented and tested as written, including all three
test-writer clarifications. One new should-fix concerns the contract, not the code (S2): `generate` now
receives the reference date, so the core no longer *structurally* keeps valid values independent of it.

## R2.1 Tool results

| Check | Command | Result |
| --- | --- | --- |
| Tests | `npm test` | pass: 6 files, 311 tests |
| Coverage | `npm run coverage` | pass. Of the 52 branches in `src/`, the 4 uncovered ones are all in `src/cli.ts` (M0 stub). Every file in `src/core/` and `src/cz.ts` has 100 % statements and branches; the text reporter leaves fully covered files out of its table |
| Typecheck | `npm run typecheck` | pass |
| Lint | `npm run lint` | pass |
| Unused code | `npm run knip` | pass |
| Build | `npm run build` | pass, attw and publint clean |
| Size | `npm run size` | pass: **651 B** min+gzip, up from 605 B, against a 10 kB budget |

The determinism-critical code (PRNG, `int` / `pick` / `digits`, stream seeds, variant choice) is unchanged
in behaviour. All pinned snapshots from round 1 and the reference-oracle property tests still pass.

## R2.2 Status of the round 1 findings

| Finding | Status | Where |
| --- | --- | --- |
| S1 – no channel for `referenceDate` | **resolved** (A1) | `src/core/settings.ts`, `IdentifierContext` in `src/core/types.ts:54-57`, context passing in `src/core/identifier.ts:89-110`; tested in `tests/core.context.test.ts` and `tests/core.settings.test.ts` |
| N1 – `{} as Options` hid required options | **resolved** (A2) | `OptionsArgs` in `src/core/types.ts:66, 80`; `Options` defaults to `NoOptions` in `src/core/identifier.ts:81`; tested in `tests/core.options.test.ts`. The remaining cast is judged in R2.4 |
| N2 – contract said `Generator` | **resolved** | `docs/rules/core.md` §5 now says `IdentifierGenerator` and explains why |
| N3 – `referenceDate` default deferred | **resolved** | `todayUtc()` at `src/core/settings.ts:25-27`; the default is documented in TSDoc at `src/core/types.ts:24-29` |
| N4 – seed and date helpers private to `cz.ts` | **resolved** | moved to `src/core/settings.ts` and `src/core/date.ts`; `src/cz.ts` now only calls `resolveSettings` |
| N5 – crypto test only covered the method | **resolved** | `tests/core.settings.test.ts:20-30, 114-119` replaces the whole global with `vi.stubGlobal('crypto', …)`. The weaker `spyOn` in `tests/core.cz.test.ts:47-55` remains, but it is now redundant rather than misleading |
| N6 – repeated test helpers | **resolved** | `tests/support/helpers.ts`; no copies of `seedArb` or `draw` remain in the test files |
| N7 – size budget due for review | **open** (Marek's call) | 651 B against 10 kB; `.size-limit.ts:1` still says "Revisit the numbers after M1" |

## R2.3 Contract checks

**A1, as written:**

| Requirement | Code | Test |
| --- | --- | --- |
| `resolveSettings` fills both defaults and returns `{ seed, referenceDate }` | `settings.ts:53-57` | `core.settings.test.ts:83-125` |
| Default date is the **UTC** date; tested with a fake clock around midnight in time zones other than UTC | `settings.ts:25-27` | `core.settings.test.ts:41-79`. Each case first asserts that the local date differs from the UTC date, so the test cannot pass by accident on a machine that runs in UTC. `core.cz.test.ts:146-157` and `core.context.test.ts:165-185` do the same for `createCz` and `validate` |
| `cz.referenceDate` and the generator's `.seed` / `.referenceDate` echo the resolved values | `cz.ts:33-37`, `identifier.ts:97-99` | `core.cz.test.ts:97-107, 125-144`, `core.identifier.test.ts:256-272` |
| The context reaches `generate`, every variant (named and random) and the inner validator | `identifier.ts:53-61, 96, 109` | `core.context.test.ts:95-122, 153-163` |
| Public `validate` resolves `referenceDate` and throws `RangeError` for an invalid one | `identifier.ts:109` | `core.context.test.ts:165-196` |
| Validators never throw for any `value` | — | `core.context.test.ts:198-206` |
| `createCz` resolves once and shares the settings | `cz.ts:34-35` | (no identifiers on `cz` yet; will be checked in M2) |

**A2, as written:** if all options are optional, the argument is optional; if one is required, the
argument is required (`[]` and `[undefined]` are rejected); `NoOptions` rejects unknown keys and equals
`Readonly<Record<string, never>>`. All of this is covered by `tests/core.options.test.ts:102-143`. At
runtime, `{}` is passed when no options are given (`core.options.test.ts:76-100`).

**The three test-writer clarifications:**

1. *A `generate` without an options parameter defaults to `NoOptions`:* implemented as a type parameter
   default (`identifier.ts:80-81`) and tested by `core.options.test.ts:136-143`. The test also checks
   that the parameter list equals that of an explicit `NoOptions` identifier.
2. *The context is exactly `{ referenceDate }`:* the code builds a fresh frozen `{ referenceDate }`
   (`identifier.ts:92-93`). The tests compare every recorded context with `toEqual({ referenceDate })`
   (`core.context.test.ts:109-111, 119-121, 159-162`), so an extra defined key such as `seed` would fail.
3. *Error messages of `create` and the public `validate` name the option:* `create` is tested for
   `/seed/` and `/referenceDate/` in `core.identifier.test.ts:274-292`, and `validate` for
   `/referenceDate/` in `core.context.test.ts:187-196`.

**Clock.** `new Date()` occurs exactly once in `src/`, inside `todayUtc()` (`src/core/settings.ts:26`).
There is no `Date.now`, `performance` or `Math.random` anywhere. `todayUtc()` has one caller,
`resolveReferenceDate` (`settings.ts:36`). That function is reached from `resolveSettings`, from the
public `validate` (`identifier.ts:109`) and also from `create` (`identifier.ts:91`); see N8 for the last.

**The plain generator and `referenceDate`.** In round 1 this independence held by construction, because
`generate` never received the date. Under A1 it does receive the context (contract §5, "`generate`, every
variant and the inner `validate` receive it"). The rule "Valid values never depend on `referenceDate`"
(§3) is now a convention that tests must check; the types no longer guarantee it. The core tests check it
for the dummies (`core.identifier.test.ts:244-254`, and the `eventDate` dummy in `core.context.test.ts:49-53`
documents it). Nothing yet makes every M2 identifier check it. See S2.

## R2.4 The implementer's two questions

### Q1 – The remaining `options ?? ({} as Options)` (`src/core/identifier.ts:96`): acceptable, not a finding against the code

The cast is sound, and it is not the cast my N1 objected to.

- The only call that reaches `{}` passes no argument. The public call signature
  `(...args: OptionsArgs<Options>)` (`types.ts:66, 80`) allows that only when `NoOptions extends Options`.
- `{}` is a value of `NoOptions`, so in that case it is a valid `Options`.
- When an option is required, omitting the argument fails to compile. `core.options.test.ts:114-122`
  pins this, which was exactly the hole in round 1.
- TypeScript cannot narrow a generic through a conditional type. Inside `create`, some assertion is
  therefore unavoidable, unless every definition supplied its own default options object, which would be
  more machinery for no gain.
- The comment at `identifier.ts:94-95` states the invariant that makes the cast safe.

The contract's parenthetical "(no `{} as Options`)" (§5, line 164; Decision A2) literally forbids this
expression. Its intent was to forbid an *unsound* default. I recommend rewording the contract rather than
changing the code (N9).

### Q2 – `CzOptions` renamed to `SettingsOptions`; `IdentifierGenerator` and `NoOptions` not exported yet: fine

- **The rename is right.** The same options type now serves `createCz` and every `create<Id>` (§3), so a
  `Cz`-specific name would be wrong. The pair `SettingsOptions` (input) and `Settings` (resolved) is
  clear. The package is at 0.0.0 and unpublished, so the rename breaks nothing. The contract does not
  name the public type yet (N10).
- **Deferring the exports is fine.** The built `dist/index.d.ts` references only `Cz`, `SettingsOptions`
  and `ValidationResult`, and all three are exported. No public type points at an unexported one.
  `IdentifierGenerator` (and `ValidatorOptions`) become part of the public type surface once M2 puts
  generators on `Cz` and adds `validate<Id>`. They should be exported then, so that users can name them.
  Exporting them now would be an unused public surface.

## R2.5 Convenience for `birthNumber`

The template now fits `birthNumber` well:

- `invalid.futureDate: (random, { referenceDate }) => …` and the inner
  `validate(value, { referenceDate })` see the same date. The property `validate(invalid('futureDate'))`
  → `futureDate` holds as long as `cz.validate.birthNumber` binds the instance's date (M2 work). For the
  standalone functions, the caller passes the same `referenceDate` to both, as §3 says.
  `core.context.test.ts:131-149` demonstrates this pattern on a dummy.
- `month+20` / `month+70` can bound their dates by `context.referenceDate`. §3 explicitly allows edge
  variants to use the date for "an upper bound such as 'not after the reference date'".
- `createBirthNumber = (options?) => birthNumber.create(resolveSettings(options))` and
  `validateBirthNumber = birthNumber.validate` are one line each. `cz.birthNumber` and `createBirthNumber`
  share one `create`, so the identical-stream guarantee (§2) holds by construction.
- The calendar helpers are in `src/core/date.ts`. `birthNumber` will need `isLeapYear` and `daysInMonth`
  exported from there, which costs nothing because knip allows the export once it is used.

What remains open is in the rules, not in the template; see S2(b).

## R2.6 Findings

### Blockers

None.

### Should-fix

**S2 – The contract does not say what `generate` may do with the context, and two core rules can collide
(contract, needs Marek before the `birthNumber` tests).**

(a) `generate` receives `{ referenceDate }` (§5), but the only limit is "Valid values never depend on
`referenceDate`" (§3, line 98). That rule is no longer enforced by construction; see R2.3. The legitimate
use is to reject options, for example `birthNumber({ birthDate })` after the reference date, which would
otherwise break "Generators never return an invalid value by accident" (§3, line 102). The fix is cheap:
- one sentence in §3: `generate` may use the context only to reject options with `RangeError`, never to
  shape a value;
- one property that every identifier test file must contain: same seed, two different `referenceDate`s,
  same plain values. This could be a shared helper in `tests/support/helpers.ts`, generalising
  `core.identifier.test.ts:244-254`.

(b) For a date-dependent identifier, "valid values never depend on `referenceDate`" plus "never invalid by
accident" conflict when a caller passes a `referenceDate` earlier than the generator's fixed date range.
The `birthNumber` draft, open question 5, proposes default births up to 2025-12-31. With
`createCz({ referenceDate: '2010-01-01' })`, a plain `cz.birthNumber()` could then fail
`cz.validate.birthNumber` with `futureDate`. The same gap appears for `month+20` / `month+70` when
`referenceDate` is before 2004-04-01, and for `futureDate` when it is after 2053-12-31: no valid date
exists in either case. The core contract should state the policy once (for example "a variant or
generator whose range is empty for the given `referenceDate` throws `RangeError` naming `referenceDate`").
The `birthNumber` rules should then apply it. This is a decision for Marek, best made when approving
`docs/rules/birthNumber.md`.

### Nits

**N8 – `create` can read the clock, a path the contract does not list** (`src/core/identifier.ts:91`).
`create` calls `resolveReferenceDate`, which *defaults* a missing date to `todayUtc()`. §3 (lines 91-92)
lists `resolveSettings` and validators as the only callers of `todayUtc`, and §5 says `create` *checks*
the date "like in `resolveSettings`". `Settings.referenceDate` is required, so the path is reachable only
from untyped JavaScript (`create({ seed: 1 })`), and no typed test can hit it. A small `assertReferenceDate`
used by `create` would keep the clock reads exactly as listed.

**N9 – Contract wording on the cast** (`docs/rules/core.md:164` and Decision A2). Replace
"(no `{} as Options`)" with the invariant the code relies on, for example "the `{}` default is reachable
only when `NoOptions extends Options`". This makes the code and the contract agree literally (see R2.4 Q1).

**N10 – The contract does not name the public options type.** §5's "Internal names" table lists
`Settings` and `NoOptions`, but not `SettingsOptions` (exported from `src/index.ts:4`) or
`ValidatorOptions` (`src/core/types.ts:45`, used by the public `validate`). Recording both names keeps
the contract the single source for the API names.
