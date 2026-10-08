# iban (IBAN, Czech account number in the international format)

Status: **DRAFT**, waiting for Marek's approval · researched 2026-10-08 · rules-researcher

Czech meaning: *číslo účtu ve formátu IBAN* (International Bank Account Number) is the Czech payment account number
written in the international form of ISO 13616. Vyhláška ČNB č. 169/2011 Sb., § 2: *"Číslo účtu se používá a) v
národním formátu, b) ve formátu IBAN."* It carries exactly the same data as the national format
(`docs/rules/bankAccount.md`): bank code, prefix and number, plus the country code `CZ` and two check digits.

Scope: **Czech IBANs only** (`CZ…`). Any other country is `wrongCountry`.

Legend: **[P]** is a primary source (ČNB decree, ČNB pages and the ECBS standard EBS204 that ČNB publishes, Finanční
správa, Národná banka Slovenska). **UNVERIFIED** means the claim rests only on secondary sources or on my own estimate.
"My derivation" marks arithmetic that anyone can re-check; it is not a rule from a source.

> **Main caveat.** ISO 13616 itself (current edition ISO 13616-1:2020, UNVERIFIED) and ISO 7064 are paywalled and were
> **not read**. The check algorithm and the electronic/paper formats are taken from ECBS **EBS204 V3.2** (August 2003),
> which ČNB links as the standard the IBAN follows, and from ČNB's own pages. The SWIFT IBAN Registry (the official
> ISO 13616 registry) returned HTTP 403 and was not read either. Everything below is consistent across ČNB,
> Finanční správa, NBS and EBS204, and 11 real official IBANs pass it (section 5).

---

## 1. Format

### 1.1 Structure (vyhláška 169/2011 Sb., § 4) [P]

Verbatim: *"Číslo účtu ve formátu IBAN je tvořeno 24 alfanumerickými znaky, kdy a) první a druhý znak jsou písmena CZ,
b) třetí a čtvrtý znak obsahují kontrolní číslice definované mezinárodní normou, c) pátý až osmý znak obsahují
číslice kódu platebního styku (§ 6) a d) devátý až dvacátý čtvrtý znak obsahují číslice identifikátoru účtu klienta
(§ 5)."* § 1 names the standard: *"… v souladu s pravidly mezinárodní standardizace (IBAN) obsaženými v normě ISO 13616
Financial services - International bank account number (IBAN)."*

| Characters (1-based) | Length | Content | Source |
| --- | --- | --- | --- |
| 1–2 | 2 | `CZ` (country code, ISO 3166) | § 4 písm. a) |
| 3–4 | 2 | check digits `02`–`98` (section 2) | § 4 písm. b), EBS204 § 6.2 |
| 5–8 | 4 | bank code (*kód platebního styku*), as in bankAccount | § 4 písm. c) |
| 9–14 | 6 | prefix (*předčíslí*), zero-padded on the left; `000000` = no prefix | Finanční správa, ČNB example (below) |
| 15–24 | 10 | number (*základní část*), zero-padded on the left | Finanční správa, ČNB example (below) |

Total **24 characters**: letters only in positions 1–2, ASCII digits everywhere else (§ 4: *"číslice"* for 5–24).

**Zero padding.** The decree says only that characters 9–24 carry *"číslice identifikátoru účtu klienta"*; it does not
spell out the 6 + 10 split or the padding. The split is explicit in Finanční správa [P]: *"2 znaky – kód země, 2 znaky
– kontrolní číslice (ochrana proti chybně zadanému číslu), 4 znaky – kód banky, 6 znaků – předčíslí bankovního účtu, 10
znaků – číslo účtu (matrika finančního úřadu)"*, and ČNB's examples show the padding [P]:

| National format (ČNB) | IBAN, electronic | IBAN, written |
| --- | --- | --- |
| `19-2000145399/0800` | `CZ6508000000192000145399` | `CZ65 0800 0000 1920 0014 5399` |
| `178124-4159/0710` | `CZ6907101781240000004159` | `CZ69 0710 1781 2400 0000 4159` |

So `19` becomes `000019` and `4159` becomes `0000004159`. The identical Slovak format is described explicitly by NBS
[P]: *"six digits comprising zeros or the account number prefix (… preceded by one or more zeros if shorter than six
digits); and ten digits comprising one or more zeros plus the account number"*.

### 1.2 Electronic and written (paper) form [P]

- ČNB: *"Číslo účtu ve formátu IBAN má dvě podoby – elektronickou (bez mezer) a písemnou (s mezerou za každou čtveřicí
  znaků pro lepší orientaci)"*.
- Finanční správa: *"V písemném styku se uvádí IBAN po 4 znacích odděleně s mezerami, elektronicky se mezery
  neuvádějí."*
- EBS204 § 5.2: *"The paper representation of the IBAN is the same as the electronic format except that the IBAN shall
  be split up in groups of 4 characters separated by a space. The last group shall be variable in length, up to 4
  characters."* For a Czech IBAN all 6 groups have 4 characters, so the written form has **29 characters**.
- EBS204 § 6.1, preliminary step of validation: *"If the IBAN is in paper format, convert to basic format by deleting
  all non-alphanumeric characters."* § 7.2: *"Every capturing system shall validate the IBAN i.e. when transferring the
  IBAN from paper to electronic form."*

### 1.3 Letter case [P]

- EBS204 § 2.1 adds to ISO 13616: *"alpha characters are in upper case"*; § 5.1.1: BBAN *"0-9, A-Z (only uppercase), no
  separators"*.
- ČNB: *"IBAN může obsahovat číslice a velká písmena"*.

So **officially the IBAN is upper case**. `cz65…` is not an IBAN in the strict sense; the spec nevertheless lists
`lowercase` as a valid edge variant (difference 3, recommendation 5).

### 1.4 Allowed characters (proposed validator)

ASCII digits `0-9`, Unicode letters (so that a letter can be reported as `letters`), and the ASCII space U+0020 only in
the exact written form. No trimming (same as every other identifier). Everything else, including U+00A0, tabs, `-`,
`/`, full-width digits and misplaced or doubled spaces, is `badFormat`.

---

## 2. Check algorithm (proposed validator)

### 2.1 ISO 7064 MOD 97-10 as given in EBS204 § 6 [P]

**Validation (§ 6.1):** (preliminary step: delete the spaces of the paper form)
1. *"Move the first four characters of the IBAN to the right of the number."*
2. *"Convert the letters into numerics in accordance with the conversion table under 6.3."* (`A = 10`, `B = 11`, …,
   `Z = 35`; so `C = 12`, `Z = 35`, `S = 28`, `K = 20`.)
3. *"Apply MOD 97-10 (see ISO 7064). For the check digits to be correct, the remainder after calculating the modulus 97
   must be 1."*

**Calculation (§ 6.2):** build the IBAN with check digits `00`, apply steps 1–2, then *"Calculate the modulo 97 and
subtract the remainder from 98. If the result is one digit, then insert a leading zero."* The result is always
**`02`–`98`** (remainder 0–96).

**Big numbers (§ 6.3 note) [P]:** *"For reasons of precision, the use of integers instead of floating point numbers is
recommended. If the number is too long … then the calculation can be split up into consecutive remainder calculations
on integers with a maximum length of 9 or 18 digits."* The Czech rearranged number has **26 digits**, more than
`Number.MAX_SAFE_INTEGER` (16 digits), so it must not be parsed as one `Number`.

Implementation options (recommendation 6):
- **Digit by digit (recommended):** `r = (r * 10 + d) % 97` for a digit, `r = (r * 100 + v) % 97` for a letter with
  `v = parseInt(ch, 36)` (10–35; it also maps lowercase `c`/`z` correctly). The largest intermediate value is
  `96 · 100 + 35 = 9 635`, safe in every engine. Estimated ~50–70 B min+gzip (UNVERIFIED).
- **Chunks** of up to 13 digits with `Number` (2-digit remainder + 13 digits = 15 digits < 2^53): fewer iterations,
  more code. No benefit for 26 digits.
- **BigInt** (`BigInt(s) % 97n`): ~20 B, supported by Node ≥ 10.4 and the project target (ES2022, `node22`). But a
  `97n` literal cannot be down-levelled: a consumer whose bundler targets below ES2020 gets a build error. Not
  recommended for a library whose selling point is "works everywhere"; `BigInt(97)` avoids the literal but costs
  bytes and still fails at run time in old engines.

### 2.2 Shortcut for test oracles (my derivation)

With `10^22 ≡ 25`, `10^16 ≡ 62`, `10^6 ≡ 27` and `123500 ≡ 19` (mod 97), the remainder of the rearranged number with
check digits `00` is

```
R = (25·code + 62·prefix + 27·number + 19) mod 97          (CZ; for SK use 21 instead of 19)
check digits = 98 − R
```

where `code`, `prefix`, `number` are the integer values of the three fields. This reproduces both ČNB examples (`65`,
`69`), the NBS example (`68`) and all 11 Finanční správa IBANs in section 5. Useful for an independent test oracle; the
implementation should use 2.1.

### 2.3 Check digits `00`, `01`, `99` (sources disagree)

`kk` and `kk ± 97` are congruent mod 97, so for some accounts `00` (when the correct value is `97`), `01` (correct `98`)
or `99` (correct `02`) **also pass** the remainder test of § 6.1. They can never be produced by § 6.2, and § 7.1 says
*"Generation of the IBAN shall be the exclusive responsibility of the bank/branch servicing the account"*, so no real
IBAN has them.

- EBS204 § 6.1 (literal reading): valid iff remainder = 1 → `00`/`01`/`99` would be valid [P].
- EBS204 § 6.2: computed digits are `98 − r`, i.e. `02`–`98` only [P].
- Wikipedia (secondary): *"Check digits in the ranges 00 to 96, 01 to 97, and 03 to 99 will also provide validation
  of an IBAN, but the standard is silent as to whether or not these ranges may be used."* (UNVERIFIED)
- Apache Commons Validator `IBANCheckDigit.isValid` rejects them explicitly:
  `if ("00".equals(check) || "01".equals(check) || "99".equals(check)) { return false; }` (secondary, a widely used
  implementation).

Recommendation 3: reject them as `badChecksum` (a value no bank can issue). Real-data samples in section 5.

### 2.4 Embedded account (consistency with bankAccount, spec line 42)

§ 4 písm. d) puts the *identifikátor účtu klienta (§ 5)* into characters 9–24, and § 5 odst. 2 requires both parts to
pass the mod 11 check (Příloha). So an IBAN whose embedded prefix or number fails mod 11 is **not** a valid Czech account
number in the IBAN format, even with correct check digits. ČNB's own IBAN calculator reports exactly this
(*"Číslo není modulo 11"*) [P]. The bank code must be a code of the ČKPS list (§ 4 písm. c) → § 6).

Inside the IBAN the fields have fixed lengths (6 and 10 digits, both already known to be digits), so of the
bankAccount rules only these remain, with the **bankAccount precedence**:

| bankAccount rule | Inside the IBAN |
| --- | --- |
| `letters`, `badFormat`, `wrongLength` | cannot occur (handled by IBAN steps 1–4) |
| `badChecksumPrefix` | prefix field (chars 9–14) fails mod 11; `000000` (no prefix) passes with sum 0 (bankAccount decision 4) |
| `badChecksumNumber` | number field (chars 15–24) fails mod 11 (includes "exactly one non-zero digit") |
| `zeroNumber` | number field `0000000000` |
| `unknownBankCode` | chars 5–8 not in the bundled ČNB snapshot; checked last, so all checksum results stay snapshot-independent |

Recommendation 2: the IBAN validator reports these **bankAccount reason codes unchanged** (no IBAN-own `badAccount`), by
calling bankAccount's inner `validate` on the reconstructed account `prefix6-number10/code`. bankAccount's
`BankAccountReason` is a subset of `IbanReason`, so the result type fits without mapping.

### 2.5 Validator steps

The first failing step gives the reason. Proposed precedence (recommendation 1): **`badFormat` → `wrongCountry` →
`letters` → `wrongLength` → `badChecksum` → `badChecksumPrefix` → `badChecksumNumber` → `zeroNumber` →
`unknownBankCode`**. The validator ignores `referenceDate`.

1. **Shape.** The input must match one of
   - electronic: `^[\p{L}0-9]+$` (u flag), or
   - written: `^[\p{L}0-9]{4}(?: [\p{L}0-9]{4})*(?: [\p{L}0-9]{1,4})?$` (u flag; groups of 4 separated by **one**
     U+0020, last group 1–4).

   Otherwise → **`badFormat`** (empty string, other characters, leading/trailing/double spaces, groups of another
   size). Let `compact` = the input without spaces.
2. **Country.** If `compact` does not start with `CZ` (ASCII case-insensitive: `C`/`c`, then `Z`/`z`) →
   **`wrongCountry`**. This also covers foreign IBANs of any length, a missing country code (`6508…`) and `ČZ…`.
3. **Letters.** If `compact` from character 3 on contains a Unicode letter → **`letters`**.
4. **Length.** If `compact.length ≠ 24` → **`wrongLength`**.
5. **Check digits.** If characters 3–4 are `00`, `01` or `99`, or the MOD 97-10 remainder of
   `compact[4..] + compact[0..4]` (letters converted, any case) is not 1 → **`badChecksum`**.
6. **Embedded account.** Return bankAccount `validate(`${compact[8..14]}-${compact[14..24]}/${compact[4..8]}`)`
   unchanged: **`badChecksumPrefix`**, **`badChecksumNumber`**, **`zeroNumber`**, **`unknownBankCode`**, or
   `{ valid: true }`.

Why this order:
- Format before letters (unlike bankAccount, where `letters` is first): letters are legitimate in positions 1–2, so
  "a letter where a digit belongs" can only be decided after the shape is known.
- Country before length: `SK…` and `DE89…` (22 characters) should both say "not Czech", the more useful message.
- `badChecksum` before the account rules: this is the ISO check of the whole string; the account rules only refine a
  string that is a correct IBAN. The bank code stays last for the reason given in bankAccount section 2.

### 2.6 Worked example 1: `CZ6508000000192000145399` (ČNB's own example)

1. Shape: electronic ✓. `compact` = the input.
2. Starts with `CZ` ✓. 3. No letters after position 2 ✓. 4. Length 24 ✓.
5. Check digits `65` ∈ 02–98 ✓. Rearranged: `08000000192000145399` + `CZ65` → `08000000192000145399` + `12` `35` `65`
   = `08000000192000145399123565` (26 digits). Chunks as in EBS204 § 6.3 (9 digits, then remainder + 7 digits):

   | Step | Number | mod 97 |
   | --- | --- | --- |
   | first 9 digits | `080000001` | 27 |
   | `27` + `9200014` | `279200014` | 64 |
   | `64` + `5399123` | `645399123` | 20 |
   | `20` + `565` | `20565` | **1** ✓ |

   Calculation check: with `00` instead of `65` the last step is `20500 mod 97 = 33`, and `98 − 33 = 65` ✓.
6. Account `000019-2000145399/0800`: prefix sum `1·2 + 9·1 = 11` ✓; number `2·6 + 1·10 + 4·5 + 5·8 + 3·4 + 9·2 + 9·1 =
   121 = 11·11` ✓; non-zero ✓; `0800` known ✓ → **`{ valid: true }`**.

### 2.7 Worked example 2: `CZ30 0710 0077 5500 7762 8111` (Finanční správa, written form)

1. Written shape: six groups of 4 ✓. `compact` = `CZ3007100077550077628111`.
2.–4. `CZ` ✓, no letters ✓, 24 ✓.
5. `30` ∈ 02–98 ✓. Shortcut 2.2: code 710 ≡ 31 → 25·31 ≡ 96; prefix 7755 ≡ 92 → 62·92 ≡ 78; number 77628111 ≡ 78 →
   27·78 ≡ 69; `R = 96 + 78 + 69 + 19 = 262 ≡ 68`; `98 − 68 = 30` ✓.
6. Prefix `007755`: `7·8 + 7·4 + 5·2 + 5·1 = 99 = 9·11` ✓. Number `0077628111`: `253 = 23·11` ✓. `0710` known ✓ →
   **`{ valid: true }`**.

### 2.8 Worked example 3: precedence

`CZ0708000000001234567890` (constructed): shape, country, letters, length ✓; check digits `07` and remainder 1 ✓ (a
pure ISO validator says valid). Account `000000-1234567890/0800`: number sum `255 ≡ 2 (mod 11)` → **`badChecksumNumber`**.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| Nov 1996 | EBS204 version 1 (ECBS) | [P] EBS204 document history |
| 2000 **or** 2002 | ČNB registers the Czech IBAN format with the Czech Banking Association. **ČNB's pages disagree**: English *"In 2000, the Czech National Bank took charge of this initiative …"*, Czech *"V roce 2002 se této iniciativy ujala Česká národní banka …"*. No rule depends on it. | [P] ČNB, both language versions of *IBAN – historický vývoj* |
| Aug 2003 | EBS204 V3.2 (references ISO 13616:2003); the version ČNB links | [P] |
| 1. 5. 2004 | Nařízení (ES) č. 2560/2001 applies in CZ (EU accession): banks state IBAN and BIC on statements | [P] ČNB *IBAN – mezinárodní číslo účtu* |
| 2005 / 2007 | IBAN registry passes from ECBS to EPC (2005), then to SWIFT (2007); ISO 13616 revised in 2007 | [P] ČNB *IBAN – historický vývoj* |
| 28. 6. 2011 → | Vyhláška 169/2011 Sb. § 4 defines the Czech IBAN in law; still in force, never amended. The previous decree 62/2004 Sb. had no IBAN provision (bankAccount.md 3.1). | [P] zakonyprolidi.cz |
| 2020 | ISO 13616-1:2020, current edition | UNVERIFIED (Wikipedia) |

The Czech structure (24 characters, 4 + 6 + 10 digits) has not changed in the period covered by the sources above; no
historical registry was read (UNVERIFIED before 2011). The validator has no date-dependent rules.

### 3.2 The bank code list changes

The embedded bank code uses the same snapshot as bankAccount (ČKPS version 255). An IBAN that was valid in 2022
(`CZ.. 6100 …`, Equa bank, cancelled 1. 7. 2023) is `unknownBankCode` today. Snapshot updates change validator results
for such IBANs, never generator output (bankAccount decisions 2 and 14).

### 3.3 Slovak IBANs look identical

Slovakia uses the same structure: `SK` + 2 check digits + 4-digit bank code + 6-digit prefix + 10-digit number, 24
characters (NBS, Decree No 8/2009) [P]; NBS example `SK6807200002891987426353`. Only the country code and the
`CZ`/`SK` letters inside the mod 97 differ. This is what a Czech-only form most likely receives by mistake, so
`wrongCountry` uses it (section 4).

### 3.4 What is not an IBAN

- `IBAN CZ65 0800 …` – EBS204's annex writes the word *IBAN* as a tag separated by a colon (*"IBAN : FR76 …"*), not
  as part of the number. With the steps in 2.5 this input has a valid written shape (`IBAN` is a group of 4), so it
  gives **`wrongCountry`** (`IB` ≠ `CZ`). Documented consequence, not a special rule.
- The national form `19-2000145399/0800` → `badFormat`.
- An IBAN built without zero padding (`CZ81 0800 1920 0014 5399`, 20 characters) is a real converter bug → `wrongLength`
  (variant in section 4).

---

## 4. Edge and invalid variants

Spec (line 54): edge `withSpaces`, `lowercase`; invalid `badChecksum`, `wrongCountry`, `wrongLength`. Every value has
exactly one property or fault. Exact draws are in section 9.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Example |
| --- | --- | --- |
| `withSpaces` | plain IBAN in the written form (EBS204 § 5.2), 29 characters | `CZ55 0800 0000 0012 3456 7899` |
| `lowercase` | plain IBAN in lower case (only `cz` changes). **Disputed** (*sporné*): official sources require upper case (1.3); mark it as such in the README, like dic `lowercasePrefix` | `cz5508000000001234567899` |
| `withPrefix` (**proposal**) | IBAN of an account with a non-zero prefix of 2–6 digits; tests converters that drop or misplace characters 9–14 | `CZ3101001234571234567899` |
| `checkDigitsLeadingZero` (**proposal**) | IBAN whose check digits are `02`–`09`; tests code that treats the check digits as a number and loses the `0` | `CZ0207100007050077621761` (real, section 5) |

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | One fault only |
| --- | --- | --- |
| `badChecksum` | plain IBAN whose check digits are replaced by a uniformly drawn **other** value from `02`–`98` | two different values in `02`–`98` differ by less than 97, so the remainder can never stay 1; the account is untouched |
| `wrongCountry` | the plain account as a **Slovak** IBAN: `SK` + check digits recomputed for `SK` + the same 20 digits | passes MOD 97-10 as an SK IBAN and has the right length; only the country is wrong |
| `wrongLength` | the plain account as an IBAN **without zero padding**: `CZ` + check digits recomputed over the unpadded digits + code + number (14–18 characters) | passes MOD 97-10; only the length is wrong. A real converter bug (3.4). Alternative: one digit removed/added (then the check digits are wrong too) |
| `letters` (**proposal**) | plain IBAN with one character of positions 3–24 replaced by a letter of `AOl` | as ico and bankAccount |
| `badChecksumPrefix` (**proposal**) | the IBAN (correct check digits) of bankAccount's `badChecksumPrefix` value | passes a pure ISO validator |
| `badChecksumNumber` (**proposal**) | the IBAN (correct check digits) of bankAccount's `badChecksumNumber` value | passes a pure ISO validator |
| `zeroNumber` (**proposal**) | the IBAN (correct check digits) of `0000000000/code` | passes a pure ISO validator |
| `unknownBankCode` (**proposal**) | the IBAN (correct check digits) of bankAccount's `unknownBankCode` value (codes `0000`, `2020`, `4000`, `6100`, `9999`) | passes a pure ISO validator; tests a stale bank list |

Reason code without a variant: **`badFormat`**. The four account variants are the main value for testers: they pass
every validator that checks only ISO 13616 (most npm IBAN packages, UNVERIFIED), but they are not valid Czech account
numbers. Check digits `00`/`01`/`99` have no variant (they share `badChecksum`); they are covered by fixed samples.

---

## 5. Known samples

No IBAN of a natural person is used. Real samples are published accounts of ČNB, Finanční správa and NBS.

### Valid (real, official)

| Input | What | Covers |
| --- | --- | --- |
| `CZ6508000000192000145399` | ČNB example for `19-2000145399/0800` [P] | worked example 1 |
| `CZ65 0800 0000 1920 0014 5399` | same, ČNB written form [P] | `withSpaces` |
| `CZ6907101781240000004159` | ČNB example for `178124-4159/0710` [P] (prefix sum 121, number 55) | 6-digit prefix |
| `CZ69 0710 1781 2400 0000 4159` | same, written form [P] | |
| `CZ30 0710 0077 5500 7762 8111` | Finanční úřad pro Středočeský kraj, daň z nemovitých věcí (example on the FS web page and in Příloha č. 5) [P] | worked example 2 |
| `CZ74 0710 0007 0500 7762 8031` | Finanční úřad pro hlavní město Prahu, DPH (Příloha č. 5) [P] | 3-digit prefix `705` |
| `CZ27 0710 0007 4800 7762 8031` | Praha, daň silniční [P] | |
| `CZ49 0710 0028 6600 7762 8031` | Praha, paušální daň [P] (prefix 2866, sum 66) | 4-digit prefix |
| `CZ52 0710 0007 0500 7762 8621` | Jihomoravský kraj, DPH [P] | |
| `CZ07 0710 0007 0500 7762 8461` | Liberecký kraj, DPH [P] | check digits with leading zero |
| `CZ02 0710 0007 0500 7762 1761` | Moravskoslezský kraj, DPH [P] | **lowest** possible check digits `02` |
| `CZ98 0710 0007 4800 7762 8111` | Středočeský kraj, daň silniční [P] | **highest** possible check digits `98` |

All 11 Finanční správa values were read from the image of Příloha č. 5 and then **recomputed** with 2.2 (mod 97) and
the mod 11 rule; every one matches, which also rules out misreading.

### Valid (constructed)

| Input | Account | Why |
| --- | --- | --- |
| `CZ5508000000001234567899` | `1234567899/0800` | plain shape, no prefix |
| `CZ55 0800 0000 0012 3456 7899` | same | `withSpaces` |
| `cz5508000000001234567899` | same | `lowercase` (disputed) |
| `cz55 0800 0000 0012 3456 7899` | same | lower case + spaces |
| `Cz5508000000001234567899` | same | mixed case country (recommendation 5) |
| `CZ3101001234571234567899` | `123457-1234567899/0100` | `withPrefix`, 6-digit prefix |
| `CZ79 0710 0137 1700 7762 8031` | `13717-77628031/0710` (official FS account, bankAccount.md; IBAN computed by me) | 5-digit prefix |
| `CZ9755000000000000000019` | `19/5500` | check digits `97`; shortest account |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'CZ6608000000192000145399'` | `badChecksum` | ČNB example, check digits +1 |
| `'CZ6508000000192000143599'` | `badChecksum` | ČNB example, adjacent digits `53` swapped (always detected: Δ = 9·(a−b)·10^k) |
| `'CZ6508000000192000145398'` | `badChecksum` | last digit changed (the account would also fail mod 11; checksum comes first) |
| `'CZ99 0710 0007 0500 7762 1761'` | `badChecksum` | real FS IBAN with `02` → `99`; **remainder is 1** (recommendation 3) |
| `'CZ01 0710 0007 4800 7762 8111'` | `badChecksum` | real FS IBAN with `98` → `01`; remainder is 1 |
| `'CZ0055000000000000000019'` | `badChecksum` | `97` → `00`; remainder is 1 |
| `'CZ0708000000001234567890'` | `badChecksumNumber` | mod 97 correct; number sum 255 (worked example 3) |
| `'CZ5308001234561234567899'` | `badChecksumPrefix` | mod 97 correct; prefix `123456` sum 76 |
| `'CZ6108000000000000000000'` | `zeroNumber` | mod 97 correct; all-zero account |
| `'CZ5761000000001234567899'` | `unknownBankCode` | mod 97 correct; `6100` Equa bank, cancelled 1. 7. 2023 |
| `'CZ7300000000001234567899'` | `unknownBankCode` | mod 97 correct; `0000` never assigned |
| `'SK6807200002891987426353'` | `wrongCountry` | NBS example, a valid Slovak IBAN [P] |
| `'SK68 0720 0002 8919 8742 6353'` | `wrongCountry` | same, written form |
| `'SK5308000000001234567899'` | `wrongCountry` | constructed SK IBAN of `1234567899/0800` (variant shape) |
| `'BE62510007547061'` | `wrongCountry` | EBS204 example, 16 characters: country wins over length |
| `'FR1420041010050500013M02606'` | `wrongCountry` | EBS204 example with a letter in the BBAN: country wins |
| `'6508000000192000145399'` | `wrongCountry` | country code missing |
| `'ČZ6508000000192000145399'` | `wrongCountry` | `Č` is a letter but not `C` |
| `'IBAN CZ65 0800 0000 1920 0014 5399'` | `wrongCountry` | tag "IBAN" in front (3.4) |
| `'CZ65O8000000192000145399'` | `letters` | `O` for `0` in the bank code |
| `'CZ6S08000000192000145399'` | `letters` | `S` in the check digits |
| `'CZ65 0800 0000 1920 0014 539l'` | `letters` | lowercase L at the end, written form |
| `'CZ650800000019200014539é'` | `letters` | any Unicode letter |
| `'CZ650800000019200014539'` | `wrongLength` | 23 characters |
| `'CZ65080000001920001453990'` | `wrongLength` | 25 characters |
| `'CZ65 0800 0000 1920 0014 5399 0'` | `wrongLength` | valid written shape, 25 characters |
| `'CZ810800192000145399'` | `wrongLength` | `19-2000145399/0800` without padding, check digits correct for that string (variant shape) |
| `'CZ'` | `wrongLength` | country only |
| `''` | `badFormat` | empty |
| `' CZ6508000000192000145399'` | `badFormat` | leading space, not trimmed |
| `'CZ6508000000192000145399 '` | `badFormat` | trailing space |
| `'CZ65  0800 0000 1920 0014 5399'` | `badFormat` | double space |
| `'CZ65 08000000 1920 0014 5399'` | `badFormat` | group of 8 |
| `'CZ6508 0000 0019 2000 1453 99'` | `badFormat` | spaces in the wrong places |
| `'CZ65-0800-0000-1920-0014-5399'` | `badFormat` | hyphens |
| `CZ65`, U+00A0, `0800 0000 1920 0014 5399` | `badFormat` | no-break space (common when copied from a web page) |
| `'CZ65\t0800 0000 1920 0014 5399'` | `badFormat` | tab |
| `'19-2000145399/0800'` | `badFormat` | national format |
| full-width `ＣＺ６５０８００００００１９２０００１４５３９９` | `badFormat` | full-width `ＣＺ` are letters (`\p{L}`), but full-width digits (U+FF10–U+FF19) are neither `[0-9]` nor letters, so step 1 fails |

Sample arithmetic (2.2, all checked a second time with the chunk method of 2.1): `1234567899/0800` → R = 18 + 0 + 6 +
19 = 43 → `55`; `123457-1234567899/0100` → 75 + 64 + 6 + 19 = 164 ≡ 67 → `31`; `19/5500` → 51 + 0 + 28 + 19 = 98 ≡ 1 →
`97`; `13717-77628031/0710` → 96 + 55 + 43 + 19 = 213 ≡ 19 → `79`.

---

## 6. Sources

Primary [P]:

1. **Vyhláška č. 169/2011 Sb.**, o stanovení pravidel tvorby čísla účtu v platebním styku, § 1, § 2, § 4, § 5 (quotes
   above), in force from 28. 6. 2011, never amended: <https://www.zakonyprolidi.cz/cs/2011-169>; ČNB copy (linked from
   the ČNB IBAN page, not fetched):
   <https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/pravni_predpisy/download/vyhl_169_2011.pdf>
2. ČNB, *IBAN – mezinárodní formát čísla účtu* (structure, two forms, upper case, examples `19-2000145399/0800` and
   `178124-4159/0710`): <https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-format-cisla-uctu/>
3. ČNB, *IBAN – mezinárodní číslo účtu* (Regulation 2560/2001 from 1. 5. 2004):
   <https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-cislo-uctu/>
4. ČNB, *IBAN – historický vývoj* (2002) <https://www.cnb.cz/cs/platebni-styk/iban/iban-historicky-vyvoj/index.html> and
   *IBAN – historic development* (2000) <https://www.cnb.cz/en/payments/iban/iban-historic-development/index.html>
5. ČNB, *Kalkulátor IBAN – Česká republika* (checks mod 11 of both parts: *"Číslo není modulo 11"*):
   <https://www.cnb.cz/cs/platebni-styk/iban/kalkulator-iban-ceska-republika/>
6. ECBS, **EBS204 V3.2** *IBAN: International Bank Account Number*, August 2003, §§ 2.1, 5.1, 5.2, 6.1–6.3, 7, annex
   (read page by page from the PDF hosted by ČNB):
   <https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/iban/download/EBS204.pdf>
7. Finanční správa, *Placení daní ze zahraničí a mezinárodní …* (structure 2+2+4+6+10, spaces, example
   `CZ30 0710 0077 5500 7762 8111`):
   <https://financnisprava.gov.cz/cs/dane/placeni-dani/jak-spravne-zaplatit-dan/2014/placeni-dani-ze-zahranici-a-mezinarodni>
8. Finanční správa, *Příloha č. 5 – Bankovní účty finančních úřadů nejčastěji placených daní (v mezinárodním formátu
   IBAN) při placení daní ze zahraničí*, valid from 1. 1. 2026 (table of 15 offices × 9 taxes):
   <https://financnisprava.gov.cz/assets/cs/prilohy/d-placeni-dani/priloha_5_bu_fu_nejcastejsi_dane_IBAN_01012026.pdf>
9. Národná banka Slovenska, *IBAN* (SK structure, padding, example `SK6807200002891987426353`, Decree No 8/2009):
   <https://nbs.sk/en/payments/general-information/iban/>
10. Bank code list and mod 11: sources 1 and 3–6 of `docs/rules/bankAccount.md` (ČKPS version 255).

Not read (blocked or paywalled): ISO 13616-1:2020, ISO 7064, SWIFT IBAN Registry
(<https://www.swift.com/standards/data-standards/iban-international-bank-account-number>, HTTP 403).

Secondary (**UNVERIFIED**):
- Wikipedia, *International Bank Account Number* (check digit ranges, ISO 13616-1:2020):
  <https://en.wikipedia.org/wiki/International_Bank_Account_Number>
- Apache Commons Validator, `IBANCheckDigit.isValid` (rejects `00`, `01`, `99`):
  <https://commons.apache.org/proper/commons-validator/jacoco/org.apache.commons.validator.routines.checkdigit/IBANCheckDigit.java.html>

Quotes from ČNB, Finanční správa and NBS web pages were obtained through a fetch tool asked for verbatim text; EBS204
and Příloha č. 5 were read as page images.

---

## 7. Differences from docs/spec.md

1. **Line 36, "CZ + 2 kontrolní číslice + kód banky + předčíslí (6) + číslo (10)".** Confirmed (§ 4, Finanční správa).
   The spec does not say that prefix and number are **zero-padded** to 6 and 10 digits and that `000000` means "no
   prefix"; the decree does not say it either (only "24 characters", "digits of the identifier"), but Finanční správa,
   ČNB's examples and NBS for the identical SK format do.
2. **Line 36, "ISO 13616, mod 97".** More precisely ISO 7064 **MOD 97-10** as given in EBS204 § 6 (remainder 1;
   computed check digits 02–98). The spec omits that § 4 písm. d) + § 5 odst. 2 also require the embedded prefix and
   number to pass **mod 11** and the code to be a ČKPS code (section 2.4); a pure mod 97 check is not enough for a
   Czech account.
3. **Line 54, `lowercase` as a valid edge variant.** Officially an IBAN is upper case (EBS204 § 2.1, § 5.1.1; ČNB).
   Proposal: keep it valid as the spec says, but mark it **disputed** (spec line 56), like dic `lowercasePrefix`.
4. **Line 54, `withSpaces`.** Confirmed as the official written form, but only in exactly one shape (groups of 4, one
   space). Other spacing is `badFormat` (recommendation 4).
5. **Line 36, "Ověřit v: ČNB".** The legal source is the ČNB decree 169/2011 Sb. § 4; the algorithm is in EBS204, which
   ČNB publishes. ISO 13616 itself was not available.
6. **Lines 42 and 101, "IBAN odpovídá číslu účtu".** The spec gives no API for it. Proposal: the plain generator is built
   from a bankAccount draw, and an `account` option converts a given account (section 9, recommendation 7).
7. **Line 54, variants.** Names confirmed; definitions in section 4. Extra proposals: edge `withPrefix`,
   `checkDigitsLeadingZero`; invalid `letters`, `badChecksumPrefix`, `badChecksumNumber`, `zeroNumber`,
   `unknownBankCode`; reason `badFormat`.
8. **Line 114, "import jednoho identifikátoru do 2 kB".** IBAN reuses bankAccount, so it needs the same amendment as dic
   (section 8.2).

---

## 8. Placement and size (proposal)

### 8.1 Where mod 97 lives

`src/iban/` (e.g. `src/iban/generate.ts` next to the conversion helper). Reasons: core rules section 5 moves an
algorithm to the core only when a **second** identifier needs it; no other v1 identifier uses MOD 97-10 (EAN uses GS1
mod 10, EIC its own check character, UNVERIFIED until their rules are written); the core is at 1.93 / 2 kB. If EIC or a
v1.1 identifier ever needs MOD 97-10, move it then.

### 8.2 Size budget amendment (like dic, CLAUDE.md "Amended 2026-10-07")

Proposal (recommendation 14):
- **iban own code ≤ 2 kB** min+gzip, measured from `src/iban/index.ts` with `../core` **and** `../bankAccount`
  external.
- **Standalone `czech-test-data/iban` ≤ 3 kB** on top of the core (iban + the bankAccount modules it imports).
- Reuse only through named imports from `src/bankAccount/` (`generate`, `validate`, single invalid-variant functions),
  never the `edge` / `invalid` records.

The own/standalone rows of `.size-limit.ts` from the dic amendment are **not on this branch** (`.size-limit.ts` here has
only the flat 2 kB row with `ignore: ['../core']`); the iban rows must be added the same way as for dic.

Estimate (UNVERIFIED, measure after implementation):

| Part | min+gzip |
| --- | --- |
| validator (two regexes, 6 steps), MOD 97-10, account → IBAN conversion | ~0.45–0.6 kB |
| generator with options, 4 edge and 8 invalid variants, identifier, index | ~0.6–0.9 kB |
| **iban own code** | **~1.1–1.5 kB of 2 kB** |
| + bankAccount `generate.ts`, `bankCodes.ts`, `validate.ts`, single invalid functions | ~+0.8–1.1 kB |
| **standalone** | **~1.9–2.6 kB of 3 kB** |

**Risk for the whole library (10 kB):** 5.84 kB was measured in the bankAccount review; dic (~1.2 kB own, if not yet
included) and iban (~1.1–1.5 kB) bring it to roughly 8.2–8.6 kB, leaving ~1.4–1.8 kB for EAN and EIC (UNVERIFIED).

---

## 9. Generator and variants contract (proposal)

### Options

`cz.iban(options?)` with `{ bankCode?: string; withPrefix?: boolean; account?: string }`, all optional.

- `bankCode`, `withPrefix`: exactly as bankAccount (same checks and `RangeError` messages, because they are passed to
  bankAccount's `generate`).
- `account` (proposal, recommendation 7): a national account `[prefix-]number/code`. It must be a string that
  bankAccount's validator accepts, and it must not be combined with `bankCode` or `withPrefix`; otherwise `RangeError`
  naming `account`. **Nothing is drawn**; the result is the conversion of that account. Enables
  `cz.iban({ account: cz.bankAccount() })` in user tests (spec lines 42, 101).
- Output: electronic form, upper case, 24 characters (`withSpaces` / `lowercase` are the other shapes).
- No date dependence. Stream id `iban`. Subpath `czech-test-data/iban`, exports `createIban`, `validateIban` and the
  types `IbanOptions`, `IbanReason`, `IbanEdgeVariant`, `IbanInvalidVariant`, `IbanGenerator`. CLI command `iban`
  (M5), e.g. `--bank-code 0800 --with-prefix`, `--account 19-2000145399/0800`.

### Conversion `toIban(account, country)` (no draws)

1. Split `account` at `-` and `/` into prefix (may be empty), number, code. Accepts any 4-digit code and any digits, so
   it also converts the invalid bankAccount values.
2. `bban = code + prefix.padStart(6, '0') + number.padStart(10, '0')`.
3. `kk = 98 − mod97(bban + country + '00')`, padded to 2 digits. Output `country + kk + bban`.

`wrongLength` uses the same steps without the padding in step 2.

### Frozen constants (part of the determinism contract)

- `COUNTRY = 'CZ'`, `FOREIGN_COUNTRY = 'SK'`, `LETTERS = 'AOl'`, check digit range `02`–`98`.
- All bankAccount constants (`WEIGHTS`, `GENERATOR_BANK_CODES`, `UNKNOWN_BANK_CODES`) through reuse.

### Draw order (determinism)

"bankAccount `X`" means the function of `src/bankAccount/` with exactly the draws of bankAccount section 9.

**Plain `generate(options)`:** if `account` is given → `toIban(account, 'CZ')`, no draws. Otherwise
`toIban(bankAccount generate(random, { bankCode, withPrefix }), 'CZ')`. So the plain IBAN of a stream state is the IBAN
of the account that bankAccount would draw from the same state.

**Edge variants:**
- `withSpaces`: `v = generate({})`, then a space after every 4th character.
- `lowercase`: `generate({}).toLowerCase()`.
- `withPrefix` (proposal): `generate({ withPrefix: true })`.
- `checkDigitsLeadingZero` (proposal): repeat `v = generate({})` until `v.charAt(2) === '0'` (probability 8/97 per try,
  ~12 tries on average; terminates with probability 1, like bankAccount `part`).

**Invalid variants:**
- `badChecksum`: `v = generate({})`, `correct = Number(v.slice(2, 4))`, `drawn = int(2, 97)`, new check digits
  `drawn ≥ correct ? drawn + 1 : drawn`, padded to 2 digits.
- `wrongCountry`: `toIban(bankAccount generate(random, {}), 'SK')`.
- `wrongLength`: `a = bankAccount generate(random, {})`, then the unpadded conversion.
- `letters` (proposal): `v = generate({})`, then `replaceDigitWithLetter(random, v, [2, 3, …, 23], LETTERS)`.
- `badChecksumPrefix`, `badChecksumNumber`, `zeroNumber`, `unknownBankCode` (proposals): `toIban(bankAccount
  <same-named invalid variant>(random), 'CZ')`.

### Reuse from `src/bankAccount/` (fine-grained, recommendation 10)

| Import | Used for |
| --- | --- |
| `generate` (`generate.ts`) | plain draws and option checks |
| `validate` (`validate.ts`, inner validator) | embedded account check (2.5 step 6) and the `account` option |
| single invalid functions `badChecksumPrefix`, `badChecksumNumber`, `zeroNumber`, `unknownBankCode` | the four account variants. Today they exist only as properties of the `invalid` record; the implementer exports them as named functions from `src/bankAccount/invalid.ts` and the record references them. **bankAccount seeds do not change.** Alternative: iban builds them itself from `part`, `drawCode` and its own digit replacement (duplicates `replaceDigitBefore`). |

`part`, `isValidPart`, `isKnownBankCode`, `drawCode` (listed in bankAccount section 9) are then used only indirectly.

### Reason codes

`'badFormat' | 'wrongCountry' | 'letters' | 'wrongLength' | 'badChecksum' | 'badChecksumPrefix' | 'badChecksumNumber' |
'zeroNumber' | 'unknownBankCode'`, in precedence order. Every bankAccount reason is in this union.

### Consistency tests (spec line 101), for the test-writer

- For every plain and edge value: the embedded `prefix6-number10/code` passes `validateBankAccount`.
- `iban({ account: a })` for `a` from `bankAccount()` and its edge variants: valid, and its digits 5–24 equal
  `code + prefix.padStart(6, '0') + number.padStart(10, '0')` of `a`.
- `iban({ account: '19-2000145399/0800' })` → `CZ6508000000192000145399`; `'178124-4159/0710'` →
  `CZ6907101781240000004159`; `'13717-77628031/0710'` → `CZ7907100137170077628031`.

---

## 10. Recommendations (questions for Marek)

1. **Reason precedence** `badFormat → wrongCountry → letters → wrongLength → badChecksum → badChecksumPrefix →
   badChecksumNumber → zeroNumber → unknownBankCode`. Recommendation: **yes**. Format comes first (unlike other
   identifiers) because letters are legal in positions 1–2; country before length so a German or Slovak IBAN says
   "not Czech". Consequence: `IBAN CZ65 …` and a missing country code give `wrongCountry`.
2. **Embedded account checked with the bankAccount rules and reasons.** Recommendation: **yes**, by calling
   bankAccount's inner `validate` on `prefix6-number10/code` and returning its reason unchanged (§ 4 písm. d) + § 5
   odst. 2; ČNB's calculator does it too). Alternatives: one IBAN-own reason `badAccount`; or a pure ISO check without
   mod 11 and bank code (then IBAN and bankAccount could disagree on the same account).
3. **Check digits `00`, `01`, `99` → `badChecksum`** even though the remainder is 1. Recommendation: **yes** (never
   issued per EBS204 § 6.2 and § 7.1; Apache Commons Validator does the same). Alternative: accept them (literal
   § 6.1). No separate variant either way.
4. **Accepted shapes**: electronic, or exactly the written form (groups of 4, one U+0020); no trimming, no other
   separators. Recommendation: **yes**, as strict as bankAccount and phone. Alternative: delete all spaces first
   (EBS204 § 6.1 "deleting all non-alphanumeric characters"), which would also accept `CZ65  0800…`.
5. **Case**: country ASCII case-insensitive (`CZ`, `cz`, `Cz`, `cZ` all valid); `lowercase` edge marked **disputed**
   in the README. Recommendation: **yes**. Alternatives: accept only `CZ` and `cz`; or strict upper case (contradicts
   spec line 54).
6. **MOD 97-10 digit by digit in `src/iban/`**, no BigInt, not in the core. Recommendation: **yes**.
7. **Generator options** `{ bankCode?, withPrefix?, account? }`; `account` converts a given valid account, draws
   nothing, cannot be combined with the other two (`RangeError` naming `account`). Recommendation: **yes**; it makes
   spec line 42 usable in user tests. Alternative: no `account` option in v1.
8. **Extra edge variants** `withPrefix` and `checkDigitsLeadingZero`. Recommendation: **yes** (both catch real
   converter bugs, a few bytes each). Alternative: only the spec's two.
9. **Extra invalid variants** `letters`, `badChecksumPrefix`, `badChecksumNumber`, `zeroNumber`, `unknownBankCode`.
   Recommendation: **yes**; the four account variants pass pure ISO validators, which is the most useful negative test
   for a Czech form. Alternative: only `letters` (reasons stay in the validator anyway).
10. **Named exports of single invalid-variant functions in `src/bankAccount/invalid.ts`** (dic precedent; no seed
    change). Recommendation: **yes**. Alternative: iban rebuilds them from `part` / `drawCode`.
11. **`wrongCountry` = the same account as a valid Slovak IBAN** (`SK`, check digits recomputed). Recommendation:
    **yes**, single fault and the most realistic mistake. Alternative: `SK` without recomputing (two faults).
12. **`wrongLength` = unpadded IBAN with correct check digits** (14–18 characters). Recommendation: **yes**.
    Alternative: one digit removed or added (also breaks the check digits).
13. **`badChecksum` = check digits replaced by another value from 02–98** (account untouched). Recommendation: **yes**.
    Alternative: a digit typo in the BBAN (would also break mod 11 or the bank code).
14. **Size budget amendment**: iban own code ≤ 2 kB (core and `../bankAccount` external), standalone `/iban` ≤ 3 kB on
    top of the core, recorded in CLAUDE.md like dic. Recommendation: **yes**. Please also note the whole-library risk
    in 8.2 before EAN/EIC.
15. **Plain output in the electronic upper-case form.** Recommendation: **yes** (EBS204 § 5.1 is the basic form).
