# ean (EAN odběrného místa elektřiny, Czech electricity supply point code)

Status: **APPROVED** by Marek on 2026-10-11 (all 10 recommendations in section 10 accepted; they override every
"proposed", "proposal", "Recommendation", "Alternative" and "open question" marker below; B: no real EAN fixture, only
OTE's examples and constructed values; C: no `numberPrecision` in v1) · researched 2026-10-11 · rules-researcher

Czech meaning: *EAN odběrného místa* (also *EAN OPM*, *EAN kód*) is the 18-digit code that identifies one electricity
supply or transfer point (*odběrné nebo předávací místo*, OPM) in the Czech grid. The law calls it *osmnáctimístný
identifikační číselný kód* (vyhláška 408/2015 Sb., § 16 odst. 2). It belongs to the place, not to the customer, and is
used when switching supplier, in contracts and on every invoice. Despite the name it is **not** a product EAN-13/GTIN:
it has the 18-digit shape of the GS1 GSRN and uses the GS1 check digit.

Scope: **Czech electricity EANs only** (prefix `8591824`). Gas points use EIC (separate identifier `eic`).

Legend: **[P]** is a primary source (Sbírka zákonů via zakonyprolidi.cz, OTE documents, distributor pages, GS1's own
published reference code). **UNVERIFIED** means the claim rests only on secondary sources or on my own inference.
"My derivation" marks arithmetic that anyone can re-check; it is not a rule from a source.

> **Main caveats.**
> 1. The law (§ 16) says only "18 digits, assigned by the distributor from number series that OTE allocates". The
>    fixed part `8591824` and the per-network ranges come from an **OTE document** (seminar material for LDS operators),
>    not from the law.
> 2. OTE's **číselník sítí** (`ciselnik_siti.xlsx`, list of networks and their EAN ranges) was parsed by the main
>    session (downloaded 2026-10-11, sheet *Rozsah sítí*, 1 758 ranges). It confirms the per-distributor ranges in 1.3
>    [P]; see "Clarifications from the network list" below.
> 3. The GS1 General Specifications (§ 7.9.1, check digit) were **not read** (gs1.org returns HTTP 403, the PDF is
>    > 10 MB). The check algorithm is taken from GS1's own open-source reference code and confirmed by OTE's worked
>    example (6 values, section 2.3).

---

## 1. Format

### 1.1 Legal basis [P]

Vyhláška č. 408/2015 Sb., o Pravidlech trhu s elektřinou (version 18, in force from 1. 9. 2026):

- § 16 odst. 1: *"Operátor trhu vytváří a spravuje číselníky identifikačních číselných kódů odběrných a předávacích míst
  v přenosové soustavě a distribučních soustavách nezbytné k identifikaci jednotlivých odběrných a předávacích míst a
  přiděluje jednotlivým provozovatelům přenosové nebo distribuční soustavy číselné řady z číselníků identifikačních
  číselných kódů odběrných a předávacích míst."*
- § 16 odst. 2: *"Pokud je uzavřena smlouva o připojení a splněny podmínky připojení v ní sjednané, provozovatel přenosové
  nebo distribuční soustavy přiděluje osmnáctimístný identifikační číselný kód a do 5 pracovních dnů registruje u
  operátora trhu jednotlivá a) odběrná místa a předávací místa odběrného místa, b) předávací místa výroben, c) předávací
  místa zařízení pro ukládání elektřiny, d) předávací místa mezi soustavami, e) místa měření mezi regiony typových
  diagramů dodávek."*
- § 15 odst. 2 (for contrast): OTE gives each **market participant** a *"třináctimístný identifikační číselný kód (dále
  jen „registrační číslo")"*. That 13-digit code (OTE calls it *EAN RÚT*) is a different identifier; see
  `wrongLength` samples.

(Quotes were obtained in ≤ 100-character fragments through a fetch tool and joined; wording checked for continuity.)

### 1.2 Structure

OTE, *Registrace LDS a přidělení EAN odběrným místům* [P], verbatim: *"Rozsah přidělitelných EAN je od
8591824XXXX0000000 do 8591824XXXX9999999, kde XXXX je číslo sítě přidělené OTE (je vždy 4-místné, LDS s číslem sítě
nižším než 1000 začínají nulou). Výjimkou jsou LDS v počátku rozsahu (sítě 0200-0261), kde je XXXX číslo
registrovaného účastníka trhu."* The same document's Excel helper labels the columns *"pevná část EAN"* (`8591824`),
*"číslo sítě"*, *"číslice identifikující OPM"* and *"kontrolní číslice"*.

| Positions (1-based) | Length | Content | Source |
| --- | --- | --- | --- |
| 1–7 | 7 | `8591824`, fixed (*pevná část EAN*); `859` is the GS1 prefix of GS1 Czech Republic, `1824` identifies OTE | OTE [P]; ČEZ Distribuce [P] (*"18místné číslo začínající 8591824"*); E.ON [P] (*"V Česku je toto čtyřčíslí u všech odběrných míst stejné: 1824"*) |
| 8–11 | 4 | network number (*číslo sítě*) assigned by OTE, zero-padded | OTE [P] |
| 12 | 1 | `0` in OTE's generator for LDS networks (see 1.3); part of the distributor/region code for the big DSOs | OTE Excel [P]; E.ON [P] |
| 13–17 | 5 | supply point number assigned by the distributor | OTE Excel [P]; E.ON [P] (*"pět čísel … jedinečná pro každé odběrné místo"*) |
| 18 | 1 | GS1 check digit (section 2) | OTE [P] |

E.ON's description of the same 18 digits is `3 + 4 + 5 + 5 + 1` [P]: *859* (country), *1824* (market operator), five
digits for *"distributor energie a kraj"*, five digits for the supply point, one check digit. This matches the table
when positions 8–12 are read as one 5-digit network/area code.

### 1.3 The three big distributors and LDS

| Distributor | Positions 8–12 | Position 10 | Source |
| --- | --- | --- | --- |
| EG.D (formerly E.ON Distribuce) | `00100`–`00299` | `1` or `2` | OTE číselník sítí [P]: networks `0011` (EG.D Západ) `859182400100000000`–`…00199999999`, `0021` (EG.D Východ) `…00200000000`–`…00299999999` |
| PREdistribuce | `00300`–`00399` | `3` | OTE číselník sítí [P]: network `0031` |
| ČEZ Distribuce | `00400`–`00899` | `4`–`8` | **ČEZ Distribuce [P]** (*"čísla 4, 5, 6, 7 nebo 8"*); OTE číselník sítí [P]: networks `0041`–`0081` (SČE, SME, STE, VČE, ZČE) |
| Local distribution systems (LDS, e.g. industrial parks, Správa železnic) | `XXXX0`, network `XXXX` from OTE; exceptions for the oldest LDS `0200`–`0261` | any | OTE [P]; OTE číselník sítí [P], see clarifications below |

So the widespread claim *"EAN začíná vždy číslicemi 859182400"* (epet.cz and similar) is true for the three big
distributors only. An LDS EAN such as OTE's own example `859182412340000003` starts `85918241…`. **A validator that
requires `859182400` rejects real LDS supply points.** (My inference, from OTE's range rule.)

The pattern "digit 10 = 1–2 EG.D, 3 PRE, 4–8 ČEZ" matches the eight former regional distribution companies (JČE, JME;
PRE; ZČE, SČE, VČE, SME, STE); the network names in the číselník sítí confirm it for ČEZ (*býv. SČE, SME, STE, VČE, ZČE*)
and EG.D (*býv. E.ON Západ / Východ*) [P].

**Clarifications from the network list** (main session, OTE číselník sítí downloaded 2026-10-11, sheet *Rozsah sítí*,
1 758 ranges, 1 757 network numbers `0011`–`1957`) [P]:
- Every range starts with `8591824`.
- Big DSOs (networks `0011`–`0081`): positions 8–9 `00`, position 10 fixed, positions 11–17 free.
- 1 695 networks (all of `0300`–`0999` and `1001`–`1957`): positions 8–11 = the network number, position 12 = `0`,
  positions 13–17 free (100 000 EANs per network). This settles the size disagreement below in favour of the Excel helper.
- The exceptions are networks `0100`, `0102` (ČEPS, transmission system) and the oldest LDS `0200`–`0261`, whose blocks
  differ from the network number (e.g. network `0200` → `85918240150…`, `0215` → `85918240196…`), as OTE's text says.
- Every 4-digit block `0300`–`0999` is assigned to an existing network, so the generator's LDS range `0300`–`0999`
  (decision 10) yields values in real, allocated ranges. OTE's own example `859182412340000003` lies in network `1234`.

**Two OTE statements disagree on the size of an LDS range** (not decisive for the validator, see decision 4): the text
gives `XXXX0000000`–`XXXX9999999` (seven free digits including the check digit, i.e. 10^6 numbers), while the Excel
helper fixes position 12 to `0` and says *"Uvedeným způsobem je možné vygenerovat 100000 jedinečných EAN, což je celý
rozsah dané sítě"* (5 free digits). The proposed generator follows the Excel helper (position 12 = `0`); the validator
does not check positions 8–17 at all.

### 1.4 Display form

Both OTE's Excel helper (*"SLOŽENÝ EAN"*) and ČEZ's current sample invoice (2024, *"s EAN kódem 000000000000000000"*,
*"EAN: 000000000000000000"*) print the 18 digits **without spaces or separators** [P]. No source defines a grouped
written form (unlike IBAN). UNVERIFIED for EG.D and PRE invoices (not found).

### 1.5 Allowed characters (proposed validator)

ASCII digits `0-9` only, exactly 18 of them. No trimming (same as every other identifier). A Unicode letter anywhere
gives `letters`; any other character (spaces, U+00A0, `-`, `+`, full-width digits) gives `badFormat`.

---

## 2. Check algorithm

### 2.1 GS1 standard check digit (mod 10, weights 3 and 1) [P]

GS1 Barcode Syntax Dictionary (GS1's official reference, GitHub `gs1/gs1-syntax-dictionary`) defines the GSRN
application identifiers as `8017 ? N18,csum,gcppos1` and `8018 ? N18,csum,gcppos1`: 18 digits, check digit (`csum`),
GS1 Company Prefix from position 1. The reference implementation of `csum` (GS1 Syntax Engine, `lint_csum.c`):

```c
weight = data_len % 2 == 0 ? 3 : 1;
for (pos = 0; pos < data_len - 1; pos++) {
    parity += weight * (data[pos] - '0');
    weight = 4 - weight;
}
parity = (10 - parity % 10) % 10;
```

For 18 digits (`data_len` even) this means:

1. Take digits `d1 … d17` (the 18th is the check digit).
2. Weight **3** for odd positions (`d1, d3, …, d17`), weight **1** for even positions (`d2, …, d16`). Equivalently:
   counting from the right of the 17 data digits, the rightmost has weight 3 (the GS1 rule for every key length).
3. `S = Σ weight · digit`.
4. Check digit `c = (10 − S mod 10) mod 10`. Valid iff `d18 = c` (equivalently: `S + d18 ≡ 0 (mod 10)`).

GS1 Australia [P]: *"A GSRN is a fixed length of 18 characters."* The Czech EAN has exactly this shape; whether OTE
registers `8591824` as a GS1 Company Prefix with GS1 Czech Republic could not be checked (GEPIR not accessible),
UNVERIFIED.

### 2.2 Shortcut for the fixed prefix (my derivation)

The prefix `8591824` contributes `8·3 + 5 + 9·3 + 1 + 8·3 + 2 + 4·3 = 95`. With `T` = weighted sum of positions 8–17
(weights `1, 3, 1, 3, 1, 3, 1, 3, 1, 3`), the check digit is `c = (5 − T) mod 10` (non-negative remainder). Useful as an
independent test oracle; the implementation should use 2.1.

### 2.3 Worked example 1: `859182412340000003` (OTE's own example) [P]

OTE's Excel helper shows, for network `1234`, the columns *kontrolní číslice* and *pomocný výpočet* (= `S`):

| EAN | `S` (OTE) | `c` |
| --- | --- | --- |
| `859182412340000003` | 117 | 3 |
| `859182412340000010` | 120 | 0 |
| `859182412340000027` | 123 | 7 |
| `859182412340000034` | 126 | 4 |
| `859182412340000041` | 129 | 1 |
| `859182412340000058` | 132 | 8 |

Recomputing the first one: odd positions `8, 9, 8, 4, 2, 4, 0, 0, 0` sum 35, ×3 = 105; even positions
`5, 1, 2, 1, 3, 0, 0, 0` sum 12; `S = 117` ✓ (same as OTE); `c = (10 − 7) mod 10 = 3` ✓. All six rows match the
algorithm in 2.1, which confirms both the weights and their direction.

### 2.4 Validator steps (proposed)

Precedence (decision 2): **`letters` → `badFormat` → `wrongLength` → `wrongPrefix` → `badChecksum`**, the ico/postalCode
order with the prefix check inserted before the checksum. The validator ignores `referenceDate`.

1. **Letters.** Any Unicode letter (`hasLetter` from `src/core/letters.ts`) → **`letters`**.
2. **Characters.** Any character other than `0-9` → **`badFormat`**.
3. **Length.** Not exactly 18 digits → **`wrongLength`** (also the empty string).
4. **Prefix.** Does not start with `8591824` → **`wrongPrefix`**.
5. **Check digit.** `d18 ≠ (10 − S mod 10) mod 10` → **`badChecksum`**.
6. Otherwise `{ valid: true }`.

Positions 8–17 are **not** checked against distributor ranges (decision 4).

### 2.5 Worked example 2: `859182400512345670` (constructed, ČEZ-shaped, check digit 0)

1.–3. No letters, only digits, 18 ✓. 4. Starts `8591824` ✓.
5. Odd positions `8, 9, 8, 4, 0, 1, 3, 5, 7` = 45, ×3 = 135; even `5, 1, 2, 0, 5, 2, 4, 6` = 25; `S = 160`;
   `c = (10 − 0) mod 10 = 0` ✓ → **`{ valid: true }`**. An implementation that forgets the final `mod 10` expects `10`
   and rejects it (edge `checkDigitZero`).

### 2.6 Worked example 3: precedence

`859182500512345677` (constructed): letters, format, length ✓; GS1 check digit correct (`S = 163`, `c = 7`); but it
starts `8591825` → **`wrongPrefix`**. A pure GS1 validator accepts it.

### 2.7 What the check digit cannot detect (my derivation)

Mod 10 with weights 3/1 detects every single-digit error and every adjacent transposition **except** of two digits that
differ by 5 (`0↔5`, `1↔6`, …), because `3a + b ≡ 3b + a (mod 10)` iff `2(a − b) ≡ 0`. Example: `859182400512345670`
with positions 9 and 10 swapped is `859182405012345670`, still valid under 2.4 (it just looks like LDS network `0501`).
Such values are documented as samples; no variant needed.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| before 2006 | Market opening (OTE founded 2001); whether 18-digit codes existed under the earlier rules was **not checked** | UNVERIFIED |
| 1. 1. 2006 | Vyhláška 541/2005 Sb. § 2 odst. 1 písm. p): *"identifikačním číselným kódem – osmnáctimístný identifikační číselný kód přiřazený provozovatelem přenosové nebo distribuční soustavy odběrnému nebo předávacímu místu"*; 13-digit *registrační číslo* for participants | [P] zakonyprolidi.cz 2005-541 |
| 1. 1. 2016 | Vyhláška 408/2015 Sb. replaces 541/2005 Sb.; § 15, § 16 as quoted in 1.1 | [P] |
| 1. 1. 2020 | All supply points inside LDS registered in CS OTE (OTE seminar document: *"S registrací všech OPM k 1.1.2020"*) | [P] OTE |
| 1. 9. 2026 | Version 18 of 408/2015 Sb. in force; § 16 still says 18 digits | [P] |

The 18-digit length and the GS1 check have no known exceptions or legacy formats. The validator has no date-dependent
rules.

### 3.2 Several EAN kinds share the format

The same 18-digit format is used for consumption EANs, separate **production EANs** (*výrobní EAN*) at the same place
(UNVERIFIED, enkidoo.cz), transfer points between systems, OTE's *dopočtový EAN* of each network and the *číslo ztrát*
of § 16c (*"osmnáctimístným číslem ztrát"*, [P]). A validator cannot tell them apart and does not try.

### 3.3 EAN is stable, never reused

ČEZ, E.ON and secondary sources: the EAN stays with the place when the customer changes, and after the supply point is
cancelled it *"se nesmí použít pro označení jiného odběrného místa"* (UNVERIFIED wording, secondary). No effect on
validation.

### 3.4 Lookalikes

- **13-digit OTE registration number** (*EAN RÚT*, § 15 odst. 2): a different identifier → `wrongLength`.
- **Foreign GS1 metering-point codes**: Poland uses 18-digit PPE codes `590` + 4-digit operator + 10 digits + check digit,
  GS1 standard (Energa-Operator IRiESD change card 1/2015, seen only as a search snippet, UNVERIFIED). Same shape, valid
  GS1 check digit → `wrongPrefix`.
- **Number precision loss**: 18 digits exceed `Number.MAX_SAFE_INTEGER` (16 digits) and Excel's 15 significant digits
  (UNVERIFIED, Microsoft limits not re-read). An EAN stored as a number becomes e.g. `859182400276543000` (Excel) →
  usually `badChecksum`; shown in scientific notation (`8,59182E+17`) → `letters` (the `E`). See open question C.
- **Gas EIC** (`27ZG…`, 16 characters): `letters`.

---

## 4. Edge and invalid variants

The spec defines **no** variants for ean (line 48 table has no EAN row). Everything below is a **proposal** (decisions
5–7). Every value has exactly one property or fault.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Catches | Example |
| --- | --- | --- | --- |
| `checkDigitZero` | plain EAN whose check digit is `0` (`S ≡ 0 mod 10`) | `10 − S % 10` without the final `% 10` | `859182400512345670` |
| `lds` | EAN of a local distribution system: `8591824` + network `0300`–`0999` + `0` + 5 digits + check digit, so positions 8–9 are not `00` | validators that require `859182400` | `859182403450123454` |

Not proposed as edge variants: one per distributor (that is the generator option `distributor`, decision 8; a variant
per distributor would add names, not test value).

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | One fault only |
| --- | --- | --- |
| `badChecksum` | plain EAN with the check digit replaced by a uniformly drawn **other** digit | prefix and length untouched |
| `wrongLength` | `int(0, 1)`: **0** → plain EAN without its check digit (17 digits, "forgot the check digit"); **1** → plain EAN with one random digit appended (19 digits) | digits only, correct prefix |
| `letters` | plain EAN with one of its 18 characters replaced by a letter of `AOl` (`replaceDigitWithLetter`) | as ico, iban |
| `wrongPrefix` | `859` + a 4-digit block ≠ `1824` + positions 8–17 of a plain EAN + **recomputed** check digit | passes every pure GS1 validator and every "starts with 859" check; only the OTE part is wrong |

Reason code without a variant: **`badFormat`** (spaces, separators, other characters), as ico and bankAccount.

---

## 5. Known samples

No EAN of a real supply point is used: an EAN identifies a place and may point to a household. The only official values
are OTE's illustrative examples for network `1234` (section 2.3). Whether network `1234` exists is unknown; the values are
published by OTE as examples, so they are safe to use.

### Valid

| Input | What | Covers |
| --- | --- | --- |
| `859182412340000003` | OTE example [P], `S = 117` | worked example 1; LDS-shaped (`85918241…`) |
| `859182412340000010` | OTE example [P], `S = 120` | check digit `0` from an official source |
| `859182412340000027` | OTE example [P] | |
| `859182412340000034` | OTE example [P] | |
| `859182412340000041` | OTE example [P] | |
| `859182412340000058` | OTE example [P] | |
| `859182400512345670` | constructed, ČEZ-shaped (digit 10 = 5), `S = 160` | worked example 2, `checkDigitZero` |
| `859182400800000007` | constructed, ČEZ-shaped (8), `S = 103` | |
| `859182400276543213` | constructed, EG.D-shaped (2), `S = 157` | |
| `859182400199999999` | constructed, EG.D-shaped (1), `S = 231` | many 9s |
| `859182400300421982` | constructed, PRE-shaped (3), `S = 148` | |
| `859182403450123454` | constructed, LDS network `0345`, `S = 156` | `lds` |
| `859182405012345670` | `859182400512345670` with positions 9/10 swapped (`0↔5`), `S = 170` | undetectable transposition (2.7) |
| `859182400000000005` | constructed, digit 10 = `0` (no known distributor), `S = 95` | positions 8–17 are not range-checked (decision 4) |
| `859182499999999995` | constructed, network `9999`, `S = 275` | same |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'859182400276543214'` | `badChecksum` | check digit 3 → 4 |
| `'859182400512345671'` | `badChecksum` | check digit 0 → 1 |
| `'859182412340000004'` | `badChecksum` | OTE example, 3 → 4 |
| `'859182400267543213'` | `badChecksum` | positions 11/12 (`7`, `6`) swapped; expected `5` |
| `'859182400276543000'` | `badChecksum` | `859182400276543213` after Excel's 15-digit rounding; expected `8` |
| `'859182500512345677'` | `wrongPrefix` | GS1-valid, `8591825` (worked example 3) |
| `'590123400000000011'` | `wrongPrefix` | GS1-valid, Polish-PPE-shaped (`590`) |
| `'000000000000000000'` | `wrongPrefix` | GS1-valid (`S = 0`, `c = 0`) |
| `'00512345670'` | `wrongLength` | `859182400512345670` with the first 7 digits cut off (11 digits): length is checked before the prefix |
| `'85918240051234567'` | `wrongLength` | 17 digits, check digit missing |
| `'8591824005123456700'` | `wrongLength` | 19 digits |
| `'8591824000007'` | `wrongLength` | 13 digits, GTIN-13-valid (shape of the OTE registration number) |
| `''` | `wrongLength` | empty (ico precedent) |
| `'85918240051234567O'` | `letters` | `O` for `0` |
| `'8591824OO512345670'` | `letters` | |
| `'EAN 859182400512345670'` | `letters` | label in front: letters before format |
| `'8,59182E+17'` | `letters` | Excel scientific notation |
| `'27ZG000000000000'` | `letters` | gas EIC-shaped |
| `'859182400 512345670'` | `badFormat` | space |
| `'859 1824 0051 2345 670'` | `badFormat` | grouped |
| `' 859182400512345670'` | `badFormat` | leading space, not trimmed |
| `'859182400512345670 '` | `badFormat` | trailing space |
| `'8591824-00512345670'` | `badFormat` | hyphen |
| `'+859182400512345670'` | `badFormat` | sign |
| `859182400`, U+00A0, `512345670` | `badFormat` | no-break space |
| full-width `８５９１８２４００５１２３４５６７０` | `badFormat` | U+FF10–U+FF19 are neither `[0-9]` nor letters |

All sums recomputed twice (2.1 and the shortcut 2.2). Shortcut check for two of them: `859182400276543213` → `T = 62`,
`(5 − 62) mod 10 = 3` ✓; `859182403450123454` → `T = 61`, `(5 − 61) mod 10 = 4` ✓.

---

## 6. Sources

Primary [P]:

1. **Vyhláška č. 408/2015 Sb.**, o Pravidlech trhu s elektřinou, § 15 odst. 2, § 16 odst. 1–2, § 16c odst. 1 (version 18,
   from 1. 9. 2026): <https://www.zakonyprolidi.cz/cs/2015-408>
2. **Vyhláška č. 541/2005 Sb.** (1. 1. 2006 – 31. 12. 2015), § 2 odst. 1 písm. p), § 4:
   <https://www.zakonyprolidi.cz/cs/2005-541>
3. OTE, *Registrace LDS a přidělení EAN odběrným místům* (seminar material; fixed part `8591824`, network ranges,
   Excel helper with 6 worked check digits; undated, refers to 1. 1. 2020; read as page images):
   <https://www.ote-cr.cz/cs/dokumentace/dokumentace-elektrina/files_dokumentace/podklady_k_seminari.pdf>
4. OTE, *Číselník sítí* (downloaded and parsed by the main session 2026-10-11; sheets *Seznam sítí*, *Rozsah sítí*):
   <https://www.ote-cr.cz/cs/dokumentace/dokumentace-elektrina/ciselnik_siti.xlsx>
5. ČEZ Distribuce, *EAN (European Article Number)* (18 digits starting `8591824`; distributor code at position 10, ČEZ
   Distribuce 4–8): <https://www.cezdistribuce.cz/cs/pro-zakazniky/potrebuji-vyresit/stavajici-pripojeni/ean>
6. ČEZ, glossary *EAN*: <https://www.cez.cz/cs/slovnicek-pojmu/ean-189008>
7. E.ON (EG.D group), *EAN kód* (3 + 4 + 5 + 5 + 1 structure, `1824` for all Czech points):
   <https://www.eon.cz/radce/energeticky-slovnik/ean/>
8. ČEZ, sample invoice *Vyúčtování za elektřinu* 2024 (EAN printed as 18 digits without spaces):
   <https://www.cez.cz/webpublic/file/edee/komodity/formulare/vyuctovani_elektrina_vysvetlivky.pdf>
9. GS1, *Barcode Syntax Dictionary* (AI 8017/8018 GSRN `N18,csum,gcppos1`):
   <https://github.com/gs1/gs1-syntax-dictionary> (file `gs1-syntax-dictionary.txt`)
10. GS1, *Syntax Engine*, `csum` linter (reference check digit code):
    <https://github.com/gs1/gs1-syntax-engine/blob/main/src/c-lib/syntax/lint_csum.c>
11. GS1 Australia, *Global Service Relation Number (GSRN)* (fixed 18 characters; utility networks):
    <https://gs1au.org/standards/id-keys/global-service-relation-number-gsrn>

Not read (blocked, too large, binary or password-protected): GS1 General Specifications § 7.9.1
(<https://ref.gs1.org/standards/genspecs/>, > 10 MB; gs1.org pages HTTP 403), GS1 GEPIR (owner of `8591824`), OTE XSD
templates (zip), OTE CDS manual (password zip), OTE CSV description for NV 5/2023 (docx), GS1 Czech Republic pages
(no EAN-for-electricity content found on <https://www.gs1cz.org/>).

Secondary (**UNVERIFIED**):
- kupnisila.cz, *Co je EAN a EIC kód* (positions 8–12: `00100`–`00299` EG.D, `00300`–`00399` PRE, `00400`–`00899` ČEZ;
  a real EG.D example): <https://www.kupnisila.cz/co-je-ean-a-eic-kod-elektromeru-a-plynomeru/>
- epet.cz, *EAN kód* (*"začíná vždy číslicemi 859182400"*; EON 1 or 2, PRE 3, ČEZ 4–8): <https://www.epet.cz/ean-kod/>
- enkidoo.cz (production EAN): <https://www.enkidoo.cz/clanky/spotrebni-a-vyrobni-ean-odberneho-mista-o-co-se-jedna-a-potrebujete-oba-dva>
- Wikipedia, *List of GS1 country codes* (859 = Czech Republic): <https://en.wikipedia.org/wiki/List_of_GS1_country_codes>
- Energa-Operator, *Karta aktualizacji IRiESD 1/2015* (Polish PPE format; only a search snippet was seen):
  <https://energa-operator.pl/upload/wysiwyg/dokumenty_do_pobrania/centrum_informacji/instrukcje/iriesd/20150218/karta_aktualizacji_IRiESD_1-2015.pdf>

Quotes from web pages were obtained through a fetch tool asked for verbatim text; the OTE PDF and the ČEZ invoice were
read as page images.

---

## 7. Differences from docs/spec.md

1. **Line 39, "18 číslic, český prefix".** More precisely the fixed **7-digit** prefix `8591824` (GS1 Czech `859` + OTE
   `1824`), per OTE and ČEZ Distribuce. Not just `859` (that is any Czech GS1 number), and **not** `859182400` (excludes
   real LDS points, 1.3).
2. **Line 39, "Kontrolní číslice podle GS1 (váhy 3 a 1, mod 10)".** Confirmed. The spec does not say the direction:
   for 18 digits, **position 1 has weight 3** (the rightmost data digit has weight 3), and the check digit is
   `(10 − S mod 10) mod 10`. Confirmed by OTE's six worked values.
3. **Line 39, "Ověřit v: OTE, GS1 Czech Republic".** The legal basis is vyhláška 408/2015 Sb. § 16 (18 digits, OTE number
   series), which the spec does not name. GS1 Czech Republic publishes nothing about electricity EANs that I could
   find; the GS1 algorithm source is GS1's global reference code.
4. **Line 48 table: no EAN row.** The spec defines no edge/invalid variants; section 4 proposes `checkDigitZero`, `lds`,
   `badChecksum`, `wrongLength`, `letters`, `wrongPrefix` and the reason `badFormat`.
5. **Line 77, `cz.ean()` without options.** Proposal: optional `{ distributor }` (decision 8).
6. **Name.** "EAN" in the spec is the market name; the identifier is not an EAN-13/GTIN but has the GSRN shape. TSDoc
   should say so, so that users do not pass product barcodes.

---

## 8. Placement and size (proposal)

### 8.1 Where GS1 mod 10 lives

Proposal (decision 9): **reuse the existing core `weightedSum`** (`src/core/checksum.ts`) with a frozen 17-element
weight array built in `src/ean/` (`3, 1, 3, …, 3`), and keep the `(10 − S % 10) % 10` rule in `src/ean/`. No core
change, so the core budget (~70 B left) is untouched, and no weighted-sum logic is duplicated (CLAUDE.md "Shared logic").
Alternative: an inline loop in `src/ean/` (~40–60 B, UNVERIFIED). EIC uses a different, alphanumeric algorithm
(UNVERIFIED until its rules are written), so nothing else would share a GS1 helper in v1.

### 8.2 Budget

Estimate (UNVERIFIED, measure after implementation):

| Part | min+gzip |
| --- | --- |
| validator (5 steps, one regex, prefix constant, check) | ~0.2–0.3 kB |
| generator with `distributor`, 2 edge and 4 invalid variants, identifier, index | ~0.4–0.6 kB |
| **ean own code** | **~0.6–0.9 kB of 2 kB** |

ean reuses no other identifier, so no standalone row and no CLAUDE.md amendment are needed (only the flat 2 kB row).
Whole library: 6.55 / 10 kB was measured before dic (iban review); with dic and iban merged, plus ean, roughly
8.5–9.5 kB (UNVERIFIED). Please measure `npm run size` on main before EAN; EIC may get tight.

---

## 9. Generator and variants contract (proposal)

### Options

`cz.ean(options?)` with `{ distributor?: 'cez' | 'egd' | 'pre' | 'lds' }`.

- Unknown value → `RangeError` naming `distributor`. Other keys ignored.
- Output: 18 ASCII digits, no spaces. No date dependence. Stream id `ean`. Subpath `czech-test-data/ean`, exports
  `createEan`, `validateEan` and the types `EanOptions`, `EanReason`, `EanEdgeVariant`, `EanInvalidVariant`,
  `EanGenerator`, `EanDistributor`. CLI command `ean` (M5), e.g. `--distributor cez`.

### Frozen constants (part of the determinism contract)

- `PREFIX = '8591824'`, `BIG_DSO = '00'` (positions 8–9 for the three big distributors).
- `DISTRIBUTOR_DIGITS` (position 10): `egd: [1, 2]`, `pre: [3]`, `cez: [4, 5, 6, 7, 8]`, default (no option):
  `[1, 2, 3, 4, 5, 6, 7, 8]` (ČEZ 5/8, EG.D 2/8, PRE 1/8, roughly their market shares, UNVERIFIED).
- LDS network range `300`–`999` (padded to 4 digits), position 12 = `'0'`.
- `WEIGHTS` = 17 × alternating `3, 1`, starting with `3`. `LETTERS = 'AOl'`.

### Draw order (determinism)

`check(body17)` = `(10 − weightedSum(body17, WEIGHTS) % 10) % 10`, no draws.

**Plain `generate({ distributor })`:**
- `'lds'`: `n = int(300, 999)`, `body = PREFIX + pad4(n) + '0' + digits(5)`.
- otherwise: `d = pick(DISTRIBUTOR_DIGITS[distributor ?? default])` (also for `pre`, one draw consumed),
  `body = PREFIX + '00' + d + digits(7)`.
- Result `body + check(body)`.

**Edge variants:**
- `checkDigitZero`: repeat `v = generate({})` until `v` ends with `0` (probability 1/10 per try; terminates with
  probability 1, like iban `checkDigitsLeadingZero`).
- `lds`: `generate({ distributor: 'lds' })`.

**Invalid variants:**
- `badChecksum`: `v = generate({})`, `c = Number(v[17])`, `drawn = int(0, 8)`, new digit `drawn ≥ c ? drawn + 1 : drawn`.
- `wrongLength`: `v = generate({})`, `k = int(0, 1)`; `0` → `v.slice(0, 17)`; `1` → `v + digits(1)`.
- `letters`: `v = generate({})`, `replaceDigitWithLetter(random, v, [0, 1, …, 17], LETTERS)`.
- `wrongPrefix`: `v = generate({})`, `b = int(0, 9998)`, block `b ≥ 1824 ? b + 1 : b` padded to 4,
  `body = '859' + block + v.slice(7, 17)`, result `body + check(body)`.

### Reason codes

`'letters' | 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'badChecksum'`, in precedence order.

---

## 10. Decisions (approved 2026-10-11: every recommendation below was accepted, alternatives rejected)

1. **Prefix rule = exactly `8591824`** (positions 1–7). Recommendation: **yes** (OTE fixed part, ČEZ Distribuce).
   Alternatives: `859182400` (rejects real LDS EANs); only `859` (accepts any Czech GS1 number).
2. **Reason precedence** `letters → badFormat → wrongLength → wrongPrefix → badChecksum`. Recommendation: **yes**
   (ico order; "not a Czech electricity EAN" before the checksum, like iban's country). Alternative: `badChecksum`
   before `wrongPrefix` (GS1-generic first).
3. **Strict shape**: 18 ASCII digits, no spaces/separators, no trimming. Recommendation: **yes** (no official grouped
   form exists, 1.4). Alternative: a `withSpaces` edge variant (no source for any grouping).
4. **No range check of positions 8–17** (distributor/network). Recommendation: **yes**: the network list (číselník sítí)
   changes (1 757 networks today, new LDS keep being added) and would need a bundled snapshot like bank codes (size,
   maintenance). Alternative: require positions 8–9 = `00` and position 10 ∈ 1–8, or bundle the network list.
5. **Edge variants** `checkDigitZero` and `lds`. Recommendation: **yes**. Alternative: also one per distributor (no
   extra test value; use the option instead).
6. **Invalid variants** `badChecksum`, `wrongLength`, `letters`, `wrongPrefix` with the shapes in section 4, plus reason
   `badFormat` without a variant. Recommendation: **yes**.
7. **`wrongPrefix` shape** = `859` + block ≠ `1824`, check digit recomputed (one fault, passes GS1 and "starts with 859"
   checks). Recommendation: **yes**. Alternative: a foreign GS1 prefix such as Polish `590` (caught already by a "859"
   check).
8. **Generator option `distributor: 'cez' | 'egd' | 'pre' | 'lds'`** with the digits in section 9; default draws
   position 10 from 1–8 (no LDS by default). Recommendation: **yes**. Alternative: no options in v1.
9. **GS1 mod 10 via core `weightedSum`** with a weight array in `src/ean/`, no core change. Recommendation: **yes**.
   Alternative: inline loop in `src/ean/`.
10. **LDS generator shape**: network `0300`–`0999`, position 12 = `0`, 5 free digits (all blocks allocated per the
    číselník sítí, 1.3). Recommendation: **yes**.

---

## Open questions for Marek

A. ~~Can you open OTE's `ciselnik_siti.xlsx`…~~ Answered by the main session (2026-10-11): ranges confirmed [P], LDS
   range narrowed to `0300`–`0999` (see 1.3, clarifications from the network list).
B. Do you have a real EAN of a **legal person or public body** (e.g. from a public tender's list of supply points) that we
   may use as a fixture? I did not use any real EAN, because a random one may belong to a household.
C. Do you want a v1.1 invalid variant `numberPrecision` (EAN rounded through `Number`/Excel, usually `badChecksum`)? Not
   proposed for v1 because of the whole-library budget.
