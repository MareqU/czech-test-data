# phone (telefonní číslo)

Status: **APPROVED** by Marek on 2026-10-06 (decisions in section 9; they override every "proposed",
"contested" and "open question" marker below) · researched 2026-10-06 · rules-researcher

> Caveat: the verbatim text of příloha č. 1 of vyhláška č. 117/2007 Sb. could only be read through
> zakonyprolidi.cz / epravo.cz renderings (e-Sbírka is a JS app). The range table below is taken from the
> ČTÚ's own communication of the national numbering plan to the ITU (5. 1. 2023) [P] and cross-checked
> against the amending decrees. Where only a rendering was available, it says so.

Czech meaning: *telefonní číslo* is a number from the Czech national numbering plan (*číslovací plán*),
which is set by the Czech Telecommunication Office (ČTÚ) in vyhláška č. 117/2007 Sb., o číslovacích plánech
sítí a služeb elektronických komunikací. The library covers numbers a person or company can be reached at:
fixed-line (geographic) and mobile numbers.

Legend: **[P]** is a primary source (decree, ČTÚ). **[S]** is an international standard or official data that
is not the source of the Czech rule. **UNVERIFIED** means the claim rests only on secondary sources.

---

## 1. Format

### Structure

| Part | Digits | Meaning |
| --- | --- | --- |
| international prefix | `+` or `00` | optional; *mezinárodní přestupný znak* |
| country code | `420` | Czech Republic; present only together with the international prefix |
| national number | **9** | starts with the area code (*kód číslovací oblasti*, TC) or network access code (*přístupový kód k síti*, DNe) |

- **9 digits.** ČTÚ to ITU, 5. 1. 2023 [P]: *"The numbering plan uses the principles of closed numbering.
  All national numbers used by subscribers have nine (9) digits (except short numbers and specific numbers
  such as voice mail services)."* Every geographic and mobile row in the table has min = max = 9.
- **Country code 420.** Vyhláška 117/2007 Sb., § 4 odst. 2 [P, via zakonyprolidi.cz]: *"Mezinárodní číslo
  se skládá z kódu země a telefonního čísla. Pro Českou republiku je kód země 420."*
- **`00` and `+`.** § 4 odst. 3 [P, via zakonyprolidi.cz]: in fixed networks the international prefix is
  *"00"*, *"ve veřejných mobilních komunikačních sítích je mezinárodní přestupný znak „00" nebo „+""*.
  So `+420…` and `00420…` are both legal ways to write the international number.
- **No trunk prefix.** Closed numbering means there is no national `0` prefix: inside the country the
  9 digits are dialled as they are. A leading `0` (`0601 123 456`) is the pre-2002 habit (section 3).
- **No checksum.** Phone numbers have no check digit. Validity is format + numbering-plan range only.

### Grouping (display)

- The law does not prescribe a written form.
- ITU-T E.123 [S] (international notation): `+`, country code, then the number in groups separated by
  **spaces**; no other separators in the international notation.
- The usual Czech form is three groups of three: `+420 601 123 456`, `601 123 456`. This grouping is said
  to come from ČSN 01 6910 (Úprava písemností), which is a paid standard and could not be checked:
  **UNVERIFIED**.
- E.164 machine form (no spaces): `+420601123456` [S, ITU-T E.164].

### Allowed characters (proposed, strict like birthNumber decision 4)

Digits, a leading `+`, and single spaces in the positions defined in section 2. Nothing else: no hyphens,
dots, slashes, parentheses, tabs, non-breaking spaces, no trimming.

---

## 2. Check algorithm (proposed validator)

No date dependence: `referenceDate` is ignored. The first failing step gives the reason.

1. **Letters.** Any Unicode letter (`\p{L}`) → **`letters`**.
2. **Characters.** Only digits, `+` and the ASCII space `U+0020` are allowed; `+` only as the first
   character; no leading or trailing space; no two spaces in a row. Otherwise → **`badFormat`**.
3. **International prefix and country code.**
   - If the value starts with `+`, the prefix is `+`; else if it starts with `00`, the prefix is `00`;
     else there is no prefix and the national part is the whole value (go to step 5).
   - Let `G` be the characters after the prefix up to the first space (or the end).
     - `G` empty (e.g. `+ 420…`, `00 420…`) → **`badFormat`**.
     - `G` does not start with `420` → **`wrongCountryCode`** (e.g. `+421…`, `0049…`, `+42 0…`).
4. **Separator after the country code.** The national part is the rest after `420`, with **one** optional
   leading space removed.
5. **Length.** If the national part does not contain exactly 9 digits → **`wrongLength`**.
   (This comes before the grouping check, so `+420 601 123 45` is `wrongLength`, not `badFormat`.)
6. **Grouping.** The national part must be `ddddddddd` or `ddd ddd ddd`. Otherwise → **`badFormat`**.
7. **Range.** Classify the 9 digits by their leading digits (table in section 3.1):
   - geographic, mobile (interpersonal) or `910` VoIP → `{ valid: true }`;
   - designated for another use (section 3.2) → **`specialPrefix`**;
   - anything else (reserved, unassigned) → **`unknownPrefix`**.

Accepted shapes (for 9 valid digits `601123456`): `+420 601 123 456`, `+420601123456`,
`+420 601123456`, `+420601 123 456`, the same four with `00420`, and `601 123 456`, `601123456`.

### Worked example

Input `+420 739 123 456`:

1. No letters. 2. Characters are digits, a leading `+`, single spaces ✓.
3. Prefix `+`; `G = 420` → starts with `420` ✓. 4. Rest ` 739 123 456`, one space removed → `739 123 456`.
5. 9 digits ✓. 6. Shape `ddd ddd ddd` ✓.
7. Leading digits `73` → public mobile network (section 3.1) → **valid**.

Input `+420 609 123 456`: steps 1–6 pass; `609` is "reserved for public mobile networks", not in use →
**`unknownPrefix`**. Input `+420 900 123 456`: `900` is premium rate → **`specialPrefix`**.

---

## 3. Special cases and history

### 3.1 Ranges that are valid (subscriber numbers)

From ČTÚ to ITU, 5. 1. 2023 [P], confirmed against the amendments (3.4):

| Leading digits | Use | Region (geographic only) |
| --- | --- | --- |
| `2` | public fixed network | Praha and Středočeský |
| `31`, `32` | public fixed network | Praha and Středočeský |
| `35` | public fixed network | Karlovarský |
| `37` | public fixed network | Plzeňský |
| `38`, `39` | public fixed network | Jihočeský |
| `41`, `47` | public fixed network | Ústecký |
| `46` | public fixed network | Pardubický |
| `48` | public fixed network | Liberecký |
| `49` | public fixed network | Královéhradecký |
| `51`, `53`, `54` | public fixed network | Jihomoravský |
| `55`, `59` | public fixed network | Moravskoslezský |
| `56` | public fixed network | Vysočina |
| `57` | public fixed network | Zlínský |
| `58` | public fixed network | Olomoucký |
| `601`–`608` | public mobile network | – |
| `702`–`719` | public mobile network (`706`–`719` only since 4. 2. 2022) | – |
| `72`, `73`, `77` | public mobile network | – |
| `7900`–`7999` (= all of `79`) | public mobile network | – |
| `910` | public network for voice over IP (nomadic use allowed) — **contested**, see 3.3 | – |

Mobile ranges: *"Nelze použít pro poskytování veřejně dostupné telefonní služby v pevném místě"*
(vyhláška 267/2009 Sb. [P]). The library does not validate the district inside an area (blocks are
allocated by ČTÚ and change); only the leading digits above.

### 3.2 Ranges designated for something else → `specialPrefix`

These exist in the plan but are not a person's or company's ordinary phone number. **The generator never
produces them.** ČTÚ to ITU [P] and vyhláška 117/2007 Sb. [P]:

| Leading digits | Use |
| --- | --- |
| `610`–`614` | public mobile network, but only for services *"jiných, než jsou interpersonální komunikační služby"* EU-wide (M2M / IoT; since 4. 2. 2022, vyhláška 22/2022 Sb.) |
| `700` | universal personal telecommunications (UPT) |
| `800` | freephone |
| `810`–`819`, `830`–`839`, `843`–`846` | shared cost |
| `820`–`829` | virtual calling cards |
| `840`–`842`, `847`–`849` | universal number services |
| `900`, `905`, `906`, `908`, `909` | premium rate (`909` adult) |
| `93` | voice mail (11 digits) |
| `95` (`95000`–`95999`) | private networks |
| `96` | voice mail (9–12 digits) |
| `970` | VoIP access code (3 digits) |
| `971`, `976` | dial-up internet access (`976` premium) |
| `972`–`974` | private networks |
| `977` | public data networks and interactive services |
| `980`, `983`, `989` (`98900`–`98999`) | virtual private networks |
| exactly `720000112` | emergency SMS for roaming users, § 26a (since 1. 1. 2024, vyhláška 376/2023 Sb.): *"se použije telefonní číslo „+420 720 000 112". Využití tohoto čísla má povahu a důsledky využívání tísňového čísla"* — proposal, **contested** (it lies inside mobile `72`) |

Short numbers (`112`, `15x`, `1180`–`1189`, `116xxx`, …) are 3–6 digits, so they fail with `wrongLength`.
`93…` with 11 digits and `96…`/`980…` with 10–12 digits also fail with `wrongLength`: the library validates
9-digit subscriber numbers only.

### 3.3 Everything else → `unknownPrefix`

Reserved or unassigned per ČTÚ to ITU [P]: `0x`, `1x` (as 9-digit numbers), `20`, `30`, `33`, `34`, `36`,
`40`, `42`–`45`, `50`, `52`, `600`, `609`, `615`–`619`, `62`–`69`, `701`, `74`–`76`, `78`, `801`–`809`,
`850`–`899`, `901`–`904`, `907`, `911`–`919`, `92`, `94`, `975`, `978`, `979`, `981`, `982`, `984`–`988`,
`99`.

`701` is not in the ITU table; zakonyprolidi.cz shows it only as a routing code (UPTAN), not as a range of
subscriber numbers (UNVERIFIED reading of the rendering).

**`910` VoIP (contested).** Designated for public VoIP networks with nomadic use; such numbers are really
assigned to people and companies by VoIP operators. Proposal: **valid** (edge variant `voip`). Alternative:
treat as `specialPrefix`, like libphonenumber's separate `voip` type.

### 3.4 Legal history

| Date | Instrument | Relevance |
| --- | --- | --- |
| 2000 | ČTÚ, Číslovací plán veřejných telefonních sítí, Telekomunikační věstník 9/2000, under zákon 151/2000 Sb. [P] | closed 9-digit numbering plan |
| 22. 9. 2002 | switch-over night ("noc dlouhých čísel") | all numbers became 9-digit; trunk `0` and old area codes (e.g. `02`) disappeared — date **UNVERIFIED** (lupa.cz only) |
| 1. 7. 2007 | vyhláška 117/2007 Sb. [P] | replaces the ČTÚ numbering plans; current legal basis |
| 1. 9. 2009 | vyhláška 267/2009 Sb. [P] | mobile ranges `601`–`608`, `72`, `73`, `77`, `7900`–`7999` must not be used for fixed-location service (existing contracts may run out); `910`–`919` VoIP |
| 1. 8. 2011 | vyhláška 53/2011 Sb. [P] | `702`–`705` public mobile, `706`–`719` reserve, `61` reserve |
| 15. 4. 2012 | vyhláška 124/2012 Sb. [P] | private-network ranges `95000`–`95999`, `98900`–`98999` |
| 4. 2. 2022 | vyhláška 22/2022 Sb. [P] | `61` → `610`–`614` (non-interpersonal, EU-wide) + `615`–`619` reserve; `702`–`705` → **`702`–`719`** mobile |
| 1. 1. 2024 | vyhláška 376/2023 Sb. [P] | § 26a `+420 720 000 112` emergency SMS; mobile network codes (MNC) list |

As of 2026-10-06 zakonyprolidi.cz shows version 8 (in force from 1. 1. 2024) as current; no later amendment
was found. Whether anything was published in 2025–2026 is **UNVERIFIED** (e-Sbírka could not be rendered).

### 3.5 Designation vs. allocation

The validator checks the **numbering plan** (stable, in a decree), not whether ČTÚ has actually allocated
the block to an operator (ČTÚ database "Přidělená čísla a kódy", changes daily). Example: `719` blocks were
allocated to O2 in 2024–2026, while most of `706`–`718` appears unallocated (ČTÚ database via search
results, UNVERIFIED in detail). libphonenumber (UNVERIFIED, cross-check only) follows allocations: its CZ
mobile pattern is `7060\d{5}|(?:60[1-8]|7(?:0[2-5]|19|[2379]\d))\d{6}`, so it **rejects most of
`706`–`718`**, which the decree designates as mobile. Hence the edge variant `newMobileRange`.

### 3.6 Real people

The Czech plan has **no range reserved for fiction or testing** (nothing found at ČTÚ; UNVERIFIED as a
negative). Any generated valid number may belong to a real subscriber. README should warn: never send SMS
or call generated numbers.

---

## 4. Edge and invalid variants

The spec has no phone row in the variants table; everything below is a **proposal**.

### Edge variants (valid but unusual) — must return `{ valid: true }`

| Variant | Example | Definition / generator constraint |
| --- | --- | --- |
| `withoutSpaces` | `+420601123456` | E.164 form; plain mobile number |
| `withoutCountryCode` | `601 123 456` | national form, grouped |
| `digitsOnly` | `601123456` | national form, no spaces |
| `prefix00` | `00420 601 123 456` | `00` instead of `+` (§ 4 odst. 3) |
| `newMobileRange` | `+420 712 345 678` | DNe `706`–`719`, mobile only since 4. 2. 2022; rejected by libphonenumber-based validators |
| `voip` | `+420 910 123 456` | **contested** (3.3); dropped if Marek decides `910` is `specialPrefix` |

### Invalid variants — must return `{ valid: false, reason }`

| Variant / reason | Example | Generator constraint (one fault only) |
| --- | --- | --- |
| `wrongLength` | `+42060112345` | valid `+420` and a plain mobile prefix, national part with 8 or 10 digits, no spaces |
| `letters` | `+420 601 12A 456` | default format, one digit of the national part replaced by a letter |
| `wrongCountryCode` | `+421 601 123 456` | valid national part; country code from a fixed list of other codes, e.g. `421`, `49`, `48`, `43`, `1` (none may start with `420`) |
| `unknownPrefix` | `+420 609 123 456` | 9 digits starting with a reserved range from 3.3; prefer look-alikes: `600`, `609`, `62`–`69`, `74`–`76`, `78`, `20`, `30`, `40`, `50` |
| `specialPrefix` | `+420 900 123 456` | 9 digits starting with `800`, `81x`, `83x`, `84x`, `900`, `905`, `906`, `908`, `909` (uncontested part of 3.2) |

Reason code without a variant: **`badFormat`** (other separators, parentheses, surrounding or double
whitespace, misplaced `+`, irregular grouping), as in birthNumber.

---

## 5. Known samples

**Real public sample:** ČTÚ switchboard `+420 224 004 111` (published by ČTÚ in its ITU communication) →
valid, fixed, Praha (`2`). No real personal numbers are used. All other samples are **constructed**; they
may still belong to real subscribers (3.6).

### Valid

| Input | Kind / variant |
| --- | --- |
| `+420 224 004 111` | fixed, Praha (real, ČTÚ) |
| `+420 601 123 456` | mobile, default format |
| `+420601123456` | `withoutSpaces` |
| `601 123 456` | `withoutCountryCode` |
| `601123456` | `digitsOnly` |
| `00420 601 123 456` | `prefix00` |
| `00420601123456` | `00`, no spaces |
| `+420 601123456` | space only after the country code |
| `+420 799 123 456` | mobile `79` |
| `+420 702 123 456` | mobile `702` (since 2011) |
| `+420 712 345 678` | `newMobileRange` |
| `+420 311 123 456` | fixed, Středočeský (`31`) |
| `+420 591 123 456` | fixed, Moravskoslezský (`59`) |
| `+420 720 000 113` | mobile, neighbour of the emergency SMS number |
| `+420 910 123 456` | `voip` (contested) |

### Invalid

| Input | Expected reason | Why |
| --- | --- | --- |
| `+42060112345` | `wrongLength` | 8 digits |
| `+420 6011234567` | `wrongLength` | 10 digits |
| `+420 601 123 45` | `wrongLength` | length checked before grouping |
| `0601 123 456` | `wrongLength` | old trunk `0`, 10 digits |
| `420 601 123 456` | `wrongLength` | country code without `+`/`00` → 12 digits (contested, see Q4) |
| `112` | `wrongLength` | short number |
| `+420` | `wrongLength` | no national part |
| `` (empty) | `wrongLength` | 0 digits |
| `+421 601 123 456` | `wrongCountryCode` | Slovakia |
| `00421601123456` | `wrongCountryCode` | `00` form |
| `+42 0601 123 456` | `wrongCountryCode` | `G = 42` |
| `+420 601 12A 456` | `letters` | letter |
| `+420 6O1 123 456` | `letters` | letter O for zero |
| `+420 601-123-456` | `badFormat` | hyphen |
| `(+420) 601 123 456` | `badFormat` | parentheses |
| ` +420 601 123 456` | `badFormat` | leading space, not trimmed |
| `+420  601 123 456` | `badFormat` | double space |
| `+ 420 601 123 456` | `badFormat` | `G` empty |
| `+420 60 1123 456` | `badFormat` | 9 digits, irregular grouping |
| `++420601123456` | `badFormat` | second `+` |
| `+420 609 123 456` | `unknownPrefix` | reserved |
| `+420 600 123 456` | `unknownPrefix` | reserved |
| `+420 650 123 456` | `unknownPrefix` | reserved (`62`–`69`) |
| `+420 701 123 456` | `unknownPrefix` | not a subscriber range |
| `+420 745 123 456` | `unknownPrefix` | reserved (`74`) |
| `+420 781 123 456` | `unknownPrefix` | reserved (`78`) |
| `+420 201 234 567` | `unknownPrefix` | `20` reserved (Praha is `2` + 8 digits, but `20…` is excluded) |
| `+420 123 456 789` | `unknownPrefix` | `1` = short numbers |
| `012 345 678` | `unknownPrefix` | `0x` reserved |
| `+420 800 123 456` | `specialPrefix` | freephone |
| `+420 900 123 456` | `specialPrefix` | premium rate |
| `+420 610 123 456` | `specialPrefix` | M2M (contested, Q3) |
| `+420 700 123 456` | `specialPrefix` | UPT |
| `+420 720 000 112` | `specialPrefix` | emergency SMS (contested, Q6) |

Note on `+420 201 234 567`: the ITU table lists `2` as Praha **and** `20` as reserved. Proposal: the longer
match wins, so `20…` is `unknownPrefix`. libphonenumber (UNVERIFIED) accepts all `2\d` as fixed. **Contested**,
see Q9.

---

## 6. Sources

Primary [P]:

1. Vyhláška č. 117/2007 Sb., o číslovacích plánech sítí a služeb elektronických komunikací (§ 4, § 26a,
   příloha č. 1). Official: <https://e-sbirka.gov.cz/sb/2007/117> (not rendered, JS app). Text used:
   <https://www.zakonyprolidi.cz/cs/2007-117> (version 8, from 1. 1. 2024),
   <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2007/117>.
2. Amendments: 267/2009 Sb. <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2009/267>, 53/2011 Sb.
   <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2011/53>, 124/2012 Sb.
   <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2012/124>, 22/2022 Sb.
   <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2022/22>, 376/2023 Sb.
   <https://www.epravo.cz/top/zakony/sbirka-zakonu/sb/2023/376>.
3. ČTÚ, *Czech Republic (country code +420), Communication of 5.I.2023* — national numbering plan table,
   9-digit closed numbering (ITU Operational Bulletin 1261):
   <https://www.itu.int/oth/T0202000035/en> (PDF
   <https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000350002PDFE.pdf>).
4. ČTÚ, *Numbering plans – archive* (117/2007 Sb. replaced ČTÚ plans on 1. 7. 2007):
   <https://ctu.gov.cz/en/numbering-plan>
5. ČTÚ, database *Přidělená čísla a kódy* (allocations, not used by the validator):
   <https://ctu.gov.cz/vyhledavaci-databaze/pridelena-cisla-a-kody>
6. ČTÚ, Číslovací plán veřejných telefonních sítí (2000), Telekomunikační věstník 9/2000:
   <https://gov.cz/vestniky/a9qaats/790890096.pdf> (found via search, contents not read in detail).

International standards [S]:

7. ITU-T E.164 (international number format) and ITU-T E.123 (notation, `+`, spaces):
   <https://www.itu.int/rec/T-REC-E.164>, <https://www.itu.int/rec/T-REC-E.123>

Secondary, **UNVERIFIED**:

8. lupa.cz, *Noc dlouhých čísel* (switch-over of 22. 9. 2002): <https://www.lupa.cz/clanky/noc-dlouhych-cisel/>
9. libphonenumber CZ metadata (cross-check only), via python-phonenumbers:
   <https://github.com/daviddrysdale/python-phonenumbers/blob/dev/python/phonenumbers/data/region_CZ.py>
10. ČSN 01 6910 (grouping `+420 601 123 456`), paid standard, not checked.

---

## 7. Differences from docs/spec.md

1. **"+420 a 9 číslic".** `00420` is equally legal (§ 4 odst. 3), and the national form without a country
   code is the normal domestic form. The spec shows only `+420`.
2. **"Mobilní prefixy 6xx a 7xx".** Too broad. Mobile is only `601`–`608`, `702`–`719`, `72`, `73`, `77`,
   `79`. `600`, `609`, `615`–`699`, `74`–`76`, `78`, `701` are reserved; `610`–`614` are M2M only; `700` is UPT.
3. **"Pevné podle oblastí".** Confirmed as the 20 area codes in 3.1 (1 or 2 digits). Finer district checks
   have no stable basis (block allocations).
4. **Non-geographic ranges** (`8xx`, `9xx`, special numbers) are not mentioned in the spec; proposed as
   `specialPrefix` / `unknownPrefix`.
5. **No checksum** exists for phone numbers; the spec does not say so explicitly.
6. **No edge/invalid variants** are in the spec for phone; all of section 4 is a proposal.
7. **Validity changes over time** (2022 added `706`–`719`, `610`–`614`; 2024 added `720 000 112`). The spec
   does not mention that the validator encodes the plan as of version 8 (1. 1. 2024).

---

## 8. Generator contract (approved 2026-10-06)

### Options

`cz.phone(options?)` with `{ type?: 'mobile' | 'fixed' }`, optional.

- `type` omitted → `'mobile'` (see Q1). Invalid runtime value → `RangeError` naming `type`.
- **mobile:** `prefix = pick(['601','602','603','604','605','606','607','608','702','703','704','705','72','73','77','79'])`,
  then `digits(9 − prefix.length)`. `706`–`719` are left to `newMobileRange` (3.5). If the result is
  `720000112`, the whole draw is repeated.
- **fixed:** `prefix = pick(['2','31','32','35','37','38','39','41','46','47','48','49','51','53','54','55','56','57','58','59'])`,
  then `digits(9 − prefix.length)`; if `prefix` is `2` and the next digit is `0`, redraw (because of the
  `20` question, Q9; drop this if `20…` is valid).
- Picking the prefix first (not uniform over all numbers) is a proposal; it is frozen by the seed snapshot
  once approved.
- Output: `+420 ddd ddd ddd` (see Q2).
- No date dependence, so no date ranges; `referenceDate` is ignored.
- Edge and invalid variants use the mobile generator unless stated in section 4.

### Reason codes

`letters`, `badFormat`, `wrongCountryCode`, `wrongLength`, `unknownPrefix`, `specialPrefix`.
Precedence: `letters` → `badFormat` (characters) → `wrongCountryCode` → `wrongLength` → `badFormat`
(grouping) → `specialPrefix` / `unknownPrefix`.

---

## 9. Decisions (Marek, 2026-10-06)

Marek approved the proposal on every question below:

1. Plain `cz.phone()` = mobile only; `type: 'fixed'` gives fixed lines (section 8).
2. Default output `+420 ddd ddd ddd`. There is **no** format option; the E.164 form is the edge variant
   `withoutSpaces`.
3. `910` is valid (edge variant `voip`, kept). `610`–`614` (M2M) is `specialPrefix`.
4. Strict input as for birthNumber: hyphens, parentheses, `420` without `+`, non-breaking spaces are invalid;
   `420 601 123 456` → `wrongLength`.
5. `706`–`719` stay out of the plain generator; edge variant `newMobileRange` only.
6. `+420 720 000 112` is `specialPrefix` and never generated (redraw rule in section 8).
7. Two reasons: `unknownPrefix` and `specialPrefix`.
8. Valid output may be a real number; the README warns about it.
9. `20…` is `unknownPrefix`; the fixed generator keeps the redraw rule from section 8.

Original questions:

1. **Default type:** plain `cz.phone()` = mobile only (proposed), or a mix of mobile and fixed?
2. **Default output format:** `+420 601 123 456` (proposed) or E.164 `+420601123456`?
3. **What counts as valid:** geographic + mobile + `910` VoIP (proposed). Is `910` valid (edge `voip`) or
   `specialPrefix`? `610`–`614` (M2M) as `specialPrefix`?
4. **Strict input:** hyphens, parentheses, `420` without `+`, non-breaking spaces all invalid (proposed, as
   for birthNumber)? `420 601 123 456` → `wrongLength` acceptable, or a separate reason?
5. **`newMobileRange`:** keep `706`–`719` out of the plain generator (proposed) so output also passes
   libphonenumber-based validators?
6. **`+420 720 000 112`:** `specialPrefix` and never generated (proposed), or plain valid mobile?
7. **Two prefix reasons** (`unknownPrefix` vs `specialPrefix`) or just one?
8. **Real subscribers:** accept that valid output may be a real number, with a README warning (no fictional
   range exists)?
9. **`20…` (e.g. `201 234 567`):** reserved per the ITU table although `2` is Praha. `unknownPrefix`
   (proposed) or valid?

---

## 10. Clarifications (from approved text, recorded 2026-10-06 while writing tests)

1. Step 3 applies literally without a country code too: a value starting with `00` always has the prefix
   `00`. So `000456789` → `wrongCountryCode` (not `unknownPrefix`); no national number starts with `0`.
2. `+` alone and `00` alone → `badFormat` (`G` empty); `00420` alone → `wrongLength` (empty national part);
   `+4200601123456` → `wrongLength` (10 national digits).
3. `letters` wins over every other fault (step 1), e.g. `++421 A` → `letters`.
4. Edge variant `newMobileRange` and the invalid variants `letters`, `unknownPrefix`, `specialPrefix` use the
   default format `+420 ddd ddd ddd`; `wrongCountryCode` is `+CC ddd ddd ddd`; `wrongLength` has no spaces
   (section 4).
5. `letters` replaces exactly one digit with one letter matching `\p{L}`.
6. `validatePhone(value, options?)` accepts and ignores `referenceDate` (section 2).
