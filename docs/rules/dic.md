# dic (DIČ, daňové identifikační číslo)

Status: **APPROVED** by Marek on 2026-10-07 (all recommendations in section 9 accepted, question 1 in the amended
form recorded there; they override every "proposed", "proposal", "optional" and "open question" marker below)
· researched 2026-10-07 · rules-researcher

Czech meaning: *daňové identifikační číslo* (DIČ) is the tax identification number that the tax administrator
(*správce daně*, a *finanční úřad*) assigns to a registered tax subject. Zákon č. 280/2009 Sb., daňový řád,
§ 130 odst. 1: *"Daňové identifikační číslo obsahuje kód „CZ" a kmenovou část, kterou tvoří obecný identifikátor,
nebo vlastní identifikátor správce daně."* For VAT payers the DIČ is also the EU VAT number (VIES).

This document builds on the approved rules in `docs/rules/core.md`, `docs/rules/ico.md` and
`docs/rules/birthNumber.md`. It does not restate them. "IČO rules" and "birthNumber rules" below mean those
documents, including their decisions.

Legend: **[P]** is a primary source (law, Finanční správa / GFŘ, ARES record, VIES answer, EU law). **[O]** is an
official document that is not the source of the rule (for example, a state's submission to the OECD).
**UNVERIFIED** means the claim rests only on secondary sources. **[ARES data]** / **[VIES]** means it was checked
live on 2026-10-07.

> **Main caveats.**
> 1. The law (§ 130) defines only the *composition*: `CZ` + IČO, birth number or a number the tax administrator
>    assigns. It defines no length, no character set and no check digit for the assigned number.
> 2. The assigned numbers (*vlastní identifikátor správce daně*, VČP) are described in an official source only as
>    "9 digits, first digit is 6" (OECD sheet submitted by Czechia [O]). Their check digit has **no official text**.
>    The rule in section 2.4 rests on python-stdnum (reverse-engineered) and is confirmed by 5 ARES records
>    and 1 VIES answer, all of them VAT-group numbers `699…`.
> 3. The format of the VČP that natural persons may request **since 1. 1. 2021** is not published. The GFŘ
>    methodical instruction says nothing about its shape (section 3.3).

---

## 1. Format

```
CZ  +  kmenová část (8, 9 or 10 digits)
```

| Kmenová část (inner part) | Digits | Subject | Rules | Source |
| --- | --- | --- | --- | --- |
| IČO | 8 | legal person (*právnická osoba*) | IČO rules, unchanged | § 130 odst. 3 [P]; ARES `dic` = `CZ` + `ico`, e.g. `CZ00177041` [ARES data] |
| birth number, 10 digits | 10 | natural person born on or after 1. 1. 1954 | birthNumber rules, **no slash** | § 130 odst. 3 [P]; MF ČR FAQ 2004 (`CZ1234567890`) |
| birth number, 9 digits | 9 | natural person born before 1. 1. 1954 | birthNumber rules, **no slash** | same |
| assigned number (VČP) | 9, first digit `6` | subject with no IČO or birth number (foreigners, foreign legal persons, VAT groups); since 2021 also a natural person on request | section 2.4 | § 130 odst. 4 [P]; OECD sheet [O]; ARES `dicSkDph` [ARES data] |

- **Prefix `CZ`.** § 130 odst. 1 [P]: *"obsahuje kód „CZ""*. Art. 215 of Council Directive 2006/112/EC [P]:
  *"Each individual VAT identification number shall have a prefix in accordance with ISO code 3166 — alpha 2 — by
  which the Member State of issue may be identified."* ISO 3166-1 alpha-2 codes are written in capitals.
- **Length after `CZ`: 8, 9 or 10 digits.** MF ČR FAQ (2004, via epravo.cz, UNVERIFIED as a copy): *"Dle typu
  daňového subjektu tedy může být tato kmenová část … 8, 9, nebo 10ti místná."* EU VAT number table (EUIPO
  [O]): `CZ99999999 or CZ999999999 or CZ9999999999`, "8-10 digits". OECD sheet [O]: the same three lengths.
- **No separators.** ARES OpenAPI 1.4: `dic` is *"Daňové identifikační číslo ve formátu CZNNNNNNNNNN"* [P]. ARES
  records show `CZ00177041`, `CZ699000797` [ARES data]. The EU TIN sheet for CZ [O]: the personal number *"should
  be written as a single block, without any slash sign"*. MF ČR FAQ examples: `CZ12345678`, `CZ123456789`,
  `CZ1234567890`. No official source writes a space between `CZ` and the digits, or a slash in the birth number.
- **Leading zeros of the IČO stay.** `CZ00177041`, `CZ00064581` [ARES data].

### Allowed characters (proposal)

`C` and `Z` as the prefix (letter case: open question 2), then ASCII digits `0-9` only. No trimming, no
normalization, the same as IČO and birthNumber.

---

## 2. Check algorithm (proposed validator)

### 2.1 Validator steps

The validator depends on `referenceDate`, because a birth-number inner part can give `futureDate`
(birthNumber rules section 3.6). The first failing step gives the reason.

**Precedence (proposal, open question 6):** `missingPrefix` / `foreignPrefix` / `badFormat` (prefix) →
`letters` → `badFormat` → `wrongLength` → `impossibleDate` → `badInnerChecksum` → `futureDate`.

1. **Prefix** (the first two characters):
   - `CZ` → go on with `inner` = everything after the first two characters. Letter case: see open question 2. The
     proposal is case-insensitive (`CZ`, `cz`, `Cz`, `cZ`).
   - Two Unicode letters (`\p{L}`) that are not `CZ` → **`foreignPrefix`**. Examples: `SK…`, `DE…`, `EL…`, `ČZ…`.
   - The value is empty, or its first character is an ASCII digit → **`missingPrefix`**. Examples: `00177041`,
     the pre-2004 form `001-00177041`.
   - Anything else → **`badFormat`**. Examples: a leading space, `C Z00177041`, a single letter followed by a
     digit (`C00177041`).
2. **Letters in the inner part.** Any Unicode letter in `inner` → **`letters`**. Examples: `CZ0O177041`,
   `CZE00177041`.
3. **Characters in the inner part.** Any character other than `0-9` in `inner` → **`badFormat`**. This covers
   `CZ 00177041`, a trailing space, a hyphen, a slash (`CZ905501/1251`), U+00A0 and full-width digits.
4. **Length.** `inner` must have 8, 9 or 10 digits, otherwise **`wrongLength`**. Examples: `CZ`, `CZ177041`,
   `CZ12345678901`.
5. **Inner check, chosen by the shape of `inner`:**
   - 8 digits → **IČO rules** (section 2.2). IČO `badChecksum` → **`badInnerChecksum`**.
   - 9 digits starting with `6` → **assigned number** (section 2.4). Wrong check digit → **`badInnerChecksum`**.
     It is never read as a birth number (section 3.5, open question 4).
   - Other 9 digits and all 10 digits → **birthNumber rules** with the same `referenceDate` (section 2.3):
     `impossibleDate` → **`impossibleDate`**, `badChecksum` → **`badInnerChecksum`**, `futureDate` →
     **`futureDate`**.
6. Otherwise `{ valid: true }`.

**How the inner reasons map** (open question 5). Steps 1–4 already catch everything the inner validators would
report as `letters`, `badFormat` or `wrongLength`. So only these inner reasons can reach the mapping:

| Inner validator | Inner reason | DIČ reason |
| --- | --- | --- |
| ico | `badChecksum` | `badInnerChecksum` |
| birthNumber | `impossibleDate` | `impossibleDate` (reused, same meaning) |
| birthNumber | `badChecksum` | `badInnerChecksum` |
| birthNumber | `futureDate` | `futureDate` (reused, same meaning) |
| assigned number | (wrong check digit) | `badInnerChecksum` |

A mapping such as `reason === 'badChecksum' ? 'badInnerChecksum' : reason` has no unreachable branch, so the
100 % branch threshold for `validate*.ts` can be met. The DIČ validator must call the existing IČO and birthNumber
validators and must not copy their rules (CLAUDE.md, "shared logic").

**Reason code union (proposal), in precedence order:**
`'missingPrefix' | 'foreignPrefix' | 'letters' | 'badFormat' | 'wrongLength' | 'impossibleDate' |
'badInnerChecksum' | 'futureDate'`. `badFormat` is listed once, although it can come from step 1 or step 3. Only
`missingPrefix`, `foreignPrefix` and `badInnerChecksum` are invalid variants (spec). The other codes have no
variant, which core rules section 4 allows.

### 2.2 IČO inner part (8 digits)

IČO rules section 2, step 4, unchanged: weights `8…2` on `d1`–`d7`, `d8 = (11 − S mod 11) mod 10`.

**Worked example 1: `CZ00177041` (Škoda Auto a.s., ARES `dic`)**

1. Prefix `CZ` ✓. `inner` = `00177041`. 2. No letters ✓. 3. Digits only ✓. 4. 8 digits ✓.
5. IČO: `S = 8·0 + 7·0 + 6·1 + 5·7 + 4·7 + 3·0 + 2·4 = 6 + 35 + 28 + 8 = 77`, `a = 0`, `d8 = (11 − 0) mod 10 = 1` ✓.
6. `{ valid: true }`.

### 2.3 Birth-number inner part (9 or 10 digits)

birthNumber rules section 2, run on the digits **without a slash**. The birthNumber validator accepts the
slash-less form (`withoutSlash`), so it can be called on `inner` as it is. All birthNumber decisions apply:
`mod11Exception` for 1954–1985, +20/+70 for 10 digits, the ČSSZ century mapping for 9 digits, zero endings valid.

**Worked example 2: `CZ9055011251` (constructed; birthNumber rules worked example)**

1. Prefix ✓. `inner` = `9055011251`. 2.–4. ✓ (10 digits).
5. Not 9 digits starting with `6`, so birthNumber rules apply: woman, 1990-05-01, `9055011251 = 11 × 823182841` ✓,
   not after `referenceDate` ✓.
6. `{ valid: true }`.

### 2.4 Assigned number, *vlastní identifikátor správce daně* (9 digits, first digit `6`)

Structure:

| Part | Digits | Meaning |
| --- | --- | --- |
| `d1` | 1 | always `6` (OECD sheet [O]: "9 digits (first digit is 6)") |
| `d2`–`d8` | 7 | number. VAT groups: `d2d3` = `99`, then a 5-digit sequence number (Pohoda, UNVERIFIED: *"CZ699nnnnnk („nnnnn" je pořadové číslo a „k" je kontrolní číslice)"*) |
| `d9` | 1 | check digit |

Check digit (python-stdnum `calc_check_digit_special`, **UNVERIFIED**, no official text):

```
S  = 8·d2 + 7·d3 + 6·d4 + 5·d5 + 4·d6 + 3·d7 + 2·d8     (the leading 6 is not used)
a  = S mod 11
d9 = (a + 8) mod 10
```

stdnum writes it as `(8 − (10 − a) mod 11) mod 10`. For every `a` from 0 to 10 this equals `(a + 8) mod 10`:

| `a` | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `d9` | 8 | 9 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

The weights are the same as for IČO, but the mapping is different. Do not reuse IČO's `(11 − a) mod 10`. The
weighted sum itself can use `weightedSum` from `src/core/checksum.ts`.

**Evidence.** python-stdnum fixed this formula in 2017 after a VIES-valid number failed the old one (issue #51; the
reporter wrote *"I was unable to find the official formula"*). Every VAT-group DIČ checked here matches it:
5 in ARES, 1 of them also in VIES, plus 3 more listed only on finmag.cz (section 5). Together they cover the
remainders `a` = 1, 2, 5, 6, 8 and 9. If the check digits were random, the chance that 8 numbers all match would be
10⁻⁸. So the rule is real **for `699…` numbers**. For other `6…` numbers there is one public sample only (the number
from stdnum issue #51). It is not reproduced here, because it may belong to a natural person.

**Worked example 3: `CZ699000797` (DEK a.s. VAT group, ARES `dicSkDph`, VIES valid)**

1.–4. ✓ (`inner` = `699000797`, 9 digits, starts with `6`).
5. `S = 8·9 + 7·9 + 6·0 + 5·0 + 4·0 + 3·7 + 2·9 = 72 + 63 + 21 + 18 = 174`, `a = 174 mod 11 = 9`,
   `d9 = (9 + 8) mod 10 = 7` ✓.
6. `{ valid: true }`. `CZ699000798` gives `badInnerChecksum`. VIES answers `INVALID` for it.

For `699…` numbers the constant `99` adds `72 + 63 = 135 ≡ 3 (mod 11)`. So
`a = (3 + 6·n1 + 5·n2 + 4·n3 + 3·n4 + 2·n5) mod 11` for the sequence number `n1…n5`.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| until 30. 4. 2004 | DIČ = 3-digit code of the tax office + hyphen + 8–10 digits, e.g. `123-12345678` | MF ČR FAQ and epravo.cz, 25. 3. 2004 (UNVERIFIED, no primary text read) |
| 1. 5. 2004 | Zákon č. 237/2004 Sb. (of 1. 4. 2004) adds § 33 odst. 12 to zákon 337/1992 Sb.: *"Daňové identifikační číslo obsahuje kód „CZ" a kmenovou část, kterou tvoří obecný identifikátor. … Není-li obecný identifikátor daňovému subjektu přidělen, přidělí správce daně vlastní identifikátor."* In force on the day of EU accession. The tax-office code was replaced by `CZ` and the digits stayed the same. | [P] text of 237/2004 Sb. (sagit.cz); epravo.cz |
| 2008/2009 | VAT groups (*skupinová registrace*, zákon 235/2004 Sb. § 5a, § 95a) get their own DIČ `CZ699nnnnnk` | Pohoda 2014 (UNVERIFIED); real group DIČ [ARES data] |
| 1. 1. 2011 | Daňový řád 280/2009 Sb. replaces 337/1992 Sb. § 130 keeps the composition: `CZ` + obecný identifikátor (FO: birth number, PO: IČO) or vlastní identifikátor. | [P] § 130 (mesec.cz copy, version from 1. 1. 2026) |
| 1. 1. 2021 | Zákon č. 283/2020 Sb.: § 130 odst. 4. A natural person may ask for a vlastní identifikátor (VČP). The VČP then replaces the birth number in the DIČ. | [P] GFŘ, Metodický pokyn č. j. 79651/20/7700-10123-010450 (in force 1. 1. 2021) |
| 2026 | Finanční správa publishes an answer on "přidělování čísla nahrazujícího rodné číslo" (76/26) | [P] link in section 6; **not read** (a .docx that could not be parsed) |

§ 130 in force today (version from 1. 1. 2026) [P]:

- (1) *"Daňovému subjektu, který není dosud registrován k žádné dani, přidělí správce daně daňové identifikační
  číslo. Daňové identifikační číslo obsahuje kód „CZ" a kmenovou část, kterou tvoří obecný identifikátor, nebo
  vlastní identifikátor správce daně."*
- (3) *"Obecným identifikátorem je u fyzické osoby rodné číslo, popřípadě jiný obecný identifikátor, stanoví-li tak
  zákon, a u právnické osoby identifikační číslo."*
- (4) *"Správce daně rozhodnutím přidělí daňovému subjektu vlastní identifikátor v případě, že není daňovému
  subjektu přidělen obecný identifikátor, nebo o jeho přidělení daňový subjekt, který je fyzickou osobou a který
  jej dosud nemá přidělen, požádá; takto přidělený vlastní identifikátor tvoří kmenovou část daňového
  identifikačního čísla."*

### 3.2 Who has which form

- **Legal person:** `CZ` + IČO. If it has no IČO (for example, a foreign legal person), it gets an assigned number
  (OECD [O]: *"Special (generated) Identification Number is issued to individuals who do not have a Personal
  Identification Number and to legal entities that do not have a Business Identification Number"*).
- **Natural person, including an entrepreneur with an IČO:** `CZ` + birth number, **not** `CZ` + IČO. The
  general identifier of a natural person is the birth number (§ 130 odst. 3). The validator cannot see who the
  subject is, so `CZ` + the IČO of a natural person still passes. This is a semantic error the library cannot
  detect.
- **Natural person without a birth number, or one who asked for a VČP (from 2021):** `CZ` + assigned number.
- **VAT group:** `CZ699nnnnnk`. ARES shows it as `dicSkDph` on each member (for example DEK a.s., CENTRAL GROUP
  a.s.). VIES answers *"Group registration - This VAT ID corresponds to a Group of Taxpayers"* [VIES].

### 3.3 The VČP on request since 2021: format unknown

The GFŘ methodical instruction [P] describes only the procedure: the request, the effective date (at least 40 days
after the decision) and that a VČP is given only once. Press articles (penize.cz, fakturomat.cz 2026) say only
"a random number assigned by the tax office". **No source gives its length, first digit or check digit.** The
proposal assumes it has the same shape as the other assigned numbers (9 digits, `6…`). This is **UNVERIFIED**
(open question 3). If the shape is different, real DIČ of this kind will fail validation.

### 3.4 Where the DIČ is written without `CZ`

- **Kontrolní hlášení DPH**, since 10. 2. 2016: *"bude u příslušného DIČ uvedena pouze jeho kmenová část (bez kódu
  státu „CZ")"* [P]. Tax forms usually have `CZ` pre-printed and a field for the digits.
- **VIES** takes the country and the number separately. It normalizes its input: `CZ 45274649` and `cz45274649`
  are both accepted (`rulesApplied`: `CHARACTER_REMOVAL`, `CASE_SENSITIVE`, `COUNTRY`) [VIES].

So `missingPrefix` is invalid only for a **complete** DIČ (as on an invoice or in ARES). An application field that
stores only the kmenová část needs the IČO or birthNumber validators instead. Document this in the TSDoc.

### 3.5 Overlap: 9 digits starting with `6`

Under birthNumber rules (decision 3) a 9-digit `6RMMDDXXX` is a valid birth number of a person born 1860–1869. Under
section 2.4 it is an assigned number. The proposal follows python-stdnum and the OECD sheet: in a DIČ, **9 digits
starting with `6` are always an assigned number**. No living person born in the 1860s registers for tax. Effects:

- `CZ600101001` is a valid birth number (1860-01-01) but a **`badInnerChecksum`** DIČ (expected `d9 = 8`).
- `CZ600000008` is not a birth number (month `00`) but a **valid** DIČ.
- The generator must never build a DIČ from a birth date in 1860–1869 (section 8, open question 8).

### 3.6 Other notes

- python-stdnum rejects 8-digit DIČ starting with `9` (`InvalidComponent`). No source for this was found, and the
  IČO rules accept such IČO. Proposal: accept (open question 10).
- The DIČ of a natural person carries the birth number, so it is personal data. That is why the 2021 change was
  made. No real DIČ of a natural person is used in this document.
- A DIČ exists only after registration. The validator checks the format, not registration (use ARES, VIES or the
  registr plátců DPH for that).

---

## 4. Edge and invalid variants

Spec (line 52): edge `fromIco`, `fromRc`, `lowercasePrefix` (disputed); invalid `missingPrefix`, `foreignPrefix`,
`badInnerChecksum`. Below are the definitions, plus two proposed new edge variants. Draw order matters for
determinism. All draws come from the `dic` stream.

"Plain inner part" means: draw `random.int(0, 1)` (0 = IČO, 1 = birth number), then generate exactly as the plain
`ico` generator (IČO rules section 8) or the plain `birthNumber` generator with no options (birthNumber rules
section 9: range 1954-01-01 … 2025-12-31, cut at `referenceDate`) and remove the slash.

### Edge variants (valid): must return `{ valid: true }`

| Variant | Definition | Generator (draw order) |
| --- | --- | --- |
| `fromIco` | `CZ` + IČO (8 digits) | ico plain generator draws, then `CZ` + value |
| `fromBirthNumber` (spec: `fromRc`, renamed by decision 7) | `CZ` + 10-digit birth number, no slash | birthNumber plain generator draws (date, gender, ending), remove `/`, `CZ` + value |
| `lowercasePrefix` (**disputed**, open question 2) | `cz` + a valid inner part | plain inner part (form draw, then inner), then `cz` + value |
| `pre1954` (**new**, open question 9) | `CZ` + 9-digit birth number (born before 1954). It breaks apps that allow only 8 or 10 digits. | birthNumber `pre1954` edge draws (1900-01-01 … 1953-12-31, cut at `referenceDate`), remove `/`, `CZ` + value. `RR` is 00–53, so it never starts with `6`. |
| `vatGroup` (**new**, open question 9) | `CZ699nnnnnk`, an assigned number of a VAT group | `digits(5)` for `nnnnn`, then the check digit of section 2.4 |

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | Generator (one fault only, draw order) |
| --- | --- | --- |
| `missingPrefix` | a valid inner part without any prefix | plain inner part, returned as is. 8 or 10 digits. |
| `foreignPrefix` | another EU country's VAT prefix + a valid Czech inner part | `random.pick(FOREIGN_PREFIXES)` first, then the plain inner part. List: open question 11. |
| `badInnerChecksum` | `CZ` + an inner part whose only fault is its checksum | form draw `int(0, 1)`. 0: the ico `badChecksum` variant (its own draws). 1: the birthNumber `badChecksum` variant (its own draws, plain range), remove `/`. Then `CZ` + value. |

Reasons without a variant: `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `futureDate`. Testers who need
these can use `'CZ' + cz.ico.invalid('letters')` and similar. Proposal: no extra DIČ variants for them.

---

## 5. Known samples

Legal persons and VAT groups: public data, checked on 2026-10-07 in ARES
(`GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/<ico>`, fields `dic` / `dicSkDph`)
and, where marked, in VIES (`GET https://ec.europa.eu/taxation_customs/vies/rest-api/ms/CZ/vat/<number>`).
All birth-number samples are **constructed** (they come from `docs/rules/birthNumber.md` section 5). Reference date
for date-dependent samples: **2026-10-07**.

### Valid (real)

| Input | Subject | Source | Path / computation |
| --- | --- | --- | --- |
| `CZ00177041` | Škoda Auto a.s. | ARES `dic` | IČO, `a = 0` → `1` (worked example 1) |
| `CZ00064581` | Hlavní město Praha | ARES `dic` | IČO, `a = 0` → `1` |
| `CZ26450691` | MAKRO Cash & Carry ČR s.r.o. | ARES `dic` | IČO, `a = 0` → `1` |
| `CZ68407700` | České vysoké učení technické v Praze | ARES `dic` | IČO, `a = 1` → `0`. 8 digits starting with `6` use the IČO path. |
| `CZ45274649` | ČEZ, a. s. | ARES `dic`, VIES valid | IČO, `a = 2` → `9` |
| `CZ61673048` | FREYSSINET CS, a.s. | ARES `dic` | IČO |
| `CZ24227757` | CENTRAL GROUP a.s. | ARES `dic` | IČO |
| `CZ699000797` | VAT group of DEK a.s. | ARES `dicSkDph`, VIES valid ("Group registration") | `S = 174`, `a = 9` → `7` (worked example 3) |
| `CZ699007433` | VAT group of CENTRAL GROUP a.s. | ARES `dicSkDph` | `S = 181`, `a = 5` → `3` |
| `CZ699003634` | VAT group of DfK Group a.s. | ARES `dicSkDph` | `S = 171`, `a = 6` → `4` |
| `CZ699003219` | VAT group of CSGM a.s. | ARES `dicSkDph` | `S = 155`, `a = 1` → `9` |
| `CZ699007986` | VAT group of FREYSSINET CS, a.s. | ARES `dicSkDph` | `S = 206`, `a = 8` → `6` |
| `CZ699007330` | AHC a.s. (group) | finmag.cz only (UNVERIFIED) | `S = 178`, `a = 2` → `0` |
| `CZ699004029` | Cloud Operations s.r.o. (group) | finmag.cz only (UNVERIFIED) | `S = 155`, `a = 1` → `9` |
| `CZ699004959` | KNOWLIMITS Group a.s. (group) | finmag.cz only (UNVERIFIED) | `S = 188`, `a = 1` → `9` |

### Valid (constructed)

| Input | Path | Why |
| --- | --- | --- |
| `CZ9055011251` | birth number | worked example 2 (F, 1990-05-01) |
| `CZ500715123` | birth number, 9 digits | `pre1954` (M, 1950-07-15) |
| `CZ905501125` | birth number, 9 digits | F, 1890-05-01 (ČSSZ mapping). `CZ9055011251` with its last digit dropped is still valid. |
| `CZ6006150140` | birth number | `mod11Exception` (1960). 10 digits starting with `6` use the birth-number path. |
| `CZ1023151239` | birth number | +20 month (M, 2010-03-15) |
| `CZ2452291237` | birth number | leap day 2024-02-29 |
| `CZ699000001` | assigned | `nnnnn = 00000`: `a = 3` → `1` |
| `CZ699000013` | assigned | `a = 5` → `3` |
| `CZ699000048` | assigned | `S = 143`, `a = 0` → `8` |
| `CZ699000128` | assigned | `S = 142`, `a = 10` → `8` |
| `CZ600000008` | assigned | `S = 0`, `a = 0` → `8`. As a birth number it would be `impossibleDate` (month 00), see 3.5. |
| `CZ600101008` | assigned | `S = 10`, `a = 10` → `8`. Also a valid birth number (1860-01-01). |
| `CZ90000005` | IČO | `S = 72`, `a = 6` → `5`. python-stdnum rejects it (first digit 9), open question 10. |
| `cz00177041` | IČO | `lowercasePrefix`, valid only if open question 2 is accepted |
| `Cz00177041` | IČO | mixed case, same condition |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'00177041'` | `missingPrefix` | IČO without `CZ` (the kontrolní hlášení form, 3.4) |
| `'9055011251'` | `missingPrefix` | birth number without `CZ` |
| `'001-00177041'` | `missingPrefix` | pre-2004 format |
| `''` | `missingPrefix` | empty |
| `'SK00177041'` | `foreignPrefix` | Slovak prefix |
| `'DE45274649'` | `foreignPrefix` | German prefix |
| `'EL00177041'` | `foreignPrefix` | Greek VAT prefix (not ISO `GR`) |
| `'ČZ00177041'` | `foreignPrefix` | two letters, not `CZ` |
| `' CZ00177041'` | `badFormat` | leading space, not trimmed |
| `'C Z00177041'` | `badFormat` | prefix broken by a space |
| `'C00177041'` | `badFormat` | one letter, then a digit |
| `'CZ 00177041'` | `badFormat` | space after the prefix (VIES would accept it, 3.4) |
| `'CZ00177041 '` | `badFormat` | trailing space |
| `'CZ-00177041'` | `badFormat` | hyphen |
| `'CZ905501/1251'` | `badFormat` | slash: a DIČ never contains one |
| `'CZ0O177041'` | `letters` | letter O instead of zero |
| `'CZE00177041'` | `letters` | `CZE` (ISO alpha-3) is not the prefix |
| `'CZ0O17704'` | `letters` | letters win over length |
| `'CZ'` | `wrongLength` | 0 digits |
| `'CZ177041'` | `wrongLength` | IČO without its leading zeros |
| `'CZ1569651'` | `wrongLength` | 7 digits |
| `'CZ12345678901'` | `wrongLength` | 11 digits |
| `'CZ00177040'` | `badInnerChecksum` | IČO `a = 0` expects `1` |
| `'CZ12345678'` | `badInnerChecksum` | IČO expects `9` |
| `'CZ9055011234'` | `badInnerChecksum` | birth number `N10 ≡ 5` (spec example) |
| `'CZ8601010100'` | `badInnerChecksum` | `mod11Exception` only until 1985 |
| `'CZ699000798'` | `badInnerChecksum` | DEK group with the last digit +1. VIES: `INVALID`. |
| `'CZ600101001'` | `badInnerChecksum` | assigned path, expects `8` (a valid birth number on its own, 3.5) |
| `'CZ9013010061'` | `impossibleDate` | month 13, checksum OK |
| `'CZ000229123'` | `impossibleDate` | 9 digits = 1900, not a leap year |
| `'CZ3001010111'` | `futureDate` | M, 2030-01-01, checksum OK, reference date 2026-10-07 |

---

## 6. Sources

Primary [P]:

1. Zákon č. 280/2009 Sb., daňový řád, § 130 (version from 1. 1. 2026). Text used:
   <https://www.mesec.cz/zakony/danovy-rad/f4009943/>; also <https://www.zakonyprolidi.cz/cs/2009-280> (the page
   was cut off before § 130); official <https://e-sbirka.gov.cz/sb/2009/280> (JS app, not rendered).
2. GFŘ, *Metodický pokyn ke změně daňového identifikačního čísla na žádost daňového subjektu*, č. j.
   79651/20/7700-10123-010450, signed 31. 12. 2020, in force 1. 1. 2021 (zákon 283/2020 Sb., § 130 odst. 4):
   <https://financnisprava.gov.cz/assets/cs/prilohy/d-sprava-dani-a-poplatku/79651_20_MP_ke_zmene_DIC_na_zadost_subjektu.pdf>
3. Zákon č. 237/2004 Sb. (adds § 33 odst. 12 to zákon 337/1992 Sb., `CZ` prefix from EU accession):
   <https://www.sagit.cz/_texty/sb04237.htm>
4. Council Directive 2006/112/EC, Art. 215 (ISO 3166 alpha-2 prefix):
   <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006L0112> (quoted from
   <https://www.legislation.gov.uk/eudr/2006/112/article/215>)
5. ARES REST API, OpenAPI 1.4: `dic` *"ve formátu CZNNNNNNNNNN"*, `dicSkDph` (DIČ of a VAT group):
   <https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/v3/api-docs>
6. ARES records used in section 5, checked on 2026-10-07: `…/ekonomicke-subjekty/<ico>` for 00177041, 00064581,
   26450691, 68407700, 45274649, 61673048, 24227757, 27636801, 28069234, 01384694.
7. VIES REST, checked on 2026-10-07: `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/CZ/vat/<number>`.
   `699000797` valid ("Group registration"); `699000798` `INVALID`; `CZ 45274649` and `cz45274649` valid after
   normalization (`CHARACTER_REMOVAL`, `CASE_SENSITIVE`, `COUNTRY`).
8. Finanční správa, kontrolní hlášení news of 10. 2. 2016 (DIČ without `CZ` in KH):
   <https://financnisprava.gov.cz/cs/dane/dane/dan-z-pridane-hodnoty/kontrolni-hlaseni-dph/aktuality/2016>
9. Finanční správa, information answer 76/26 on the number that replaces the birth number (**not read**, .docx):
   <https://financnisprava.gov.cz/assets/cs/prilohy/fs-generalni-financni-reditelstvi/Informace_106_2026_76.docx>

Official, not the source of the rule [O]:

10. OECD, *Czechia – Information on Tax Identification Numbers* (submitted by Czechia; the TIN structure lists
    `699999999 9 digits (first digit is 6) Special (generated) Identification Number`):
    <https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/czechia-tin.pdf>
11. European Commission, *TIN country sheet: Czech Republic*, version 09/07/2015 (birth number "as a single block,
    without any slash sign"). Copy used: <https://www.clickworker.com/wp-content/uploads/2023/12/TIN_-_country_sheet_CZ_en.pdf>
    (the original is on the EC TIN portal <https://ec.europa.eu/taxation_customs/tin/>).
12. EUIPO, *European Union VAT identification numbers* (CZ: `CZ99999999 or CZ999999999 or CZ9999999999`, 8–10
    digits): <https://euipo.europa.eu/tunnel-web/secure/webdav/guest/document_library/Documents/COSME/VAT%20numbers%20EU.pdf>

Secondary, **UNVERIFIED**:

13. MF ČR FAQ on the 2004 DIČ change, via epravo.cz (8/9/10 digits, `123-…` → `CZ…`):
    <https://www.epravo.cz/top/clanky/danove-identifikacni-cislo-dic-caste-dotazy-25313.html>,
    <https://www.epravo.cz/top/clanky/nova-podoba-danoveho-identifikacniho-cisla-24548.html>
14. python-stdnum `stdnum/cz/dic.py` (forms, check digit of the assigned numbers, rejects 8 digits starting with
    `9`): <https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/cz/dic.py>; fix of 2017:
    <https://lists.arthurdejong.org/python-stdnum-commits/2017/msg00017.html>; issue #51:
    <https://github.com/arthurdejong/python-stdnum/issues/51>
15. Pohoda portal, F. Sinecký, *Skupinová registrace k DPH* (2014, `CZ699nnnnnk`):
    <https://portal.pohoda.cz/dane-ucetnictvi-mzdy/dph/skupinova-registrace-k-dph>
16. finmag.cz registr DPH pages for the three group DIČ marked "finmag.cz only", e.g.
    <https://www.finmag.cz/obchodni-rejstrik/dph/cz699004029-cloud-operations-s-r-o>
17. Press on the 2021 change: <https://www.penize.cz/podnikani/430461-rodne-cislo-uz-muze-zmizet-z-dic-kdy-skonci-jinde>,
    <https://www.fakturomat.cz/clanek/dic-bez-rodneho-cisla/>

---

## 7. Differences from docs/spec.md

1. **"CZ + číslo přidělené finančním úřadem" (line 34).** The law calls it *vlastní identifikátor správce daně*
   (§ 130 odst. 1, 4). The law gives no format. The only official description is "9 digits, first digit 6" (OECD
   [O]). The check digit has no official text (section 2.4).
2. **"DIČ fyzické osoby odpovídá jejímu rodnému číslu" (line 42).** Since 1. 1. 2021 a natural person may have a
   DIČ without the birth number (§ 130 odst. 4, zákon 283/2020 Sb.). The rule still holds for generated values,
   because the generator builds birth-number DIČ only. Natural persons with an IČO also use the birth number, not
   the IČO (§ 130 odst. 3).
3. **`missingPrefix` as invalid (line 52).** It is correct for a complete DIČ (ARES, invoices). Official Czech
   forms (kontrolní hlášení since 2016) write only the kmenová část without `CZ`, and VIES takes the number without
   it (3.4).
4. **`lowercasePrefix` (line 52, disputed).** Art. 215 and ARES use capital `CZ`. VIES accepts lowercase and
   spaces after normalization. No source says that a lowercase prefix is a different or invalid number (open
   question 2).
5. **`fromRc`.** The spec name uses a Czech abbreviation, but the identifier is `birthNumber` (CLAUDE.md naming).
   Open question 7.
6. **Extra reason codes** `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `futureDate` (no variants).
   The spec lists only `missingPrefix`, `foreignPrefix`, `badInnerChecksum`.
7. **The DIČ validator depends on `referenceDate`** (through `futureDate` of the birth-number path). The spec does
   not mention this.
8. **Lengths** 8, 9 and 10 are confirmed. The 9-digit form has two meanings (pre-1954 birth number or assigned
   number). The spec does not mention this. Section 3.5 resolves it.
9. **Size budget.** "Import jednoho identifikátoru do 2 kB" (spec line 114; CLAUDE.md: ≤ 2 kB on top of the core)
   cannot hold for `dic`, because it must include ico and birthNumber (open question 1).
10. **Two new edge variants proposed** (`pre1954`, `vatGroup`). They are not in the spec.

---

## 8. Generator and variants contract (proposal)

- Stream id `dic`. Subpath `czech-test-data/dic`, exports `createDic` and `validateDic`. `cz.dic`,
  `cz.validate.dic` (uses the instance `referenceDate`). CLI command `dic`.
- **Options** (open question 8):

  ```ts
  type DicOptions =
    | { readonly from: 'ico' }
    | { readonly from?: 'birthNumber'; readonly gender?: 'male' | 'female'; readonly birthDate?: string };
  ```

  - `from: 'ico'` → `CZ` + plain IČO. Passing `gender` or `birthDate` with it is a type error. At runtime it
    throws `RangeError` naming the option.
  - `from: 'birthNumber'`, or `from` omitted with `gender` or `birthDate` given → `CZ` + birthNumber
    `generate(random, { gender, birthDate }, context)` with the slash removed. birthNumber's own `RangeError`s
    apply (they name `gender` / `birthDate`). **Extra rule:** `birthDate` before **1900-01-01** throws `RangeError`
    naming `birthDate`. This avoids the 1860–1869 overlap (section 3.5), so no generated value is ever invalid.
  - `from` omitted, no `gender`, no `birthDate` → form draw `random.int(0, 1)` (0 = IČO, 1 = birth number), then
    the plain inner generator.
  - Unknown `from` → `RangeError` naming `from`.
  - The plain generator never produces assigned numbers, `pre1954` values or lowercase prefixes. Those come only
    from the edge variants.
- **Consistency (spec line 42):** decoding the birth-number part gives back the given `gender` and `birthDate`.
- **Reuse, not copies.** Inner values come from the `ico` and `birthNumber` generator and variant functions, called
  with the **`dic` stream**. Their draw order is the one in their own rules. Calling `cz.dic()` therefore never
  changes `cz.ico()` or `cz.birthNumber()` values (core rules, decision Q3). The validator calls `ico`'s and
  `birthNumber`'s inner `validate`. The weighted sum for the assigned numbers uses `weightedSum` from the core.
  Its mapping `(a + 8) mod 10` lives in `src/dic/`.
- **Date ranges** (core rules A3): only the birth-number paths are date-dependent. They use birthNumber's fixed
  ranges (plain 1954–2025, `pre1954` 1900–1953), cut by `referenceDate`. The shared determinism check from
  `tests/support/identifierContract.ts` must pass.
- Edge variants, in definition order: `fromIco`, `fromBirthNumber`, `lowercasePrefix`, `pre1954`,
  `vatGroup`. Invalid variants: `missingPrefix`, `foreignPrefix`, `badInnerChecksum`.

---

## 9. Decisions (approved 2026-10-07: every recommendation below was accepted, question 1 as amended)

1. **Size budget.** `.size-limit.ts` measures `src/dic/index.ts` with only `../core` external. dic must bundle the
   ico code (~0.78 kB) and the birthNumber code (~1.98 kB), plus its own code (estimated 0.4–0.7 kB, not measured).
   That is about 3.2–3.5 kB on top of the core, over the 2 kB limit. **Recommendation:** measure every identifier
   with the core **and the other identifier folders** external (`ignore: ['../core', '../ico', '../birthNumber', …]`,
   built from the list of identifier subpaths, so nothing is hard-coded for dic). Then "≤ 2 kB on top of the core"
   becomes "≤ 2 kB of its own code", the same rule for everyone. Also add one entry that shows the real cost of
   importing `czech-test-data/dic` (core external, ico and birthNumber included) with a **4 kB** limit, so the
   reuse cannot grow unnoticed. The 10 kB whole-library budget stays. Alternative: raise only dic's limit to 4 kB.
   Either way, record the change next to the 2026-10-05 decision in CLAUDE.md. Note: dic may import the variant
   records `invalid` from ico and birthNumber, which pulls in all their invalid variants. The implementer should
   measure that before refactoring anything.
   **Approved in amended form (2026-10-07, Marek):**
   - *Reuse, never copy*; and import **fine-grained**: `src/dic/` imports only `generate` / `validate` and the
     individual variant functions it needs (`pre1954`, `badChecksum`), never `identifier.ts` or the whole `edge` /
     `invalid` records (objects are not tree-shaken). The needed variant functions get named exports in
     `src/birthNumber/` and `src/ico/`; their records keep using them, so outputs and seeds do not change.
   - Budget: every identifier's **own code** ≤ 2 kB (core and other identifier folders external), and the
     standalone subpath `czech-test-data/dic` (core external, ico and birthNumber included) ≤ **3 kB**.
     Measured 2026-10-07: fine-grained dependencies ≈ 2.06 kB, whole records ≈ 2.5 kB. Whole library stays ≤ 10 kB.
2. **Lowercase prefix and spaces.** **Recommendation:** the prefix is **case-insensitive** (`cz`, `Cz`, `cZ` valid),
   and `lowercasePrefix` stays an edge variant marked "disputed" in TSDoc and the README. The spec puts it under
   valid. No source makes lowercase a different number, and VIES accepts it. **Spaces stay `badFormat`**
   (`CZ 00177041`), consistent with IČO and birthNumber (no trimming, no grouping). ARES and the law's examples are
   compact. Alternative: strict uppercase, with `lowercasePrefix` moved to the invalid variants under its own
   reason code.
3. **Assigned numbers (`6…`, 9 digits).** (A) accept them with the check digit of section 2.4, (B) accept any
   9 digits starting with `6` without a check, or (C) do not support them (they would then fail as birth numbers).
   **Recommendation: A.** It matches python-stdnum and every real sample (5 ARES, 1 VIES). The risk is the
   unpublished 2021 VČP format (3.3): if it differs, those real DIČ fail. Same approach as IČO: data-confirmed,
   marked UNVERIFIED.
4. **Scope of the assigned path:** first digit `6` (OECD sheet, python-stdnum) or only `699` (all VAT-group
   samples)? **Recommendation: `6`.** The OECD sheet says "first digit is 6" for all special numbers, and the
   stdnum issue shows a VIES-valid `68…` number. The cost: 9-digit birth numbers of people born 1860–1869 are not
   accepted inside a DIČ (3.5).
5. **Reason codes.** One `badInnerChecksum` for every inner checksum fault (IČO, birth number, assigned number).
   Reuse `impossibleDate`, `futureDate`, `letters`, `badFormat`, `wrongLength` as they are, without an "inner"
   prefix. **Recommendation: yes.** Tests can then say "the check digit is wrong" without knowing the form, and
   the date reasons mean the same as in birthNumber.
6. **Precedence:** prefix first, then `letters` → `badFormat` → `wrongLength` → `impossibleDate` →
   `badInnerChecksum` → `futureDate`. **Recommendation: yes.** The prefix is the first thing a reader checks, and
   the rest is birthNumber decision 7. So `00177041` is `missingPrefix`, not `letters`, and `''` is `missingPrefix`.
7. **Names:** `from: 'ico' | 'birthNumber'` and the edge `fromBirthNumber` instead of the spec's `fromRc`?
   **Recommendation: rename to `fromBirthNumber`.** CLAUDE.md naming rule: the identifier is `birthNumber` and
   there are no aliases. The spec name `fromRc` is the only Czech abbreviation in the API.
8. **Generator options** as in section 8: a discriminated union, `gender`/`birthDate` imply `birthNumber`, a 50/50
   form draw when nothing is given, and `birthDate` must be ≥ 1900-01-01. **Recommendation: yes.** Alternative:
   no person options on dic (users build `'CZ' + birthNumber.replace('/', '')` themselves). That is smaller, but
   it drops the spec's consistency requirement from the API.
9. **New edge variants** `pre1954` (`CZ` + 9-digit birth number) and `vatGroup` (`CZ699nnnnnk`).
   **Recommendation: add both.** They test the two real forms that most apps reject: 9 digits, and a DIČ that is
   neither an IČO nor a birth number. `vatGroup` uses only the `699` shape confirmed by ARES.
10. **8 digits starting with `9`** (python-stdnum rejects them, no source given). **Recommendation: accept** if the
    IČO check digit holds. IČO rules have no such restriction, and no official source was found.
11. **`foreignPrefix` list.** **Recommendation:** the 26 VAT prefixes of the other EU member states in alphabetical
    order (`AT BE BG CY DE DK EE EL ES FI FR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK`, with Greece as `EL` per
    Art. 215), one `pick`. Alternative, smaller and more readable in tests: only `SK` (the realistic mix-up). The
    validator treats any two letters other than `CZ` as `foreignPrefix` either way.
