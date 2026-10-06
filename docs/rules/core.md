# Core (M1) – design proposal

Status: **APPROVED** by Marek on 2026-10-04 (all open questions decided, see Decisions);
amendments A1, A2 and A3 approved on 2026-10-05.

The core has no official source, so this document replaces the rules document for M1: it is the
contract the test-writer tests against and the implementer implements. Identifier rules (M2+) build on it.

## 1. Seeded PRNG

- Algorithm: **SplitMix32** variant recommended by the author of mulberry32 (Tommy Ettinger, public domain),
  32-bit state. The spec names mulberry32 only as an example; why not mulberry32: decision Q5.
  Reference (comment of 10 Nov 2022): https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
  ```c
  uint32_t next(void) {
    uint32_t z = (x += 0x9E3779B9u);
    z ^= z >> 16;
    z *= 0x21f0aaadu;
    z ^= z >> 15;
    z *= 0x735a2d97u;
    z ^= z >> 15;
    return z;
  }
  ```
  The initial state `x` is the seed. In JS: `>>>` for shifts, `Math.imul` for multiplication, `>>> 0` for uint32.
- Seed: an integer `0 … 2^32 − 1`. Anything else (negative, fractional, `NaN`, too large) throws `RangeError`.
- Internal interface `Random` (not exported from the package, so it is not public API):
  - `uint32(): number` – next raw output.
  - `int(min, max): number` – uniform integer, **both bounds inclusive**. Throws `RangeError` if `min > max`,
    a bound is not a safe integer, or the number of values `n = max − min + 1` exceeds 2^32
    (`int(0, 2^32 − 1)` is allowed, `int(0, 2^32)` throws). Exact algorithm (frozen, it decides every output):
    1. `n = max − min + 1`. If `n = 2^32`, return `min + uint32()` (one draw).
    2. `limit = 2^32 − (2^32 mod n)`. Draw `u = uint32()` until `u < limit` (rejection removes the `% n` bias).
    3. Return `min + (u mod n)`.
  - `pick(items)` – exactly `items[int(0, items.length − 1)]`; throws `RangeError` on an empty array.
  - `digits(length)` – exactly one `int(0, 9)` per digit, concatenated left to right (leading zeros allowed).
    `digits(0)` is `''` and draws nothing.
- No floats are used anywhere, so results are identical in every JS engine.

## 2. Determinism contract

> Same package major version + same seed + same sequence of calls = same output
> (for date-dependent variants also the same `referenceDate`).

- **One PRNG stream per identifier** (decision Q3). All calls of one identifier (`generate`, `edge`,
  `invalid`) consume from that identifier's stream in call order; calls of other identifiers never affect it.
  Adding `cz.ico()` to a test therefore does not change any `cz.birthNumber()` value.
- Stream seed of an identifier: `streamSeed = (seed XOR fnv1a32(id)) >>> 0`, where `id` is the camelCase
  identifier id (e.g. `birthNumber`) and `fnv1a32` is 32-bit FNV-1a over the UTF-16 code units of `id`
  (offset basis `2166136261`, prime `16777619`, multiplication modulo 2^32). The stream is the PRNG from
  section 1 with initial state `streamSeed`.
  Reference: http://www.isthe.com/chongo/tech/comp/fnv/index.html#FNV-1a
- Consequence: `createBirthNumber({ seed: 42 })` yields exactly the same values as `cz.birthNumber` of
  `createCz({ seed: 42 })`, regardless of other identifiers used on `cz`.
- Changing any output for a given seed and call sequence is a **breaking change** (major version).
- Snapshot tests pin the first outputs for seeds `0`, `1`, `42` and `4294967295`.

## 3. Entry points and API shape

```ts
import { createCz } from 'czech-test-data';                    // everything, most convenient
import { createBirthNumber, validateBirthNumber } from 'czech-test-data/birthNumber'; // one identifier, tree-shaken

const cz = createCz({ seed: 42 });
cz.seed;                         // 42 – read it to reproduce a failing test
cz.birthNumber({ gender: 'female' });
cz.birthNumber.edge('month+20'); // a specific edge variant
cz.birthNumber.edge();           // a random edge variant
cz.birthNumber.invalid('badChecksum');
cz.birthNumber.edgeVariants;     // readonly list of all edge variant names
cz.birthNumber.invalidVariants;  // readonly list of all invalid variant names
cz.validate.birthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }

const birthNumber = createBirthNumber({ seed: 42 }); // same callable as cz.birthNumber
validateBirthNumber('9055011234');                    // validators need no seed
```

- `createCz` returns `seed`, `referenceDate` and `validate` (empty in M1); identifiers plug in from M2.
- **Settings** `{ seed?: number; referenceDate?: string }` are the options of `createCz` **and** of every
  standalone `create<Id>` (e.g. `createBirthNumber({ seed: 42, referenceDate: '2026-10-05' })`). They are
  resolved by one shared core function, `resolveSettings`, into `{ seed: number; referenceDate: string }`:
  - `seed` is checked exactly like in `createRandom`; the `RangeError` message mentions `seed`.
    Omitted → a random seed from `globalThis.crypto.getRandomValues` (looked up at call time, not at module
    load; never `Math.random`) (decision Q1). `crypto` is a global in Node.js ≥ 19 and browsers; `src/` has
    no DOM types, so the core declares the one function it uses instead of adding `lib: DOM`.
  - `referenceDate` (`YYYY-MM-DD`, a real Gregorian calendar date) is "today" for date-dependent rules such
    as `futureDate`. Invalid → `RangeError` mentioning `referenceDate`. Omitted → **the current UTC date**
    (decision Q2, amendment A1).
  - The resolved values are exposed as `cz.seed` / `cz.referenceDate` and on every generator as
    `.seed` / `.referenceDate`, so a failing run can be reproduced exactly, including the date.
- **The clock is read in exactly one function in `src/`**: `todayUtc()` in `src/core/settings.ts`, called by
  `resolveSettings` and by validators whose `referenceDate` is omitted (see below). Nothing else reads it.
- **Validators** have the signature `validate<Id>(value: string, options?: { referenceDate?: string })`.
  `referenceDate` matters only to date-dependent rules; omitted → `todayUtc()`. `cz.validate.<id>(value)` uses
  the instance's `referenceDate`, so `cz.<id>.invalid('futureDate')` and `cz.validate.<id>` always agree; with
  the standalone functions, pass the same `referenceDate` to `create<Id>` and `validate<Id>`. Validators never throw for any `value`; an invalid
  `referenceDate` option is a programming error and throws `RangeError`.
- **Fixed date ranges, cut only by `referenceDate` (amendment A3):** every date-dependent generator or
  variant draws dates from a **fixed range** written in the identifier's rules. `referenceDate` may only cut
  that range where it cuts into it (e.g. upper bound = min(fixed end, `referenceDate`)); if nothing is left,
  it throws `RangeError` naming `referenceDate`. So:
  - for any `referenceDate` after the end of the fixed ranges, output is the same for the same seed on any
    day (the plain generator never depends on the date otherwise);
  - a generator never returns an invalid value because of the date ("never return an invalid value by
    accident" wins over "never depend on the date");
  - `generate` may additionally use the date to reject an option with `RangeError` (e.g. a `birthDate`
    after `referenceDate`).
- Every identifier's tests include the shared check from `tests/support/`: same seed with two different
  `referenceDate`s after the fixed ranges gives the same plain values, edge values and date-independent
  invalid values.
- Invalid generator options (unknown variant name, malformed date, …) throw `RangeError` with a message
  saying which option is wrong. Generators never return an invalid value by accident.
- Generators return plain `string`s.

## 4. Validation result

```ts
type ValidationResult<Reason extends string> =
  | { valid: true }
  | { valid: false; reason: Reason };
```

- Each identifier declares its own union of reason codes (English camelCase, e.g. `badChecksum`).
- **Every invalid variant name is also a reason code, and the validator returns exactly that code
  for that variant.** So a test can always assert `validate(invalid(v))` → `{ valid: false, reason: v }`.
  A validator may have extra reason codes that no variant produces.
- Every edge variant must pass the validator.
- Validators take a `string` and never throw.

## 5. Identifier module template

```
src/core/random.ts        PRNG (section 1)
src/core/settings.ts      resolveSettings, todayUtc (the only clock read), default seed
src/core/date.ts          Gregorian calendar helpers (date check, leap years, days in month)
src/core/types.ts         ValidationResult, IdentifierGenerator, IdentifierContext, Settings
src/core/identifier.ts    defineIdentifier(): builds create() and validate() of an identifier
src/cz.ts                 createCz
src/index.ts              root entry: createCz + public types
src/<id>/generate.ts      generate(random, options, context): string
src/<id>/validate.ts      validate(value, context): ValidationResult<Reason>   ← 100 % branch coverage
src/<id>/edge.ts          Record<EdgeVariant, (random, context) => string>
src/<id>/invalid.ts       Record<InvalidVariant, (random, context) => string>
src/<id>/index.ts         subpath entry: create<Id>, validate<Id>, types
tests/<id>.<area>.test.ts  e.g. validate, generate, variants, determinism, api
docs/rules/<id>.md
```

- `<id>` is the camelCase API name, used everywhere: folder, file names, subpath export
  (`czech-test-data/birthNumber`) (decision Q4). The CLI keeps kebab-case commands as in the spec (`birth-number`).
- `IdentifierContext` is `{ readonly referenceDate: string }` (already resolved and checked). `generate`,
  every variant and the inner `validate` receive it; identifiers that do not need the date ignore it.
- `defineIdentifier({ id, generate, validate, edge, invalid })` returns an object with two functions:
  - `create(settings: Settings): IdentifierGenerator`, where `Settings` is the **resolved**
    `{ seed: number; referenceDate: string }` (seed checked exactly like in `createRandom`, date checked like
    in `resolveSettings`). The generator is backed by the identifier's own stream (section 2) and passes
    `{ referenceDate }` as context. `createCz` resolves settings once and passes the same object to every
    identifier; `create<Id>(options?)` in `src/<id>/index.ts` is `create(resolveSettings(options))`.
  - `validate(value: string, options?: { referenceDate?: string }): ValidationResult<Reason>`: the public
    validator (`validate<Id>`); it resolves `referenceDate` (omitted → `todayUtc()`) and calls the inner one.
- `IdentifierGenerator` (named so because `Generator` is a built-in TypeScript type) is the callable from
  section 3 plus `.seed`, `.referenceDate`, `.edge`, `.invalid`, `.edgeVariants`, `.invalidVariants`.
  It does not expose `validate`; validators are reached via `cz.validate.<id>` or `validate<Id>`.
- Variant lists come from the keys of `edge` / `invalid`, so a new variant cannot be forgotten in the list.
  `edge()` / `invalid()` without an argument pick a variant with `pick(variantList)` from the same stream,
  then call it. With an explicit name nothing is drawn for the choice; only the variant itself draws.
- Variant lists are in definition order (`Object.keys` order) and frozen (`Object.freeze`).
- A variant name counts only if it is an own key of `edge` / `invalid` (`Object.hasOwn`), so `toString`,
  `__proto__` or a name from the other list is unknown and throws `RangeError` whose message contains the name.
- Every invalid variant name must be one of the validator's reason codes; this is checked by the type system.
- **Options typing (amendment A2):** `generate` always receives an options object (`{}` when the caller
  passes none, never `undefined`), and the types must be honest about it:
  - if every option is optional, the generator's argument is optional;
  - if any option is required, the argument is required and omitting it is a type error. The runtime
    default `{}` is only used when the type allows omitting the argument (`NoOptions` assignable to `Options`),
    so a `{} as Options` cast there is sound; any cast that lets a required option go missing is not allowed;
  - an identifier without options declares `NoOptions` (`Readonly<Record<string, never>>`, exported from
    `src/core/types.ts`), so passing an unknown option such as `{ typo: true }` is a type error.
  `Options` must not be silently inferred as `object`: a `generate` that declares no options parameter gets
  `Options = NoOptions` (type parameter default), not a compile error.
- The context is exactly `{ referenceDate }` (not the whole settings object). `create` and the public
  `validate` throw `RangeError` whose message names the bad option (`seed` / `referenceDate`), like
  `resolveSettings` and `createCz`.
- Shared algorithms (weighted sums, mod 11, mod 97, GS1) go to `src/core/` when the second identifier
  needs them, not before (knip forbids unused exports). Calendar helpers live in `src/core/date.ts` from the
  start, because both `createCz` and the first identifier need them.

### Internal names the M1 tests import

| Module | Export | Signature |
| --- | --- | --- |
| `src/core/random.ts` | `createRandom` | `(seed: number) => Random` – throws `RangeError` for an invalid seed |
| `src/core/random.ts` | `Random` (type) | `{ uint32(): number; int(min, max): number; pick<T>(items: readonly T[]): T; digits(length: number): string }` |
| `src/core/random.ts` | `streamSeed` | `(seed: number, id: string) => number` (section 2) |
| `src/core/identifier.ts` | `defineIdentifier` | see above: returns `{ create, validate }` |
| `src/core/settings.ts` | `resolveSettings` | `(options?: { seed?: number; referenceDate?: string }) => Settings` |
| `src/core/settings.ts` | `todayUtc` | `() => string` – current UTC date as `YYYY-MM-DD` |
| `src/core/types.ts` | `ValidationResult`, `IdentifierGenerator`, `IdentifierContext`, `Settings`, `NoOptions` (types) | sections 4 and 5 |
| `src/core/types.ts` | `SettingsOptions` (type) | `{ seed?: number; referenceDate?: string }`, options of `createCz` and `create<Id>`; public |
| `src/core/types.ts` | `ValidatorOptions` (type) | `{ referenceDate?: string }`, options of the public validators; public from M2 |
| `src/index.ts` | `createCz` | `(options?: { seed?: number; referenceDate?: string }) => Cz` with `seed`, `referenceDate`, `validate` |

`digits(length)` throws `RangeError` for a negative or non-integer length; `digits(0)` is `''`.

## 6. What the M1 tests should cover

- PRNG: snapshot of the first 5 `uint32()` outputs for the four seeds, computed from the reference
  algorithm above (test-writer computes them independently, not from our code).
- `int`: always within inclusive bounds (property test), hits both bounds, `int(5, 5) === 5`,
  `RangeError` for invalid ranges; `pick`, `digits` likewise.
- Seed validation: `RangeError` for `-1`, `1.5`, `NaN`, `2 ** 32`.
- `createCz`: same seed → same sequence; different seeds → different sequence; `cz.seed` echoes the seed.
- Default seed: two `createCz()` calls without a seed expose a valid uint32 `cz.seed`, and passing that
  seed back reproduces the output.
- `referenceDate`: accepted as `YYYY-MM-DD`, `RangeError` for malformed or impossible dates (`2026-02-30`).
- Amendment A1: `resolveSettings` fills both defaults and exposes them; without `referenceDate` the result is
  the current **UTC** date (test with a fake clock around midnight in a non-UTC time zone); `cz.referenceDate`
  and generator `.seed` / `.referenceDate` echo the resolved values; context reaches `generate`, variants and
  the inner validator; the public `validate` resolves `referenceDate` and rejects an invalid one with `RangeError`.
- Amendment A2: type-level tests (`expectTypeOf`) that required options cannot be omitted, optional ones can,
  and `NoOptions` rejects unknown keys.
- `defineIdentifier` with a dummy identifier defined inside the test file: variant lists, random variant
  choice is deterministic, unknown variant name throws `RangeError`.
- Streams: `streamSeed` matches values computed independently from FNV-1a and XOR (e.g. for ids
  `birthNumber` and `ico` with seeds `0` and `42`); two dummy identifiers created from the same seed do not
  influence each other (calling one any number of times leaves the other's sequence unchanged).

## Decisions (Marek, 2026-10-04)

- **Q1 – Default seed:** random seed from `crypto.getRandomValues`, exposed as `cz.seed`. A fixed default would
  make every run identical, which breaks E2E tests that need unique values in a shared database.
- **Q2 – Current date:** `createCz({ referenceDate })`, defaulting to the current date read once in `createCz`.
  Generators of valid values never depend on it.
- **Q3 – Streams:** one PRNG stream per identifier, seeded by `streamSeed(seed, id)` (section 2), so adding
  or removing calls of one identifier in a test never changes the values of another.
- **Q4 – Subpath names:** camelCase, `czech-test-data/birthNumber`; one name everywhere.
- **Clarifications from the M1 test-writer (approved 2026-10-04):** `int` range limit counts values; exact
  `int` / `pick` / `digits` algorithms; `generate` gets `{}`; definition order; no draw for an explicit variant
  name; seed check also in `defineIdentifier` and `createCz`; error messages name the bad input; frozen
  variant lists; `Generator` has no `validate`; `crypto` looked up at call time. All recorded in the text above.
- **A1 – Reference date in the template (2026-10-05, from review S1/N3):** settings `{ seed, referenceDate }`
  shared by `createCz` and `create<Id>`, resolved by `resolveSettings`; current date is UTC and read only by
  `todayUtc`; context `{ referenceDate }` for `generate`, variants and validators; validators take an optional
  `{ referenceDate }`; resolved values exposed for reproduction.
- **A2 – Honest options typing (2026-10-05, from review N1):** no unsound `{} as Options`; required options are
  required by the type; `NoOptions` for identifiers without options. Also N2 (`IdentifierGenerator` name) and
  N4 (calendar and seed helpers in `src/core/`) are folded into section 5.
- **A1/A2 clarifications from the test-writer (2026-10-05, derived from the approved text):** `generate`
  without an options parameter defaults to `NoOptions`; the context is exactly `{ referenceDate }`; error
  messages of `create` and the public `validate` name the option (clarification 8 applies to them too).
- **A3 – Fixed date ranges (2026-10-05, from review S2, approved with `docs/rules/birthNumber.md`):** date
  ranges are fixed per identifier and only cut by `referenceDate`; empty range → `RangeError` naming
  `referenceDate`; shared determinism check for every identifier in `tests/support/`.
- **Q5 – PRNG algorithm:** SplitMix32 variant above. The author of mulberry32 wrote (10 Nov 2022, link in
  section 1) that mulberry32 "isn't equidistributed … and actually can't produce about 1/3 of all possible
  `uint32_t` numbers"; the SplitMix32 variant produces every 32-bit value exactly once per period.
