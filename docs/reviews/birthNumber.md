# Review: birthNumber (M2)

Reviewed 2026-10-05 by reviewer.
Rules: `docs/rules/birthNumber.md` (APPROVED 2026-10-05; sections 8 and 9 win), `docs/rules/core.md` incl. A1–A3.
Code: `src/birthNumber/*`, `git diff main` of `src/core/date.ts`, `src/cz.ts`, `src/index.ts`, `tsdown.config.ts`,
`package.json`, `README.md`.
Tests: `tests/birthNumber.{api,determinism,generate,validate,variants}.test.ts`, `tests/support/birthNumber.ts`,
`tests/support/determinism.ts`.

**Verdict: one blocker (B1).** If `referenceDate` is `9999-12-31`, `invalid('futureDate')` returns a **valid**
number. The fix is one or two lines. Everything else matches the rules: every step of section 2, every
decision of section 8 and every range of section 9. The validator has 100 % branch coverage, and each invalid
variant has exactly one fault. Most should-fix items are about duplication and documentation. Each is cheap.

## 1. Tool results

| Check | Command | Result |
| --- | --- | --- |
| Tests | `CI=true npm test` | pass: 11 files, 695 tests |
| Coverage | `CI=true npm run coverage` | pass. Branches (lcov): `src/birthNumber/validate.ts` **39/39**, `generate.ts` 25/25, `edge.ts` 2/2, `invalid.ts` 8/8, `src/core/date.ts` 23/23. Only `src/cli.ts` is at 0 % (M0 stub). The 100 % `validate*.ts` threshold now applies to a real file and holds |
| Typecheck | `npm run typecheck` | pass |
| Lint | `npm run lint` | pass, no output |
| Unused code | `npm run knip` | pass, nothing reported |
| Build | `npm run build` | pass, attw and publint clean, `./birthNumber` subpath emitted (ESM + CJS + d.ts) |
| Size | `npm run size` | **fails**: `birthNumber` subpath 3.08 kB against the 2 kB budget. The whole library is 3.19 kB of 10 kB. See section 5; per the brief this is not a blocker |

## 2. Rules → code → tests

| Rule | Code | Test | OK |
| --- | --- | --- | --- |
| §2 step 1: `letters` (`\p{L}`), then `badFormat`; no trimming | `validate.ts:21-23, 33-38` | `validate.test.ts:118-179`, oracle properties `:563-615` | yes |
| §2 step 2: 9 or 10 digits after removing the slash | `validate.ts:81-84` | `:181-201` (incl. `''`, `123456/`) | yes |
| §2 steps 3–4: month series; +20/+70 only for 10 digits | `validate.ts:27-28, 40-44` | `:203-268` | yes |
| §2 step 5: century from the length (ČSSZ) | `validate.ts:55` | `:270-297` | yes |
| §2 step 6: Gregorian date (1900 not leap, 2000 leap) | `validate.ts:57` → `core/date.ts:daysInMonth` | `:299-351` | yes |
| §2 step 7: mod 11, exception only 1954–1985 | `validate.ts:61-67, 90` | `:353-425` | yes (see N2) |
| §2 step 8: `futureDate`; equal to `referenceDate` is valid | `validate.ts:94` | `:427-452`, `api.test.ts:206-247` | yes |
| Decision 7: precedence | order of `validate.ts:76-97` | `:454-477` | yes |
| Decisions 1, 2, 3, 6: formerly disputed samples | as above | `validate.test.ts:88-116` | yes |
| Decision 4: strict input | `validate.ts:20-38` | step-1 tests | yes |
| Decision 5 / A1: `referenceDate`, default UTC, `cz.validate` uses the instance date | `identifier.ts:109`, `cz.ts:56` | `validate.test.ts:479-511`, `api.test.ts:206-247` | yes |
| Decision 6: zero endings valid, never generated | `generate.ts:86-89, 107` | `generate.test.ts:195-213`, `variants.test.ts:60-65, 307-315` | yes |
| Decision 8: README sentence | `README.md:8` | (doc) | yes |
| §9 options: `gender`, `birthDate` (9/10 digits, 1854–2053, ≤ `referenceDate`), `RangeError` naming the option | `generate.ts:111-139` | `generate.test.ts:110-271` | yes |
| §9 ranges + A3 cut + empty-range `RangeError` naming `referenceDate` | `generate.ts:52-65`, `edge.ts:24-37, 57-63`, `invalid.ts:25, 89-94` | `variants.test.ts:291-382`, `generate.test.ts:73-96, 263-271` | yes, **except B1** |
| §9 clarifications: other invalid variants use the plain range; `withoutSlash` and `leapDay` cover both lengths | `invalid.ts:47-49, 63`; `edge.ts:31, 35-37` | `variants.test.ts:242-258, 347-352` | yes |
| A3 shared determinism check | — | `determinism.test.ts:79-99` via `tests/support/determinism.ts` | yes |

**One fault per invalid variant** (checked by hand against the code, and by the tests for every seed and date):

- `badChecksum` (`invalid.ts:55-59`): the original check digit is `N9 mod 11 ≤ 9`, so `N9 mod 11 ≠ 10`. No
  other last digit can turn it into a `mod11Exception`, and the date stays ≤ `referenceDate`.
- `impossibleDate` (`:62-71`): the checksum is recomputed for the faulty prefix. `IMPOSSIBLE_MONTHS` excludes
  all four series. A day of 0 or `daysInMonth + 1` covers "29 Feb in a non-leap year".
- `wrongLength` (`:76-79`): 8 or 11 digits, never a 9-digit truncation.
- `letters` (`:82-86`): exactly one letter, never at the slash position.
- `futureDate` (`:89-94`): a correct checksum and a date in the future. Exception: B1.

**Draw order.** Every generator draws the date first, then the gender, then the ending:
`generate.ts:135-138`; `pre1954`, `withoutSlash` and `leapDay` through argument evaluation order at
`edge.ts:62, 68, 75`; `mod11Exception` `:52-54`; `futureDate` `invalid.ts:92-93`. `month+20` and `month+70`
skip the gender. `impossibleDate` adds `fault` and the month between gender and ending. `badChecksum`,
`wrongLength` and `letters` run the plain sequence, then their mutation draws. `impossibleDate` with the
`month` fault draws a gender it then throws away. That keeps the order uniform, so I accept it. The order is
sensible and the same everywhere.

**Snapshot coverage.** The four snapshots cover: every edge and invalid variant by name; random choice of
both; 9- and 10-digit `leapDay` and `withoutSlash`; all three `impossibleDate` faults (`815732` day 32,
`821808` month 18, `780600` day 00, `210431` 31 April); both `wrongLength` branches; and the three option
shapes. What is missing is the cut paths; see S6.

## 3. Findings

### Blockers

**B1 – `futureDate` returns a valid number when `referenceDate` is `9999-12-31`.**
`src/birthNumber/invalid.ts:90-92` computes `addDays('9999-12-31', 1)`. `fromDayNumber` → `formatDate`
(`src/core/date.ts:33-34`) formats that as `'10000-01-01'`. The string comparison `dayAfter > '2040-01-01'`
is then false, because `'1' < '2'`. The lower bound falls back to `2040-01-01`, `from ≤ to`, and a 2040–2053
date is drawn, which is *before* the reference date. Reproduced on the built bundle:

```
createBirthNumber({ seed: 42, referenceDate: '9999-12-31' }).invalid('futureDate') // '486104/4243'
validateBirthNumber('486104/4243', { referenceDate: '9999-12-31' })               // { valid: true }
```

With that date, 44 of 200 random `invalid()` calls came back valid. `9999-12-31` passes `isCalendarDate` and
is a common "far future" sentinel. This breaks core §4 ("the validator returns exactly that code for that
variant") and A3, which requires a `RangeError` naming `referenceDate` when the range is empty. Every other
`referenceDate` from 2053-12-31 on throws correctly. Fix: compare day numbers rather than strings, for example
`from = max(toDayNumber(FUTURE_RANGE.from), toDayNumber(referenceDate) + 1)` and draw in day numbers. Another
option is to throw early when `referenceDate >= FUTURE_RANGE.to`. The root cause, `formatDate` emitting a
5-digit year, also breaks the comment at `date.ts:3-4` ("4-digit year, so string order is date order").
Either keep `addDays` from leaving year 9999 or note the limit there. The tests never use `9999-12-31`
(`variants.test.ts:345-346` stops at `2060-01-01`). The test-writer should add it, since the implementer does
not edit tests.

### Should-fix

**S1 – `pad` is duplicated.** `src/core/date.ts:28-30` (private) and `src/birthNumber/generate.ts:44-46`
(exported) contain the same function. Export one copy from core (CLAUDE.md: shared logic lives in a shared
utility). Saves about 10 B gzip.

**S2 – Month encoding and `RRMMDD` formatting live in several places.** The offsets 0/50/20/70 appear in
`generate.ts:41`, `edge.ts:40-41`, `validate.ts:27-28` and again as ranges in `invalid.ts:28-33`.
`invalid.ts:69` rebuilds `RRMMDD` inline instead of using `datePrefix` (`generate.ts:77-80`). One constant
for the series, plus a prefix helper that takes `(year, encodedMonth, day)`, removes the copies. Then the
`IMPOSSIBLE_MONTHS` derivation reads as "not in any series". Also, the comment at `invalid.ts:27` describes
`IMPOSSIBLE_MONTHS` but sits above `VALID_MONTH_SERIES`.

**S3 – The variant type is declared three times.**
`type Variant = (random: Random, context: IdentifierContext) => string` appears in `edge.ts:21`,
`invalid.ts:22` and `core/identifier.ts:14`. Export it once from `src/core/types.ts`, so later identifiers
reuse it instead of copying it. Type-only; it costs no bytes.

**S4 – Some rule comments cite a source without the link** (CLAUDE.md: "link … in a code comment"):

- DASTA (`https://dastacr.cz/dasta/hypertext/DSBET.htm`) in `edge.ts:25, 73` and `validate.ts:30`.
- zákon č. 53/2004 Sb. (`https://www.zakonyprolidi.cz/cs/2004-53`) in `edge.ts:27` and `validate.ts:26`.
- MV ČR registry specification section 6.3 in `generate.ts:93`.

The law and ČSSZ links are present in the file headers of `generate.ts` and `validate.ts`.

**S5 – Stale and missing TSDoc on the public surface.**

- `src/core/types.ts:26-27` (`SettingsOptions.referenceDate`, public) still says "Valid values never depend
  on it, so the same seed gives the same valid values on any day". That is the pre-A3 wording. Under A3, an
  early `referenceDate` cuts the ranges and changes valid values. It can also make the generator throw.
- Nothing a user sees in the IDE says that calling the generator can throw. `BirthNumberOptions`
  (`generate.ts:13-21`) and `createBirthNumber` (`index.ts:25-40`) do not mention the `RangeError` for a bad
  `gender` or `birthDate`. They also do not mention the empty-range `RangeError`.
  `createBirthNumber({ referenceDate: '1950-01-01' })` succeeds, but every plain call then throws, and that is
  surprising without a `@throws` note.

**S6 – The snapshot does not pin the cut paths** (`tests/birthNumber.determinism.test.ts:101-293`; test-side,
for Marek or the test-writer). All four snapshots use `2026-10-05`, so no range is cut. The `drawDateUpTo`
upper bound, the filtered `leapDay` list and the moved `futureDate` lower bound decide outputs for explicit
dates, and core §2 freezes those outputs too. Today they are checked only by properties, which any correct
implementation passes. One extra inline snapshot would close the gap. Example: seed 42 with `referenceDate`
`1990-06-15` (plain, `pre1954`, `mod11Exception`, `leapDay`, `withoutSlash`, the date-independent invalid
variants) and `2045-06-15` (`futureDate`). `month+20` and `month+70` must be left out for 1990, because they
throw.

### Nits

**N1 – Unused capture groups.** `src/core/date.ts:6` `DATE_PATTERN` keeps its capture groups, but since
`isCalendarDate` switched to `.test()` + `dateParts` nothing reads them. Use `/^\d{4}-\d{2}-\d{2}$/`.

**N2 – The missing lower bound needs a comment.** `validate.ts:66` checks `year <= 1985` with no `>= 1954`
bound. That is correct, because a 10-digit number always decodes to 1954–2053. A short comment would stop a
later reader from "fixing" it, or from wondering whether it was forgotten.

**N3 – `createCz` resolves the settings twice.** `src/cz.ts:54` passes already-resolved settings to
`createBirthNumber`, which runs `resolveSettings` again. Core §5 says `createCz` passes the resolved object
to each identifier's `create`. The output is the same; it is only duplicated work. `cz.validate.birthNumber`
(`:56`) also re-checks `referenceDate` on every call. Fine as it is; worth knowing before eight more
identifiers follow this pattern.

**N4 – Stale header in the determinism test.** `tests/birthNumber.determinism.test.ts:5-8` and the describe
title at `:101` still say the snapshots are "left EMPTY on purpose" or "filled by Marek after the
implementation passes". They are filled now. Test-side.

**N5 – Template paths differ from the layout.** `docs/rules/core.md:145` and `CLAUDE.md:34, 42` name
`tests/<id>.test.ts`; M2 uses five `tests/birthNumber.*.test.ts` files. The split reads well. Update the
template wording so the next identifiers follow one convention.

**N6 – The empty-range error does not name the variant.** The message (`generate.ts:54-56`, `edge.ts:60`)
says "leaves no birth date in the fixed range of this generator". With `edge()` or `invalid()` and no name,
the variant is chosen at random. For example, `month+20` with `referenceDate` before 2004-04-01 makes some
seeds throw and others not, and the user cannot tell which variant failed. Naming the variant would help,
but it costs bytes (section 5), so this is Marek's trade-off.

## 4. Code quality

- **Template:** the layout matches core §5 (`generate`, `validate`, `edge`, `invalid`, `index`). The
  `./birthNumber` subpath is wired in `tsdown.config.ts` and `package.json`. `generate.ts` also serves as the
  helper library for `edge.ts` and `invalid.ts`. Its header says so, and the result reads fine.
- **Shared logic:** the date arithmetic is in `src/core/date.ts` (Hinnant's algorithms, cited) and is not
  duplicated. `isLeapYear` and `daysInMonth` are reused by `edge.ts`, `invalid.ts` and `validate.ts`. The
  mod 11 arithmetic stays local for now; core §5 moves shared algorithms to `src/core/` "when the second
  identifier needs them", so that is correct until IČO. The duplication is in S1–S3.
- **Names and comments:** clear. Comments explain why and cite the rule: for example `drawCongruent`
  (`generate.ts:82-89`) and the `badChecksum` argument (`invalid.ts:51-54`).
- **API:** matches `docs/spec.md:69-80` exactly. It is convenient in Vitest or Playwright:
  `createCz({ seed })` once, then `cz.birthNumber({ gender, birthDate })`, `.edge(name)`, `.invalid(name)`,
  and `expect(cz.validate.birthNumber(v)).toEqual({ valid: false, reason: 'badChecksum' })`. `seed` and
  `referenceDate` are echoed for reproduction. The types reject unknown variant names and options.
- **TSDoc:** present on every public export, including the Czech meaning. See S5 for the gaps.
- **Tests:** read like a specification. Section-numbered describes, a "why" column per sample, and an oracle
  written from the rules (`tests/support/birthNumber.ts`) that property tests compare against.

## 5. Size budget (3.08 kB vs 2 kB): what could realistically shrink

I measured in memory with rolldown + minify + gzip (level 9) against the built subpath, which comes to 3120 B,
in line with size-limit.

| Part | gzip |
| --- | --- |
| Core as used by the subpath (`random`, `settings`, `identifier`, `date` incl. M2 additions) | ~1.66 kB |
| of which the new day-number helpers (`toDayNumber`, `fromDayNumber`, `addDays`) alone | ~0.43 kB standalone |
| `validate.ts` alone | ~0.62 kB |
| birthNumber on top of core (generate, edge, invalid, validate, index) | ~1.46 kB |

Candidates that do not hurt readability or the contract:

| Change | Est. saving (gzip) | Notes |
| --- | --- | --- |
| Shorter birthNumber error messages: drop the `(docs/rules/birthNumber.md section 9)` suffixes and trim the `birthDate`/`gender`/empty-range wording while still naming the option and value | ~90 B | measured; the suffixes alone ~20 B |
| One `pad` (S1) | ~10 B | measured |
| Day numbers through `Date` (`setUTCFullYear` + `getTime() / 86_400_000`, `toISOString().slice(0, 10)`) instead of Hinnant's algorithms | ~150–200 B | measured 227 B vs 435 B standalone. Same epoch and integer results, so outputs and snapshots stay the same. It reverses the M1 "no `Date`" choice in `date.ts:2-4`, so Marek decides. It must still avoid `Date.UTC`'s 0–99 year mapping |
| Merge the month-series constants and the inline prefix (S2); reuse one empty-range message for `leapDay` | ~20–40 B | estimate |
| Shorter core messages (`int`, `digits`, `seed`) | ~50 B | M1 code, already reviewed; low value |

Dead paths: `Random.digits` is unused by birthNumber (about 60 B), but core §1 requires it and later
identifiers will use it. I found nothing else dead.

**Realistic total: about 250–350 B, which brings the subpath to ~2.75–2.85 kB.** The 2 kB budget cannot be
met by trimming. Core alone, as the subpath uses it, is ~1.66 kB, which would leave about 0.35 kB for the most
complex identifier. Options for Marek: raise the per-identifier budget to about 3–3.5 kB including core, or
measure each identifier as its increment over core (birthNumber ≈ 1.5 kB; a 2 kB increment budget would
hold).

---

# Round 2

Reviewed 2026-10-05 by reviewer. Scope: `git diff main` plus untracked files after the round-1 fixes (B1,
S1–S6, N1–N4, size budget variant B, `vitest.config.ts` `update: 'none'`). Round 1 above is unchanged.

**Verdict: no blockers.** B1 is fixed at the root: ranges are computed in day numbers, and `fromDayNumber`
refuses years outside 0000–9999. S1–S6 are resolved. The new size setup measures what it says it measures.
Two cheap should-fix items remain, both documentation. Everything else is a nit.

## R2.1 Tool results (`npm run check`, one run, `CI` not set)

| Step | Result |
| --- | --- |
| typecheck | pass |
| lint | pass |
| knip | pass |
| coverage | pass: 12 files, 733 tests. All files except `src/cli.ts` (M0 stub) are at 100 % (hidden by `skipFull`), so the `validate*.ts` 100 % branch threshold holds |
| build | pass |
| size | pass: whole library 3.21 kB / 10 kB; core 1.79 kB / 2 kB; `birthNumber` on top of core 1.99 kB / 2 kB |

The run did not touch `tests/birthNumber.determinism.test.ts` (mtime 21:10, before the run).

## R2.2 Status of the round-1 findings

| Finding | Status | Evidence |
| --- | --- | --- |
| B1 `futureDate` at `9999-12-31` | **resolved** | `invalid.ts:86-90` computes `max(2040-01-01, referenceDate + 1)` in day numbers. `drawDate` (`generate.ts:68-73`) throws `RangeError` naming `referenceDate` when `fromDay > toDay`. `fromDayNumber` (`core/date.ts:86-89`) throws outside 0000-01-01 … 9999-12-31, so no 5-digit year can come back. Reproduced on the built bundle: `createBirthNumber({ seed: 42, referenceDate: '9999-12-31' }).invalid('futureDate')` throws `referenceDate "9999-12-31": leaves no date in range`; 0 of 200 random `invalid()` calls returned a valid value. Tests: `variants.test.ts:386-485` (2053-12-31 … 9999-12-31, and a property over 0000–9999), `core.date.test.ts` (both boundaries, round trips over the whole range against an independent `setUTCFullYear` reference) |
| S1 one `pad` | resolved | `core/date.ts:17-19`, imported by `generate.ts` and `edge.ts` |
| S2 month series and prefix | resolved | `MONTH_OFFSETS` (`generate.ts:40`) feeds `edge.ts:69-70`, `invalid.ts:27-30` and `validate.ts:28-29`. `encodePrefix` (`generate.ts:91-93`) replaces the inline `RRMMDD` in `impossibleDate`. The `IMPOSSIBLE_MONTHS` comment now sits on the right constant |
| S3 one variant type | resolved | `IdentifierVariant` in `core/types.ts:64-68`, used by `core/identifier.ts`, `edge.ts`, `invalid.ts` |
| S4 source links | resolved | DASTA (`edge.ts:25, 45, 72`, `validate.ts:32`), zákon 53/2004 Sb. (`generate.ts:38`, `edge.ts:27`, `validate.ts:27`), MV ČR registry spec (`generate.ts:112-113`) |
| S5 TSDoc | resolved, with R2-S1 | `SettingsOptions.referenceDate` (`core/types.ts:25-33`) now states A3. `BirthNumberOptions` (`generate.ts:11-27`) and `createBirthNumber` (`index.ts:38-47`) list every `RangeError`. The placement of that list has a rendering problem; see R2-S1 |
| S6 cut-range snapshot | resolved | `determinism.test.ts:295-371`: seed 42 at `1970-06-15` (plain, options, four edge variants, all invalid variants) and `2045-06-15` (`futureDate`, plain); `month+20`/`month+70` asserted to throw. I checked every pinned value against the built validator: each edge and plain value is valid at its `referenceDate`, each invalid value fails with its own reason, and every decoded date lies inside its cut range (early plain ≤ 1970-06-15, `mod11Exception` 1967/1969, late `futureDate` 2047–2052, valid at 2053-12-31). This checks the properties of the pinned values, not the exact draws |
| N1 capture groups | resolved | `core/date.ts:7` |
| N2 comment on the missing lower bound | resolved | `validate.ts:68` |
| N3 settings resolved twice | **open, accepted** | see R2.4 |
| N4 stale determinism header | **open** | done only for the seed snapshots; see R2-N1 |
| N5 test file paths in the template | partly resolved | `CLAUDE.md` and `.claude/agents/test-writer.md` now say `tests/<id>.<area>.test.ts`. `docs/rules/core.md:145` still says `tests/<id>.test.ts` |
| N6 empty-range error does not name the variant | open, accepted | the message is now shorter still. With 10 B of identifier budget left, naming the variant is not affordable. It stays Marek's trade-off |

**Byte-identical output.** The four round-1 seed snapshots are still there, including the values round 1
quoted (`815732/8949`, `821808/4875`, `780600/7220`, `210431/5994`). The suite passes with
`update: 'none'`, so the S1/S2 refactors and the day-number rewrite did not change any pinned value.
`update: 'none'` is a valid Vitest 5 value (`boolean | "all" | "new" | "none"`). A missing snapshot now fails
instead of being written.

## R2.3 Size budget (variant B): does `.size-limit.ts` measure what it claims?

Yes. I checked this against `@size-limit/rolldown` 14.1.0 and with my own rolldown build:

- **Identifier:** `ignore: ['../core']` becomes the rolldown `external` regex `^(\.\./core)($|/)`. That
  matches every `../core/<module>.js` specifier the identifier uses. My own bundle of
  `src/birthNumber/index.ts` with that regex kept only three external imports
  (`../core/identifier.js`, `../core/settings.js`, `../core/date.js`) and contains none of the core constants
  (PRNG, Hinnant). So the 1.99 kB is birthNumber's own code plus those import statements.
- **Core:** the generated entry re-exports every `src/core/*.ts` (`readdirSync`), so a new core module is
  measured automatically. The core is measured in full (`import: '*'`), not just the part birthNumber uses,
  which is the conservative choice.
- **Whole library:** `dist/index.js` with `import: '*'`, which pulls in `createCz` → birthNumber → core.
  The published `./birthNumber` subpath (core + identifier, about 3.1 kB in my measurement) no longer has a
  budget of its own. That is what variant B means.

**Messages:** all of them still name the option and show the value:
`gender "x": male or female`, `birthDate "1800-01-01": YYYY-MM-DD in 1854–2053`,
`birthDate "2026-10-06": after referenceDate`, `referenceDate "1950-01-01": leaves no date in range`. The
unknown-variant message comes from core and is unchanged.

## R2.4 N3 (declined by the implementer): acceptable?

Acceptable. The reason given is not quite complete, though. Exposing the `defineIdentifier` result is not
the only way to avoid the second `resolveSettings`. A non-entry module such as `src/birthNumber/identifier.ts`,
imported by both `index.ts` and `cz.ts`, would stay internal, because only `tsdown.config.ts` entries are
public. That fix costs one extra file per identifier and saves one cheap validation per `createCz` call.
Keeping the current pattern is fine. Since it becomes the template for eight more identifiers, decide it
before IČO rather than changing it later.

## R2.5 New findings

### Blockers

None.

### Should-fix

**R2-S1 – The `RangeError` list in `createBirthNumber` is rendered as part of the example.**
`src/birthNumber/index.ts:38-44` ("The returned generator throws `RangeError` too: …") comes after the
`@example` block tag at `:31`. In TSDoc, a block tag runs until the next block tag, so the list belongs to
`@example`. IDE hovers show it under the example heading, and doc generators put it inside the example
section. This is the text S5 asked for. Move the paragraph above `@example`, and the hover shows it as
part of the summary. Zero bytes.

**R2-S2 – Determinism test header and titles are stale (round-1 N4, now also for S6).** This is test-side,
for the test-writer or Marek. `tests/birthNumber.determinism.test.ts:8-9` says the cut-range snapshot "is
still EMPTY on purpose; Marek fills it after the B1 fix", and tells the reader to run with `CI=true` or
Vitest writes snapshots. Both are no longer true: the snapshot is filled, and `update: 'none'` now prevents
writes. The describe titles at `:102` ("filled by Marek after the implementation passes") and `:320`
("filled by Marek after the B1 fix") are just as stale. A reader of a test that is meant to be a
specification would think the pinned values are provisional. I tagged it should-fix rather than nit because
it was reported as done.

### Nits

**R2-N1 – Not much budget headroom.** The `birthNumber` increment is 1.99 kB of 2 kB (about 10 B left) and the
core is 1.79 kB of 2 kB. The core figure matters more: the shared utilities that later identifiers need
(weighted mod 11 for IČO/DIČ/bank account, mod 97 for IBAN, EAN) all go into the 0.21 kB that remains,
because CLAUDE.md requires shared logic in core. Round 1 section 5 lists savings that are still available
(about 150–200 B from day numbers via `Date`, which Marek would have to decide). Expect the core budget to
come up again at IČO.

**R2-N2 – Fixed temp file name in `.size-limit.ts:19`.** `join(tmpdir(), 'czech-test-data-size-core.ts')`
is shared by every checkout on the machine, and its content holds absolute paths. Two worktrees running
`npm run size` at the same time can measure each other's core. `mkdtempSync`, or a name derived from
`process.cwd()`, avoids this. It does not affect CI.

**R2-N3 – The 1985 limit is written twice.** `edge.ts:24-26` (`MOD11_EXCEPTION_RANGE.to = '1985-12-31'`) and
`validate.ts:31-33` (`LAST_MOD11_EXCEPTION_YEAR = 1985`) each carry the same DASTA citation. This is one rule
(decision 1). One exported constant next to `MONTH_OFFSETS` would keep the generator and the validator in
sync.

**R2-N4 – Two error message styles.** Core says `referenceDate must be a calendar date written as
YYYY-MM-DD, got "x"`, and birthNumber says `referenceDate "1950-01-01": leaves no date in range`. Both
follow the contract. The shorter style came from the identifier budget, which the core messages do not
count against. If later identifiers adopt the short style, write it into the template (core §5) so all
nine stay consistent.
