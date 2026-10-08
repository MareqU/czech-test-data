# bankAccount (číslo účtu, domestic Czech bank account number)

Status: **APPROVED** by Marek on 2026-10-08 (all 15 recommendations in section 10 accepted; they override every
"proposed", "proposal", "Recommendation", "Alternative" and "open question" marker below) · researched 2026-10-08
· rules-researcher

Czech meaning: *číslo účtu* (in the national format, *v národním formátu*) is the domestic number of a payment
account. Vyhláška ČNB č. 169/2011 Sb., § 2 odst. 1: *"Číslo účtu je jedinečným identifikátorem podle § 2 odst. 3
písm. h) zákona o platebním styku, který slouží v platebním styku k jednoznačné identifikaci účtu klienta"*. It has
two parts (§ 3): the *identifikátor účtu klienta* (prefix *předčíslí* + base number *základní část*) and the *kód
platebního styku* (4-digit code of the bank or payment institution, colloquially *kód banky*). The IBAN (next
identifier) contains the same data in a fixed 24-character form (§ 4).

Legend: **[P]** is a primary source (ČNB decree, ČNB číselník, ČNB rules, Finanční správa). **UNVERIFIED** means the
claim rests only on secondary sources or on my own estimate.

> **No main caveat this time.** Unlike IČO, the check algorithm is stated verbatim in a decree that is in force
> (169/2011 Sb., Příloha), and real public account numbers of Finanční správa confirm it (section 5). The open points
> are design decisions (separators, zero parts, the bank code snapshot), not doubts about the rule.

---

## 1. Format

Written (national) form: **`[prefix-]number/bankCode`**, e.g. `13717-77628031/0710` (a real account of Finanční úřad
pro hlavní město Prahu, section 5).

| Part | Decree term | Written digits | Rule (169/2011 Sb.) |
| --- | --- | --- | --- |
| prefix | první část identifikátoru účtu klienta (*předčíslí*) | 0–6, **optional** | § 5 odst. 1 písm. a): *"první část, která obsahuje nejvýše 6 číselných znaků s tím, že úvodní nuly jsou bez významu; první část identifikátoru účtu klienta nemusí být v čísle účtu obsažena"* |
| number | druhá část (*základní část*) | 2–10 | § 5 odst. 1 písm. b): *"druhou část, která obsahuje nejméně 2 a nejvýše 10 číselných znaků s tím, že alespoň dva z nich nesmějí být nulové a úvodní nuly jsou bez významu"* |
| bank code | kód platebního styku | exactly 4 | § 6: *"Kód platebního styku obsahuje 4 číselné znaky a musí být od identifikátoru účtu klienta v písemné podobě zřetelně oddělen."* |

- **Both parts must pass the check** (§ 5 odst. 2: *"První a druhá část identifikátoru účtu klienta musí být
  vytvořeny tak, aby vyhovovaly kontrole, jejíž algoritmus je uveden v příloze"*). They are checked **separately**.
- **Leading zeros are insignificant** in both parts (*"úvodní nuly jsou bez významu"*). So `0000000019` and `19` are
  the same number, `000035` and `35` the same prefix. Writing them is allowed (edge `withLeadingZeros`).
- **The whole identifier has at most 16 digits** (§ 5 odst. 1: *"nejvýše 16 číselných znaků"*), i.e. 6 + 10. The IBAN
  carries exactly these 16 digits in characters 9–24 (§ 4).
- **Separators.** The decree only says the parts must be *"v písemné podobě zřetelně odděleny"* (prefix from number,
  § 5 odst. 3; bank code from the rest, § 6). It does **not** name the characters. The universal convention is `-`
  between prefix and number and `/` before the bank code; Finanční správa writes exactly this in its official list
  (`13717-77628031/0710`, section 5) [P]. Proposal: accept **only** `-` and `/`, no spaces (recommendation 3).
- **Zero prefix.** The prefix is optional and its leading zeros are insignificant, so `0-…` and `000000-…` mean "no
  prefix" and are valid (recommendation 4). The weighted sum of zeros is 0, so they also pass the check.
- **Zero number.** The number needs at least two non-zero digits, so an all-zero number (`00`, `0000000000`) is
  invalid even though its weighted sum is 0 (section 2, reason `zeroNumber`, recommendation 6).

### Allowed characters

Only ASCII digits `0-9`, one optional `-` and exactly one `/`. Letters give `letters`. Anything else (spaces, U+00A0,
en dash `–`, backslash, full-width digits, a second `/`, an empty part) gives `badFormat`. No trimming, the same as
birthNumber, phone, postalCode and ico.

---

## 2. Check algorithm (proposed validator)

### The mod 11 rule (Příloha of 169/2011 Sb.) [P]

Verbatim: *"Příslušná část identifikátoru účtu klienta ABCDEFGHIJ je správně vytvořena, pokud je součet S beze
zbytku dělitelný 11"*, with

```
S = J×1 + I×2 + H×4 + G×8 + F×5 + E×10 + D×9 + C×7 + B×3 + A×6
```

and *"Váhy se k číslicím na jednotlivých pozicích příslušné části identifikátoru účtu klienta přiřazují zprava."*

| Position from the right | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weight | 6 | 3 | 7 | 9 | 10 | 5 | 8 | 4 | 2 | 1 |

- Weights left to right for a full 10-digit part: **`6, 3, 7, 9, 10, 5, 8, 4, 2, 1`**.
- A shorter part is **right-aligned**: a 6-digit prefix uses `10, 5, 8, 4, 2, 1`, a 2-digit part uses `2, 1`. This is
  the same as padding the part with zeros on the left to 10 digits.
- The rule is `S mod 11 = 0`. There is **no check digit with a wrap-around** as in IČO. Every digit position counts,
  and the rightmost weight is 1, so the last digit acts as a check digit for generation (section 9).

**Consequence (my derivation, easy to verify):** 11 is prime and every weight is 1–10, so a part with **exactly one
non-zero digit can never pass** (`S = d × w`, neither factor divisible by 11). Therefore the rule "at least two
non-zero digits" adds only one thing beyond the checksum: **the number must not be all zeros**. That is why
`zeroNumber` comes after `badChecksumNumber` in the precedence below.

### Validator steps

The validator does not depend on the date and ignores `referenceDate`. It uses the bundled bank code snapshot
(section 8). The first failing step gives the reason. Proposed precedence (recommendation 5): **`letters` →
`badFormat` → `wrongLength` → `badChecksumPrefix` → `badChecksumNumber` → `zeroNumber` → `unknownBankCode`**.

1. **Letters.** Any Unicode letter (`hasLetter` from `src/core/letters.ts`) → **`letters`**.
2. **Format.** The input must match `^(?:([0-9]+)-)?([0-9]+)\/([0-9]+)$`. Otherwise → **`badFormat`**. This covers
   spaces, other characters, a missing `/`, an empty part (`-19/0800`, `19-/0800`, `19/`), extra separators and the
   empty string.
3. **Lengths.** Prefix (if written) 1–6 characters, number 2–10 characters, bank code exactly 4 characters, counted
   **as written, zeros included**. Otherwise → **`wrongLength`** (recommendation 7).
4. **Prefix checksum.** If a prefix is written and `S(prefix) mod 11 ≠ 0` → **`badChecksumPrefix`**.
5. **Number checksum.** If `S(number) mod 11 ≠ 0` → **`badChecksumNumber`**.
6. **Zero number.** If the number has no non-zero digit → **`zeroNumber`**. (Exactly one non-zero digit was already
   rejected in step 5.)
7. **Bank code.** If the code is not in the snapshot (section 8) → **`unknownBankCode`**.
8. Otherwise `{ valid: true }`.

Why the bank code is checked last: its result depends on the snapshot date, the checksum results do not. With this
order, an input with a checksum fault gives the same reason in every library version, whatever ČNB does with codes.

### Worked example 1: `13717-77628031/0710` (Finanční úřad pro hlavní město Prahu, official)

1. No letters ✓. 2. Matches the pattern: prefix `13717`, number `77628031`, code `0710` ✓.
3. Lengths 5 (≤ 6), 8 (2–10), 4 ✓.
4. Prefix, right-aligned weights `5, 8, 4, 2, 1`: `1·5 + 3·8 + 7·4 + 1·2 + 7·1 = 5 + 24 + 28 + 2 + 7 = 66 = 6 · 11` ✓.
5. Number, weights `7, 9, 10, 5, 8, 4, 2, 1`:
   `7·7 + 7·9 + 6·10 + 2·5 + 8·8 + 0·4 + 3·2 + 1·1 = 49 + 63 + 60 + 10 + 64 + 0 + 6 + 1 = 253 = 23 · 11` ✓.
   Padded to `0077628031` with all ten weights, the sum is the same 253.
6. Non-zero digits present ✓. 7. `0710` (ČESKÁ NÁRODNÍ BANKA) is in the snapshot ✓.
8. Result `{ valid: true }`.

### Worked example 2: `123456-1234567890/0800` (constructed, two faults)

Prefix `123456` with weights `10, 5, 8, 4, 2, 1`: `10 + 10 + 24 + 16 + 10 + 6 = 76`, `76 mod 11 = 10 ≠ 0` → step 4
stops: **`badChecksumPrefix`**. (The number is also wrong: `S = 255`, `255 mod 11 = 2`. It is never reached.)
Fixing the prefix to `123457` (`S = 77 = 7 · 11`) gives `badChecksumNumber`; fixing the number to `1234567899`
(`S = 264 = 24 · 11`) then gives a valid `123457-1234567899/0800`.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| 1. 3. 2004 – 27. 6. 2011 | Vyhláška č. 62/2004 Sb., § 4 odst. 2: number of at most 16 digits, *předčíslí* of *"nejvíce 6 číselných znaků"*, base part of *"nejméně 2 a nejvíce 10 číselných znaků"* of which *"alespoň dva z nich nesmějí být nulové"*, 4-digit bank code, both parts checked separately by mod 11 (Příloha č. 1). No IBAN. | [P] zakonyprolidi.cz 2004-62, read through a summarising fetch; the 2004 weights were **not** compared digit by digit (UNVERIFIED that they are identical) |
| 28. 6. 2011 → | Vyhláška č. 169/2011 Sb. replaces 62/2004 (§ 7). Same structure; the code is now called *kód platebního styku*; IBAN format added (§ 4). In force on 2026-10-08, version 1, never amended. | [P] zakonyprolidi.cz 2011-169 |
| 1. 3. 2009 → | ČNB publishes the history of every change to the bank code list | [P] ČNB, *Historie změn Číselníku ČKPS* |
| 1. 6. 2019 | *Pravidla ČKPS*, verze 6 (current rules for assigning codes; legal basis § 38 odst. 4 zákona 6/1993 Sb. and § 6 odst. 2 vyhl. 169/2011 Sb.) | [P] ČNB |
| 1. 10. 2026 | Číselník ČKPS **version 255** (47 codes), current on 2026-10-08 | [P] ČNB |

Before 2004: not researched. The format and the check did not change in the period covered by primary sources, so
the validator has no date-dependent rules.

### 3.2 The bank code list changes about once a month

*Pravidla ČKPS* (verze 6) [P]:

- Čl. II odst. 1: *"Kód platebního styku sestává ze 4 číslic."* The digits carry no meaning; there are no ranges.
- Čl. II odst. 5: a provider may hold several codes, *"např. dočasný souběh kódů po fúzi jejich držitelů"*.
- Čl. II odst. 7: ČNB removes a code when the provider ceases, loses its licence, asks for it, or stopped the services.
- Čl. III odst. 3: a new version is issued when the content changes, *"zpravidla k prvnímu dni v měsíci"*, and
  published *"v dostatečném předstihu před jeho platností"*. So a downloaded list may describe a future state.

Recent changes from the official history (versions 226–255) [P]:

| Version, valid from | Change |
| --- | --- |
| 255, 1. 10. 2026 | new `8620` Comgate a.s. |
| 254, 1. 9. 2026 | cancelled `8190` Sparkasse Oberlausitz-Niederschlesien |
| 253, 1. 7. 2026 | cancelled `2260` NEY spořitelní družstvo |
| 250, 1. 2. 2026 | new `6600` Banking Circle S.A. |
| 247 / 246, 2025 | new `8660` PAYMONT, UAB; new `8610` Devizová burza a.s. |
| 245, 9. 4. 2025 | cancelled `4000` (Max banka, merged into Banka CREDITAS; kept until 8. 4. 2025 for incoming payments) |
| 243, 242, 240, 239, 237 | cancelled `2275`, `8280`, `3050`, `8299`, `8270` |
| 235, 1. 10. 2023 | new `6363` Partners Banka, a.s. |
| 233, 1. 7. 2023 | cancelled `6100` (Equa bank, merged into Raiffeisenbank; kept until 30. 6. 2023) and `8200` |
| 232, 231 | cancelled `8199`, `8230`, `8240` |
| 226, 10. 10. 2022 | cancelled `2020` MUFG Bank (Europe) N.V. Prague Branch |

So an account number that was valid in 2022 (`…/6100`, Equa bank) is `unknownBankCode` today. This "stale bank list"
bug is a good reason to have the `unknownBankCode` variant draw from recently cancelled codes (section 4).

### 3.3 Codes outside CERTIS are still valid codes

The list has a column *Systém CERTIS* (`A` = direct participant, `-` = not a participant). The explanatory notes of
the číselník say the code *"se používá při tvorbě čísla účtu v národním formátu a ve formátu IBAN"* regardless of
that column [P]. So `6600`, `8198`, `8220`, `8620` (all `-`) are valid bank codes. `6800` *Sberbank CZ, a.s. v
likvidaci* is still in version 255 and therefore valid.

### 3.4 The 16-digit form

Bank exports and IBAN conversions often write both parts zero-padded: `000035-0077628031/0710`. This is valid
(leading zeros are insignificant, lengths 6 and 10). The prefix-less version `000000-0077628031/0710` is valid too
(zero prefix). Both are good edge data (`withLeadingZeros`, proposed `zeroPrefix`).

---

## 4. Edge and invalid variants

Spec (line 53): edge `withPrefix`, `maxLength`, `minLength`, `withLeadingZeros`; invalid `badChecksumPrefix`,
`badChecksumNumber`, `unknownBankCode`. Definitions below; exact draws are in section 9. Every value has exactly one
property or fault. "Generator code" means a code from the frozen list `GENERATOR_BANK_CODES` (section 9).

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Shape |
| --- | --- | --- |
| `withPrefix` | a non-zero prefix of 2–6 significant digits | `prefix-number/code`, as `generate({ withPrefix: true })` |
| `maxLength` | prefix of 6 and number of 10 significant digits (first digit non-zero); the longest form, 22 characters | `123457-1234567899/0100` |
| `minLength` | no prefix, number of exactly 2 digits; the shortest form, 7 characters. Only `19, 27, 35, 43, 51, 78, 86, 94` pass (`2a + b ≡ 0 mod 11`, both non-zero) | `19/0800` |
| `withLeadingZeros` | no prefix, number of 2–9 significant digits written zero-padded to 10 | `0000123457/5500` |
| `zeroPrefix` (**proposal**, recommendation 8) | explicit all-zero prefix `000000-` + a plain number; what a naive IBAN → domestic conversion produces | `000000-1234567899/0800` |

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | One fault only |
| --- | --- | --- |
| `badChecksumPrefix` | prefix fails mod 11, number valid, code known | a plain `withPrefix` value whose prefix's **last** digit is replaced by a uniformly drawn different digit. A change of ±1…9 at weight 1 can never keep `S ≡ 0`. |
| `badChecksumNumber` | number fails mod 11, no prefix, code known | a plain value whose number's last digit is replaced by a different digit (same rule) |
| `unknownBankCode` | valid prefix-less account with a code not in the snapshot | a plain value whose code is replaced by one from the frozen list `UNKNOWN_BANK_CODES = ['0000', '2020', '4000', '6100', '9999']`: two boundary codes plus three codes cancelled in 2022–2025 (section 3.2). Recommendation 9. |
| `wrongLength` (**proposal**) | digits and separators fine, a part has the wrong written length | 50/50: a 1-digit number (`int(1, 9)/code`) or an 11-digit number (a valid 10-digit number + one random digit). Recommendation 10. |
| `letters` (**proposal**) | one digit replaced by a letter | a plain value with one digit (any digit position of the number or the code) replaced by `replaceDigitWithLetter`, letters `AOl`, as in ico |
| `zeroNumber` (**proposal**) | number of ten zeros; passes a naive mod 11 check | `0000000000/code`, no prefix |

Reason code without a variant: **`badFormat`** (as in ico). If Marek rejects the proposed variants `wrongLength`,
`letters` and `zeroNumber`, the reason codes stay (the validator still needs them).

---

## 5. Known samples

### Valid (real, official)

Accounts of the Czech tax administration are public (Finanční správa, *Příloha č. 2: Předčíslí bankovních účtů
finančních úřadů*, 2024). No account of a natural person is used anywhere in this file.

| Input | What | Covers |
| --- | --- | --- |
| `13717-77628031/0710` | Finanční úřad pro hlavní město Prahu, správní poplatky GFŘ (stated in full in footnote 4) [P] | worked example 1, 5-digit prefix |
| `13717-77628621/0710` | Finanční úřad pro Jihomoravský kraj, správní poplatky OFŘ (footnote 4) [P]. Number `S = 275 = 25 · 11` | 5-digit prefix |

Every one of the **39 prefixes** in that official table passes the check (I verified all of them, e.g. `35` → 11,
`748` → 44, `705` → 33, `7704` → 88, `14701` → 66, `80039` → 55, `10030` → 11). The accounts below are **composed**
from an official prefix and the official Praha number `77628031`; they follow the scheme of the table (prefix = tax
type, number = office) but were not looked up one by one:

| Input | Prefix meaning (FS table) | Covers |
| --- | --- | --- |
| `35-77628031/0710` | zvláštní prostředky – exekuce | 2-digit prefix (shortest real prefix) |
| `748-77628031/0710` | daň silniční | 3-digit prefix |
| `7704-77628031/0710` | daň z příjmů právnických osob | 4-digit prefix |
| `000035-0077628031/0710` | same account as `35-…`, 16-digit padded form | leading zeros on both parts |

### Valid (constructed)

| Input | Sums | Why |
| --- | --- | --- |
| `1234567899/0800` | number 264 | plain, 10 digits |
| `123457/0800` | number 77 | 6-digit number |
| `123457-1234567899/0100` | prefix 77, number 264 | `maxLength`, 22 characters |
| `19/0800`, `94/0300`, `78/2010`, `51/0710` | 11, 22, 22, 11 | `minLength` |
| `0000000019/0800` | 11 | `withLeadingZeros` (2 significant digits) |
| `0000123457/5500` | 77 | `withLeadingZeros` |
| `0-1234567899/0800` | prefix 0 | zero prefix, 1 character (recommendation 4) |
| `000000-1234567899/0800` | prefix 0 | zero prefix, 6 characters (`zeroPrefix`) |
| `1234567899/8620` | 264 | code added in version 255, CERTIS `-` |
| `1234567899/6800` | 264 | *Sberbank CZ v likvidaci*, still listed |
| `1234567899/6600` | 264 | CERTIS `-` |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'1234567890/0800'` | `badChecksumNumber` | `S = 255 ≡ 2` |
| `'13717-77628032/0710'` | `badChecksumNumber` | real account, last digit +1 (`S = 254`) |
| `'1000000000/0800'` | `badChecksumNumber` | one non-zero digit can never pass (`S = 6`) |
| `'10/0800'` | `badChecksumNumber` | `S = 2`; also only one non-zero digit |
| `'1234567890/6100'` | `badChecksumNumber` | checksum is checked before the bank code |
| `'123456-1234567899/0800'` | `badChecksumPrefix` | prefix `S = 76 ≡ 10` |
| `'13718-77628031/0710'` | `badChecksumPrefix` | real account, prefix +1 (`S = 67`) |
| `'1-1234567899/0800'` | `badChecksumPrefix` | one non-zero digit (`S = 1`) |
| `'123456-1234567890/0800'` | `badChecksumPrefix` | both parts wrong, prefix first (worked example 2) |
| `'0000000000/0800'` | `zeroNumber` | passes the weighted sum, no non-zero digit |
| `'00/0800'` | `zeroNumber` | 2 characters, both zero |
| `'1234567899/6100'` | `unknownBankCode` | Equa bank, cancelled 1. 7. 2023 |
| `'1234567899/4000'` | `unknownBankCode` | Max banka, cancelled 9. 4. 2025 |
| `'1234567899/8190'` | `unknownBankCode` | cancelled 1. 9. 2026 (version 254) |
| `'1234567899/0000'` | `unknownBankCode` | never assigned |
| `'1234567899/9999'` | `unknownBankCode` | never assigned |
| `'0/0800'` | `wrongLength` | number of 1 character (length before zero check) |
| `'5/0800'` | `wrongLength` | number of 1 digit |
| `'12345678990/0800'` | `wrongLength` | number of 11 digits |
| `'01234567899/0800'` | `wrongLength` | 11 characters even though the zero is insignificant (recommendation 7) |
| `'1234567-1234567899/0800'` | `wrongLength` | prefix of 7 digits |
| `'0000019-1234567899/0800'` | `wrongLength` | prefix of 7 characters |
| `'1234567899/800'` | `wrongLength` | 3-digit code |
| `'1234567899/08000'` | `wrongLength` | 5-digit code |
| `'0800/1234567899'` | `wrongLength` | code and number swapped: code of 10 digits |
| `'1234567899/O800'` | `letters` | letter O in the code |
| `'l9-1234567899/0800'` | `letters` | lowercase L in the prefix |
| `'CZ00 0800 0000 0012 3456 7899'` | `letters` | IBAN-like input (not a valid IBAN; letters win) |
| `'1234567899 / 08O0'` | `letters` | letters win over format |
| `''` | `badFormat` | no `/` (unlike ico, the empty string fails the structure, not the length) |
| `'1234567899'` | `badFormat` | no bank code |
| `'1234567899/'` | `badFormat` | empty bank code |
| `'/0800'` | `badFormat` | empty number |
| `'-1234567899/0800'` | `badFormat` | empty prefix |
| `'19-/0800'` | `badFormat` | empty number |
| `'19--1234567899/0800'` | `badFormat` | double hyphen |
| `'19-123-1234567899/0800'` | `badFormat` | two hyphens |
| `'1234567899/0800/0800'` | `badFormat` | two slashes |
| `'1234567899 / 0800'` | `badFormat` | spaces around `/` |
| `' 1234567899/0800'` | `badFormat` | leading space, not trimmed |
| `'1234567899/0800 '` | `badFormat` | trailing space |
| `'19 1234567899/0800'` | `badFormat` | space instead of `-` |
| `'19–1234567899/0800'` | `badFormat` | en dash U+2013 |
| `'1234567899\\0800'` | `badFormat` | backslash |
| `1234567899`, U+00A0, `/0800` | `badFormat` | no-break space before `/` |
| full-width `１２３４５６７８９９/０８００` | `badFormat` | U+FF10–U+FF19 are not `[0-9]` and not letters |

---

## 6. Sources

Primary [P]:

1. **Vyhláška č. 169/2011 Sb.**, o stanovení pravidel tvorby čísla účtu v platebním styku, § 2–6 and Příloha (all
   quotes above), version 1, in force from 28. 6. 2011, no amendments: <https://www.zakonyprolidi.cz/cs/2011-169>;
   official Sbírka <https://e-sbirka.gov.cz/sb/2011/169> (JS app, not rendered).
2. Vyhláška č. 62/2004 Sb. (previous rules, 1. 3. 2004 – 27. 6. 2011): <https://www.zakonyprolidi.cz/cs/2004-62>
3. ČNB, *Číselníky, seznamy, registry* (page with the bank code list; text *"Číselník 255 platný od 1. 10. 2026"*):
   <https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/>
4. ČNB, *Číselník kódů platebního styku v České republice (ČKPS)*, verze 255, platnost od 1. 10. 2026, downloaded
   2026-10-08:
   - CSV (UTF-8): <https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv>
   - PDF (has version, date and explanatory notes; used to verify the 47 codes):
     <https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.pdf>
5. ČNB, *Historie změn Číselníku ČKPS* (since 1. 3. 2009):
   <https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR_zmeny.pdf>
6. ČNB, *Pravidla pro vydávání a správu Číselníku kódů platebního styku v České republice (Pravidla ČKPS)*, verze 6,
   1. 6. 2019: <https://www.cnb.cz/export/sites/cnb/cs/platebni-styk/.galleries/ucty_kody_bank/download/Pravidla_CKPS.pdf>
   (landing page <https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/pravidla-pro-vydavani-a-spravu-ciselniku-kodu-platebniho-styku-v-ceske-republice/>)
7. Finanční správa, *Příloha č. 2 – Předčíslí bankovních účtů finančních úřadů (FÚ) kromě Specializovaného
   finančního úřadu* (2024), incl. footnote 4 with the full accounts `13717-77628031/0710` and `13717-77628621/0710`:
   <https://financnisprava.gov.cz/assets/cs/prilohy/d-placeni-dani/Priloha_2_PBU_FU_2024.pdf>

Secondary: none needed. **UNVERIFIED**: only the size estimates in section 8.3 and the claim in 3.1 that the 2004
weights equal the 2011 weights.

---

## 7. Differences from docs/spec.md

1. **Line 35, "Předčíslí max. 6 číslic, základní část 2–10 číslic".** Confirmed, but the spec omits three rules of
   § 5: the prefix is **optional**, **leading zeros are insignificant** in both parts, and the number must have **at
   least two non-zero digits**. With mod 11 the last rule only excludes the all-zero number (section 2), which the
   spec cannot express; proposed reason `zeroNumber`.
2. **Line 35, separators.** The spec (and the brief) write `prefix-number/bankCode`. The decree requires only that
   the parts are *"zřetelně odděleny"* and names no characters. `-` and `/` are the convention, used by Finanční
   správa. The strict choice is recommendation 3.
3. **Line 35, "kód banky z číselníku ČNB".** Confirmed. The official name since 2011 is *kód platebního styku* and
   the list is *Číselník kódů platebního styku v České republice (ČKPS)*; it includes non-banks (payment
   institutions, e.g. `8620` Comgate). The API name `bankCode` stays (CLAUDE.md naming).
4. **Line 35, "Ověřit v: Vyhláška ČNB".** Identified as vyhláška č. 169/2011 Sb. (in force, never amended).
5. **Line 110, "snapshot … s datem stažení".** The download date alone is not enough: the CSV has **no version and
   no date**, and ČNB publishes versions in advance. Proposal: record version + validity date + download date
   (section 8).
6. **Line 117, "Číselník kódů bank je malý a může být v jádře".** Proposal: **not in the core**, but in
   `src/bankAccount/`. The core is at 1.91 / 2 kB; the list costs ~120 B (section 8.3). IBAN imports it from there.
7. **Line 53, variants.** Names confirmed; definitions proposed in section 4. Extra proposals: edge `zeroPrefix`,
   invalid `wrongLength`, `letters`, `zeroNumber`, reason `badFormat`.

---

## 8. Bank code snapshot (proposal)

### 8.1 Official list, version 255 (valid from 1. 10. 2026, downloaded 2026-10-08)

47 codes, verified against the PDF (two pages, 35 + 12 rows) and the CSV. `-` = not a CERTIS participant.

| Code | Provider | | Code | Provider |
| --- | --- | --- | --- | --- |
| 0100 | Komerční banka, a.s. | | 6363 | Partners Banka, a.s. |
| 0300 | Československá obchodní banka, a. s. | | 6600 | Banking Circle S.A., Czech Republic (`-`) |
| 0600 | MONETA Money Bank, a.s. | | 6700 | Všeobecná úverová banka a.s., pobočka Praha |
| 0710 | ČESKÁ NÁRODNÍ BANKA | | 6800 | Sberbank CZ, a.s. v likvidaci |
| 0800 | Česká spořitelna, a.s. | | 7910 | Deutsche Bank Aktiengesellschaft Filiale Prag, organizační složka |
| 2010 | Fio banka, a.s. | | 7950 | Raiffeisen stavební spořitelna a.s. |
| 2060 | Citfin, spořitelní družstvo | | 7960 | ČSOB Stavební spořitelna, a.s. |
| 2070 | TRINITY BANK a.s. | | 7970 | MONETA Stavební Spořitelna, a.s. |
| 2100 | ČSOB Hypoteční banka, a.s. | | 7990 | Modrá pyramida stavební spořitelna, a.s. |
| 2200 | Peněžní dům, spořitelní družstvo | | 8030 | Volksbank Raiffeisenbank Nordoberpfalz eG pobočka Cheb |
| 2220 | Artesa, spořitelní družstvo | | 8040 | Oberbank AG pobočka Česká republika |
| 2250 | Banka CREDITAS a.s. | | 8060 | Stavební spořitelna České spořitelny, a.s. |
| 2600 | Citibank Europe plc, organizační složka | | 8090 | Česká exportní banka, a.s. |
| 2700 | UniCredit Bank Czech Republic and Slovakia, a.s. | | 8150 | HSBC Continental Europe, Czech Republic |
| 3030 | Air Bank a.s. | | 8198 | FAS finance company s.r.o. (`-`) |
| 3060 | PKO BP S.A., Czech Branch | | 8220 | Payment execution s.r.o. (`-`) |
| 3500 | ING Bank N.V. | | 8250 | Bank of China (CEE) Ltd. Prague Branch |
| 4300 | Národní rozvojová banka, a.s. | | 8255 | Bank of Communications Co., Ltd., Prague Branch odštěpný závod |
| 5500 | Raiffeisenbank a.s. | | 8265 | Industrial and Commercial Bank of China Limited, Prague Branch, odštěpný závod |
| 5800 | J&T BANKA, a.s. | | 8500 | Multitude Bank p.l.c. |
| 6000 | PPF banka a.s. | | 8610 | Devizová burza a.s. |
| 6200 | COMMERZBANK Aktiengesellschaft, pobočka Praha | | 8620 | Comgate a.s. (`-`) |
| 6210 | mBank S.A., organizační složka | | 8660 | PAYMONT, UAB |
| 6300 | BNP Paribas S.A., pobočka Česká republika | | | |

CSV format [P]: UTF-8, `;`-separated, header exactly
`Kód platebního styku;Poskytovatel platebních služeb;BIC kód (SWIFT);Systém CERTIS`, one row per code, empty BIC
allowed, CERTIS `A` or `-`. Line endings and BOM were not visible through the fetch tool; the script must handle CRLF
and a BOM.

### 8.2 Snapshot shape and location

- **Codes only, no names, no BIC.** No API needs the names; IBAN does not need the BIC. Names would cost about
  +0.8–0.9 kB min+gzip (≈ 1.6 kB of UTF-8 text) and push the identifier near or over its 2 kB budget.
- **File:** `src/bankAccount/bankCodes.ts`, generated, committed, never edited by hand. Proposed content:

  ```ts
  // Generated by scripts/update-bank-codes.ts – do not edit.
  // Source: ČNB, Číselník kódů platebního styku v České republice (ČKPS), verze 255, platný od 2026-10-01,
  // https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv, staženo 2026-10-08.
  // Legal basis: vyhláška č. 169/2011 Sb., § 6 odst. 2 (docs/rules/bankAccount.md section 8).
  /** Kódy platebního styku (bank codes) of ČKPS version 255, ascending, separated by single spaces. */
  export const BANK_CODES = '0100 0300 0600 … 8660';
  ```

  One space-separated string is the smallest form (47 × 5 − 1 = 234 characters). The lookup must match whole
  tokens (e.g. `split(' ')` once, or an equivalent token-safe check); the implementer decides.
- **Not in the core** (difference 6). `src/bankAccount/` is measured "on top of the core", so the list counts in the
  identifier's own 2 kB.
- **Metadata** (version, valid-from, download date) live in the header comment and in the CHANGELOG, not in a public
  export (recommendation 12).

### 8.3 Size estimate (UNVERIFIED, measure after implementation)

| Part | Estimate, min+gzip |
| --- | --- |
| `BANK_CODES` string (234 digits and spaces) | ~110–140 B |
| bankAccount code (generator with options, parts, 5 edge and 6 invalid variants, validator) | ~1.0–1.4 kB (ico's own code is 782 B and is simpler) |
| **Total own code** | **~1.2–1.6 kB of 2 kB** |
| with provider names | +0.8–0.9 kB → likely over budget |

### 8.4 Update script contract

- **Path:** `scripts/update-bank-codes.ts`, outside `src/`, not published (`files` is `["dist"]`). Already covered by
  `tsconfig.json` `include` and by `eslint .` (`no-console` applies: write with `process.stdout.write`). The `src/`
  bans (`fetch`, `node:*`) do not apply to `scripts/`. Check that knip accepts it (its `project` is `src/**` only).
- **Run:** `npm run update:bank-codes` → `node scripts/update-bank-codes.ts` (Node 24 runs erasable TypeScript
  directly). Only global `fetch` and `node:fs`; no new dependencies. **Never** run in CI, `build` or `test`.
- **Steps:**
  1. GET the CSV URL (source 4). Strip a BOM, accept LF or CRLF.
  2. Check the header line exactly (8.1). Every row must have 4 fields, field 1 must match `^[0-9]{4}$`, codes must
     be unique, and there must be at least 30 rows (sanity). Any failure → error message, exit code ≠ 0, **no file
     written**.
  3. GET the landing page (source 3) and read the version and validity date from the text `Číselník <N> platný od
     <d>. <m>. <yyyy>`. If it is not found, fail, unless `--version <N> --valid-from <YYYY-MM-DD>` are given.
  4. Write `src/bankAccount/bankCodes.ts` in the exact shape of 8.2: codes sorted ascending, download date = current
     UTC date. The output is byte-stable for the same input, so a re-run without a ČNB change gives no diff (except
     the download date line).
  5. Print the added and removed codes compared with the previous file, for the CHANGELOG.
- **After an update**, `GENERATOR_BANK_CODES ⊆ BANK_CODES` and `UNKNOWN_BANK_CODES ∩ BANK_CODES = ∅` must still hold
  (tests, section 9), and the test oracle's copy of the list (from 8.1 of this file) is updated in the same PR.
- **Initial snapshot:** the implementer writes the script and the generated file from 8.1; Marek runs the script once
  locally and confirms that only the download date differs (recommendation 13).

---

## 9. Generator and variants contract (proposal)

### Options

`cz.bankAccount(options?)` with `{ bankCode?: string; withPrefix?: boolean }`, both optional (spec line 75:
`cz.bankAccount({ bankCode: '0800', withPrefix: true })`).

- `bankCode` omitted → drawn from `GENERATOR_BANK_CODES`. Given → must be a code in `BANK_CODES`, otherwise
  `RangeError` naming `bankCode` (also for cancelled codes such as `6100`). Nothing is drawn for a given code. Type
  `string`, not a literal union, so a snapshot update never breaks types (recommendation 11).
- `withPrefix` omitted → `false`. Not a boolean at runtime → `RangeError` naming `withPrefix`.
- No date dependence: `referenceDate` is ignored; the shared determinism check from `tests/support/` applies.
- Stream id `bankAccount`. Subpath `czech-test-data/bankAccount`, exports `createBankAccount`, `validateBankAccount`.
  CLI command `bank-account` (M5), e.g. `--bank-code 0800 --with-prefix`.

### Frozen constants (part of the determinism contract)

- `WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1]`
- `GENERATOR_BANK_CODES = ['0100', '0300', '0600', '0800', '2010', '2700', '3030', '5500', '6210']`, in this order
  (KB, ČSOB, MONETA, ČS, Fio, UniCredit, Air Bank, Raiffeisenbank, mBank): large retail banks that are unlikely to
  be cancelled. A snapshot update therefore **never changes generator output**. Only if ČNB cancels one of these
  codes must the list change, which is a major version (recommendation 2).
- `UNKNOWN_BANK_CODES = ['0000', '2020', '4000', '6100', '9999']`
- `LETTERS = 'AOl'`

### Draw order (determinism)

**`part(n)`**, a valid part with `n` significant digits, `2 ≤ n ≤ 10`:
1. `first = int(1, 9)`, then `middle = digits(n − 2)`.
2. `r = weightedSum(first + middle + '0', WEIGHTS) mod 11` (right-aligned), `d = (11 − r) mod 11`.
3. If `d = 10`, go back to step 1 (`n` is kept). Otherwise return `first + middle + d`.

The result never starts with `0` and always has at least two non-zero digits (section 2). The rejection happens with
probability 1/11.

**Plain `generate(options)`**, in written order:
1. If `withPrefix`: `P = int(2, 6)`, `prefix = part(P)`.
2. `L = int(6, 10)`, `number = part(L)`.
3. `code = bankCode` option, or `pick(GENERATOR_BANK_CODES)`.
4. Output `prefix-number/code` or `number/code`, no leading zeros, no spaces.

**Edge variants:**
- `withPrefix`: exactly `generate({ withPrefix: true })`.
- `maxLength`: `prefix = part(6)`, `number = part(10)`, `code = pick(GENERATOR_BANK_CODES)`.
- `minLength`: `number = part(2)`, `code = pick(…)`.
- `withLeadingZeros`: `L = int(2, 9)`, `number = part(L)` padded with `0` on the left to 10 characters, `code = pick(…)`.
- `zeroPrefix` (proposal): `L = int(6, 10)`, `number = part(L)`, `code = pick(…)`; output `000000-number/code`.

**Invalid variants:**
- `badChecksumPrefix`: `v = generate({ withPrefix: true })` (draws `P`, prefix, `L`, number, code), then
  `drawn = int(0, 8)`, new last prefix digit = `drawn ≥ correct ? drawn + 1 : drawn` (as ico `badChecksum`).
- `badChecksumNumber`: `v = generate({})`, then the same replacement on the number's last digit.
- `unknownBankCode`: `v = generate({})`, then `code = pick(UNKNOWN_BANK_CODES)` replaces the code.
- `wrongLength` (proposal): branch `int(0, 1)` first. **0**: `int(1, 9)` as a 1-digit number. **1**: `part(10)` +
  `digits(1)`. Then `code = pick(GENERATOR_BANK_CODES)`. No prefix.
- `letters` (proposal): `v = generate({})`, then `replaceDigitWithLetter(random, v, positions, LETTERS)`, where
  `positions` are the indexes of all digits of `v` (everything except the `/`).
- `zeroNumber` (proposal): `code = pick(GENERATOR_BANK_CODES)`; output `0000000000/code`.

### Reason codes

`'letters' | 'badFormat' | 'wrongLength' | 'badChecksumPrefix' | 'badChecksumNumber' | 'zeroNumber' |
'unknownBankCode'`, in precedence order (section 2).

### Shared helper `weightedSum` (deferred ico review N1/N2)

Today (`src/core/checksum.ts`) it iterates over `weights` and reads `digits.charAt(i)`; a shorter `digits` silently
reads as zeros **on the right**, which is wrong for right-aligned bank account weights.

**Recommended contract (recommendation 1): right-align inside `weightedSum`.**
`weightedSum(digits, weights)` = Σ `digit · weight`, with `digits` aligned to the **right end** of `weights`; a
shorter `digits` counts as left-padded with zeros (e.g. `digits.padStart(weights.length, '0')` before the existing
reduce). Preconditions, stated in TSDoc and not checked at runtime (callers validate first, and the core has ~90 B
left): `digits` has only ASCII `0-9` and `digits.length ≤ weights.length`; a longer `digits` gives an unspecified
result.

- IČO output and results do not change (its base is always exactly 7 digits for 7 weights).
- bankAccount can call `weightedSum(part, WEIGHTS)` for any part length and the IBAN code can pass its 6- and 10-digit
  padded parts directly; no caller can forget the padding.
- Cost: one `padStart` call, estimated +10–20 B in the core (UNVERIFIED, measure).
- Alternative: "caller pads" (TSDoc says equal lengths; bankAccount pads to 10). Zero core bytes, but keeps the
  footgun from N1.
- Core-level tests (`tests/core.checksum.test.ts`, test-writer): equal lengths (IČO weights), shorter digits equal
  their left-padded form (bank weights), empty `digits` → 0, the bank example `77628031` → 253.

The divisibility rule (`S mod 11 = 0`) stays in `src/bankAccount/`; IČO keeps its `(11 − a) mod 10`.

`docs/rules/core.md` section 5 now lists `src/core/checksum.ts` / `weightedSum` with this contract (approved 2026-10-08).

### What IBAN (next identifier) will reuse

Per CLAUDE.md, only fine-grained imports, never the `edge` / `invalid` records:

- `BANK_CODES` from `src/bankAccount/bankCodes.ts` (IBAN validator: the bank code in characters 5–8 should be known)
  and `GENERATOR_BANK_CODES`.
- A part check, e.g. `isValidPart(part): boolean` (`weightedSum(part, WEIGHTS) % 11 === 0`), for the 6-digit prefix
  and 10-digit number inside the IBAN (§ 4: characters 9–24 are the 16 digits of the identifier).
- `part(n)` or `generate` from `src/bankAccount/generate.ts`, so `cz.iban()` is built from a valid account and "IBAN
  odpovídá číslu účtu" (spec line 42) holds by construction.
- mod 97 (ISO 13616) is needed only by IBAN in v1; with ~70–90 B left in the core it probably belongs in `src/iban/`
  (core rules section 5 sends shared algorithms to the core only when a second identifier needs them).
- Size: IBAN will need the same budget amendment as `dic` (own code with `src/bankAccount/` external, plus a
  standalone budget).

---

## 10. Decisions (approved 2026-10-08: every recommendation below was accepted, alternatives rejected)

1. **`weightedSum` padding contract.** Recommendation: **right-align inside `weightedSum`** (pad on the left), with
   `digits.length ≤ weights.length` as a documented precondition. It removes the N1 footgun, IČO is unaffected, and
   IBAN can reuse it. Alternative: "caller pads".
2. **Plain generator bank codes from a frozen list** (`GENERATOR_BANK_CODES`, 9 large banks), not from the whole
   snapshot. Recommendation: **yes**, so snapshot updates never change seeded output. Alternative: all 47 codes,
   which makes every ČNB change a major version.
3. **Strict separators.** Recommendation: accept only `-` and `/`, no spaces, no other dashes (`badFormat`), the same
   strictness as ico and phone. The decree names no characters, so this is a convention, documented as such.
4. **Zero prefix** (`0-…`, `000000-…`). Recommendation: **valid**. The prefix is optional and its leading zeros are
   insignificant (§ 5 písm. a)), and the IBAN carries `000000` for "no prefix".
5. **Reason precedence** `letters → badFormat → wrongLength → badChecksumPrefix → badChecksumNumber → zeroNumber →
   unknownBankCode`. Recommendation: **yes**; the bank code last keeps checksum results independent of the snapshot.
   Alternative: bank code right after `wrongLength`.
6. **All-zero number** (`0000000000/0800`): new reason **`zeroNumber`** plus an invalid variant of the same name.
   Recommendation: **yes**; it passes naive mod 11 validators, a typical tester case. Alternative: report it as
   `wrongLength` (the decree puts the non-zero rule in the length sentence).
7. **Length counts written characters, zeros included** (`01234567899/0800` → `wrongLength`). Recommendation:
   **yes**, strict, like ico. Alternative: strip insignificant zeros before counting.
8. **Extra edge variant `zeroPrefix`** (`000000-number/code`). Recommendation: **yes**. Alternatively fold it into
   `withLeadingZeros`, which then would have two shapes.
9. **`unknownBankCode` source list** `['0000', '2020', '4000', '6100', '9999']` (boundaries + codes cancelled
   2022–2025). Recommendation: **yes**; it tests the "stale bank list" bug. Risk: ČNB re-assigns a cancelled code
   (nothing in Pravidla ČKPS forbids it); a test catches that on the next snapshot update.
10. **Extra invalid variants `wrongLength` and `letters`** (not in spec line 53), shapes as in section 9.
    Recommendation: **yes**, for consistency with ico, birthNumber and phone.
11. **`bankCode` option** typed as `string` with a runtime check against the snapshot (not a literal union).
    Recommendation: **yes**.
12. **Snapshot metadata** (version 255, valid from 2026-10-01, downloaded 2026-10-08) only in the file header and
    CHANGELOG, no public export in v1. Recommendation: **yes**; it saves bytes and API surface. Alternative: export
    `bankCodesSnapshot = { version, validFrom, downloaded }`.
13. **Who creates the first snapshot.** Recommendation: the implementer writes `scripts/update-bank-codes.ts` and the
    generated file from section 8.1; Marek runs the script once and confirms that only the download date differs.
14. **Release policy for snapshot updates.** Recommendation: a **minor** version with a CHANGELOG entry listing
    added and removed codes (validator results change, generator output does not). How often to refresh (ČNB changes
    the list about monthly) is Marek's call; suggestion: before every release.
15. **Plain number length `int(6, 10)` and prefix length `int(2, 6)`.** Recommendation: **yes**; 2–5 digit numbers are
    left to `minLength` / `withLeadingZeros`. Alternative: always 10 digits.

### Open items outside this identifier

- `docs/rules/core.md` section 5 also does not list `src/core/letters.ts` (`hasLetter`, `replaceDigitWithLetter`).
  Added by the main session on 2026-10-08 (Marek approved).
