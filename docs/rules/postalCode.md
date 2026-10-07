# postalCode (PSČ)

Status: **APPROVED** by Marek on 2026-10-06 (decisions in section 8; they override every "proposed",
"optional" and "open question" marker below) · researched 2026-10-06 · rules-researcher

> **Verified [P] (main session, 2026-10-06):** official list `ZV_PSC_ADR.csv` downloaded 2026-10-06 from
> <https://www.ceskaposta.cz/documents/d/guest/csv_psc_a-zip> (file dated 2026-10-01, effective since 1. 2. 2020
> per `zv_psc_adr-docx`). 16,264 codes (not ~2,700 – the list includes all types: 1 post office 2,202;
> 3 P.O. Box 988; 4 organisation 854; 5 sorting hub 14; 10 contract partner 12,206). Min `10000`, max `79999`.
> First digits: only **1–7** (1: 1,698 · 2: 2,493 · 3: 2,566 · 4: 1,772 · 5: 2,411 · 6: 2,078 · 7: 3,246).
> Range `20000`–`24999`: **174 codes** of all types (e.g. `22000` type 1, `21111` type 4); `22599` present.
> This makes the `foreignRange` basis (section 2 step 5) primary. Open question 1 is resolved.

Czech meaning: *poštovní směrovací číslo* (PSČ) is the postal code. Česká pošta, s.p. assigns it and keeps the
list. It is a five-digit routing code for the delivery post office, written in front of the post office or
municipality name in a postal address.

Legend: **[P]** is a primary source (Česká pošta, a state agency, or the UPU sheet that Česká pošta supplied).
**[S]** is an official state data standard that is not the source of the rule. **UNVERIFIED** means the claim
rests only on secondary sources.

---

## 1. Format

| Part | Digits | Meaning (UPU coding method, data from Česká pošta [P]) |
| --- | --- | --- |
| `d1` | 1 | postal zone (*postal zone*) |
| `d2` | 1 | central transport (*central transport*) |
| `d3` | 1 | district transport (*district transport*) |
| ` ` | 0–1 | one space between the 3rd and 4th digit (see "Space") |
| `d4d5` | 2 | delivery post office (*delivery*) |

- **Exactly 5 digits.** UPU, *Czech Rep.* sheet (02/2018, contact Czech Post) [P]: *"5 digits to the left of
  locality name; 1 space between 3rd and 4th digits; 2 spaces between code and locality name."*
- **No check digit and no checksum.** No source describes one, and the UPU coding method gives every digit a
  routing meaning.
- **Human-readable form `NNN NN`.** Every PSČ in Česká pošta's own address templates has this form. Examples are
  `190 16  PRAHA 916`, `623 00  BRNO 23` and `378 07  RAPŠACH` (Poštovní podmínky – Základní poštovní služby,
  Příloha č. 2, version of 1. 10. 2026) [P]. The two spaces before the post office name are part of the address
  layout, not part of the PSČ.
- **Machine form `NNNNN`.** RÚIAN (ČÚZK) stores the address point attribute `Psc` as **Integer, length 5**
  ("PSČ adresní pošty") [S, VFR structure 3.5/3.6, section 3.3.20]. RCzechia describes the Česká pošta data as
  "ZIP Code as string in format NNNNN" (UNVERIFIED).

### Space

- The official written form has one space after the 3rd digit (UPU [P], Česká pošta templates [P]).
- The machine form has no space (RÚIAN [S]).
- Result: `123 45` and `12345` are both valid. The space is **optional**, so `withoutSpace` is a valid edge variant
  (like `withoutSlash` for birthNumber). No other separator has an official basis. The UPU sheet does **not**
  mention a hyphen (`NNN-NN`). One search-engine summary claimed that it did, but the PDF does not say so.
- ČSN 01 6910 (typography of documents) is said to prescribe `123 45`, with two spaces before the place name
  (cs Wikipedia). The standard is behind a paywall, so this is **UNVERIFIED**. The rules above do not depend on it.

### Allowed characters

Only the digits `0-9` and at most one ASCII space (U+0020), placed right after the 3rd digit. Everything else is
outside the official format. Letters give `letters`, and any other deviation gives `badFormat` (section 2).

### Leading digit

| `d1` | Area (as of 1973; after 1993 split by state) | State |
| --- | --- | --- |
| 1 | Praha | CZ |
| 2 | Středočeský (from 25x; see 3.3 for 20x–24x) | CZ |
| 3 | Západočeský + Jihočeský (Plzeň, Karlovy Vary, České Budějovice) | CZ |
| 4 | Severočeský | CZ |
| 5 | Východočeský (+ parts of Vysočina) | CZ |
| 6 | Jihomoravský | CZ |
| 7 | Severomoravský | CZ |
| 8 | Bratislava | **SK** |
| 9 | Western and southern-central Slovakia | **SK** |
| 0 | Northern and eastern Slovakia | **SK** |

Sources: en/cs Wikipedia (UNVERIFIED). SITA, 2. 1. 2023, quoting the Slovenská pošta spokesperson: *"Pre územie
Slovenska po rozdelení ČSFR zostali tri pásma, označované číslami 8, 9 a 0"* (press report of an official
statement, UNVERIFIED as primary). Česká pošta's own template for mail to Slovakia uses `948 01 Lučenec
SLOVENSKO` (Příloha č. 3) [P], which shows that a Slovak PSČ has **the same `NNN NN` format**. A format-only check
therefore cannot tell Czech and Slovak codes apart. That is why section 2 proposes the `foreignRange` step.

Consistency check: RÚIAN stores the Czech PSČ as an Integer [S]. If any Czech PSČ started with `0`, the leading
zero would be lost. This fits "no Czech PSČ starts with 0", but it is only an inference.

---

## 2. Check algorithm (proposed validator)

The order matters only when an input has more than one problem. Each generated invalid variant has exactly one
problem. The proposed precedence follows birthNumber (approved decision 7 there): **`letters` → `badFormat` →
`wrongLength` → `foreignRange`**. The first failing step gives the reason.

1. **Letters.** If the input has any Unicode letter (`\p{L}`), the result is **`letters`**. Examples: `CZ-110 00`,
   `1O0 00`.
2. **Characters.** If the input has any character other than `0-9` and the ASCII space U+0020, the result is
   **`badFormat`**. This covers the hyphen, dot, tab, newline, the no-break space U+00A0 (see open question 4) and
   full-width digits.
3. **Space.** If there is more than one space, or there is exactly one space that is not right after the 3rd
   character (index 3, which means exactly three digits before it), the result is **`badFormat`**. No trimming:
   leading or trailing spaces fail here.
4. **Length.** If the number of digits (spaces not counted) is not 5, the result is **`wrongLength`**.
5. **Leading digit** (pending open questions 1 and 2). If the first digit is `0`, `8` or `9`, the result is
   **`foreignRange`**, because these are Slovak ranges.
6. Otherwise `{ valid: true }`.

Notes for implementation:

- One regex expresses steps 2–4 as a whole: `^\d{3} ?\d{2}$` with `\d` = `[0-9]`. Separate steps are still
  needed to return the specific reason.
- There is no checksum, so nothing goes into the shared mod 11 utilities.
- The validator does not depend on the date. It ignores `referenceDate`.
- **Existence is not checked** (spec: "výchozí generátor PSČ ověřuje jen formát"). A well-formed PSČ that Česká
  pošta never assigned is still `{ valid: true }`. See section 3.4 and open question 3.

### Worked example

Input `623 00` (BRNO 23, from Česká pošta Příloha č. 2):

1. No letters ✓.
2. Characters are `6`,`2`,`3`,` `,`0`,`0`, so only digits and U+0020 ✓.
3. One space at index 3 ✓.
4. Digits `62300` are 5 ✓.
5. `d1 = 6` is in 1–7 ✓ (zone 6, Jihomoravský).
6. Result: `{ valid: true }`. The machine form `62300` gives the same result (no space, so step 3 is trivially OK).

Counter-examples: `6230 0` → `badFormat` (step 3). `623 0` → `wrongLength` (step 4). `948 01` → `foreignRange`
(step 5).

---

## 3. Special cases and history

### 3.1 History

| Year | Event | Source |
| --- | --- | --- |
| 1973 | PSČ introduced in Czechoslovakia (cs Wikipedia: 1. 1. 1973), five digits, ten zones `0`–`9` | SITA / Slovenská pošta ("od roku 1973"), cs Wikipedia (exact date UNVERIFIED) |
| 1993 | After the split, Czechia keeps zones 1–7 and Slovakia keeps 8, 9, 0. The codes do not overlap. No renumbering. | SITA / Slovenská pošta, en Wikipedia (UNVERIFIED) |
| 2012 | Since May 2012 municipal editors cannot change the PSČ of an address point in RÚIAN; ČÚZK maintains it from Česká pošta data | ČÚZK FAQ 12 [P] |
| 2018 | UPU sheet for the Czech Republic (data from Czech Post): 5 digits, `NNN NN` | UPU [P] |
| 2026 | Poštovní podmínky of 1. 10. 2026, čl. 4 and Příloha č. 2: address templates in `NNN NN` form | Česká pošta [P] |

As of 2026-10-06 no change to the format is known. The *assignment* of individual codes changes over time. Česká
pošta updates its PSČ lists on the 1st working day of every month ("aktualizovány vždy k 1. pracovnímu dni
v měsíci", zákaznické výstupy page [P]).

### 3.2 Kinds of PSČ (all have the same format)

Poštovní podmínky – Základní poštovní služby, čl. 4 [P]:

- **PSČ of the address post office** (odst. 2 písm. d): *"poštovní směrovací číslo přidělené podnikem poště, která
  je pro danou poštovní adresu podnikem určena jako adresní pošta"*.
- Instead of that, *"poštovní směrovací číslo přidělené podnikem místu dodání nebo **zvláštní poštovní směrovací
  číslo přidělené podnikem adresátovi**"* (same letter). These are codes for large addressees.
- **P.O. box / delivery box** (odst. 3 písm. d): the PSČ of the post office where the box is. UPU example:
  `530 87  PARDUBICE 2` [P].
- **Poste restante** (odst. 4 písm. c): the PSČ of the chosen post office, e.g. `110 00  PRAHA 1` (UPU [P]).

The validator cannot tell these kinds apart, and it does not need to.

### 3.3 Range 200–249 (non-geographic)

- en Wikipedia (UNVERIFIED): *"Numbers 200 00 - 249 99 are reserved for internal needs of the postal system itself
  and are not assigned to any region."* cs Wikipedia (UNVERIFIED): Praha has the special ranges 21xxx and 22xxx,
  and Středočeský starts at 25xxx.
- Primary data point: Česká pošta's own seat is **`225 99` Praha 1** (footer of the Poštovní podmínky, 2026 [P])
  and was `225 99 PRAHA 3` in the 2018 UPU sheet [P]. So codes in this range are real, assigned PSČ. They are
  addressee-specific, not municipal.
- Consequence: the validator must **accept** `20x xx`–`24x xx`. Any rule like "Středočeský starts at 25" would
  reject Česká pošta's own address.

### 3.4 Existing vs. well-formed

- The official list of address PSČ is Česká pošta's *Seznam adresních PSČ* (`csv_psc_a-zip`, `ZV_PSC_ADR.csv`),
  updated monthly [P]. RCzechia counts **2,671** ZIP code areas (data as of 2021, UNVERIFIED).
- With about 2,700 address codes among 70,000 well-formed Czech codes (`1xxxx`–`7xxxx`), a random well-formed PSČ
  exists with a probability of only about 4 % (estimate, UNVERIFIED count). An application that checks against
  the real list will reject most generated values. This belongs in the README.
- The address list does **not** contain addressee-specific codes (`225 99`) or, probably, P.O. box codes. The ČÚZK
  FAQ says RÚIAN holds only PSČ tied to address points, not those of companies or organizations. So "exists in the
  address list" is **not** the same as "valid PSČ". This is a further reason not to make the list the default
  check.

### 3.5 Foreign codes that look Czech

- Slovak codes have the same format (`948 01`) → `foreignRange` (if approved).
- German codes are 5 digits without a space (`22767 HAMBURG`, Česká pošta Příloha č. 3 [P]). `22767` is
  indistinguishable from a Czech PSČ in the machine form, so it is valid. This is a known limit that cannot be
  fixed without the list.
- A country prefix (`CZ-110 00`, used in international mail per en Wikipedia, UNVERIFIED) is not part of the PSČ.
  Under strict input it gives `letters`.

---

## 4. Edge and invalid variants

`docs/spec.md` lists **no** edge or invalid variants for PSČ. Everything below is a proposal.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Generator constraint |
| --- | --- | --- |
| `withoutSpace` | `NNNNN`, the machine form (RÚIAN, Česká pošta data) | same distribution as the plain generator, space removed |
| `nonGeographic` *(optional, open question 5)* | `2[0-4]N NN`, the non-regional range (e.g. `225 99`) | `d1 = 2`, `d2` from 0–4, the rest random |

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | Generator constraint (one fault only) |
| --- | --- | --- |
| `wrongLength` | digit count other than 5, otherwise well-formed | 4 or 6 digits, `d1` from 1–7, either without a space or with one space right after the 3rd digit (`NNN N`, `NNN NNN`), so step 3 passes |
| `letters` | contains a letter | a valid `NNN NN` (`d1` from 1–7) with exactly one digit replaced by an ASCII letter `A`–`Z` (e.g. `O` for `0`) |
| `badFormat` *(variant proposed, open question 6)* | 5 digits and no letters, but a wrong separator or space | a valid 5-digit code (`d1` from 1–7) written as one of: space in the wrong place (`NNNN N`, `NN NNN`, `N NNNN`), hyphen `NNN-NN`, two spaces `NNN  NN`, leading or trailing space |
| `foreignRange` *(open questions 1 and 2)* | well-formed, first digit `0`, `8` or `9` (Slovak ranges) | `NNN NN` with `d1` from {0, 8, 9} |

If Marek rejects `badFormat` as a variant, it stays a reason code without a variant, as in birthNumber
(`docs/rules/core.md` section 4 allows that).

---

## 5. Known samples

Real PSČ are not personal data. The samples below come from official Česká pošta and UPU documents. Whether each
one is in the **current** address PSČ list was not checked (UNVERIFIED against `ZV_PSC_ADR.csv`). For the
format-only validator this makes no difference.

### Valid (real, from official documents)

| Input | Source | Note |
| --- | --- | --- |
| `190 16` | Česká pošta Příloha č. 2 (PRAHA 916) | |
| `623 00` | Česká pošta Příloha č. 2 (BRNO 23) | worked example |
| `378 07` | Česká pošta Příloha č. 2 and UPU (RAPŠACH) | |
| `513 01` | Česká pošta Příloha č. 2 and UPU (SEMILY) | |
| `460 15` | Česká pošta Příloha č. 2 (LIBEREC 15) | |
| `150 06` | Česká pošta Příloha č. 2 (PRAHA 5) | |
| `102 00` | UPU (Praha 102) | |
| `100 00` | UPU coding-method diagram | |
| `251 66` | UPU (SENOHRABY) | Středočeský |
| `530 87` | UPU (PARDUBICE 2) | P.O. box code |
| `110 00` | UPU (PRAHA 1) | poste restante |
| `225 99` | Česká pošta seat (Poštovní podmínky footer, UPU) | non-geographic range 20x–24x, section 3.3 |

### Valid (constructed)

| Input | Variant | Why |
| --- | --- | --- |
| `62300` | `withoutSpace` | machine form of `623 00` |
| `12345` | `withoutSpace` | well-formed; existence not checked |
| `799 99` | plain | `d1 = 7`; well-formed even if unassigned |
| `200 00` | `nonGeographic` | well-formed |

### Invalid

Inputs are written as JS string literals (single quotes) so leading, trailing and doubled spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'948 01'` | `foreignRange` | Lučenec, Slovakia (Česká pošta Příloha č. 3) |
| `'811 01'` | `foreignRange` | `d1 = 8` (constructed) |
| `'010 01'` | `foreignRange` | `d1 = 0` (constructed) |
| `'00000'` | `foreignRange` | `d1 = 0`; well-formed otherwise |
| `'1011'` | `wrongLength` | Wien, Austria (Česká pošta Příloha č. 3), 4 digits |
| `'623 0'` | `wrongLength` | 4 digits, space correctly placed |
| `'623 000'` | `wrongLength` | 6 digits, space correctly placed |
| `'623000'` | `wrongLength` | 6 digits |
| `''` | `wrongLength` | empty string: 0 digits (steps 1–3 pass) |
| `'623 '` | `wrongLength` | trailing space at index 3 is allowed, then only 3 digits |
| `'CZ-110 00'` | `letters` | country prefix |
| `'1O0 00'` | `letters` | letter O instead of zero |
| `'HR-21001'` | `letters` | Croatian form with prefix (Česká pošta Příloha č. 3) |
| `'6230 0'` | `badFormat` | space after the 4th digit |
| `'62 300'` | `badFormat` | space after the 2nd digit |
| `'623-00'` | `badFormat` | hyphen |
| `'623  00'` | `badFormat` | two spaces |
| `' 62300'` | `badFormat` | leading space, not trimmed |
| `'62300 '` | `badFormat` | trailing space, not trimmed |
| `623`, U+00A0, `00` | `badFormat` | no-break space instead of the space (open question 4) |
| full-width `１２３` + space + `４５` | `badFormat` | full-width digits (U+FF10–U+FF19) are not `[0-9]` and not letters |

Precedence examples: `'62 30'` → `badFormat` (step 3 runs before the length check). `'9O8 01'` → `letters`.
`'948 0'` → `wrongLength` (length runs before the range check).

---

## 6. Sources

Primary [P]:

1. Česká pošta, *Poštovní podmínky České pošty, s.p. – Základní poštovní služby*, datum aktualizace 1. 10. 2026:
   čl. 4 (Poštovní adresa: kinds of PSČ), čl. 5 odst. 1, Příloha č. 2 (domestic address templates, `NNN NN`),
   Příloha č. 3 (foreign templates: `948 01 Lučenec`, `1011 WIEN`, `22767 HAMBURG`), footer (`225 99 Praha 1`).
   <https://www.ceskaposta.cz/documents/d/guest/postovni-podminky-zakladni-postovni-sluzby>
   (listed on <https://www.ceskaposta.cz/ke-stazeni/postovni-a-obchodni-podminky>)
2. Česká pošta, *Zákaznické výstupy* (official PSČ datasets, monthly updates): *Seznam adresních PSČ*
   `/documents/d/guest/csv_psc_a-zip`, description `/documents/d/guest/zv_psc_adr-docx`, *Seznam PSČ částí obcí a
   obcí bez částí* `/documents/d/guest/db_pcobc-zip`, *Formáty PSČ zemí* `/documents/d/guest/zv_format_mz_psc-zip`.
   <https://www.ceskaposta.cz/ke-stazeni/zakaznicke-vystupy>. The zip and docx files could not be opened in this
   research run (no unzip tool).
3. UPU, *Postal addressing systems – Czech Rep.* (02/2018, contact: Czech Post headquarters): format, coding method,
   examples. <https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/czeEn.pdf>
4. ČÚZK, FAQ 12 *Proč již nelze zapsat PSČ k adresnímu místu* (PSČ maintained from Česká pošta data; only
   address-point PSČ in RÚIAN):
   <https://cuzk.gov.cz/ruian/Editacni-agendovy-system-ISUI/FAQ-Casto-kladene-otazky/FAQ-ulice-a-cislovani-SO-(1)/12-Proc-jiz-nelze-zapsat-PSC-k-adresnimu-mistu.aspx>
5. Vyhláška č. 359/2011 Sb., o základním registru územní identifikace, adres a nemovitostí, § 6 (PSČ in the 3rd
   address line, no format rule). <https://www.zakonyprolidi.cz/cs/2011-359> (version 3, in force from 1. 1. 2022)

Official data standard, not the source of the rule [S]:

6. ČÚZK, *Struktura a popis výměnného formátu RÚIAN (VFR)*, version 3.6 (8. 9. 2026), section 3.3.20
   AdresniMisto: `Psc` Integer, length 5, "PSČ adresní pošty".
   <https://cuzk.gov.cz/ruian/Poskytovani-udaju-ISUI-RUIAN-VDP/Vymenny-format-RUIAN-(VFR)/DL058RR2-v5-0-Struktura-a-popis-VFR_final.aspx>
7. GFŘ, *Informace ke způsobu uvádění adres* (confirms that the address post office follows čl. 4 odst. 2 of the
   Poštovní podmínky): <https://financnisprava.gov.cz/assets/cs/prilohy/d-danovy-system-cr/Informace_ke_zpusobu_uvadeni_adresy.pdf>

Secondary, **UNVERIFIED**:

8. en Wikipedia, *Postal codes in the Czech Republic* (first-digit table, 200–249 reserved, `CZ-` prefix; no
   citations): <https://en.wikipedia.org/wiki/Postal_codes_in_the_Czech_Republic>
9. cs Wikipedia, *Poštovní směrovací číslo* (1. 1. 1973, digit meanings, 21xxx/22xxx, ČSN spacing):
   <https://cs.wikipedia.org/wiki/Po%C5%A1tovn%C3%AD_sm%C4%9Brovac%C3%AD_%C4%8D%C3%ADslo>
10. SITA, 2. 1. 2023, *Slovenská pošta oslavuje 50. výročie zavedenia PSČ* (Slovak zones 8, 9, 0; quotes the
    Slovenská pošta spokesperson):
    <https://sita.sk/slovenska-posta-oslavuje-50-vyrocie-zavedenia-psc-vydava-postovy-listok-a-prilezitostnu-peciatku/>
11. RCzechia `zip_codes()` documentation (2,671 areas, format `NNNNN`, data 2021):
    <https://rdocumentation.org/packages/RCzechia/versions/1.7.2/topics/zip_codes>
12. ČSN 01 6910 (2014), *Úprava dokumentů zpracovaných textovými editory*: paywalled, not read.

---

## 7. Differences from docs/spec.md

1. **"Jen formát".** The proposal adds one cheap structural check beyond the bare format: first digit `0`/`8`/`9`
   gives `foreignRange`, because Slovak PSČ share the format exactly. This is a real decision (open question 2).
   Its factual basis also needs the CSV check (open question 1).
2. **Format "123 45".** The spec shows only the spaced form. The official machine form has no space (RÚIAN Integer
   [S]), so `12345` is valid and `withoutSpace` is an edge variant. No other separator is official.
3. **No variants in the spec.** The edge/invalid table in the spec has no PSČ row. All variants in section 4 are
   proposals, and so are the new reason codes `foreignRange` and (as a variant) `badFormat`.
4. **"nebo existující PSČ ze seznamu".** The official list (a) changes monthly, (b) holds only *address* PSČ, so it
   would reject real codes such as `225 99` (Česká pošta's own seat) or P.O. box codes, (c) has about 2,700
   entries (UNVERIFIED), which is too big for the 2 kB budget, and (d) would break determinism if a generator drew
   from it and it were updated. Recommendation: no list in v1 (open question 3).
5. **Source "Česká pošta".** Confirmed. Česká pošta defines the kinds of PSČ (Poštovní podmínky čl. 4), but no
   Česká pošta document read here states the format in words. The written rule comes from the UPU sheet supplied
   by Czech Post, and the templates in Příloha č. 2 confirm it. No law defines the PSČ format: vyhláška 359/2011
   Sb. only places the PSČ in the address.

---

## 8. Decisions (Marek, 2026-10-06)

1. Verified by the main session from the official CSV (note at the top of this file).
2. `foreignRange` exists (first digit `0`, `8`, `9`).
3. No list of existing PSČ in v1.
4. No-break space (U+00A0) → `badFormat`.
5. Edge variant `nonGeographic` exists (174 official codes in `20000`–`24999` confirm the range).
6. `badFormat` is an invalid variant.
7. Plain generator: `d1` uniform 1–7, `d2`–`d5` uniform 0–9, no exclusion of `20x`–`24x`.

So the contract in section 9 holds with all optional parts included: reasons
`'letters' | 'badFormat' | 'wrongLength' | 'foreignRange'`, edge variants `withoutSpace` and `nonGeographic`,
invalid variants `wrongLength`, `letters`, `badFormat`, `foreignRange`.

Original questions (with the researcher's recommendations):

1. **Verify zones 1–7 in the official CSV.** Please (or the main session) run once on the current
   `csv_psc_a-zip`: distinct first digits, min, max, count, and whether any code starts with `20`–`24`. Expected:
   first digits ⊆ {1..7}, about 2,700 codes. This turns the `foreignRange` basis from UNVERIFIED into [P]. Also
   record the download date in this file.
2. **`foreignRange` (first digit 0/8/9 is invalid).** Recommendation: **yes**. It costs a few bytes and catches the
   most realistic wrong input (a Slovak PSČ). The alternative is a pure format check, under which Slovak codes are
   valid.
3. **Existing-PSČ list.** Recommendation: **not in v1**. Keep `czech-test-data/data/postal-codes` as a possible
   later optional subpath with a dated Česká pošta snapshot. It must never change the default generator's output.
   Also check Česká pošta's terms of use for redistributing the CSV first (not researched). README: "generated PSČ
   are well-formed, most do not exist".
4. **No-break space (U+00A0) between the digit groups.** It is common after copy-paste from typeset text.
   Recommendation: `badFormat` (strict input, same as birthNumber decision 4). The alternative is to accept it.
5. **`nonGeographic` edge variant (`20x xx`–`24x xx`).** Its value: apps with an over-strict "region" rule reject
   real codes such as `225 99`. The range itself is UNVERIFIED (Wikipedia), and only `225 99` is primary.
   Recommendation: leave it out of v1 unless open question 1 confirms codes in this range in the official data.
6. **`badFormat` as an invalid variant** (in birthNumber it is a reason only). Recommendation: **yes** for PSČ,
   because a misplaced space or a hyphen is the most common real-world PSČ input error.
7. **Plain generator distribution.** Proposal in section 9: `d1` uniform 1–7, `d2`–`d5` uniform 0–9, no
   exclusion of 20x–24x. The alternative is to exclude `d1 = 2, d2 ≤ 4` so plain values look regional.

---

## 9. Generator and variants contract (approved 2026-10-06)

### Options

`cz.postalCode()` takes **no options** (`NoOptions`, `docs/rules/core.md` A2). A `region` option (first digit) is
possible later. It is not proposed, to keep the API small.

- Output: `NNN NN`, a string of 6 characters. `d1` is uniform from 1–7, and `d2`–`d5` are uniform from 0–9.
  Under the proposed rules every output is `{ valid: true }`. Existence is not guaranteed (section 3.4).
- No date dependence. `referenceDate` is ignored, so there are no fixed date ranges (core A3 trivially holds). The
  shared determinism check from `tests/support/` must pass.
- Stream id `postalCode` (core section 2). Subpath `czech-test-data/postalCode`, exports `createPostalCode` and
  `validatePostalCode`. CLI command `postal-code`.
- Reason code union: `'letters' | 'badFormat' | 'wrongLength' | 'foreignRange'`. Without `foreignRange` if open
  question 2 is "no".
- Edge variants: `withoutSpace`, plus `nonGeographic` only if open question 5 is "yes".
- Invalid variants: `wrongLength`, `letters`, `badFormat` (open question 6), `foreignRange` (open question 2). Each
  has exactly one fault, as defined in section 4.
- Size: no data tables. The validator is a few comparisons and the generator draws 5 digits, so it should be far
  below the 2 kB identifier budget (min+gzip on top of core).

Clarifications from the main session (2026-10-07, derived from the approved text):

- `badFormat` variant, leading or trailing space: the space is added to the machine form (`' 62300'`, `'62300 '`),
  as in the section 5 samples, so the value has exactly one fault. The tests accept either form.
