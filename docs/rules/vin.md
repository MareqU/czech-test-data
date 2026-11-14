# vin (VIN, identifikační číslo vozidla, vehicle identification number)

Status: **DRAFT**, waiting for Marek's approval (section 10) · researched 2026-11-14 · rules-researcher

Czech meaning: *VIN* (*identifikační číslo silničního vozidla*, zákon č. 56/2001 Sb.) is the 17-character code that the
manufacturer marks on a road vehicle (chassis, a plate and behind the windscreen). It identifies one vehicle for its
whole life and is recorded in the vehicle register (*registr silničních vozidel*), the registration certificate
(*osvědčení o registraci*, *technický průkaz*), insurance contracts and STK protocols. It is alphanumeric, upper case,
without spaces; the letters `I`, `O` and `Q` are never used.

Scope (proposal, decision 1): **17-character VINs in the ISO 3779 structure** (every road vehicle since model year 1981
in North America, and every vehicle type-approved in the EU). Older VINs of other lengths, chassis numbers (*výrobní
číslo podvozku*) and Czech official numbers (*úřední číslo*, 3.4) are out of scope.

Legend: **[P]** is a primary source (US Code of Federal Regulations, EU regulations, Sbírka zákonů, the manufacturer's own
publication). **[P, snippet]** means a primary document that could not be opened (CAPTCHA) and was seen only as a search
engine extract. **UNVERIFIED** means the claim rests only on secondary sources or on my own inference. "My derivation"
marks arithmetic that anyone can re-check. Quotes were obtained in short fragments through a fetch tool.

> **Main caveats.**
> 1. **The brief's premise "check digit not required in the EU" is out of date.** Commission Implementing Regulation
>    (EU) 2021/535, Annex II, Part 2, Section A, point 2.4 requires a *"mathematically correct"* check digit in position 9
>    (same formula as the US), Article 12: for **new vehicle types from 6 July 2022**, and for the **registration of all
>    new vehicles from 7 July 2026** [P]. Millions of older European VINs on the road (and in Czech data) still have no
>    valid check digit. Section 3.2 and decision 3 deal with this.
> 2. ISO 3779:2009 (VIN content and structure) and ISO 3780:2009 (WMI) are paywalled and were **not read** (iso.org HTTP
>    403). Every rule below is taken from public law texts that reproduce them: 49 CFR Part 565 (US) and EU 2021/535
>    (previously 19/2011).
> 3. The official eCFR and EUR-Lex pages block automated fetching. 49 CFR was read on Cornell LII (a copy of the CFR,
>    with the Federal Register amendment line), 2021/535 on lexaris.de (the original OJ text), 2024/883 on lawplayer.com
>    and 19/2011 on legislation.gov.uk (the "as adopted" EU text). The consolidated 2021/535 on EUR-Lex was **not** read;
>    the only VIN changes I found in 2024/883 are listed in 3.1.
> 4. No public primary source lists the WMI of Czech manufacturers (the SAE register is paid, NHTSA's vPIC lists only
>    manufacturers that sell in the US). **`TMB` = Škoda Auto is confirmed by Škoda's own publication [P]**; every other
>    Czech WMI is UNVERIFIED.

---

## 1. Format

### 1.1 Legal basis

**EU (applies directly in the Czech Republic).** Commission Implementing Regulation (EU) 2021/535, Annex II
*"Statutory plate and the vehicle identification number"*, Part 2, Section A [P] (fragments, verbatim):

- 2.1: *"The VIN shall consist of the following three sections and a check digit:"* (WMI, VDS, VIS).
- 2.2.1: WMI = *"three alphanumeric characters, capital roman letters or Arabic numerals,"* assigned by the competent
  authority of the country of the manufacturer's principal place of business.
- 2.2.2: the authority acts in agreement with the international organisation of *"Standard ISO 3780:2009"*.
- 2.2.3: *"Where the manufacturer's global production is less than 500 vehicles per year,"* *"the third character shall
  always be '9'."* The competent authority then assigns the 3rd–5th characters of the VIS (positions 12–14).
- 2.3: *"The VDS shall consist of five alphanumeric characters, capital roman letters or Arabic numerals,"* unused places
  filled at the manufacturer's discretion.
- 2.4: *"The ninth position of the VIN shall be a check digit that is mathematically correct"* *"in accordance with the
  formula specified in Section C."*
- 2.5: *"The VIS shall consist of eight alphanumeric characters, capital Roman letters or Arabic numerals,"* *"of which
  the last four shall consist of digits only."* Unused VIS places are filled with `0`.
- 2.7: no spacing between the characters. 2.8: *"The use of the letters 'I', 'O' or 'Q' shall not be permitted."*
- Recital: the VIN should contain a check digit *"in order to prevent clerical errors"* [P, snippet].
- Annex II, Part 2, Section A, points 2.0.1–2.0.5 (inserted by 2024/883): a VIN *"shall be marked on each vehicle"*,
  *"shall be unique"*, traceability for 30 years [P].

**US.** 49 CFR Part 565 (Subpart B, vehicles made on or after 30 April 2009; Subpart C keeps the same rules for model
year 2009 and earlier) [P]:

- § 565.13(b): *"Each VIN shall consist of seventeen (17) characters."*
- § 565.13(c): *"The check digit shall appear in position nine (9) of the VIN, on the vehicle"* and on transfer documents.
- § 565.13(d): no two vehicles *"manufactured within a 60-year period beginning with the 1980 model year"* share a VIN.
- § 565.13(g): letters from the set `ABCDEFGHJKLMNPRSTUVWXYZ` or numerals `0`–`9` (so `I`, `O`, `Q` are excluded).
- § 565.13(h): *"All spaces provided for in the VIN must be occupied by a character"*. § 565.13(i): *"capital,
  sanserif characters."*
- § 565.12: a *low-volume manufacturer* makes fewer than **1 000** vehicles of a given type per year; its manufacturer
  identifier is positions 1–3 **plus** 12–14.
- § 565.15: content per position, see 1.2. Amendment line: *"[73 FR 23379, Apr. 30, 2008, as amended at 87 FR 13232,
  Mar. 9, 2022]"*.

**Czech law.** Zákon č. 56/2001 Sb. (version 50, in force 1. 1. 2026 – 31. 12. 2026) [P] uses the VIN but does **not**
define its format:

- § 28 odst. 1 písm. o): the manufacturer must *"opatřit silniční vozidlo identifikačním číslem silničního vozidla
  (VIN)"*.
- § 4 odst. 3 písm. d): the register records *"identifikační číslo silničního vozidla (VIN), není-li, pak výrobní číslo
  podvozku silničního vozidla"* (so vehicles without a VIN exist in the register, out of scope).
- § 32 odst. 1: for an individually built vehicle (*jednotlivě vyrobené vozidlo*) any *obecní úřad obce s rozšířenou
  působností* assigns the VIN that the builder marks on the vehicle (no format given).
- § 37 odst. 1 písm. d): *"zásahy do identifikátorů vozidla, například VIN"* make the vehicle technically ineligible.

**ISO.** ISO 3779:2009 *Road vehicles — Vehicle identification number (VIN) — Content and structure* and ISO 3780:2009
*Road vehicles — World manufacturer identifier (WMI) code*. Not read (paywalled); 2021/535 and 19/2011 cite ISO 3780.
The structure in 1.2 is what both public law texts state.

### 1.2 Structure

| Positions (1-based) | Length | Section | Content | Source |
| --- | --- | --- | --- | --- |
| 1–3 | 3 | WMI | world manufacturer identifier; positions 1–2 region/country (Czech Republic `TJ`–`TP`), position 3 manufacturer; `9` in position 3 = small manufacturer (EU < 500/year, US < 1 000/year of a type) | 2021/535 2.2 [P]; 49 CFR 565.15(a), 565.12 [P]; Škoda [P] for `TJ`–`TP` |
| 4–8 | 5 | VDS | vehicle attributes (model, body, engine, restraint system …), any allowed character | 2021/535 2.3 [P]; 49 CFR 565.15(b) [P] |
| 9 | 1 | check digit | `0`–`9` or `X` (section 2) | 2021/535 2.4, Section C [P]; 49 CFR 565.15(c) [P] |
| 10 | 1 | VIS | **US:** model year code (1.3). **EU:** not regulated (the EU's own example VINs have `9`, `0`, `7`, `X` here) | 49 CFR 565.15(d) [P]; 2021/535 Section B [P] |
| 11 | 1 | VIS | **US:** plant of manufacture. **EU:** not regulated (Škoda: plant, `0`–`4` Mladá Boleslav, `5`–`9` Kvasiny) | 49 CFR 565.15(d) [P]; Škoda [P] |
| 12–17 | 6 | VIS | serial number; small manufacturers: 12–14 complete the manufacturer identifier, 15–17 serial. **Last four (14–17) digits only** (EU and US); US passenger cars, MPVs and trucks ≤ 4 536 kg: **last five (13–17)** digits only | 2021/535 2.2.3, 2.5 [P]; 49 CFR 565.15(d) [P] |

(The older Regulation 19/2011, 2.3, had a **six**-character VDS covering positions 4–9 and no check digit; 2021/535 cut
the VDS to five characters and gave position 9 to the check digit [P].)

### 1.3 Model year code, position 10 (US only)

49 CFR 565.15(d), Table VII [P] (current table shows 2005–2039; Subpart C covers 1980–2009 with the same 30-year cycle):

| Code | `A` | `B` | `C` | `D` | `E` | `F` | `G` | `H` | `J` | `K` | `L` | `M` | `N` | `P` | `R` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Year | 2010 | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 |

| Code | `S` | `T` | `V` | `W` | `X` | `Y` | `1` | `2` | `3` | `4` | `5` | `6` | `7` | `8` | `9` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Year | 2025 | 2026 | 2027 | 2028 | 2029 | 2030 | 2031 | 2032 | 2033 | 2034 | 2035 | 2036 | 2037 | 2038 | 2039 |

- 30 codes; `I`, `O`, `Q`, `U`, `Z` and `0` are not year codes (absent from Table VII). Each code repeats every 30 years
  (`A` = 1980 and 2010).
- US light vehicles: position 7 numeric → 1980–2009 cycle, position 7 alphabetic → 2010–2039 cycle (565.15(b), (d)) [P].
- Škoda says it uses the same year code (*"Rok 2010 měl přiděleno písmeno A"*, example `P` = 2023) [P], but **EU law
  does not require it**, and the EU's own fictitious plates in 2021/535 Section B use `0` in position 10
  (`ZCFC35A3405850414`). Wikipedia: *"Outside of North America the 10th digit is usually 0"* (UNVERIFIED).

### 1.4 Display form

One line, 17 characters, no spaces (2021/535 2.7; 19/2011 2.6 *"There shall be no space between the characters."*) [P].
On a vehicle marked on two lines, start and end symbols may be added; *"This provision may be waived when the VIN is
marked on a single line"* (19/2011 2.8.1) [P]. The symbols are not part of the VIN. Upper case only (49 CFR 565.13(i);
"capital roman letters" in 2021/535) [P].

### 1.5 Allowed characters (proposed validator)

ASCII `0-9` and `A-Z` (upper case). `I`, `O`, `Q` are A–Z but get their own reason `forbiddenLetter`. Anything else
(lower case, spaces, U+00A0, `-`, `*`, diacritics, full-width characters) gives `badFormat`. No trimming (as every other
identifier).

---

## 2. Check algorithm

### 2.1 Check digit, position 9 [P]

Identical in 49 CFR 565.15(c) (Tables III–V) and 2021/535 Annex II, Part 2, Section C:

1. **Transliterate** each character to a value: digits keep their value; letters:

   | Value | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | Letters | A J | B K S | C L T | D M U | E N V | F W | G P X | H Y | R Z |

   (`I`, `O`, `Q` have no value. Every value is a single digit.)
2. **Weights** for positions 1–17: `8 7 6 5 4 3 2 10 0 9 8 7 6 5 4 3 2` (position 9, the check digit itself, weight 0).
3. `S = Σ value · weight`.
4. `r = S mod 11`. Check digit = `r` for `0`–`9`, **`X` for 10**. Valid iff position 9 equals it.

EU text: remainder 10 is *"X"*. Implementing Regulation (EU) 2024/883 corrected one row of the EU table (the decimal
for 7/11 to *"0,636"*); the US table still prints *"0.634"* for 7/11 [P]. Typo only, no effect on the result.

### 2.2 Worked example 1: `1G4AH59H45G118341` (49 CFR 565.15, Table VI) [P]

| Pos | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Char | 1 | G | 4 | A | H | 5 | 9 | H | (4) | 5 | G | 1 | 1 | 8 | 3 | 4 | 1 |
| Value | 1 | 7 | 4 | 1 | 8 | 5 | 9 | 8 | – | 5 | 7 | 1 | 1 | 8 | 3 | 4 | 1 |
| Weight | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 10 | 0 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 |
| Product | 8 | 49 | 24 | 5 | 32 | 15 | 18 | 80 | 0 | 45 | 56 | 7 | 6 | 40 | 12 | 12 | 2 |

`S = 411`, `411 = 37 · 11 + 4`, check digit **`4`** (the regulation's own result). Recomputed ✓.

### 2.3 Worked example 2: `TMBJR8NX6PY123456` (constructed from Škoda's illustrative `TMBJR8NX*PYxxxxxx`)

Products: `T` 3·8 = 24, `M` 4·7 = 28, `B` 2·6 = 12, `J` 1·5 = 5, `R` 9·4 = 36, `8`·3 = 24, `N` 5·2 = 10, `X` 7·10 = 70,
`P` 7·9 = 63, `Y` 8·8 = 64, `1`·7 = 7, `2`·6 = 12, `3`·5 = 15, `4`·4 = 16, `5`·3 = 15, `6`·2 = 12. `S = 413`,
`413 = 37 · 11 + 6` → check digit **`6`** → valid.

### 2.4 Worked example 3: check digit `X` (official)

EU 2021/535 Section B, Model C plate: `YSXFB56VX71134031`. `S = 64 + 14 + 42 + 30 + 8 + 15 + 12 + 50 + 63 + 8 + 7 + 18 +
20 + 0 + 9 + 2 = 362`, `362 = 32 · 11 + 10` → **`X`** ✓. A validator that only accepts digits in position 9 rejects it.

### 2.5 Validator steps (proposed)

Precedence (decision 4): **`badFormat` → `wrongLength` → `forbiddenLetter` → `nonNumericSerial` → `badChecksum`**
(eic order: characters, length, structure, check last). The validator ignores `referenceDate`.

1. **Characters.** Any character outside ASCII `0-9 A-Z` → **`badFormat`**. The empty string passes this step.
2. **Length.** Not exactly 17 → **`wrongLength`** (also `''`).
3. **Excluded letters.** Contains `I`, `O` or `Q` → **`forbiddenLetter`**.
4. **Serial.** Positions 14–17 not all digits → **`nonNumericSerial`** (EU 2.5 and US 565.15(d) agree on the last
   four; the stricter US "last five" rule for light vehicles is not checked).
5. **Check digit.** Position 9 ≠ the value from 2.1 → **`badChecksum`** (also any letter other than `X` in position 9).
6. Otherwise `{ valid: true }`.

Not checked (decision 5): whether the WMI is assigned, the region code, position 10 (model year), position 11 (plant),
position 7 (US cycle rule), the US "last five numeric" rule.

**Consequence of the precedence:** `badChecksum` means "everything else is a correct VIN, only position 9 is wrong".
An application that must accept older European VINs can treat `{ valid: false, reason: 'badChecksum' }` as acceptable.
The README should say so (decision 3).

### 2.6 What the check digit cannot detect (my derivation)

- **Same-value substitutions.** Characters with equal values (`A`/`J`/`1`, `B`/`K`/`S`/`2`, …) are interchangeable:
  `TMBAR8NX6PY123456` (`J` → `A`) is still valid. The common misreading `S` ↔ `5` is caught (`S` = 2).
- Every other single-character error outside position 9 is caught: each weight there is 2–10, the value difference is
  1–9, and 11 is prime, so `weight · Δ ≢ 0 (mod 11)`.
- Transpositions of two neighbours among positions 1–8 and 10–17 are caught unless both characters have the same value
  (neighbouring weights differ). Swaps involving position 9 were not analysed.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| 1954 | first VINs in the US (various formats) | Škoda [P] |
| 1977–1980 | SAE J1044 (WMI) first issued 1977; ISO 3779/3780 first editions (Wikipedia: 1979 and 1980) | SAE store page J1044A_197709 [P]; ISO years UNVERIFIED |
| model year 1981 | 17-character VIN with check digit standard in the US (49 CFR 565; 60-year uniqueness counted from MY 1980) | 49 CFR 565.13(d) [P]; Škoda: format standardised in 1981 [P] |
| model year 1984 | Škoda uses the VIN | Škoda [P] |
| 2008/2009 | 49 CFR 565 rewritten (73 FR 23379); Subpart B for vehicles from 30 April 2009, position 7 rule for the 2010–2039 cycle | 49 CFR 565.2, 565.15 [P] |
| 2011 – 5 Jul 2022 | EU: Regulation 19/2011, 6-character VDS (positions 4–9), **no check digit**, last four digits numeric, no I/O/Q | 19/2011 Annex I Part B [P] |
| 6 Jul 2022 | EU: 2021/535 replaces 19/2011; **check digit mandatory for new vehicle types** (Art. 12(1)) | 2021/535 [P] |
| 2024 | 2024/883 inserts Annex II points 2.0.1–2.0.5 (VIN marked on every vehicle, unique, 30-year traceability) and corrects the Section C table | 2024/883 [P] |
| 7 Jul 2026 | EU: national authorities refuse registration, placing on the market and entry into service of vehicles whose VIN has no correct check digit (Art. 12(2)) | 2021/535 [P] |

2021/535 Article 12(2), verbatim fragments: *"With effect from 7 July 2026, national authorities shall refuse, on grounds
relating to the check digit"* *"of the vehicle identification number, the registration, placing on the market and entry
into service"* *"of vehicles, which do not comply with the technical specifications set out in Annex II, Part 2, Section
C"* [P]. Article 12(1): *"With effect from 6 July 2022, type-approval authorities shall refuse to grant EU type-approval"*
*"in respect of new types of vehicles, with regard to the check digit of the vehicle identification number,"* [P].

### 3.2 European VINs without a check digit

Until 2022/2026 the EU did not require a check digit, so a correct older European VIN often fails 2.1 (fillers such as
`Z` in position 9 are typical; Wikipedia: check digit *"compulsory for vehicles in North America and China, but not so
in Europe"*, UNVERIFIED and outdated since 2021/535). My inferences:

- Article 12(2) is about registering **new** vehicles; already registered vehicles keep their VIN, so Czech registers,
  insurance and used-car data will contain VINs without a valid check digit for decades.
- 2021/535 is adopted under Regulation (EU) 2019/2144, which covers categories M, N and O (not re-read). Motorcycles (L,
  Regulation 168/2013) and tractors (T) have their own rules, which I did not read: they may still lack a mandatory
  check digit (UNVERIFIED).
- Some European makers used a check digit before it was required (Škoda's 2023 article calls position 9 *"takzvaná
  kontrolní číslice"* [P]); since when Škoda does so is not stated.

That is why decision 3 matters: a strict validator is right for new vehicles and wrong for many real older ones.

### 3.3 Small manufacturers (`9` in position 3)

EU: global production < 500 vehicles/year → position 3 is `9`, positions 12–14 assigned by the authority (2.2.3) [P].
US: low-volume manufacturer (< 1 000 of a type per year) → a `9` in position 3 always indicates a six-character
manufacturer identifier (positions 1–3 + 12–14) [P]. Consequence: positions 12–13 may be **letters** (EU requires only
14–17 to be digits). Czech examples from the Wikibooks WMI list (UNVERIFIED): `TM9`/`TE6` TEDOM buses, `TM9`/`SE3`
Škoda Transportation trolleybuses, `TK9`/`SL5` SOR Libchavy.

### 3.4 Czech official numbers (*úřední číslo*) with the Ministry's WMI `TM1`

[P, snippet] Ministry of Transport, *Instrukce pro STK č. 3/2003* and methodology *152vin*: *"Ministerstvu dopravy byl
přidělen, pro účely udělování čísla VIN a úředního čísla, světový kód výrobce (WMI)"* = `TM1` (one snippet reads
`TMI`, impossible because `I` is excluded). Structure from the snippets: positions 1–3 `TM1`; 4 `V` for a whole vehicle
(another letter for a component); 5–6 vehicle category or component; **7–9 numeric code of the district** that assigned
it; 10 year of assignment; 11 letter code of the region (*kraj*); 12–17 sequence number. It is given after a major rebuild
or when the original VIN was lost; the Ministry adds that a VIN in the registration document is never replaced by
another VIN (*"maximálně lze do technického průkazu zapsat přidělené úřední číslo"*).

Consequence: position 9 is part of the district code, **not a check digit**, so such numbers fail 2.1 about 10 times
in 11 (constructed sample `TM1VM11233A000001` → `badChecksum`). The documents are from 2002/2003 and could not be opened
(md.gov.cz CAPTCHA); whether this scheme is still used is UNVERIFIED. Proposal: out of scope (question B).

### 3.5 Pre-1981 and non-17-character VINs

Out of scope (decision 1): no common structure, no check rule, and Czech law itself falls back to the chassis number when
there is no VIN (§ 4 odst. 3 písm. d)). The validator returns `wrongLength` for them.

### 3.6 Lookalikes

- **SPZ / RZ** (registration plate, separate v1.1 identifier): 7–8 characters → `wrongLength`.
- **Chassis or engine numbers**: any length → mostly `wrongLength`.
- **Masked VINs** (`TMBJR8NX*PYxxxxxx` in Škoda's article, `*` for the check digit): `badFormat` (`*`, lower case).
- **North American / Chinese VINs**: same rules, valid if correct (the validator is not Czech-specific, decision 5).

---

## 4. Edge and invalid variants

The spec defines **no** variants for VIN (line 21: VIN is v1.1, *"až po ověření pravidel v oficiálních zdrojích"*).
Everything below is a proposal (decisions 6–7). Every value has exactly one property or fault.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Catches | Example |
| --- | --- | --- | --- |
| `checkDigitX` | plain VIN whose check digit is `X` (remainder 10) | validators that expect a digit in position 9 or forget remainder 10 | `TMBJR8NXXPY123413` |
| `smallManufacturer` | WMI `TM9`, positions 12–13 letters, 14–17 digits, check digit recomputed | validators that require positions 12–17 (or 13–17) numeric, or reject `9` in position 3 | `TM9KX3B11R0AB7012` |
| `noModelYear` | plain VIN with `0` in position 10, check digit recomputed (the EU's own example shape) | validators that enforce US model year codes in position 10 | `TMBJR8NX90Y123456` |

Not proposed: `lowercase` / `withSpaces` (both forbidden by the texts in 1.4, unlike IBAN's paper format); a
"legacy European VIN without check digit" edge (impossible under the recommended strict validator; covered by the
`badChecksum` reason, 2.5).

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | One fault only |
| --- | --- | --- |
| `badChecksum` | plain VIN with position 9 replaced by a uniformly drawn **other** check character from `0`–`9`, `X` | everything else valid |
| `wrongLength` | `int(0, 1)`: **0** → plain VIN without its last character (16); **1** → plain VIN + one random digit (18) | allowed characters only |
| `forbiddenLetter` | plain VIN with one of its 17 characters replaced by `I`, `O` or `Q` | the classic `O`/`0`, `I`/`1` typo |
| `nonNumericSerial` | plain VIN with one of positions 14–17 replaced by a letter (`I`, `O`, `Q` excluded), check digit **recomputed** | passes every pure check-digit validator |

Reason code without a variant: **`badFormat`** (lower case, spaces, other characters), as in eic and ean.

---

## 5. Known samples

No VIN of a real vehicle is used: a VIN identifies one car and, through the register, its keeper. The official samples
are the fictitious ones printed in the regulations.

### Valid

| Input | What | Covers |
| --- | --- | --- |
| `1G4AH59H45G118341` | 49 CFR 565.15 Table VI sample [P], `S = 411` | worked example 1 |
| `VRZUA5FX29J276031` | 2021/535 Annex II Section B, Models A and E [P], `S = 464`, `r = 2` | EU official |
| `ZCFC35A3405850414` | 2021/535 Section B, Model B [P], `S = 356`, `r = 4` | `0` in position 10 (no model year) |
| `YSXFB56VX71134031` | 2021/535 Section B, Model C [P], `S = 362`, `r = 10` | check digit `X` (worked example 3) |
| `2T0YX646XX7472266` | 2021/535 Section B, Model D [P], `S = 428`, `r = 10` | check digit `X` next to `X` in position 10 |
| `1M8GDM9AXKP042788` | Wikipedia's check-digit example (UNVERIFIED as official), `S = 351`, `r = 10` | `X` |
| `TMBJR8NX6PY123456` | constructed, Škoda-shaped, `S = 413` | worked example 2 |
| `TMBJR8NXXPY123413` | constructed, `S = 395`, `r = 10` | `checkDigitX` |
| `TMBJR8NX90Y123456` | constructed, `S = 350`, `r = 9` | `noModelYear` |
| `TM9KX3B11R0AB7012` | constructed, `S = 309`, `r = 1` | `smallManufacturer` (letters in 12–13) |
| `TMBAR8NX6PY123456` | `TMBJR8NX6PY123456` with `J` → `A` (both value 1) | undetectable error (2.6) |
| `11111111111111111` | constructed, `S = 89`, `r = 1` | WMI not checked (decision 5) |
| `00000000000000000` | constructed, `S = 0`, `r = 0` | placeholder value passes (question D) |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'TMBJR8NX4PY123456'` | `badChecksum` | 6 → 4 |
| `'TMBJR8NXXPY123456'` | `badChecksum` | 6 → `X` |
| `'TMBJR8NX3PY123465'` | `badChecksum` | last two digits swapped, expected `7` |
| `'1G4AH59H55G118341'` | `badChecksum` | official US sample, 4 → 5 |
| `'TMBZZZ5JZ8B012345'` | `badChecksum` | constructed legacy-European shape, filler `Z` in position 9 |
| `'TM1VM11233A000001'` | `badChecksum` | constructed Czech *úřední číslo* shape (3.4), expected `7` |
| `'TMBJR8NX8PY1234S6'` | `nonNumericSerial` | `S` in position 16, check digit recomputed (`S = 404`, `r = 8`) |
| `'TMBJR8NX3PY1234S6'` | `nonNumericSerial` | same with the old check digit: serial before checksum |
| `'TMBJR8NX3PYI23456'` | `forbiddenLetter` | `I` for `1` |
| `'TMBJR8NX3OY123456'` | `forbiddenLetter` | `O` in position 10 |
| `'TMBJR8NX3PY12345O'` | `forbiddenLetter` | `O` in position 17: forbidden letter before serial |
| `'TMBJR8NX3PQ123456'` | `forbiddenLetter` | `Q` |
| `'TMBJR8NX3PY12345'` | `wrongLength` | 16 |
| `'TMBJR8NX6PY1234560'` | `wrongLength` | 18 |
| `'TMBJR8NX3PYI2345'` | `wrongLength` | 16 with `I`: length before forbidden letter |
| `'TMB12345'` | `wrongLength` | short pre-standard shape |
| `''` | `wrongLength` | empty |
| `'tmbjr8nx3py123456'` | `badFormat` | lower case |
| `'TMB JR8NX3 PY123456'` | `badFormat` | spaces |
| `' TMBJR8NX6PY123456'` | `badFormat` | leading space, not trimmed |
| `'TMBJR8NX3PY-123456'` | `badFormat` | hyphen |
| `'TMBJR8NX*PY123456'` | `badFormat` | Škoda's masked check digit |
| `'*TMBJR8NX6PY123456*'` | `badFormat` | start/end symbols of a two-line marking |
| `'TMBJR8NX3PY12345Ö'` | `badFormat` | non-ASCII letter |
| `TMBJR8NX3`, U+00A0, `PY123456` | `badFormat` | no-break space |
| full-width `ＴＭＢＪＲ８ＮＸ３ＰＹ１２３４５６` | `badFormat` | not ASCII |

All sums computed by hand twice. The four EU samples were checked character by character (e.g. `VRZUA5FX29J276031`:
40 + 63 + 54 + 20 + 4 + 15 + 12 + 70 + 81 + 8 + 14 + 42 + 30 + 0 + 9 + 2 = 464). The test-writer should re-check every
value with an independent script.

---

## 6. Sources

Primary [P]:

1. **49 CFR Part 565**, Vehicle Identification Number (VIN) Requirements, §§ 565.2, 565.12, 565.13, 565.15 (73 FR 23379,
   30 Apr 2008, as amended 74 FR 67977, 22 Dec 2009, and 87 FR 13232, 9 Mar 2022). Official:
   <https://www.ecfr.gov/current/title-49/subtitle-B/chapter-V/part-565> (blocks automated access); read at
   <https://www.law.cornell.edu/cfr/text/49/565.15>, <https://www.law.cornell.edu/cfr/text/49/565.13>,
   <https://www.law.cornell.edu/cfr/text/49/565.12>, <https://www.law.cornell.edu/cfr/text/49/565.2>
2. **Commission Implementing Regulation (EU) 2021/535**, Article 12, Annex II Part 2 Sections A, B, C, recitals:
   <https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj> (read as the original OJ text at
   <https://lexaris.de/book/version/documentflat/head/2057153>; consolidated version 2025-01-01 not read:
   <https://eur-lex.europa.eu/eli/reg_impl/2021/535/2025-01-01/eng/pdf>)
3. **Commission Implementing Regulation (EU) 2024/883** (Annex II points 2.0.1–2.0.5, Section C table correction):
   <https://eur-lex.europa.eu/eli/reg_impl/2024/883/oj> (read at <https://lawplayer.com/eu/act/32024R0883>)
4. **Commission Regulation (EU) No 19/2011** (repealed 6 Jul 2022), Annex I Part B:
   <https://eur-lex.europa.eu/eli/reg/2011/19/oj> (read as adopted at
   <https://www.legislation.gov.uk/eur/2011/19/annex/I/part/B/adopted>)
5. **Zákon č. 56/2001 Sb.**, o podmínkách provozu vozidel na pozemních komunikacích, § 4 odst. 3 písm. d), § 28 odst. 1
   písm. o), § 32 odst. 1, § 36 odst. 4, § 37 odst. 1 písm. d) (version 50, 2026): <https://www.zakonyprolidi.cz/cs/2001-56>
6. **Škoda Auto**, *Co vše prozradí VIN?* (Škoda Storyboard, 13. 6. 2023; `TMB`, `TJ`–`TP`, check digit in position 9,
   year code, plant codes): <https://www.skoda-storyboard.com/cs/skoda-svet-cs/inovace-a-technologie/technologie-cs/co-vse-prozradi-vin/>
7. **Ministerstvo dopravy**, *Instrukce pro STK č. 3/2003* and methodology *152vin* ([P, snippet], `TM1` and *úřední
   číslo* structure): <https://md.gov.cz/getattachment/Dokumenty/Silnicni-doprava/STK/Instrukce-pro-STK/instrukce-STK-3-2003.rtf.aspx?lang=cs-CZ>,
   <https://md.gov.cz/getattachment/Dokumenty/Silnicni-doprava/Schvalovani-vozidel/Metodiky/152vin-(2).rtf.aspx?lang=cs-CZ>
8. **ISO 3779:2009** and **ISO 3780:2009** (cited, not read): <https://www.iso.org/standard/52200.html>,
   <https://www.iso.org/standard/45844.html>
9. **SAE J1044**, World Manufacturer Identifier (international WMI coordinator; first issue 1977):
   <https://saemobilus.sae.org/standards/j1044_202501-world-manufacturer-identifier>,
   <https://saemobilus.sae.org/standards/j1044a_197709-world-manufacturer-identifier>
10. **NHTSA vPIC** WMI decoder (checked 2026-11-14: `TMB`, `TMA`, `TMT` return no records, because vPIC holds only
    manufacturers that report to NHTSA): <https://vpic.nhtsa.dot.gov/api/vehicles/DecodeWMI/TMB?format=json>

Not read: ISO texts (paywalled), the SAE WMI database (paid), md.gov.cz documents (CAPTCHA), EUR-Lex HTML/PDF (empty
to the fetch tool), Regulation (EU) 2019/2144, the L-category (168/2013, 44/2014, 901/2014) and tractor VIN rules,
vyhlášky 341/2014 Sb. and 343/2014 Sb. (not searched for a VIN format).

Secondary (**UNVERIFIED**):
- Wikipedia, *Vehicle identification number* (`TJ`–`TP` "as of April 2019", check digit "not so in Europe", position 10
  "usually 0" outside North America, example `1M8GDM9AXKP042788`): <https://en.wikipedia.org/wiki/Vehicle_identification_number>
- Wikibooks, *World Manufacturer Identifier (WMI)* (Czech WMIs `TMA`, `TMC` Hyundai Motor Manufacturing Czech, `TMK`
  Karosa, `TMP`, `TMT` Tatra, `TLJ` Jawa, `TM9`/`TK9`/`TN9` small manufacturers):
  <https://en.wikibooks.org/wiki/Vehicle_Identification_Numbers_(VIN_codes)/World_Manufacturer_Identifier_(WMI)>
- NSAI (Ireland), national WMI issuer that notifies SAE as world co-ordinator:
  <https://www.nsai.ie/certification/automotive/transport-schemes/world-manufacturer-identifier/>

---

## 7. Differences from docs/spec.md (and the brief)

1. **Spec lines 21 / 166 / 222:** VIN has no format row and no variants in the spec. Everything in sections 1–4 is new.
2. **Brief: "check digit not required in the EU".** Outdated: required by 2021/535 for new vehicle types since 6 July
   2022 and for every new registration since 7 July 2026 (categories M, N, O). It was not required under 19/2011
   (until 5 July 2022), which is why older European VINs fail it (3.2).
3. **Brief: "pre-1981 / non-17-character VINs".** Proposed out of scope → `wrongLength` (3.5).
4. **Brief: position 10 model year codes.** A US rule only; the EU does not regulate position 10 and its own sample
   plates use `0`, `7`, `9`, `X` there. Proposal: not validated (decision 5), edge `noModelYear`.
5. **Brief: verify Czech WMIs.** Only `TMB` (Škoda) has a primary source. `TMA`/`TMC` (Hyundai Nošovice), `TMT`
   (Tatra), `TMK` (Karosa) are secondary only. `TM1` belongs to the Ministry of Transport (3.4, snippet).
6. **Brief: reason codes "letters-like faults".** A `letters` reason does not fit (VINs contain letters); proposed
   `forbiddenLetter` for `I`/`O`/`Q` and `nonNumericSerial` for letters in 14–17.

---

## 8. Placement and size (proposal)

### 8.1 Check digit and shared code

- Transliterate with one string: value = `'0123456789.ABCDEFGH..JKLMN.P.R..STUVWXYZ'.indexOf(char) % 10` (my
  derivation; `.` for the gaps `I`, `O`, `Q`; e.g. `S` at index 32 → 2, `Z` at 39 → 9). Every value is one digit, so the
  transliterated 17-digit string can go through the **existing core `weightedSum`** with
  `WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]` (decision 8). No core change.
- Check character = `'0123456789X'[S % 11]`.
- Reused core helpers: `weightedSum`, `intExcept` (`badChecksum`), `replaceDigitWithLetter` with `letters = 'IOQ'`
  (`forbiddenLetter`) and with the 23 VIN letters (`nonNumericSerial`). `hasLetter`/`hasNonDigit` are not needed.
- The validator needs one regex `^[0-9A-Z]*$`, a length check, `/[IOQ]/`, `/^\d{4}$/` on the last four.

### 8.2 Budget

Data the module needs (all small strings, no tables): `ALPHABET` (33 chars), `LETTERS` (23), `YEAR_CODES` (30),
transliteration string (40), 17 weights, `'0123456789X'`, WMIs `TMB` and `TM9`.

Estimate (UNVERIFIED, measure after implementation):

| Part | min+gzip |
| --- | --- |
| validator (2.5) | ~0.25–0.35 kB |
| generator, 3 edge and 4 invalid variants, identifier, index | ~0.6–0.8 kB |
| **vin own code** | **~0.9–1.1 kB of 2 kB** (ean measured 986 B) |

vin reuses no other identifier: flat 2 kB row. **Whole library:** 8.02 / 10 kB today, about 1.98 kB left, so vin leaves
roughly **0.9–1.1 kB for SPZ**, which is also planned for v1.1. If that is too tight, cheapest cuts: `nonNumericSerial`
(reason + variant, ~0.1 kB) and `noModelYear` (~0.05 kB); or raise the whole-library budget (question E).

---

## 9. Generator and variants contract (proposal)

### Options

`cz.vin()` with **no options** in v1.1 (decision 9). Output: 17 characters, upper case, no spaces, valid check digit. No
date dependence. Stream id `vin`. Subpath `czech-test-data/vin`, exports `createVin`, `validateVin` and the types
`VinReason`, `VinEdgeVariant`, `VinInvalidVariant`, `VinGenerator`. CLI command `vin`.

### Frozen constants (part of the determinism contract)

- `WMI = 'TMB'` (Škoda Auto, [P]), `SMALL_WMI = 'TM9'` (Czech range `TM` + small-manufacturer `9`).
- `ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'` (33), `LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'` (23).
- `YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789'` (30, all year codes; any code is a valid year in some cycle, so no
  date dependence and no "future" model year problem).
- `WEIGHTS` as in 8.1, `CHECK = '0123456789X'`, `FORBIDDEN = 'IOQ'`.

### Draw order (determinism)

`checkChar(v)` = `CHECK[S % 11]` over the 16 non-check positions, no draws. `withCheck(v)` = `v` with position 9 set
to `checkChar(v)`.

**Plain `generate()`:** `vds` = 5 × `ALPHABET[int(0, 32)]` (left to right); `y = YEAR_CODES[int(0, 29)]`;
`tail = digits(7)` (position 11 plant digit, as Škoda's 0–9 plant codes, then a 6-digit serial).
Result `withCheck(WMI + vds + '?' + y + tail)`.

**Edge variants:**
- `checkDigitX`: repeat `v = generate()` until `v[8] === 'X'` (probability 1/11 per try).
- `smallManufacturer`: `vds` and `y` as plain; `plant = digits(1)`; `code = LETTERS[int(0, 22)] + LETTERS[int(0, 22)]
  + digits(1)` (positions 12–14); `serial = digits(3)`; result `withCheck(SMALL_WMI + vds + '?' + y + plant + code + serial)`.
- `noModelYear`: `v = generate()`; result `withCheck(v` with position 10 = `'0')`.

**Invalid variants:**
- `badChecksum`: `v = generate()`, `c = CHECK.indexOf(v[8])`, `n = intExcept(random, 0, 10, c)`, position 9 = `CHECK[n]`.
- `wrongLength`: `v = generate()`, `k = int(0, 1)`; `0` → `v.slice(0, 16)`; `1` → `v + digits(1)`.
- `forbiddenLetter`: `v = generate()`, `replaceDigitWithLetter(random, v, [0, 1, …, 16], 'IOQ')`.
- `nonNumericSerial`: `v = generate()`, `w = replaceDigitWithLetter(random, v, [13, 14, 15, 16], LETTERS)`, result
  `withCheck(w)`.

### Reason codes

`'badFormat' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial' | 'badChecksum'`, in precedence order.

---

## 10. Decisions (approved 2026-11-14: every recommendation below was accepted, alternatives rejected; check digit policy 3(a) strict)

1. **Scope** = 17-character ISO 3779 VINs only; pre-1981, other lengths, chassis numbers out of scope (`wrongLength`).
   Recommendation: **yes**.
2. **Character rules**: ASCII `0-9 A-Z`, upper case, no spaces, no trimming; lower case → `badFormat`. Recommendation:
   **yes** (49 CFR 565.13(i), 2021/535 2.7). Alternative: iban-style disputed edge `lowercase`.
3. **Check digit policy.** Recommendation: **(a) strict**: validator always checks position 9 and returns `badChecksum`;
   README explains that `badChecksum` is the last check, so apps that must accept pre-2022/2026 European VINs can accept
   that one reason. Matches the US, China (UNVERIFIED) and the EU since 7 July 2026; keeps the `badChecksum` variant.
   Alternatives: **(b) lenient**: no check-digit validation, no `badChecksum` variant (wrong for new vehicles, weakest
   negative tests); **(c) validator option** `{ checkDigit: false }` (changes the core validator template and
   `ValidatorOptions`, core budget, and `cz.validate.vin` cannot pass it today); **(d) two reasons**, `badChecksum` for a
   wrong `0`–`9`/`X` and `noCheckDigit` for a letter in position 9 (unreliable: a legacy filler can also be a digit).
4. **Precedence** `badFormat → wrongLength → forbiddenLetter → nonNumericSerial → badChecksum`. Recommendation: **yes**.
5. **Not validated**: WMI registry/region, position 10 (model year), position 11, US position 7 rule, US "last five
   numeric" rule. Recommendation: **yes** (EU does not regulate them; registry data would need a bundled, paid list).
6. **Edge variants** `checkDigitX`, `smallManufacturer`, `noModelYear`. Recommendation: **yes**.
7. **Invalid variants** `badChecksum`, `wrongLength`, `forbiddenLetter`, `nonNumericSerial`, plus reason `badFormat`
   without a variant. Recommendation: **yes**; drop `nonNumericSerial` first if the budget is short.
8. **Check digit via core `weightedSum`** on the transliterated string, no core change. Recommendation: **yes**.
   Alternative: inline loop in `src/vin/`.
9. **Generator**: WMI only `TMB` (the only Czech WMI with a primary source), random VDS from the 33-character alphabet,
   US year code in position 10, digits in 11–17, valid check digit by default, no options in v1.1. Recommendation:
   **yes**. Alternatives: add `TMA`/`TMC` (Hyundai Nošovice, secondary only); an option `{ modelYear }`; a fictitious WMI
   to avoid colliding with real Škoda VINs (random VINs may coincide with a real car, like random IČO).
10. **Czech *úřední číslo* (`TM1…`)**: out of scope; documented as a known `badChecksum` case. Recommendation: **yes**,
    unless question B shows it is still issued and appears in the VIN field.

---

## Open questions for Marek (answered 2026-11-14)

A. **Answer:** not done; `TM1` stays out of scope as UNVERIFIED (decision 10). Original question: can you (or the main session) download the md.gov.cz RTFs in section 6 item 7 by hand (CAPTCHA)? They would confirm
   `TM1` and the *úřední číslo* layout verbatim.
B. **Answer:** assumed no; decision 10 stands. Original question: do Czech registers or your target apps put the *úřední číslo* into the VIN field? If yes, decision 10 may need an
   edge variant and a policy exception, which the strict check digit (decision 3a) would reject.
C. **Answer:** no; the generator stays `TMB`-only (decision 9). Original question: do you have a primary source (CoC, recall notice, type-approval document) for Hyundai Nošovice `TMA`/`TMC` or Tatra
   `TMT`? Without one, the generator stays `TMB`-only.
D. **Answer:** accept, document only (the recommendation). Original question: should obvious placeholders (`00000000000000000`, `11111111111111111`) be rejected? They pass every rule in the law;
   rejecting them would need a new, non-official reason. Recommendation: accept, document only.
E. **Answer:** no change now; vin fits the current budget, the whole-library limit is revisited with SPZ. Original question: vin (~1 kB) plus SPZ in v1.1 may exceed the 10 kB whole-library limit (1.98 kB left). Raise the limit for
   v1.1, or keep vin to the minimal variant set?
F. **Answer:** committed by the main session (7da8042). Original note: this agent had no shell access, so `docs/rules/vin.md` is written but **not committed** on `m7-vin`.
