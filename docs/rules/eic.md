# eic (EIC kód odběrného místa plynu, Czech gas supply point code)

Status: **DRAFT**, awaiting Marek's approval · researched 2026-10-11 · rules-researcher

Czech meaning: *EIC kód* (*Energy Identification Code*) is the 16-character code that identifies one gas supply or
transfer point (*odběrné nebo předávací místo*, OPM) in the Czech gas market. The law defines it as an *"identifikační
číselný kód jednoznačně určující účastníka trhu s plynem a jednotlivé odběrné a předávací místo"* (vyhláška 349/2015 Sb.,
§ 2 odst. 1 písm. g). Although the law calls it *číselný* (numeric), it is alphanumeric. It belongs to the place, not to
the customer. It appears in contracts, on every gas invoice and is needed to switch supplier. Czech gas supply points
always start with `27ZG`.

Scope: **Czech gas supply point EICs only** (prefix `27ZG`). Other EICs, such as Czech participant codes `27X…`, foreign
EICs or the electricity EAN (identifier `ean`), are out of scope and get `wrongPrefix` or `wrongLength`.

Legend: **[P]** is a primary source: ENTSO-E documents, Sbírka zákonů via zakonyprolidi.cz, OTE documents, or a
distribution grid code (*Řád PDS*/*Řád PLDS*) approved by ERÚ. **[P, extract]** means that the primary document is an
ERÚ PDF I could not open (ERÚ serves it as `application/octet-stream`), and the wording comes from the search engine's
extract of that PDF. **UNVERIFIED** means the claim rests only on secondary sources or on my own inference.
"My derivation" marks arithmetic that anyone can re-check. It is not a rule from a source.

> **Main caveats.**
> 1. **Usage restriction in the ENTSO-E document.** The ENTSO-E *EIC Data Exchange Implementation Guide* v1.2,
>    § 5.1, says: *"The algorithm deriving from this document may only be used for the purpose of checking the validity
>    of an allocated EIC code, unless used by an authorised LIO when allocating EIC codes. Any other use of the ENTSO-E
>    algorithm is expressly prohibited."* A generator of valid-looking EICs is arguably "other use". This is not legal
>    advice. It is **decision 10 / question A** for Marek.
> 2. **LIO 27 is ČEPS, not OTE.** ENTSO-E's list of Local Issuing Offices gives `27 | CEPS | CZ`. ČEPS delegated the
>    gas participant series `27XG` to NET4GAS. The `27ZG` series for gas supply points is managed by **OTE** under its
>    *Pravidla jednotné identifikace EIC kódů v plynárenství*. I found that only through DSO grid codes (ERÚ PDFs,
>    [P, extract]). I could not find or open the OTE document itself.
> 3. The Czech sub-structure after `27ZG` (distribution system code, point type, 7-digit number) comes from the ERÚ PDFs
>    ([P, extract]), one LDS grid code [P] and secondary sites. ENTSO-E says a code is to be used *"as a complete string
>    without trying to extract information from its structure"* [P]. The proposed validator therefore does **not** check
>    positions 5–15 (decision 4).

---

## 1. Format

### 1.1 Legal basis [P]

Vyhláška č. 349/2015 Sb., o Pravidlech trhu s plynem (version 12, in force from 1. 1. 2026):

- § 2 odst. 1 písm. g): *"EIC kódem – identifikační číselný kód jednoznačně určující účastníka trhu s plynem a jednotlivé
  odběrné a předávací místo"*.
- § 5 odst. 1: *"Operátor trhu eviduje číselníky registrovaných účastníků trhu s plynem, anonymní kódy zahraničních
  účastníků a spravuje číselníky předávacích a odběrných míst a další nezbytné údaje k identifikaci účastníků trhu s
  plynem a jednotlivých odběrných a předávacích míst. Pro číselníky se používá EIC kód. Operátor trhu dále spravuje
  číselné identifikátory distribučních sítí."*
- § 5 odst. 2 (beginning): *"Provozovatel distribuční soustavy zajistí u operátora trhu označení přidělením číselných
  kódů"* (for supply and transfer points).

The law sets **no length, alphabet or check rule**. Those come from ENTSO-E (1.2) and OTE (1.3).

(I obtained the quotes in ≤ 100-character fragments through a fetch tool and joined them.)

OTE, *Obchodní podmínky OTE, a.s., pro plynárenství*, revision 25 (June 2025) [P]:
- 6.1.2.1: a distribution system is registered with a *"trojciferný identifikátor DS"* (3-digit DS identifier).
- 6.2.3.1: the first mandatory OPM attribute is the *"jednoznačný identifikátor OPM, tzv. EIC kód OPM"*.
- 6.2.4: this attribute *"nelze po zaregistrování měnit"* (cannot be changed after registration).

### 1.2 ENTSO-E structure (every EIC) [P]

ENTSO-E, *EIC Reference Manual*, release 5.5 (2022-02-01), § 5:

- § 5.2: *"Permitted characters are numbers (0 to 9), capital letters (A to Z, English alphabet) and the sign minus (-).
  To avoid confusion, the check character shall use numbers (0 to 9) or the capital letters (A to Z)."*
- § 5.3: 2 characters for the LIO (*"as assigned by the CIO"*), 1 character for the object type, *"12 digits, uppercase
  characters or minus signs allocated by the LIO"*, and *"1 check character based on the 15 previous characters"*.
- § 4.1: *"The EIC code is to be used as a complete string without trying to extract information from its structure."*
- § 4.2 object types: `X` party, `Y` area, `Z` measurement point (*"a physical or logical point that is used to
  identify an object where the measurement of energy is measured or calculated"*), `W` resource object, `T` tie-line,
  `V` location, `A` substation.

| Positions (1-based) | Length | ENTSO-E meaning |
| --- | --- | --- |
| 1–2 | 2 | LIO number (`27` = ČEPS, Czech Republic) |
| 3 | 1 | object type (`Z` = measurement point) |
| 4–15 | 12 | allocated by the LIO: `0-9`, `A-Z`, `-` |
| 16 | 1 | check character: `0-9` or `A-Z`, **never `-`** |

ENTSO-E's LIO list (eiccodes / entsoe.eu, LIO websites page) [P]: `27 | CEPS | CZ`. ČEPS [P]: *"Certain defined rights
and obligations of the National EIC Issuing Office were transferred from ČEPS to NET4GAS … concerning a specific code
series (beginning with 27XG) for the issuance of EICs for the gas sector."*

### 1.3 Czech gas supply points: `27ZG` sub-series

ERÚ-approved distribution grid codes, appendix *EIC kódy* (several DSOs, e.g. `priloha-c5-eic-kody.pdf`,
`rpdsrwegasnetp5eic.pdf`) [P, extract]:
- *"Na základě pravidel vydaných společností OTE, a. s. byla pro potřeby označování předávacích a odběrných míst v
  plynárenství vyčleněna jedna řada v rámci kombinací dostupných pro ČR. Tato řada je spravována OTE, a. s. s tím, že PDS
  byla přidělena „podřada", v rámci které jsou přidělovány kódy EIC pro jednotlivá odběrná místa."*
- The series identifies *"lokálního vydavatele kódu (27), druh označovaného subjektu/objektu (Z) … a znakem „G" také
  specifikuje, že daná řada je určena pro plynárenství. EIC kód takto vyčleněné podřady dále obsahuje 11 volitelných
  znaků + kontrolní znak."*
- Layout: `2 7 Z G SO SO SO OM X X X X X X X KZ`, i.e. *identifikace vydávací kanceláře*, *typ kódované entity / místo
  s měřením*, *identifikátor řady (plyn)*, *označení příslušné distribuční soustavy*, *druh odběrného místa*,
  *pořadové číslo*, *kontrolní znak*.
- *Druh odběrného místa*: `Z` skutečné (real), `V` virtuální (virtual), `N` nezákaznické (non-customer).
- *"kontrolní znak na konci nesmí mít hodnotu „-""*. The DSO skips the affected sequence number, which leaves a gap.
- *"EIC kód je nepřenositelný"*: after a point is cancelled, its code must not be reused for another point.

| Positions | Length | Content | Source |
| --- | --- | --- | --- |
| 1–4 | 4 | `27ZG`, fixed | ERÚ grid codes [P, extract]; ENERGO KD [P]; E.ON, epet.cz (*"vždy začíná 27ZG"*, UNVERIFIED) |
| 5–7 | 3 | distribution system code (*SO*, OTE's *trojciferný identifikátor DS*) | [P, extract]; OTE OPP 6.1.2.1 [P] |
| 8 | 1 | point type `Z` / `V` / `N` | [P, extract] |
| 9–15 | 7 | sequence number (*pořadové číslo*), digits | [P, extract]; usetreno.cz (*"7místné pořadové číslo"*, UNVERIFIED) |
| 16 | 1 | ENTSO-E check character (section 2) | ENTSO-E [P] |

**Distribution system codes (positions 5–7).**

| Code | Network | Source |
| --- | --- | --- |
| `100` | Pražská plynárenská Distribuce (*DS PP*, Praha) | [P] RWE GasNet appendix 5, PPD appendix 5 |
| `200` | GasNet, *síť Severozápadní Čechy, zóna centrální* | [P] RWE GasNet appendix 5 |
| `300` | GasNet, *síť Severozápadní Čechy, zóna západní* | [P] |
| `400` | GasNet, *síť Severozápadní Čechy, zóna severní* | [P] |
| `500` | GasNet, *síť Východní Čechy* (former VČP) | [P] |
| `600` | GasNet, *síť Jižní Morava* (former JMP) | [P]. svitimestejne.cz (2017) attributing 600 to E.ON is wrong |
| `700` | GasNet, *síť Severní Morava* (former SMP) | [P] |
| `900` | *DS E.ON* (today EG.D, South Bohemia) | [P]; E.ON → EG.D rename from secondary sites |
| `800` | not mentioned by any source | – |
| `dXX` | local distribution system (LDS), inside regional network `d`, `XX` = LDS number (e.g. ENERGOAQUA `711` [P]) | [P, extract]: *"objekty LDS v rámci regionální sítě STP budou mít označení 2 XX, kde XX je pořadové číslo sítě LDS v rámci PDS"*; ENERGO KD [P]: *"Základní formát EIC kódu v LDS ENERGO KD s.r.o. – 27ZG203Zxxxxxxxx (šestnáctimístný kód – prvních 8 míst se nemění – pozice označené x je pořadové číslo přidělené PLDS)"* |

OTE manages *"číselné identifikátory distribučních sítí"* (§ 5 odst. 1), but no public list was found (question C).

**Verified by the main session (2026-10-11):** the ERÚ PDFs listed in section 6 were downloaded with `curl` and read
with `pdftotext`. The quoted wording, the layout `2 7 Z G D D D OM X X X X X X X KZ` (PPD writes `SO SO SO`), the
point types `Z`/`V`/`N`, the "never `-`, skip the sequence number" rule and the network codes in the table above are
in the text layer verbatim. The [P, extract] claims from these PDFs are therefore [P].

### 1.4 Display form

Every source writes the code as 16 characters with no spaces (ENTSO-E examples, OTE's own codes, ENERGO KD, distributor
pages). No grouped written form is defined. I did not check a real gas invoice (UNVERIFIED).

### 1.5 Allowed characters (proposed validator)

Exactly 16 characters from `0-9`, `A-Z` (ASCII upper case) and `-`. There is no trimming, as for every other
identifier. Anything else gives `badFormat`. That includes lower case, spaces, U+00A0, `_`, `*`, diacritics and
full-width characters. Position 16 = `-` gives `dashCheckCharacter`.

---

## 2. Check algorithm

### 2.1 ENTSO-E check character (weighted, mod 37) [P]

ENTSO-E, *EIC Data Exchange Implementation Guide* v1.2 (2024-02-08), § 5.3, steps 1–6:

1. Take the first 15 characters.
2. Map each character to a value: `0`–`9` → 0–9, `A`–`Z` → 10–35, `-` → 36.
3. Weights *"beginning with the greatest value to the left and ending with the lower at the far right"*: position 1 has
   weight 16 and position 15 has weight 2.
4. Multiply each value by its weight.
5. Sum: `S`.
6. *"Apply a modulo 37 … with the formula (36 – MOD ((S-1), 37))"*. The result 0–35 is mapped back with the table of
   step 2. *"If the check character generated is the "-" character (result of the calculation equal to 36), one of the
   characters in the proposed EIC code shall be changed in order to obtain a result which does not give a value of 36."*

So `c = 36 − ((S − 1) mod 37)`. The code is valid iff `c ≠ 36` and character 16 is `ALPHABET[c]`, where
`ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'` (index = value).

**Closed form for the validator (my derivation).** Let `c = 36 − ((S − 1) mod 37)`. Then `S + c ≡ 0 (mod 37)`.
Therefore a 16-character string is valid iff `Σ_{i=1..16} (17 − i) · value(char_i) ≡ 0 (mod 37)`, with weights
`16, 15, …, 2, 1` (the check character has weight 1), **and** character 16 is not `-`. The second condition is needed:
when `S ≡ 1 (mod 37)`, `-` (value 36) satisfies the sum but is forbidden. Equivalently `c = (37 − S mod 37) mod 37`.
The final `mod 37` matters when `S ≡ 0`. Then the check character is `0`, not "37".

### 2.2 Worked example 1: `11XRWENET12345-2` (ENTSO-E's own example) [P]

ENTSO-E's table: values `1 1 33 27 32 14 23 14 29 1 2 3 4 5 36`, products `16 15 462 351 384 154 230 126 232 7 12 15 16
15 72`, *"total value: 2107"*. `36 − ((2107 − 1) mod 37) = 36 − 34 = 2`, so the check character is `2` (a digit,
*"since it is inferior to 10"*). Closed form: `2107 + 2 = 2109 = 37 · 57` ✓.

### 2.3 Worked example 2: `27ZG100Z0000001K` (constructed, Czech gas shape)

| Pos | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9–14 | 15 | 16 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Char | `2` | `7` | `Z` | `G` | `1` | `0` | `0` | `Z` | `000000` | `1` | `K` |
| Value | 2 | 7 | 35 | 16 | 1 | 0 | 0 | 35 | 0 | 1 | 20 |
| Weight | 16 | 15 | 14 | 13 | 12 | 11 | 10 | 9 | 8…3 | 2 | (1) |
| Product | 32 | 105 | 490 | 208 | 12 | 0 | 0 | 315 | 0 | 2 | |

`S = 1164`. `(1164 − 1) mod 37 = 16`, `36 − 16 = 20` → `K` ✓. Closed form: `1164 + 20 = 1184 = 37 · 32` ✓.

Shortcut for test oracles (my derivation): `27ZG` contributes 835. `27ZG` followed by `Z` at position 8 contributes
1150 (≡ 3 mod 37).

### 2.4 Validator steps (proposed)

Precedence (decision 2): **`badFormat` → `wrongLength` → `wrongPrefix` → `dashCheckCharacter` → `badChecksum`**. This
is the ean order without `letters`, because letters are legal in an EIC. The validator ignores `referenceDate`.

1. **Characters.** Any character outside `0-9`, `A-Z`, `-` → **`badFormat`**. The empty string passes this step.
2. **Length.** Not exactly 16 characters → **`wrongLength`**. That includes `''`.
3. **Prefix.** Does not start with `27ZG` → **`wrongPrefix`**.
4. **Dash.** Character 16 is `-` → **`dashCheckCharacter`**. This step runs before the sum, so a trailing `-` always
   gets this reason, whatever the sum is.
5. **Check character.** `Σ (17 − i) · value(char_i) mod 37 ≠ 0` → **`badChecksum`**.
6. Otherwise `{ valid: true }`.

Positions 5–15 are **not** checked against the Czech sub-structure (decision 4).

### 2.5 Worked example 3: precedence

- `27XGOTE-CZ-GAS-R` (OTE's own participant EIC, [P]) is a valid ENTSO-E code: `S = 2711`, `36 − (2710 mod 37) = 27` →
  `R` ✓. It starts `27X`, so the result is **`wrongPrefix`**. A pure ENTSO-E validator accepts it.
- `27ZG100Z0000037-` (constructed): `S = 1185 ≡ 1 (mod 37)`, so the computed check value is 36 (`-`). A naive validator
  that compares `ALPHABET[36 − ((S−1) % 37)]` with the last character, or that only tests the closed-form sum, accepts
  it. The result is **`dashCheckCharacter`**. No valid code with this body exists: OTE skips sequence number `0000037`
  in network `100`.

### 2.6 Error detection (ENTSO-E claim, my derivation)

IG § 5.3.7 [P]: the scheme *"detects 100% of all single digit errors and all transposition errors"*. My derivation
confirms it. 37 is prime, the weights 1–16 are non-zero and pairwise different mod 37, and the values differ by less
than 37. So every single substitution and every swap of two characters (at any distance, including the check
character) changes the sum mod 37. Unlike ean (2.7 there), no undetectable transposition exists. `O` for `0` is a
legal character, but it is still caught as `badChecksum`.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| 2001-05-24 | ETSO/ENTSO-E EIC Reference Manual v1 | [P] RM revision history |
| 2002-06-20 | v2: the asterisk `*` removed from the character set | [P] |
| 2004-09-30 | v3: object type `W` added | [P] |
| 1. 1. 2007 – 31. 12. 2009 | Vyhláška 524/2006 Sb. § 20: the **transmission system operator** keeps the code lists of participants and supply points; the term "EIC" does not appear | [P] zakonyprolidi.cz 2006-524 (via fetch tool, not quoted) |
| 1. 1. 2010 – 31. 12. 2015 | Vyhláška 365/2009 Sb. § 2 odst. 2 písm. u): *"EIC kód – identifikační číselný kód jednoznačně identifikující účastníka trhu s plynem a jednotlivé odběrné a předávací místo"*; § 25 odst. 1: OTE keeps the code lists, *"Pro číselníky se používá EIC kód"* | [P] zakonyprolidi.cz 2009-365 |
| 1. 1. 2016 | Vyhláška 349/2015 Sb. replaces 365/2009 Sb.; § 2 odst. 1 písm. g), § 5 as quoted in 1.1 | [P] |
| 2018-05-08 | RM 5.3: the § 5.1 examples corrected (earlier `10X1680A248`, `10X---ENTSOE--3` were not 16 characters) | [P] RM 5.5 revision history; RM 5.2 text |
| 2022-02-01 | RM 5.5 (latest read); § 5 unchanged in substance since 5.2 | [P] |
| 2024-02-08 | Implementation Guide v1.2 (check algorithm, § 5.3) | [P] |
| 1. 1. 2026 | Version 12 of 349/2015 Sb. in force; definition unchanged | [P] |

The 16-character length, the alphabet and the check rule have no known exceptions or legacy formats in the Czech gas
market. The validator has no date-dependent rules. **When `27ZG` was introduced** (2007 market opening? OTE taking
over in 2010?) was not found. UNVERIFIED, and irrelevant to validation.

### 3.2 Several kinds of `27ZG` code share the format

- Point types `Z` (real customer point), `V` (virtual OPM, e.g. a DS's loss / residual diagram, OTE OPP 6.2.2 [P]) and
  `N` (non-customer).
- Transfer points between systems, OPMs of gas producers and storage. Their exact shape is unknown (UNVERIFIED).
- OTE's own technical code for the Czech virtual trading point *"EIC kód VOB CZ pro XML výměnu zpráv … 27ZG---VPB-----E"*
  (OTE OPP rev. 25, page 2 [P]). It has hyphens in positions 5–15, so it does not follow the OPM layout. The PDF text
  layer (checked by the main session, question B) reads exactly `27ZG---VPB-----E`, and **it fails the ENTSO-E check**: `S = 3299`, expected check character `V`, printed `E`. Either I
  misread the number of hyphens (I checked every split of the 8 hyphens: none gives `E`), or the code is a local code
  not computed by the ENTSO-E algorithm. The text layer rules out a misreading, so it is an OTE local code or a typo.
  Not a supply point, not used as a fixture; our validator returns `badChecksum` for it.

A validator cannot tell these kinds apart and does not try (decision 4).

### 3.3 Stable, never reused

ERÚ grid codes [P, extract]: *"EIC kód je nepřenositelný"*. OTE OPP 6.2.4 [P]: the identifier cannot be changed after
registration. No effect on validation.

### 3.4 Lookalikes

- **Czech participant EICs** `27X…` (OTE `27XGOTE-CZ-GAS-R` [P]; PPD `27XG-PPD-DSO-CZE`, NET4GAS `27XG-RTN-TSO-CZ9`,
  ČEZ `27XCEZ-INTRA---M` from cs.wikipedia, UNVERIFIED; I recomputed the first three, all are valid EICs) →
  `wrongPrefix`.
- **Foreign or European EICs**: `21Y---A001A001-B` (ENTSOG LIO 21, the CZ VOB REMIT code in OTE OPP [P]), `10X…`,
  `11X…` → `wrongPrefix`.
- **Electricity EAN** (18 digits, `8591824…`) → `wrongLength`. Czech electricity supply points use EAN, not EIC.
- **Gas meter serial number** (*číslo plynoměru*): a different number printed on the meter. Its shape varies, usually
  `wrongLength` or `wrongPrefix`.

---

## 4. Edge and invalid variants

The spec defines **no** variants for eic (the line 48 table has no EIC row). Everything below is a **proposal**
(decisions 5–7). Every value has exactly one property or fault.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Catches | Example |
| --- | --- | --- | --- |
| `checkCharacterDigit` | plain EIC whose check character is a digit `0`–`9` (10 of 36 values) | validators or regexes that require a letter at position 16 (kupnisila.cz calls the check character a "letter") | `27ZG200Z12345679` |
| `lds` | EIC of a local distribution system: `27ZG` + region digit + LDS number `01`–`99` + `Z` + 7 digits + check | validators that require positions 5–7 to be `100`, `200`, … (whitelist of big DSOs) | `27ZG299Z00000006` |

Not proposed (budget, decision 5): `virtualPoint` / `nonCustomerPoint` (`V`, `N` at position 8; rare for customer-facing
forms), `withHyphens` (a `27ZG` code with `-` in positions 5–15, like OTE's VOB code; valid for the proposed validator,
see samples).

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | One fault only |
| --- | --- | --- |
| `badChecksum` | plain EIC with the check character replaced by a different character from `0-9A-Z` (never `-`) | prefix, length and alphabet untouched |
| `wrongLength` | `int(0, 1)`: **0** → plain EIC without its check character (15 characters, "forgot the check character"); **1** → plain EIC with one random digit appended (17) | alphabet and prefix correct |
| `wrongPrefix` | `27` + an object type from `X, Y, W, T, V, A` (≠ `Z`) + `G` + positions 5–15 of a plain EIC + **recomputed** check character | a valid ENTSO-E EIC that also passes "starts with 27" checks; `27XG…` is the real NET4GAS gas-participant series |
| `dashCheckCharacter` | `27ZG` body whose computed check value is 36, followed by `-` | passes every naive mod-37 check, only the forbidden `-` is wrong |

Reason code without a variant: **`badFormat`** (lower case, spaces, separators, other characters), as in ean and ico.

---

## 5. Known samples

No real supply point EIC is used as a fixture. An EIC identifies a place and may point to a household (ean precedent,
question B there). The official samples are ENTSO-E's examples and OTE's own non-OPM codes. The `27ZG` OPM-shaped values
are constructed. The secondary example `27ZG600Z0453982A` (kupnisila.cz, described as a real South Moravian supply point)
is valid under 2.1 (`S = 1359`, check `A`) and confirms that the algorithm applies to Czech gas codes. It is **not** used
as a fixture.

### Valid

| Input | What | Covers |
| --- | --- | --- |
| `27ZG100Z0000001K` | constructed, network `100`, `S = 1164` | worked example 2 |
| `27ZG200Z12345679` | constructed, `S = 1286` | `checkCharacterDigit` |
| `27ZG900Z00000000` | constructed, `S = 1258 = 37 · 34` | check character `0` (`S ≡ 0`; the shortcut without the final `mod 37` would give 37) |
| `27ZG100V0000001J` | constructed, virtual point, `S = 1128` | position 8 = `V` |
| `27ZG100N0000001H` | constructed, non-customer point, `S = 1056` | position 8 = `N` |
| `27ZG299Z00000006` | constructed, LDS-shaped (`2` + LDS `99`), `S = 1363` | `lds` |
| `27ZG203Z9999999Z` | constructed, ENERGO KD's LDS prefix `27ZG203Z` [P], `S = 1519` | check `Z` (value 35, the largest) |
| `27ZG---VPB-----V` | OTE's VOB code shape with the check character recomputed (`S = 3299`) | hyphens in positions 5–15 are accepted (decision 4) |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'27ZG100Z0000001L'` | `badChecksum` | check `K` → `L` |
| `'27ZG200Z12345678'` | `badChecksum` | check `9` → `8` |
| `'27ZG100Z0000010K'` | `badChecksum` | positions 14/15 swapped; expected `J` |
| `'27ZG1OOZ0000001K'` | `badChecksum` | letter `O` for `0` (legal characters); expected `Y` |
| `'27ZG100Z00000370'` | `badChecksum` | body with `S ≡ 1`: no check character can be valid |
| `'27ZG100Z0000037-'` | `dashCheckCharacter` | worked example 3, the sum is satisfied by `-` |
| `'27ZG100Z0000001-'` | `dashCheckCharacter` | sum also wrong; the dash step comes first |
| `'27XGOTE-CZ-GAS-R'` | `wrongPrefix` | OTE's participant EIC [P], ENTSO-E-valid |
| `'27XG200Z12345670'` | `wrongPrefix` | `wrongPrefix` variant shape, ENTSO-E-valid (`S = 1258`) |
| `'27XG-PPD-DSO-CZE'` | `wrongPrefix` | PPD participant EIC (cs.wikipedia, UNVERIFIED; check recomputed ✓) |
| `'21Y---A001A001-B'` | `wrongPrefix` | ENTSOG LIO 21, OTE OPP [P], ENTSO-E-valid |
| `'10X---ENTSOE---L'` | `wrongPrefix` | ENTSO-E RM 5.5 example [P], valid |
| `'10X168Y4E6H0041Z'` | `wrongPrefix` | ENTSO-E RM 5.5 example [P], valid |
| `'11XRWENET12345-2'` | `wrongPrefix` | ENTSO-E IG example [P], valid |
| `'10Z317973010277Q'` | `wrongPrefix` | ENTSO-E IG's *incorrect* example (expected `S`); prefix comes before the checksum |
| `'23X--130302DLGW-'` | `wrongPrefix` | python-stdnum's "check digit cannot be minus" case (`S ≡ 1`); prefix first |
| `'27ZG100Z0000001'` | `wrongLength` | 15 characters, check character missing |
| `'27ZG100Z0000001K0'` | `wrongLength` | 17 characters |
| `'859182400512345670'` | `wrongLength` | an electricity EAN (18 digits) |
| `''` | `wrongLength` | empty (ico/ean precedent) |
| `'27zg100z0000001k'` | `badFormat` | lower case (decision 3) |
| `'27ZG100Z0000001k'` | `badFormat` | lower-case check character |
| `'27ZG 100Z 0000001K'` | `badFormat` | spaces |
| `' 27ZG100Z0000001K'` | `badFormat` | leading space, not trimmed |
| `'27ZG100Z0000001K '` | `badFormat` | trailing space |
| `'27ZG100Z0000001*'` | `badFormat` | `*` (removed from the alphabet in 2002) |
| `'27ZG100Z_000001K'` | `badFormat` | `_` (allowed in EIC display names, not in codes) |
| `'EIC 27ZG100Z0000001K'` | `badFormat` | label in front (format before length) |
| `27ZG100Z`, U+00A0, `0000001K` | `badFormat` | no-break space |
| full-width `２７ＺＧ１００Ｚ００００００１Ｋ` | `badFormat` | U+FF10… / U+FF21… are not ASCII |

I recomputed every sum twice, with the ENTSO-E formula and the closed form. Spot checks: `27ZG200Z12345679` →
`(1286 − 1) mod 37 = 27`, `36 − 27 = 9` ✓; `27XG-PPD-DSO-CZE` → `S = 2798`, `(37 − 23) = 14` → `E` ✓;
`27XG-RTN-TSO-CZ9` → `S = 3062`, check `9` ✓; `10X---ENTSOE---L` → `S = 3087`, check `L` ✓;
`22XWATTPLUS----G` (python-stdnum's valid doctest) → `S = 2944`, check `G` ✓.

---

## 6. Sources

Primary [P]:

1. ENTSO-E, *The Energy Identification Coding Scheme (EIC) Reference Manual*, release 5.5, 2022-02-01 (§ 4.1, § 4.2,
   § 5.1–5.3; read as page images): <https://transgaz.ro/sites/default/files/users/user822/EIC_Reference_Manual_Release_5_5.pdf>
   (copy hosted by Transgaz); release 5.2, 2017-06-01: <https://www.entsog.eu/sites/default/files/2018-09/EIC_Reference_Manual.pdf>
2. ENTSO-E, *EIC Data Exchange Implementation Guide*, v1.2, 2024-02-08 (§ 5.1 usage restriction, § 5.3 check
   algorithm with worked example, § 5.3.7 strengths):
   <https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/cim_based/EIC_Data_Exchange_IG_v1.2.pdf>
3. ENTSO-E, *EIC LIO websites* (LIO list, `27 = CEPS`): <https://www.entsoe.eu/data/energy-identification-codes-eic/eic-lio-websites/>
4. ČEPS, *How to obtain an EIC* (LIO for CZ; `27XG` series delegated to NET4GAS): <https://www.ceps.cz/en/how-to-obtain-an-eic>
5. ENTSOG, *EIC Manual of procedures* (structure summary; LIO 21 = ENTSOG): <https://entsog.eu/eic-codes/manual-of-procedures>
6. **Vyhláška č. 349/2015 Sb.**, o Pravidlech trhu s plynem, § 2 odst. 1 písm. g), § 5 odst. 1–2 (version 12, from
   1. 1. 2026): <https://www.zakonyprolidi.cz/cs/2015-349>
7. **Vyhláška č. 365/2009 Sb.** (1. 1. 2010 – 31. 12. 2015), § 2 odst. 2 písm. u), § 25 odst. 1:
   <https://www.zakonyprolidi.cz/cs/2009-365>
8. **Vyhláška č. 524/2006 Sb.** (1. 1. 2007 – 31. 12. 2009), § 20: <https://www.zakonyprolidi.cz/cs/2006-524>
9. OTE, *Obchodní podmínky OTE, a.s., pro plynárenství*, revision 25, June 2025 (page 2: OTE's EIC codes; 6.1.2.1,
   6.2.2, 6.2.3.1, 6.2.4; read as page images):
   <https://www.ote-cr.cz/cs/registrace-a-smlouvy/files-registrace-plyn/Obchodni_Podminky_OTE_Plyn.pdf>
10. ENERGO KD s.r.o., *Řád provozovatele lokální distribuční soustavy* (section 3: LDS format `27ZG203Zxxxxxxxx`; read
    as page images): <https://www.energokd.cz/wp-content/uploads/2021/11/Rad-provozovatele-LDS.pdf>
11. GasNet, *Řád provozovatele distribuční soustavy* (2022), 7.3.1 (EIC system, refers to appendix 5, not included in
    the PDF): <https://www.gasnet.cz/-/media/GasNet/Files/Gasnet/obchodni-podminky-a-rady/rad-pds/rad-pds-gasnet-archiv/GN_Kodex_2022.pdf>

Primary, ERÚ appendices (first seen as search-engine extracts; downloaded and verified with `pdftotext` by the main
session on 2026-10-11, see 1.3; ERÚ serves them as `application/octet-stream`; the fetch
tool could not read them):
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/priloha-c5-eic-kody.pdf>
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/priloha-c5-eic-kody_0.pdf>
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/priloha-5-eic-kody.pdf>
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/rpdsrwegasnetp5eic.pdf> (RWE GasNet appendix 5; zone codes)
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/prilohac6eic.pdf>
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/priloha5zmenova-verze.pdf>
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/priloha4rplds-energoaqua.pdf> (LDS: PLDS generates EICs)
- <https://eru.gov.cz/sites/default/files/obsah/prilohy/radprovozovatele-priloha-4jednotnaidentifikace.pdf>

Not found or not read: OTE *Pravidla jednotné identifikace EIC kódů v plynárenství* (the old URL
`ote-cr.cz/o-spolecnosti/Zpravy_OTE/pravidla-jednotne-identifikace-eic-kodu-v-plynarenstvi`, cited by
svitimestejne.cz, returns 404), any public OTE list of gas distribution network identifiers, the GasNet EIC page
(<https://www.gasnet.cz/distribucni-soustava/informace-o-soustave/eic-kody>, HTTP 403), and the ENTSO-E central
registry download.

Secondary (**UNVERIFIED**):
- python-stdnum, `stdnum/eu/eic.py` (LGPL; same algorithm, doctests `22XWATTPLUS----G`, `23X--130302DLGW-`):
  <https://github.com/arthurdejong/python-stdnum/blob/master/stdnum/eu/eic.py>
- cs.wikipedia, *EIC kód* (participant codes of ČEZ, PPD, NET4GAS): <https://cs.wikipedia.org/wiki/EIC_k%C3%B3d>
- kupnisila.cz (positions, codes 100–900, example `27ZG600Z0453982A`):
  <https://www.kupnisila.cz/co-je-ean-a-eic-kod-elektromeru-a-plynomeru/>
- usetreno.cz (positions, Z/V/N, 7-digit number, EG.D 900): <https://www.usetreno.cz/eic-kod/>
- svitimestejne.cz, 2017 (E.ON "900, 600"; GasNet "200, 300, 400, 500, 700"): <https://www.svitimestejne.cz/2017/08/15/struktura-eic-kod/>
- E.ON, *EIC kód* (16 characters, always `27ZG`): <https://www.eon.cz/radce/energie/energeticky-slovnik/eic-kod-plynomeru/>
- epet.cz, *EIC kód*: <https://www.epet.cz/eic-k-d/>

---

## 7. Differences from docs/spec.md (and the brief)

1. **Line 40, "český prefix".** More precisely the fixed **4-character** prefix `27ZG`: LIO `27`, object type `Z`
   (measurement point), `G` (gas series managed by OTE). `27` alone also covers Czech participant, area and
   electricity codes.
2. **Brief: "OTE as Czech LIO, code 27".** Per ENTSO-E the LIO `27` is **ČEPS**. NET4GAS has the delegated `27XG`
   series (gas participants). OTE manages only the `27ZG` supply point series, under its own rules ([P, extract]).
3. **Line 40, "Kontrolní znak podle algoritmu EIC".** Confirmed (weights 16–2, mod 37, `36 − ((S − 1) mod 37)`). The
   spec omits that **`-` is never a valid check character**. That case gets the proposed reason `dashCheckCharacter`.
4. **Line 40, "16 znaků".** Confirmed, alphabet `0-9 A-Z -`, upper case only (RM § 5.2). The spec does not say upper
   case.
5. **Line 48 table: no EIC row.** The spec defines no edge or invalid variants. Section 4 proposes
   `checkCharacterDigit`, `lds`, `badChecksum`, `wrongLength`, `wrongPrefix`, `dashCheckCharacter` and the reason
   `badFormat`.
6. **Not in the spec: the ENTSO-E usage restriction** on the check algorithm (caveat 1, decision 10).
7. **Name.** The law calls the code *identifikační číselný kód* although it is alphanumeric. TSDoc should say "16
   characters, digits, capital letters and `-`".

---

## 8. Placement and size (proposal)

### 8.1 Where the mod 37 check lives

Proposal (decision 9): **inline in `src/eic/`**: a frozen `ALPHABET` string (`indexOf` = value, `charAt` = check
character) and one loop over 15 or 16 characters. The core `weightedSum` (`src/core/checksum.ts`) **cannot be reused**:
it reads digits with `Number(char)`, and EIC characters are letters and `-` (value 36). Generalising it (a value-mapper
parameter) would change the core, and the core has about 70 B left. No other identifier uses mod 37, so nothing is
duplicated. The core `replaceDigitWithLetter` / `hasLetter` are not needed, because there is no `letters` reason. The
"draw a different value" step (`drawn >= x ? drawn + 1 : drawn`, ean review N2) appears once more in `badChecksum`.

### 8.2 Budget

Estimate (UNVERIFIED, measure after implementation):

| Part | min+gzip |
| --- | --- |
| validator (one regex, length, prefix, dash, mod-37 loop) | ~0.2–0.3 kB |
| generator, 2 edge and 4 invalid variants, identifier, index | ~0.5–0.7 kB |
| **eic own code** | **~0.7–1.0 kB of 2 kB** (ean measured 986 B) |

eic reuses no other identifier: flat 2 kB row only. The whole library has about 2.4 kB left, so eic fits. If it gets
tight, dropping `dashCheckCharacter` (decision 6 alternative) saves roughly 0.1 kB.

---

## 9. Generator and variants contract (proposal)

### Options

`cz.eic()` with **no options** in v1 (decision 8). Output: 16 characters, `27ZG` + 3 digits + `Z` + 7 digits + check
character, upper case, no spaces. No date dependence. Stream id `eic`. Subpath `czech-test-data/eic`, exports
`createEic`, `validateEic` and the types `EicReason`, `EicEdgeVariant`, `EicInvalidVariant`, `EicGenerator`. CLI command
`eic` (M5).

### Frozen constants (part of the determinism contract)

- `PREFIX = '27ZG'`, `POINT_TYPE = 'Z'`, `BIG_DSO_SUFFIX = '00'`.
- `REGION_DIGITS = [1, 2, 3, 4, 5, 6, 7, 9]` (position 5; `8` is unused by every source). Order frozen.
- LDS number range `1`–`99`, padded to 2 digits.
- `ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'`, `DASH = 36`.
- `OTHER_TYPES = ['X', 'Y', 'W', 'T', 'V', 'A']` (ENTSO-E object types ≠ `Z`, in RM § 4.2 order). Order frozen.

### Draw order (determinism)

`checkValue(body15)` = `(37 − S mod 37) % 37` with `S = Σ (16 − i) · ALPHABET.indexOf(body15[i])`, `i = 0…14`. No
draws. It equals the ENTSO-E formula.

`drawBody(lds)`: `d = pick(REGION_DIGITS)`; then `so = lds ? d + pad2(int(1, 99)) : d + '00'`;
`body = PREFIX + so + POINT_TYPE + digits(7)`.

**Plain `generate()`:** repeat `body = drawBody(false)` until `checkValue(body) ≠ 36`. The probability of a retry is
1/37 per try. This mirrors OTE skipping the sequence number. Result: `body + ALPHABET[checkValue(body)]`.

**Edge variants:**
- `checkCharacterDigit`: repeat `v = generate()` until the last character is `0`–`9` (probability 10/36 per try).
- `lds`: like plain, but with `drawBody(true)`.

**Invalid variants:**
- `badChecksum`: `v = generate()`, `c = ALPHABET.indexOf(v[15])` (0–35), `drawn = int(0, 34)`,
  new value `drawn ≥ c ? drawn + 1 : drawn`, result `v.slice(0, 15) + ALPHABET[new]`.
- `wrongLength`: `v = generate()`, `k = int(0, 1)`; `0` → `v.slice(0, 15)`; `1` → `v + digits(1)`.
- `wrongPrefix`: repeat { `v = generate()`; `t = pick(OTHER_TYPES)`; `body = '27' + t + v.slice(3, 15)` } until
  `checkValue(body) ≠ 36`; result `body + ALPHABET[checkValue(body)]`.
- `dashCheckCharacter`: repeat `body = drawBody(false)` until `checkValue(body) === 36` (about 37 tries); result
  `body + '-'`.

### Reason codes

`'badFormat' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter' | 'badChecksum'`, in precedence order.

---

## 10. Decisions for Marek (recommendations)

1. **Scope / prefix = exactly `27ZG`.** Recommendation: **yes** (spec: "EIC plynu"; every DSO grid code). Alternatives:
   any EIC starting `27` (also accepts participant codes `27XG…`), or any valid ENTSO-E EIC (no Czech check).
2. **Reason precedence** `badFormat → wrongLength → wrongPrefix → dashCheckCharacter → badChecksum`. Recommendation:
   **yes** (ean order: "not a Czech gas EIC" before the check). Alternative: checksum before prefix.
3. **Strict alphabet**: ASCII `0-9 A-Z -`, upper case only, no spaces or trimming; lower case → `badFormat`.
   Recommendation: **yes** (RM § 5.2 says capital letters; no grouped form exists). Alternative: accept lower case and
   add an iban-style **disputed** edge `lowercase` (costs a reason-free `toUpperCase`, but has no official basis).
4. **No structure check of positions 5–15** (DSO code, point type, digits). Recommendation: **yes** (RM § 4.1 "complete
   string"; OTE's own `27ZG---VPB…` code, LDS codes and the unclear `600`/`900` attribution). Alternative: require
   `27ZG\d{3}[ZVN]\d{7}`, which would reject the OTE-style technical codes.
5. **Edge variants** `checkCharacterDigit`, `lds`. Recommendation: **yes**. Alternative: also `virtualPoint` and
   `withHyphens` (about 60–100 B each).
6. **Invalid variants** `badChecksum`, `wrongLength`, `wrongPrefix`, `dashCheckCharacter`, plus reason `badFormat`
   without a variant. Recommendation: **yes**. `dashCheckCharacter` is the EIC-specific trap: naive implementations
   accept it. Alternative: fold the trailing `-` into `badChecksum` (no own variant, ~0.1 kB less).
7. **`wrongPrefix` shape** = `27` + type ≠ `Z` + `G` + rest, check recomputed. Recommendation: **yes** (one fault,
   ENTSO-E-valid, passes "starts with 27"; `27XG` is the real NET4GAS series). Alternative: another LIO number (e.g.
   `21ZG…`), which a "starts with 27" check already catches.
8. **No generator options in v1**; default positions 5–7 = `REGION_DIGITS` + `00`, position 8 = `Z`. Recommendation:
   **yes** (budget; `900` = EG.D is secondary-only and `600` is disputed). Alternative: `{ distributor: 'ppd' |
   'gasnet' | 'egd' | 'lds' }` like ean, after question C is answered.
9. **Mod 37 inline in `src/eic/`** with `ALPHABET`, no core change. Recommendation: **yes** (core `weightedSum` is
   digits-only). Alternative: generalise `weightedSum` (core change, core budget).
10. **ENTSO-E usage restriction** (IG § 5.1, caveat 1). This needs your decision; I cannot assess it legally. Options:
    (a) proceed: the algorithm is published in open-source libraries (python-stdnum), and the generated values are
    test data, never allocated codes; add a README note. (b) Ask ENTSO-E first (`cio-admin@entsoe.eu`, or `cim@entsoe.eu`
    as the IG maintainer) and hold the eic generator until they answer. (c) Ship the validator only (contradicts spec
    line 13). Suggestion: (b) in parallel with implementation on the branch, and decide before publishing v1.
    **Marek decided (2026-10-11): (a).** Proceed with the generator; the README states that generated EICs are test
    data, not allocated codes.

---

## Open questions for Marek

A. ~~**ENTSO-E restriction** (decision 10): proceed, ask ENTSO-E, or validator only?~~ Answered: (a), proceed.
B. ~~Answered by the main session (2026-10-11): the text layer reads exactly `27ZG---VPB-----E`; dropped from the
   samples.~~ Original question: please let the main session copy the exact text of OTE's *"EIC kód VOB CZ pro XML výměnu zpráv"* from the PDF text
   layer (OTE OPP rev. 25, page 2). I read `27ZG---VPB-----E`, which fails the ENTSO-E check (expected `V`). If the
   text is the same, either OTE codes are not always ENTSO-E-checked, or OTE has a typo. Keep or drop the sample.
C. ~~Answered by the main session (2026-10-11): verified verbatim, see 1.3; `900` = DS E.ON, `700` = Severní Morava
   (missing in the draft), `800` absent. No public OTE list of gas network identifiers found.~~ Original question: the
   ERÚ PDFs in section 6 (*[P, extract]*) need a real download (e.g. `curl` + `pdftotext`) to confirm verbatim: the
   layout `27ZG SO SO SO OM XXXXXXX KZ`, the point types `Z/V/N`, and the DSO codes, especially whether **`900` is
   EG.D** and whether `800` exists. Most useful are `rpdsrwegasnetp5eic.pdf` and the current EG.D and PPD appendices.
   Is there a public OTE list of gas network identifiers (*"číselné identifikátory distribučních sítí"*, § 5 odst. 1),
   like `ciselnik_siti.xlsx` for electricity? I found none.
D. Do you have a real `27ZG` EIC of a **legal person or public body** (e.g. from a public tender's list of supply
   points) that we may use as a fixture? I used none, as in ean.
