# birthNumber (rodné číslo)

Status: **APPROVED** by Marek on 2026-10-05 (decisions in section 8) · researched 2026-10-04 · rules-researcher

> Caveat: the verbatim wording of § 13 odst. 5 (additional series +20/+70) could not be fetched from e-Sbírka
> and remains UNVERIFIED (section 6); the rules below do not depend on its exact wording.

Czech meaning: *rodné číslo* is the birth number, a personal identifier assigned by the Ministry of the
Interior (MV ČR) under zákon č. 133/2000 Sb., o evidenci obyvatel a rodných číslech. It encodes the
birth date and sex.

Legend: **[P]** is a primary source (law, ministry, state agency). **[S]** is an official state data standard
that is not the source of the rule. **UNVERIFIED** means the claim rests only on secondary sources.

---

## 1. Format

| Part | Digits | Meaning |
| --- | --- | --- |
| `RR` | 2 | last two digits of the birth year |
| `MM` | 2 | birth month, encoded (see below) |
| `DD` | 2 | birth day, 01–31, not encoded |
| `/` | 0–1 | separator (see "Slash") |
| `XXX` or `XXXX` | 3 or 4 | ending (*koncovka*). It tells apart people born on the same day. In the 4-digit form, the last digit makes the whole number divisible by 11. |

Lengths:

- **9 digits** (`RRMMDD/XXX`) for people **born before 1 January 1954**. No divisibility rule applies.
  Source: § 13 odst. 4 zákona 133/2000 Sb. [P]: *"Rodná čísla přidělená fyzickým osobám narozeným před
  1. lednem 1954 mají stejnou strukturu jako rodná čísla uvedená v odstavci 3, jsou však devítimístná s
  třímístnou koncovkou a nesplňují podmínku dělitelnosti jedenácti."* "Nesplňují podmínku" means the
  condition does not apply. A 9-digit number that happens to be divisible by 11 is fine.
- **10 digits** (`RRMMDD/XXXX`) for people **born on or after 1 January 1954**, divisible by 11.
  Source: § 13 odst. 3 [P]: *"Rodné číslo je desetimístné číslo, které je dělitelné jedenácti beze zbytku.
  První dvojčíslí vyjadřuje poslední dvě číslice roku narození, druhé dvojčíslí vyjadřuje měsíc narození,
  u žen zvýšené o 50, třetí dvojčíslí vyjadřuje den narození. Čtyřmístná koncovka je rozlišujícím znakem
  fyzických osob narozených v tomtéž kalendářním dnu."*

The cut-off depends on the **birth date**, not on the date the number was assigned. A person born in 1950
who gets a birth number in 2020 (for example a foreigner) still gets a 9-digit number. Sources: § 13
odst. 4 [P]. The MV ČR registry specification [P] says "devítimístného, přidělovaného fyzickým osobám
narozeným do 31. 12. 1953" and "desetimístného, přidělovaného fyzickým osobám narozeným po 1. 1. 1954".

### Month encoding

| `MM` value | Sex | Series | Since |
| --- | --- | --- | --- |
| 01–12 | male | normal | always |
| 51–62 | female | normal (+50) | always |
| 21–32 | male | additional series (+20) | 1 April 2004, 10-digit only |
| 71–82 | female | additional series (+70 = 50 + 20) | 1 April 2004, 10-digit only |

Every other value (00, 13–20, 33–50, 63–70, 83–99) is not a valid month.

Source for +20/+70: § 13 odst. 5 [P], added by zákon č. 53/2004 Sb. (in force since 1 April 2004). The
additional series is used **only when** the issuing offices have used up all normal numbers for that
calendar day: *"V případě, že jsou výdejovými místy rodných čísel pro daný kalendářní den v příslušném
kalendářním roce vyčerpána veškerá určená rodná čísla, určí ministerstvo pro tento den novou, dodatečnou
sestavu rodných čísel, pro niž platí, že rodné číslo je desetimístné číslo, které je dělitelné jedenácti
beze zbytku. První dvojčíslí vyjadřuje poslední dvě číslice roku narození, druhé dvojčíslí vyjadřuje
měsíc narození, u mužů zvýšené o 20, u žen zvýšené o 70, ..."*. The MV ČR registry specification
(section 5.1, page 22) uses the same wording [P].

Note: zakonyprolidi.cz would not return the full § 13 odst. 5 verbatim. The wording above combines the
text that was shown (up to "dodatečnou sestavu rodných čísel") with the identical structure sentence in the
MV ČR specification. Check it in e-Sbírka before approval.

### Century

The law gives only two year digits. The century is worked out from the length, following the ČSSZ
"standardní kontrola rodného čísla" [P]:

| Length | `RR` 00–53 | `RR` 54–99 |
| --- | --- | --- |
| 9 digits | 1900–1953 | **1854–1899** |
| 10 digits | 2000–2053 | 1954–1999 |

ČSSZ pseudo-code: for a 3-digit ending *"pokud ROK > 53, pak ROK = 18RR, jinak ROK = 19RR"*; for a
4-digit ending *"pokud ROK > 53, pak ROK = 19RR, jinak ROK = 20RR"*.

Real 9-digit numbers for people born in the 1890s exist. The MV ČR registry specification, section 4.2 A,
lists numbering cards for "narozené v rozmezí od roku 1891–1968 pro ženy, 1890–1968 pro muže" [P].

From 2054 the scheme becomes ambiguous (10-digit `54` could mean 1954 or 2054). The law does not deal
with this. The library supports birth dates from 1854-01-01 to 2053-12-31.

### Slash

- The official written form contains the slash: MV ČR specification, *"tvar: RRMMDD/XXX nebo
  RRMMDD/XXXX"* and *"zápis rodného čísla obsahuje lomítko, které je pevně ukotvené"* [P].
- In machine records the slash is left out: DASTA (NZIS data standard of MZ ČR), *"Při zápisu na
  technických nosičích se lomítko vynechává."* [S]
- ČSSZ validates the bare digit string (`RRMMDDKKK(K)`, "není numerické" is an error) [P].

Result: `RRMMDD/XXXX` and `RRMMDDXXXX` (and the 9-digit versions) are both valid. The slash is
**optional**, so `withoutSlash` is a valid edge variant. No other separator (space, hyphen, dot) has an
official basis.

### Allowed characters

Only the digits `0-9` and at most one `/`, placed between the 6th and 7th digit. Everything else is outside
the official format: letters give `letters`, any other deviation gives `badFormat` (section 2, step 1).

---

## 2. Check algorithm (proposed validator)

The order matters only when an input has more than one problem. Each generated invalid variant has exactly
one problem. The order below is **approved** (decision 7): the first failing step gives the reason.

1. **Characters and separator.** The input must match `^\d{6}/?\d{3,4}$`. In detail (decision 4):
   - Any letter (Unicode letter, `\p{L}`) gives **`letters`**.
   - Otherwise, any character other than a digit or `/` (whitespace, `-`, `.`, other symbols), more than
     one `/`, or a `/` that is not right after the 6th digit gives **`badFormat`**. `badFormat` is a reason
     code only; there is no `badFormat` variant (allowed by `docs/rules/core.md` section 4).
   - No trimming and no normalization.
2. **Length.** Remove the slash. If the digit count is not 9 or 10, the result is **`wrongLength`**.
3. **Split.** `RR = d1d2`, `MM = d3d4`, `DD = d5d6`, ending = the rest.
4. **Month and sex.**
   - 01–12: male. 51–62: female, subtract 50.
   - 21–32: male, subtract 20. 71–82: female, subtract 70. Both are allowed only for 10 digits, because
     § 13 odst. 5 defines the additional series as 10-digit.
   - Anything else gives **`impossibleDate`**.
5. **Century.** Use the table in section 1.
6. **Calendar date.** The date must exist in the Gregorian calendar. Day 01 up to the length of the
   month; 29 February only in leap years. 1900 is **not** a leap year, 2000 is. Otherwise the result is
   **`impossibleDate`**.
7. **Checksum (10 digits only).** Let `N10` be the 10-digit number and `N9` its first 9 digits.
   - If `N10 mod 11 == 0`: OK.
   - Else, if `N9 mod 11 == 10`, the last digit is `0`, and the birth year is between 1954 and 1985:
     OK (`mod11Exception`, see section 3.2).
   - Otherwise **`badChecksum`**.
   - 9-digit numbers skip this step.
8. **Future date.** If the birth date is after the reference date ("today"), the result is
   **`futureDate`**. A birth date equal to the reference date is valid.
9. Otherwise `{ valid: true }`.

Notes for implementation:

- `N10 ≤ 9 999 999 999 < 2^53`, so a plain JS `number` is exact.
- `N10 mod 11 == 0` is the same as a weighted sum with weights `10,1,10,1,10,1,10,1,10,1` (from the left)
  being 0 mod 11. This is because 10^k ≡ (−1)^k (mod 11). It fits the shared weighted mod 11 utility.
- The normal check digit is `N9 mod 11`. Since `N10 = 10·N9 + c ≡ −N9 + c (mod 11)`, `N10` is divisible
  by 11 exactly when `c ≡ N9 (mod 11)`. If `N9 mod 11 == 10` there is no single-digit `c`. That is where
  the historical exception comes from. About 1 in 11 three-digit sequences per day cannot be used after
  1985.
- The MV registry fills endings for one day by stepping +11 (section 6.3, "každá následující čtyřmístná
  koncovka je vyšší o 11 než předchozí") [P]. This confirms the divisibility rule.

### Worked example

A woman born 1 May 1990, ending sequence 125:

1. `RR = 90`, `MM = 05 + 50 = 55`, `DD = 01`, so the prefix is `905501`.
2. `N9 = 905501125`. `905501125 = 11 × 82318284 + 1` (because `11 × 82318284 = 905501124`), so
   `N9 mod 11 = 1`.
3. The check digit is `1`, giving `N10 = 9055011251`.
4. Check: `9055011251 = 11 × 823182841`, remainder 0. Alternating digit sum from the right:
   `1−5+2−1+1−0+5−5+0−9 = −11 ≡ 0` ✓.
5. Formatted: **`905501/1251`**. Unformatted (`withoutSlash`): **`9055011251`**.
6. Decoding: `MM = 55 > 50` means female, month 5. A 10-digit number with `RR = 90 ≥ 54` means 1990.
   The date is 1990-05-01 ✓.

The spec example `cz.validate.birthNumber('9055011234')` gives `9055011234 mod 11 = 5`, so the result is
`badChecksum` ✓ (consistent with the spec). Note that its first nine digits `905501123` have remainder 10
when divided by 11. `9055011230` would only be valid under the lenient reading of the exception, because the
birth year 1990 is after 1985.

---

## 3. Special cases and history

### 3.1 Legal history

| Year | Instrument | Relevance |
| --- | --- | --- |
| 1953 | vyhláška MNB č. 240/1953 Ú. l. under vládní nařízení č. 61/1953 Sb. | the term *rodné číslo* is introduced (UNVERIFIED, Wikipedia only) |
| 1954 | (date-based rule) | 10-digit numbers divisible by 11 for people born from 1. 1. 1954 |
| 1976 | vyhláška FSÚ č. 55/1976 Sb., § 1 odst. 2 [P] | first definition: 10 digits, women month +50; *"Rodná čísla přidělená osobám narozeným do 31. prosince 1953 jsou devítimístná s třímístnou koncovkou."* No mention of divisibility by 11. Repealed 1. 1. 2003 by vyhláška 543/2002 Sb. |
| 1985 | internal directive FSÚ Č. Vk. 2898/1985 | assignment of numbers using the "remainder 10, check digit 0" exception stops (see 3.2) |
| 2000 | zákon č. 133/2000 Sb., § 13 [P] | current legal basis |
| 2004 | zákon č. 53/2004 Sb. [P], in force **1. 4. 2004** | adds § 13 odst. 5: additional series with +20/+70 |
| 2004 | vyhláška č. 296/2004 Sb. [P] | implementing regulation. Covers only the transfer and recording of numbers, nothing about structure or checksum |

As of 2026-10-04 no change to the structure is known. A 2023 government plan to stop using the birth number
as a general identifier (expats.cz) is about how the number is used, not its format. UNVERIFIED whether
anything new was passed in 2025–2026: e-Sbírka could not be rendered (it is a JS app), and the
zakonyprolidi.cz copy is version 33, in force from 1. 1. 2025.

### 3.2 Mod 11 exception: remainder 10 gives check digit 0

- **Not in the law.** § 13 odst. 3 requires divisibility by 11 with no exception. These numbers do not
  meet the current legal definition. They are real historical numbers that the registry tolerates. The MV
  ČR specification (section 5.1) allows numbers "které neodpovídají zákonem stanovené struktuře (např. není
  dělitelné jedenácti beze zbytku…)", issued in exceptional cases [P].
- **The rule** (DASTA [S]; Wikipedia, python-stdnum and rodnecislo UNVERIFIED): if `N9 mod 11 == 10`,
  the check digit is `0`. The whole number then has `N10 mod 11 == 1`.
- **Years.** DASTA [S]: *"Je-li zbytek 10, pak kontrolní číslice je také 0 (podle interního předpisu FSÚ
  ČVK 2898/1985 byly tyto nulové koncovky přidělovány pouze do roku 1985."* Wikipedia (UNVERIFIED):
  about 1,000 such numbers were issued, and issuing stopped in 1985 under FSÚ Č. Vk. 2898/1985. The
  directive itself is not public, so the 1985 cut-off is **UNVERIFIED in a primary source**.
- **"Issued until 1985" means the assignment year, not the birth year.** A number cannot be assigned before
  the person is born, so the birth year is at most 1985. Normal 10-digit numbers start in 1954. The
  validator therefore needs the bound **birth year 1954–1985**. A person born in 1970 who got a new number
  after 1985 (for example after a change) would not have an exception number, but the validator cannot
  tell, so it accepts any birth year in 1954–1985.
- **Sources disagree:**
  - ČSSZ standard check [P]: rejects every 10-digit number not divisible by 11, so **no exception at all**.
  - rodnecislo (npm, UNVERIFIED): accepts the exception for `RR` 54–85.
  - python-stdnum (UNVERIFIED): accepts it for **any** year (`int(number[:-1]) % 11 % 10`).
  - This document proposes the 1954–1985 bound (consistent with the spec). See the open questions.

### 3.3 Additional series +20/+70 (from 2004)

- Used **only** when the normal numbers for a given birth date are used up (§ 13 odst. 5 [P]). The MV ČR
  registry warns when fewer than 10 free numbers remain for a day, month, year and sex, and says
  additional numbers will then have to be created (specification section 6.19 [P]).
- The rule has been in force since **1. 4. 2004** (assignment date). The law **does not limit it to
  people born in 2004 or later.** The condition is "pro daný kalendářní den v příslušném kalendářním roce"
  (the birth date). Someone born in 1990 who got a number after 1. 4. 2004 (for example a foreigner or a
  new citizen) could legally receive a +20/+70 number if 1. 1. 1990 was used up. For births before 1954
  the additional series does not apply: § 13 odst. 5 defines it as 10-digit and divisible by 11, while
  § 13 odst. 4 requires 9 digits.
- Numbers assigned before 2004 were not renumbered. The 2004 change does not affect existing numbers.
- Whether any +20/+70 number was ever actually assigned, and for which birth years, is **UNVERIFIED**.
  No official statistics were found. rodnecislo (UNVERIFIED) describes +20 as "after 2004 (law nr.
  53/2004)" and does not say whether it limits it by birth year.
- **Lookalikes from other identifiers** that must not be accepted as birth numbers:
  - VZP *číslo pojištěnce* for foreigners: month +20 **and** day +50 [P, VZP answer of 26. 3. 2016].
  - ČSSZ *evidenční číslo pojištěnce* (EČP): day +40 [P].
  - A birth number's day is never above 31, so these all fail with `impossibleDate`. ČSSZ also explicitly
    rejects the combination "měsíc +20 a zároveň den +40".

### 3.4 Real numbers that break the rules

The MV ČR registry stores assigned numbers that do not match the legal structure: not divisible by 11,
non-existent dates "jako 29. 2., 31. 4.", and duplicates [P, specification section 5.1]. They are
exceptions, and the usual fix is a change of number (§ 17: "chybně přidělené rodné číslo"). **The library
validates against the legal structure.** Such real numbers will be reported invalid. Document this in the
README.

### 3.5 Zero endings

- MV ČR [P]: endings run "0000 až 9999", and "od přidělování rodných čísel se čtyřmístnou nulovou
  koncovkou bylo v minulosti upuštěno". The registry still accepts `/0000`: "v současné době se již rodná
  čísla s nulovou koncovkou neurčují".
- ČSSZ [P] rejects a **9-digit** ending `000` ("Koncovka rodného čísla 000 je nepřípustná").
- The MV examples of 9-digit endings start at `/001`.
- The spec has no reason code for this. Proposal: the validator accepts zero endings (the law does not
  forbid them), and the **generator never produces `/000` or `/0000`**. See the open questions.
- A 10-digit `RRMMDD/0000` passes the checksum only when `RRMMDD` itself is divisible by 11.

### 3.6 Future dates

- No law says this directly. A birth number is assigned because of an event that has already happened
  (birth, adoption, citizenship and so on: § 16 [P]). The MV registry assigns numbers on request
  "po zadání data narození a pohlaví" [P]. So no real assigned number can carry a birth date after the
  date it is checked. **This is derived, not explicit.**
- Only 10-digit numbers with `RR` 00–53 can be in the future, since they map to 2000–2053. 9-digit
  numbers always map to 1854–1953.
- `futureDate` is a library rule. The number is well-formed, but no one with that number can exist yet.
- **Determinism:** the result depends on "today". Per `docs/rules/core.md` (amendment A1) the validator takes
  `{ referenceDate }` (`YYYY-MM-DD`), defaulting to the current **UTC** date; `cz.validate.birthNumber` uses
  the instance's `referenceDate`. Birth date equal to `referenceDate` is valid; the day after is `futureDate`.

### 3.7 Slovak numbers

§ 13 odst. 8 [P]: birth numbers assigned in Slovakia before 1. 1. 1993 also count as Czech birth numbers.
Their structure is the same, so the validator needs no special case. The library cannot tell Czech and
Slovak numbers apart.

---

## 4. Edge and invalid variants

### Edge variants (valid but unusual) — must return `{ valid: true }`

| Variant | Definition | Generator constraint |
| --- | --- | --- |
| `pre1954` | 9 digits, `RRMMDD/XXX`, born before 1. 1. 1954, no checksum | Birth date 1900-01-01 … 1953-12-31 (avoid the debatable 18xx range), ending 001–999 |
| `mod11Exception` | 10 digits, `N9 mod 11 == 10`, last digit `0`, `N10 mod 11 == 1` | Birth year 1954–1985 only |
| `month+20` | man, `MM` 21–32 | Birth date in the range of section 9 (from 2004-04-01), so it is valid under both readings (3.3) |
| `month+70` | woman, `MM` 71–82 | same as `month+20` |
| `leapDay` | born 29 February of a leap year | e.g. 2000, 2024 (10-digit) or 1904–1952 (9-digit). Never 1900 |
| `withoutSlash` | any valid number written without `/` | 9 or 10 digits |

### Invalid variants — must return `{ valid: false, reason }`

| Variant / reason | Definition | Generator constraint (one fault only) |
| --- | --- | --- |
| `badChecksum` | 10 digits, valid date, `N10 mod 11 ≠ 0` and not a valid `mod11Exception` | Valid number with the last digit changed. Must not end up as a valid exception (for example, do not change it to `0` when `N9 mod 11 == 10` and the year is 1954–1985) |
| `impossibleDate` | month outside the allowed ranges (00, 13–20, 33–50, 63–70, 83–99), day 00 or past month end, 29 Feb in a non-leap year, +20/+70 on a 9-digit number | 10 digits with a **correct** checksum, so the date is the only fault |
| `wrongLength` | digit count (slash not counted) other than 9 or 10 | Use 8 or 11 digits. **Never remove a digit from a 10-digit number to get 9 digits**: that is a valid 9-digit number in most cases (`905501125` = woman born 1. 5. 1890 under the ČSSZ mapping) |
| `letters` | contains a letter (see section 2, step 1) | Replace one digit with a letter, e.g. `O` for `0`, `A` |
| `futureDate` | well-formed, correct checksum, birth date after the reference date | 10 digits; birth date in the range of section 9 |

Reason code without a variant: **`badFormat`**, for whitespace, other separators and a misplaced or repeated
`/` (section 2, step 1).

---

## 5. Known samples

**No real public samples are used.** Birth numbers are personal data. The only examples in official
documents are either illustrative numbers that could belong to real people (MV ČR specification, page
60) or six-digit prefixes of insurance numbers (VZP). None are reproduced here. All samples below are
**constructed**, each computation is shown, and the reference date is **2026-10-04**.

Checksum shorthand: the alternating digit sum from the right (`+d10 −d9 +d8 …`) is ≡ `N mod 11`.

### Valid

| Input | Variant | Decoded | Computation |
| --- | --- | --- | --- |
| `905501/1251` | normal (worked example) | F, 1990-05-01 | `N9=905501125 ≡ 1` → c=1; `9055011251 = 11 × 823182841` |
| `9055011251` | `withoutSlash` | F, 1990-05-01 | same |
| `540101/0010` | first 10-digit day | M, 1954-01-01 | `N9=540101001 ≡ 0` → c=0; sum `0−1+0−0+1−0+1−0+4−5 = 0` |
| `500715/123` | `pre1954` | M, 1950-07-15 | 9 digits, no checksum |
| `536231/001` | `pre1954` (last day) | F, 1953-12-31 | 9 digits, month 62 − 50 = 12 |
| `040229/123` | `pre1954` + `leapDay` | M, 1904-02-29 | 1904 is a leap year |
| `000229/0013` | `leapDay` (year 2000) | M, 2000-02-29 | `N9=000229001 ≡ 3` → c=3; sum `3−1+0−0+9−2+2−0+0−0 = 11` |
| `245229/1237` | `leapDay` | F, 2024-02-29 | `N9=245229123 ≡ 7` → c=7; sum `7−3+2−1+9−2+2−5+4−2 = 11` |
| `600615/0140` | `mod11Exception` | M, 1960-06-15 | `N9=600615014`: `4−1+0−5+1−6+0−0+6 = −1 ≡ 10` → c=0; `N10 ≡ 1` |
| `850101/0090` | `mod11Exception` (last year) | M, 1985-01-01 | `N9=850101009`: `9−0+0−1+0−1+0−5+8 = 10` → c=0 |
| `102315/1239` | `month+20` | M, 2010-03-15 | `N9=102315123 ≡ 9` → c=9; sum `9−3+2−1+5−1+3−2+0−1 = 11` |
| `158130/4582` | `month+70` | F, 2015-11-30 | `N9=158130458 ≡ 2` → c=2; sum `2−8+5−4+0−3+1−8+5−1 = −11` |
| `261004/0081` | birth date = reference date | M, 2026-10-04 | `N9=261004008 ≡ 1` → c=1; sum `1−8+0−0+4−0+0−1+6−2 = 0` |

### Invalid

| Input | Expected reason | Why |
| --- | --- | --- |
| `9055011234` | `badChecksum` | spec example; `N10 ≡ 5` |
| `905501/1252` | `badChecksum` | worked example with the last digit +1; `N10 ≡ 1`, and `N9 ≡ 1 ≠ 10` |
| `230229/1233` | `impossibleDate` | 2023 is not a leap year; checksum OK (sum `3−3+2−1+9−2+2−0+3−2 = 11`) |
| `000229/123` | `impossibleDate` | 9 digits means 1900, which is **not** a leap year |
| `901301/0061` | `impossibleDate` | month 13; checksum OK (sum `1−6+0−0+1−0+3−1+0−9 = −11`) |
| `900132/0031` | `impossibleDate` | day 32; checksum OK (sum `1−3+0−0+2−3+1−0+0−9 = −11`) |
| `900431/0051` | `impossibleDate` | 31 April; checksum OK (sum `1−5+0−0+1−3+4−0+0−9 = −11`) |
| `904001/0100` | `impossibleDate` | month 40; checksum OK (sum `0−0+1−0+1−0+0−4+0−9 = −11`) |
| `902101/003` | `impossibleDate` | +20 month on a 9-digit number (proposal, see 3.3) |
| `90550112` | `wrongLength` | 8 digits |
| `90550112510` | `wrongLength` | 11 digits |
| `905501/12` | `wrongLength` | 8 digits with a slash |
| `905501/125A` | `letters` | letter |
| `9O5501/1251` | `letters` | letter O instead of zero |
| `905501 1251` | `badFormat` | space as separator |
| `905501-1251` | `badFormat` | hyphen as separator |
| ` 9055011251` | `badFormat` | surrounding whitespace, not trimmed |
| `90550/11251` | `badFormat` | misplaced slash |
| `300101/0111` | `futureDate` | M, 2030-01-01; checksum OK (sum `1−1+1−0+1−0+1−0+0−3 = 0`) |
| `261005/0091` | `futureDate` | M, 2026-10-05 = reference date + 1; checksum OK (sum `1−9+0−0+5−0+0−1+6−2 = 0`) |

### Formerly disputed (resolved by the decisions in section 8)

| Input | Result (approved) | Alternative rejected |
| --- | --- | --- |
| `860101/0100` | `badChecksum` (exception only until 1985; `N9=860101010 ≡ 10`, c=0) | valid in python-stdnum (no year limit) |
| `600615/0140` | valid (`mod11Exception`) | `badChecksum` under the ČSSZ standard check (no exception) |
| `902101/0031` | valid (+20, born 1990; sum `1−3+0−0+1−0+1−2+0−9 = −11`) | invalid if +20/+70 is limited to birth year ≥ 2004 |
| `905501125` | valid, 9 digits = F, 1890-05-01 (ČSSZ mapping) | python-stdnum: valid (it maps `RR` ≥ 80 to 18xx) |
| `540101/001` | valid, 9 digits = M, 1854-01-01 (ČSSZ mapping) | python-stdnum: rejected (`RR` 54–79 in 9 digits) |
| `540111/0000` | valid (zero ending; `540111 = 11 × 49101`, so `5401110000` is divisible by 11; M, 1954-01-11) | MV no longer assigns zero endings |
| `500715/000` | valid (law does not forbid it) | rejected by ČSSZ ("koncovka 000 je nepřípustná") |

---

## 6. Sources

Primary [P]:

1. Zákon č. 133/2000 Sb., o evidenci obyvatel a rodných číslech, § 13 (odst. 3, 4, 5, 8), § 16, § 17.
   Official: <https://e-sbirka.gov.cz/sb/2000/133> (could not be rendered, JS app). Text used:
   <https://www.zakonyprolidi.cz/cs/2000-133> (version 33, in force from 1. 1. 2025). Also
   <https://www.podnikatel.cz/zakony/zakon-o-evidenci-obyvatel-a-rodnych-cislech-a-o-zmene-nekterych-zakonu-zakon-o-evidenci-obyvatel/f2031052/>.
2. Zákon č. 53/2004 Sb. (adds § 13 odst. 5, in force 1. 4. 2004): <https://www.zakonyprolidi.cz/cs/2004-53>
3. Vyhláška FSÚ č. 55/1976 Sb., o rodných číslech (historical, § 1 odst. 2):
   <https://www.zakonyprolidi.cz/cs/1976-55>
4. Vyhláška č. 543/2002 Sb. (repeals 55/1976 Sb.): <https://www.zakonyprolidi.cz/cs/2002-543>
5. Vyhláška č. 296/2004 Sb., kterou se provádí zákon o evidenci obyvatel (no structure rules):
   <https://www.zakonyprolidi.cz/cs/2004-296>
6. MV ČR, odbor správních činností: *Zadání funkcionalit aplikace registru rodných čísel*, květen 2011.
   Section 5.1 (structure, slash, accepted non-conforming numbers, `/0000`), 4.2 A (1890s numbering
   cards), 6.3 (+11 ending steps), 6.19 (exhaustion warning).
   <https://archiv.mv.gov.cz/soubor/zd-aiseo-priloha-1-2-4-funkcionality-rrc-pdf.aspx> (originally
   <https://mvcr.cz/soubor/zd-aiseo-priloha-1-2-4-funkcionality-rrc-pdf.aspx>)
7. MV ČR, *Rodné číslo – obecně* (endings 0000–9999, zero endings discontinued):
   <https://mv.gov.cz/rodne-cislo-obecne>
8. MV ČR, *Přidělení rodného čísla*: <https://mv.gov.cz/prideleni-rodneho-cisla>
9. ČSSZ, *Standardní kontrola rodného čísla a evidenčního čísla pojištěnce* (century mapping, month
   handling, no remainder-10 exception, 9-digit `000`):
   <https://www.cssz.gov.cz/standardni-kontrola-rodneho-cisla-a-evidencniho-cisla-pojistence>
10. VZP ČR, answer to an information request of 26. 3. 2016 (foreigner insurance numbers with
    month +20 and day +50):
    <https://www.vzp.cz/o-nas/informace/odpovedi-na-zadosti-o-informace/zadost-ze-dne-26-3-2016>

Official data standard, not the source of the rule [S]:

11. DASTA / NZIS (MZ ČR), *Struktura rodného čísla* (remainder 10 gives 0 until 1985 per FSÚ ČVK
    2898/1985; slash omitted on technical carriers): <https://dastacr.cz/dasta/hypertext/DSBET.htm>

Secondary, **UNVERIFIED**:

12. Wikipedia cs, *Rodné číslo* (about 1,000 exception numbers; FSÚ Č. Vk. 2898/1985; history 1946–1977):
    <https://cs.wikipedia.org/wiki/Rodn%C3%A9_%C4%8D%C3%ADslo>
13. python-stdnum `stdnum/cz/rc.py` (cross-check only):
    <https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/cz/rc.py>
14. rodnecislo (npm, kub1x) README (cross-check only): <https://github.com/kub1x/rodnecislo>
15. expats.cz, 2023-05-24, plan to stop using the birth number as a general identifier:
    <https://www.expats.cz/czech-news/article/czechia-plans-to-cancel-birth-numbers-as-privacy-measure>

---

## 7. Differences from docs/spec.md

1. **Mod 11 exception, "čísla vydaná do 1985".** The exception is **not in the law**. § 13 odst. 3
   requires divisibility by 11 with no exception. The 1985 cut-off comes only from an internal FSÚ
   directive cited by DASTA [S] and Wikipedia; the directive itself is not available (UNVERIFIED). "Issued
   until 1985" refers to the assignment year. The validator needs a birth-year bound, proposed as
   1954–1985. ČSSZ [P] does not accept the exception at all.
2. **+20/+70 "od 2004 možný".** It has been possible since **1. 4. 2004** (effective date of 53/2004 Sb.),
   **only when the normal series for that birth date is used up**. The law does not limit it to people
   born in 2004 or later. The spec mentions neither the condition nor the birth-year question.
3. **"Před rokem 1954".** Precisely: born **before 1. 1. 1954** (birth date, not assignment date).
4. **Century of 9-digit numbers.** Not in the spec. ČSSZ maps 9-digit `RR` 54–99 to **1854–1899**, so a
   9-digit number never carries a post-1953 date. This means truncating a 10-digit number to 9 digits
   usually gives a *valid* number, which matters for the `wrongLength` generator.
5. **+20/+70 is 10-digit only** (§ 13 odst. 5). The spec does not say so.
6. **`withoutSlash`.** Confirmed valid (DASTA: slash omitted in machine records; ČSSZ validates digits
   only). The spec's format column shows only the slashed form.
7. **`impossibleDate`.** The spec gives month 13 and day 32 as examples. Real registry numbers with
   impossible dates (29. 2. in non-leap years, 31. 4.) exist [P, MV]. The library still reports them as
   invalid. The month ranges 21–32 / 51–62 / 71–82 are valid, and everything else including 00 is invalid.
8. **`futureDate`.** Not a legal rule; it is derived. It needs a reference date, which the spec does not
   mention (determinism).
9. **Zero endings** (`/0000`, `/000`). Not in the spec. MV no longer assigns them but still accepts them;
   ČSSZ rejects the 9-digit `/000`.
10. **Input normalization** (whitespace, other separators, misplaced slash). Not in the spec. There is no
    matching reason code other than `letters`.
11. The spec examples `cz.birthNumber({ gender: 'female', birthDate: '1990-05-01' }) → '905501/XXXX'`
    and `validate('9055011234') → badChecksum` are **consistent** with the rules.

---

## 8. Decisions (Marek, 2026-10-05)

1. **`mod11Exception`** is accepted only for birth years **1954–1985**; otherwise `badChecksum`.
2. **+20/+70** is accepted for any **10-digit** number with a birth year from 1954 (law text), not only from
   2004. The `month+20` / `month+70` generators still produce birth dates from 2004-04-01 only (section 9),
   so their output is valid under every reading.
3. **9-digit numbers with `RR` 54–99** are valid and mean **1854–1899** (ČSSZ mapping).
4. **Strict input:** no trimming, only `/` as separator. Letters give `letters`; whitespace, other
   separators and a misplaced or repeated `/` give the new reason code **`badFormat`** (no variant).
5. **Reference date:** as in `docs/rules/core.md` amendment A1 (default current **UTC** date). Date ranges:
   section 9.
6. **Zero endings** `/0000` and `/000` are valid for the validator; generators never produce them.
7. **Reason precedence:** `letters` → `badFormat` → `wrongLength` → `impossibleDate` → `badChecksum` →
   `futureDate`.
8. **README** gets one sentence: some real, legally assigned numbers fail validation (section 3.4).
9. **Date ranges** (from review finding S2 of `docs/reviews/core.md`): section 9.
10. **Generator options:** section 9.

## 9. Generator (approved 2026-10-05)

### Options

`cz.birthNumber(options?)` with `{ gender?: 'male' | 'female'; birthDate?: string }`, both optional.

- `gender` omitted → chosen at random from the identifier's stream. `female` adds 50 to the month.
- `birthDate` (`YYYY-MM-DD`) omitted → random date in the default range below.
- `birthDate` before 1954-01-01 → a **9-digit** number (§ 13 odst. 4), ending `001`–`999`.
  `birthDate` from 1954-01-01 → a **10-digit** number with a correct checksum, never using the
  `mod11Exception` and never a zero ending; the plain generator never uses +20/+70.
- `birthDate` that is not a real calendar date, is outside **1854-01-01 … 2053-12-31** (what the format can
  encode), or is after `referenceDate` → `RangeError` naming the option.
- Output format: with the slash (`RRMMDD/XXXX`, `RRMMDD/XXX`); `withoutSlash` is an edge variant.
- The result is consistent: decoding it gives back exactly the given `gender` and `birthDate` (spec).

### Date ranges

Fixed ranges keep the output independent of the day the tests run. A range is cut only where `referenceDate`
cuts into it; if nothing is left, the generator throws `RangeError` naming `referenceDate`.

| Generator | Fixed range of birth dates | Cut by `referenceDate` |
| --- | --- | --- |
| plain `cz.birthNumber()` (no `birthDate`) | 1954-01-01 … 2025-12-31 | upper bound = min(2025-12-31, `referenceDate`) |
| `month+20`, `month+70` | 2004-04-01 … 2025-12-31 | upper bound = min(2025-12-31, `referenceDate`) |
| `mod11Exception` | 1954-01-01 … 1985-12-31 | upper bound = min(1985-12-31, `referenceDate`) |
| `leapDay` (10-digit) | 29 Feb of 1956 … 2024 leap years (incl. 2000) | only leap days ≤ `referenceDate` |
| `pre1954`, `leapDay` (9-digit) | 1900-01-01 … 1953-12-31 | upper bound = min(1953-12-31, `referenceDate`) |
| `futureDate` | 2040-01-01 … 2053-12-31 | lower bound = max(2040-01-01, `referenceDate` + 1 day) |
| other invalid variants | as the plain generator | as the plain generator |

Clarifications from the test-writer (2026-10-05, derived from the approved text):

- **Other invalid variants** (`badChecksum`, `impossibleDate`, `wrongLength`, `letters`) use the plain
  generator's range, so they also throw `RangeError` naming `referenceDate` when it is before 1954-01-01.
- **`withoutSlash`** draws from the union of the plain range (10 digits) and the `pre1954` range
  (9 digits), i.e. 1900-01-01 … min(2025-12-31, `referenceDate`); it produces both lengths.
- **`leapDay`** treats its 9-digit and 10-digit leap days as one range (all 29 Feb from 1904 to 2024 except
  1900, ≤ `referenceDate`); it produces both lengths.
- An invalid runtime `gender` throws `RangeError` naming `gender`.
- `''` and `123456/` give `wrongLength` (step 1 finds no bad character, step 2 fails).
- Only Unicode letters (`\p{L}`) count as letters; other characters, e.g. full-width digits or `Ⅻ`, give
  `badFormat`.
- No generator or variant produces a zero ending (decision 6 applies to edge variants too).
- A `letters` value has exactly one letter and otherwise the shape of a valid number.

With the default `referenceDate` (today, 2026 or later) no range is cut until 2040, so the same seed gives the
same output on any day. A range that is cut changes output only for that explicit `referenceDate`, which is
still deterministic.
