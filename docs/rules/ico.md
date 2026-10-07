# ico (IČO, identifikační číslo osoby)

Status: **APPROVED** by Marek on 2026-10-07 (all recommendations in section 9 accepted; they override every
"proposed", "optional" and "open question" marker below) · researched 2026-10-07 · rules-researcher

Czech meaning: *identifikační číslo osoby* (IČO, often shortened to IČ) is the identification number of a legal
person, an entrepreneur (*podnikající fyzická osoba*), a public body or another subject in the basic register of
persons (*základní registr osob*, ROS). Zákon č. 111/2009 Sb., § 24 písm. c) defines it as *"číselný kód označovaný
zkratkou „IČO", který slouží k jednoznačné identifikaci subjektu"*. Once assigned, an IČO is never given to anyone
else (§ 26 odst. 8: *"Již jednou přidělené identifikační číslo nesmí být přiděleno jiné osobě"*). The DIČ of a legal
person is `CZ` + IČO, so `dic` will reuse this validator.

Legend: **[P]** is a primary source (law, ARES, ČSÚ, or a record in ARES). **UNVERIFIED** means the claim rests
only on secondary sources. **[ARES data]** means the claim was checked against live ARES records on 2026-10-07
(`GET https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/<ico>`).

> **Main caveat.** No reachable *official* document states the check-digit algorithm in words. The law does not
> define the format at all. ARES defines only `^\d{8}$`. The algorithm below rests on (a) secondary sources that all
> agree, and (b) live ARES records that cover **every** branch of the rule (remainder 0, 1, 10 and an ordinary
> remainder; section 5). The only "official" text found, an article in the Ministry of the Interior's journal
> *Kriminalistika* (1999, now offline), states a variant that **rejects** real IČO with remainder 0 (section 3.3).

---

## 1. Format

| Part | Digits | Meaning |
| --- | --- | --- |
| `d1`–`d7` | 7 | base number (sequence number assigned by the register) |
| `d8` | 1 | check digit, computed from `d1`–`d7` (section 2) |

- **Exactly 8 digits.** ARES REST API 1.4.0, OpenAPI definition of `ico`: `"pattern": "^\\d{8}$"`, `minLength: 8`,
  `maxLength: 8`, description *"Identifikační číslo osoby - IČO"* [P].
- **Leading zeros are part of the IČO.** Old numbers are written with zeros in front: Ministerstvo financí
  `00006947`, ČSOB `00001350`, Škoda Auto `00177041` [ARES data]. IČO assigned by ROS also start with `0`, e.g.
  Superfaktura.cz, s.r.o. `01569651`, created 2013-04-08 [ARES data]. cs Wikipedia: *"Starší čísla s méně číslicemi
  jsou odpředu doplněna nulami"* (UNVERIFIED).
- **Shorter forms are not IČO.** ARES answers `GET …/ekonomicke-subjekty/177041` (Škoda Auto without its two zeros)
  with **HTTP 400 Bad Request**, and an 8-digit number with a bad check digit (`00177040`) with **HTTP 404** [P,
  tested 2026-10-07]. ARES itself does not pad.
- **Padding and the checksum.** Zeros in front add nothing to the weighted sum. So a shorter number padded on the
  left to 8 digits has the same check result as the same number with right-aligned weights. Whether the validator
  should pad is open question 2. The proposal is: it does not.
- **No separators.** No official source groups the digits. ARES uses the bare 8 digits. Spaces, hyphens and other
  characters are outside the format.
- **No meaning in the digits.** Older literature says that number ranges were given to the assigning offices
  (courts, trade offices, ČSÚ) (UNVERIFIED). Since 1. 7. 2012 ROS assigns all new IČO. The validator checks no
  ranges.

### Allowed characters

Only ASCII digits `0-9`. Letters give `letters`. Any other character, including spaces, the no-break space, full-width
digits and a leading or trailing space, gives `badFormat` (proposed reason, open question 3). No trimming, the same
as birthNumber, phone and postalCode.

---

## 2. Check algorithm (proposed validator)

### The check digit

Weights `8, 7, 6, 5, 4, 3, 2` apply to `d1`–`d7`:

```
S = 8·d1 + 7·d2 + 6·d3 + 5·d4 + 4·d5 + 3·d6 + 2·d7
a = S mod 11
d8 = (11 − a) mod 10
```

What `(11 − a) mod 10` means for each remainder:

| `a` | `11 − a` | `d8` | Note |
| --- | --- | --- | --- |
| 0 | 11 | **1** | wrap-around: `11 mod 10 = 1` (edge `checkDigitOne`) |
| 1 | 10 | **0** | wrap-around: `10 mod 10 = 0` (edge `checkDigitZero`) |
| 2–10 | 9–1 | `11 − a` | ordinary case. `a = 10` also gives `d8 = 1`. |

So check digit `1` comes from two remainders (`a = 0` and `a = 10`), check digit `0` comes only from `a = 1`, and
every other digit comes from exactly one remainder. For a given base there is exactly one valid check digit.

**Not the same as "weighted sum ≡ 0 (mod 11)".** If you add the check digit with weight 1 (`S + d8`), the total is
divisible by 11 for `a = 2…10` only. For `a = 1` the total is ≡ 1 (because `d8` is 0, not 10). For `a = 0` the total
is also ≡ 1 (because `d8` is 1, not 0). This is why naive "mod 11 = 0" validators reject real IČO, and why the
two edge variants exist (section 3.3). The validator must compute the expected `d8` and compare it.

The rule is confirmed by ARES records for all branches (section 5): `a = 0` (`00177041`, `00064581`, `00845451`,
`26450691`), `a = 1` (`48136450`, `00075370`, `00001350`, `68407700`), `a = 10` (`01569651`), and ordinary
remainders (`00006947`, `00025593`, `45274649`).

### Validator steps

The validator does not depend on the date and ignores `referenceDate`. The first failing step gives the reason. The
precedence follows birthNumber decision 7 and postalCode: **`letters` → `badFormat` → `wrongLength` →
`badChecksum`**.

1. **Letters.** If the input has any Unicode letter (`\p{L}`, `hasLetter` from `src/core/letters.ts`), the result
   is **`letters`**. Examples: `CZ00177041` (a DIČ), `0O177041`.
2. **Characters.** If the input has any character other than `0-9`, the result is **`badFormat`**. This covers
   spaces (`001 77 041`), a leading or trailing space, hyphens, U+00A0 and full-width digits.
3. **Length.** If the number of digits is not 8, the result is **`wrongLength`**. This covers the empty string and
   unpadded `177041`.
4. **Checksum.** If `d8 ≠ (11 − S mod 11) mod 10`, the result is **`badChecksum`**.
5. Otherwise `{ valid: true }`.

One regex covers steps 2–3 (`^[0-9]{8}$`). Separate steps are still needed to return the specific reason.

### Worked example 1: `48136450` (Česká národní banka, ARES)

1. No letters ✓. 2. Only digits ✓. 3. Eight digits ✓.
4. `S = 8·4 + 7·8 + 6·1 + 5·3 + 4·6 + 3·4 + 2·5 = 32 + 56 + 6 + 15 + 24 + 12 + 10 = 155`.
   `a = 155 mod 11 = 1` (because `11 · 14 = 154`). `d8 = (11 − 1) mod 10 = 0`. The actual `d8` is `0` ✓.
5. Result `{ valid: true }`. A naive check `(155 + 0) mod 11 = 1 ≠ 0` would reject this real IČO.

### Worked example 2: `00064581` (Hlavní město Praha, ARES)

`S = 8·0 + 7·0 + 6·0 + 5·6 + 4·4 + 3·5 + 2·8 = 30 + 16 + 15 + 16 = 77`, `a = 77 mod 11 = 0`,
`d8 = (11 − 0) mod 10 = 1` ✓ → valid. The same base with `d8 = 0` (`00064580`) is `badChecksum`, even though
`(77 + 0) mod 11 = 0` passes a naive check.

---

## 3. Special cases and history

### 3.1 History

| Date | Event | Source |
| --- | --- | --- |
| 1. 1. 1990 | Zákon č. 128/1989 Sb. (amends 21/1971 Sb., o jednotné soustavě sociálně ekonomických informací): the founder of an organization must ask the state statistics body for an *identifikační číslo organizace* | [P] zakonyprolidi.cz 1989-128 |
| 1992 | Zákon č. 278/1992 Sb.: IČO assignment for entrepreneurs changed | cs Wikipedia (UNVERIFIED) |
| 1995 | Zákon č. 89/1995 Sb., o státní statistické službě: ČSÚ keeps the Registr ekonomických subjektů (§ 20). One IČO per subject; § 28 odst. 8–9 handles subjects that had several numbers. | [P] zakonyprolidi.cz 1995-89 (version 31, from 1. 1. 2026), not quoted verbatim |
| 2004 | Zákon č. 81/2004 Sb.: renamed *identifikační číslo ekonomického subjektu* | cs Wikipedia (UNVERIFIED) |
| 2009 / 1. 7. 2012 | Zákon č. 111/2009 Sb., o základních registrech: name *identifikační číslo osoby*, assigned by ROS editors on entry into the register. ČSÚ regional offices stopped assigning IČO on 2. 7. 2012. Earlier numbers stay valid. | [P] 111/2009 Sb. § 24, § 26; ČSÚ notice |
| 2013 → | ROS-assigned IČO with a leading `0`, e.g. `01569651` (2013) | [ARES data] |

The **format and the check digit never changed**. Old numbers with zeros in front pass the same algorithm
(`00006947`, `00001350`). No source mentions a separate "6-digit IČO" with its own rule. "Shorter" IČO are the same
8-digit numbers written without zeros in front.

### 3.2 Who keeps the register today

zakonyprolidi.cz (111/2009 Sb., version 35, from 1. 1. 2026) names the administrator of ROS as the assigning body.
The rendering suggests this is now the Digitální a informační agentura, not ČSÚ. This was **not checked** against the
verbatim text and does not affect the format.

### 3.3 Conflicting formulations of the check (sources disagree)

| Source | Rule as stated | `a = 0` | `a = 1` |
| --- | --- | --- | --- |
| cs Wikipedia, phpFashion (citing *Katalog datových prvků ISVS*), python-stdnum `cz.dic`, zizka.ch, the spec | `d8 = (11 − a) mod 10`, i.e. `a = 0 → 1`, `a = 1 → 0`, otherwise `11 − a` | `1` ✓ | `0` ✓ |
| MV ČR, *Kriminalistika* 3/1999 (article "rak"), as quoted on abclinuxu.cz (2008); the original URL is now 404 | weight `9 − i` for positions 1–7, add `d8` (a `0` counts as 10); the total must be divisible by 11 | **no valid digit** → would reject | `0` (as 10) ✓ |

Real IČO with `a = 0` exist and are in ARES: `00064581` Hlavní město Praha, `00845451` Statutární město Ostrava,
`00177041` Škoda Auto, `26450691` MAKRO Cash & Carry ČR [ARES data]. So the MV 1999 formulation is **wrong for
`a = 0`**. A živě.cz forum thread (UNVERIFIED) reports the same problem with `26450691` and a patch ("if the last digit
is 1 and the remainder is 1, add 10"). phpFashion reports the same with `25596641` (not in ARES today, so not used).
**Decision taken here:** `(11 − a) mod 10`. All evidence from real records supports it. Nothing official was found
that supports the other rule while being consistent with ARES data.

### 3.4 ARES does not check the check digit

ARES returns 404 ("not found") for an 8-digit number with a bad check digit, not an input error (tested with
`00177040`). A Czech application that sends unchecked input to ARES therefore cannot tell a typo from a missing
subject. This is a reason to test with `badChecksum` values.

### 3.5 Base `0000000`

`00000001` passes the algorithm (`S = 0`, `a = 0`, `d8 = 1`). No source says that the base `0000000` is
excluded, and no such subject was looked up. Proposal: valid (open question 10). The generators never produce it on
purpose.

---

## 4. Edge and invalid variants

Spec (line 51): edge `leadingZeros`, `checkDigitZero`, `checkDigitOne`; invalid `badChecksum`, `wrongLength`,
`letters`. Below are the definitions and the proposed generator constraints. Every value has exactly one property or
fault.

### Edge variants (valid but unusual): must return `{ valid: true }`

| Variant | Definition | Generator constraint (proposal) |
| --- | --- | --- |
| `leadingZeros` | 8 digits starting with `0`. It breaks applications that store IČO as a number. | `k = int(1, 4)` zeros, then one digit from 1–9, then `digits(6 − k)`, then the check digit. Real examples: `01569651` (k = 1), `00177041` (2), `00064581` (3), `00006947` (4). Open question 5. |
| `checkDigitZero` | `a = 1`, so `d8 = 0` (wrap-around `10 → 0`). It breaks validators that use `11 − a` without `mod 10` or the "sum ≡ 0" rule. | Draw the base like the plain generator and redraw the whole base until `a = 1` (rejection sampling). |
| `checkDigitOne` | `a = 0`, so `d8 = 1` (wrap-around `11 → 1`). It breaks the same validators and the MV 1999 rule. | As above, until `a = 0`. **Not** `a = 10`, because that gives `d8 = 1` by the ordinary formula (open question 1). |

### Invalid variants: must return `{ valid: false, reason }`

| Variant / reason | Definition | Generator constraint (one fault only) |
| --- | --- | --- |
| `badChecksum` | 8 digits, `d8` is not the expected check digit | a plain valid IČO with `d8` replaced by a uniformly drawn **different** digit (`int(0, 8)`, skipping the correct one) |
| `wrongLength` | digits only, length ≠ 8 | proposal (open question 6): draw `int(0, 1)`. **0** gives 7 digits: a valid IČO with exactly one leading zero, that zero removed (`01569651` → `1569651`, the "stored as a number" bug). **1** gives 9 digits: a plain valid IČO with one random digit appended. |
| `letters` | contains a letter, otherwise the shape of a valid IČO | a plain valid IČO with one digit (any of the 8 positions) replaced by `replaceDigitWithLetter` from `src/core/letters.ts`, letters `AOl` as in birthNumber and phone (open question 7) |

Reason code without a variant (proposal, open question 3): **`badFormat`** (spaces, other separators, other
characters), as in birthNumber.

---

## 5. Known samples

IČO of legal persons and public bodies are public data (ARES). All values below were checked in ARES on 2026-10-07.
No IČO of a natural person is used.

### Valid (real, ARES)

| Input | Subject | `S` | `a` | `d8` | Covers |
| --- | --- | --- | --- | --- | --- |
| `00177041` | Škoda Auto a.s. | 77 | 0 | 1 | `checkDigitOne`, `leadingZeros` (k = 2) |
| `00064581` | Hlavní město Praha | 77 | 0 | 1 | `checkDigitOne`, `leadingZeros` (k = 3) |
| `00845451` | Statutární město Ostrava | 110 | 0 | 1 | `checkDigitOne`, `leadingZeros` |
| `26450691` | MAKRO Cash & Carry ČR s.r.o. | 143 | 0 | 1 | `checkDigitOne`, no zeros in front |
| `48136450` | Česká národní banka | 155 | 1 | 0 | `checkDigitZero` (worked example 1) |
| `68407700` | České vysoké učení technické v Praze | 177 | 1 | 0 | `checkDigitZero` |
| `00075370` | Statutární město Plzeň | 78 | 1 | 0 | `checkDigitZero`, `leadingZeros` |
| `00001350` | Československá obchodní banka, a. s. | 23 | 1 | 0 | `checkDigitZero`, `leadingZeros` (k = 4) |
| `01569651` | Superfaktura.cz, s.r.o. (created 2013-04-08) | 131 | 10 | 1 | `a = 10` → `1` by the ordinary formula; `leadingZeros` (k = 1), ROS era |
| `00006947` | Ministerstvo financí | 59 | 4 | 7 | `leadingZeros` (k = 4) |
| `00025593` | Český statistický úřad | 63 | 8 | 3 | `leadingZeros` |
| `45274649` | ČEZ, a. s. | 156 | 2 | 9 | plain |

### Valid (constructed, not looked up in ARES)

| Input | `S` / `a` | Why |
| --- | --- | --- |
| `12345679` | 112 / 2 | plain |
| `11111119` | 35 / 2 | plain |
| `10001000` | 12 / 1 | `checkDigitZero` |
| `10000101` | 11 / 0 | `checkDigitOne` |
| `00000019` | 2 / 2 | `leadingZeros` (k = 6, beyond the generator's range, but valid) |
| `00000001` | 0 / 0 | base `0000000` (section 3.5, open question 10) |

### Invalid

Inputs are JS string literals, so spaces are visible.

| Input | Expected reason | Why |
| --- | --- | --- |
| `'12345678'` | `badChecksum` | expected `9` |
| `'11111111'` | `badChecksum` | expected `9` |
| `'45274648'` | `badChecksum` | ČEZ with the last digit changed |
| `'00177040'` | `badChecksum` | `a = 0` expects `1`. A naive "sum ≡ 0" check accepts it. ARES 404. |
| `'00064580'` | `badChecksum` | `a = 0` expects `1`. A naive check accepts it. |
| `'48136451'` | `badChecksum` | `a = 1` expects `0` |
| `'00000000'` | `badChecksum` | `a = 0` expects `1` |
| `'177041'` | `wrongLength` | Škoda Auto without zeros in front (ARES 400) |
| `'1569651'` | `wrongLength` | 7 digits: `01569651` with its zero removed |
| `'001770410'` | `wrongLength` | 9 digits |
| `''` | `wrongLength` | 0 digits |
| `'CZ00177041'` | `letters` | DIČ, not IČO |
| `'0O177041'` | `letters` | letter O instead of zero |
| `'4813645l'` | `letters` | lowercase L instead of one |
| `'0O17704'` | `letters` | letters win over length |
| `'001 77 041'` | `badFormat` | spaces |
| `' 00177041'` | `badFormat` | leading space, not trimmed |
| `'00177041 '` | `badFormat` | trailing space |
| `'0017-7041'` | `badFormat` | hyphen |
| `'001 7704'` | `badFormat` | format runs before length |
| `0017`, U+00A0, `7041` | `badFormat` | no-break space |
| full-width `００１７７０４１` | `badFormat` | U+FF10–U+FF19 are not `[0-9]` and not letters |

---

## 6. Sources

Primary [P]:

1. Zákon č. 111/2009 Sb., o základních registrech, § 24 písm. c) (definition), § 25, § 26 odst. 8 (no reuse). No
   format or check digit. <https://www.zakonyprolidi.cz/cs/2009-111> (version 35, from 1. 1. 2026); official
   <https://e-sbirka.gov.cz/sb/2009/111> (not rendered, JS app).
2. ARES REST API, OpenAPI 1.4.0: `ico` pattern `^\d{8}$`, length 8.
   <https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/v3/api-docs> (Swagger UI <https://ares.gov.cz/swagger-ui/>).
3. ARES records used as samples (section 5), checked on 2026-10-07:
   `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/<ico>`. Also: `177041` → HTTP 400,
   `00177040` → HTTP 404.
4. Zákon č. 128/1989 Sb. (introduces the *identifikační číslo organizace* from 1. 1. 1990):
   <https://www.zakonyprolidi.cz/cs/1989-128>
5. Zákon č. 89/1995 Sb., o státní statistické službě, § 2, § 20, § 28: <https://www.zakonyprolidi.cz/cs/1995-89>
6. ČSÚ, *Informace ČSÚ ke změnám v přidělování IČO a poskytování výpisů z RES* (regional offices stop assigning IČO
   on 2. 7. 2012): <https://csu.gov.cz/pha/informace_csu_ke_zmenam_v_pridelovani_ico_a_poskytovani_vypisu_z_res>
7. ČSÚ, *Dotazy k IČO* (one IČO per entrepreneur): <https://csu.gov.cz/dotazy_k_ico_ros>

Official, but not reachable or not read (the check algorithm is said to be stated there):

8. MV ČR, *Kriminalistika* 3/1999, article "rak", the formulation in section 3.3. The original
   <http://aplikace.mvcr.cz/archiv2008/casopisy/kriminalistika/1999/9903/rak.html> is now 404. Known only through
   the quote on abclinuxu.cz (**UNVERIFIED**).
9. Ministerstvo informatiky, *Katalog datových prvků ISVS* (2005), cited by phpFashion as the authority. Copy:
   <https://is.muni.cz/el/1433/podzim2010/PA116/um/mi-Katalog_DP_ISVS-20050602.pdf>. The PDF could not be read
   (**UNVERIFIED**).

Secondary, **UNVERIFIED**:

10. cs Wikipedia, *Identifikační číslo osoby* (formula, zeros in front, history):
    <https://cs.wikipedia.org/wiki/Identifika%C4%8Dn%C3%AD_%C4%8D%C3%ADslo_osoby>
11. D. Grudl, *Jak ověřit platné IČ a rodné číslo* (rule `0 → 1`, `1 → 0`, else `11 − a`):
    <https://phpfashion.com/cs/jak-overit-platne-ic-a-rodne-cislo>
12. abclinuxu.cz, *Kontrola IČ* (2008, quotes the MV 1999 text): <https://www.abclinuxu.cz/blog/bloK/2008/10/kontrola-ic>
13. Živě.cz forum, *Ověření správnosti IČ* (`26450691`, the "+10" patch):
    <https://forum.zive.cz/viewtopic.php?f=922&t=954987>
14. O. Žižka, *Kontrola RČ a IČ* (`0 or 10 → 1`, `1 → 0`, `^\d{8}$`):
    <https://www.zizka.ch/pages/programming/ruzne/rodne-cislo-identifikacni-cislo-rc-ico-kontrola-validace.html>
15. python-stdnum `stdnum/cz/dic.py` (legal persons: same rule; cross-check only):
    <https://arthurdejong.org/git/python-stdnum/tree/stdnum/cz/dic.py?h=1.12>

---

## 7. Differences from docs/spec.md

1. **"Ověřit v: ARES, metodika MŠ".** ARES publishes only the format (`^\d{8}$`), not the check digit. No
   "metodika MŠ" for IČO was found. MŠMT uses its own school identifiers (IZO, RED_IZO), which are different
   identifiers. The algorithm has no reachable official text (header caveat and section 3.3). The legal basis is
   zákon 111/2009 Sb. § 24–26, which says nothing about the format.
2. **Check algorithm.** It agrees with the spec (`(11 − a) mod 10`) and ARES data confirms it. The spec does not say
   that `a = 10` also gives `1`. That matters for how `checkDigitOne` is defined (open question 1).
3. **"8 číslic".** Confirmed. The spec does not say that zeros in front are part of the IČO and that shorter forms
   are rejected by ARES (HTTP 400). Proposal: shorter means `wrongLength` (open question 2).
4. **New reason `badFormat`** (no variant) for spaces and other characters. The spec lists only `badChecksum`,
   `wrongLength` and `letters`. This keeps IČO consistent with the other validators (open question 3).
5. **Variant definitions.** The spec names the variants but does not define them. Section 4 proposes the
   definitions.

---

## 8. Generator and variants contract (proposal)

- `cz.ico()` takes **no options** (`NoOptions`).
- Plain generator (proposal, open question 4): `d1 = int(1, 9)`, then `digits(6)`, then the check digit
  `(11 − S mod 11) mod 10`. Every output is valid. About 1 in 11 outputs has `d8 = 0` and about 2 in 11 have
  `d8 = 1`, by chance.
- Output: 8 digits, no separators.
- No date dependence. `referenceDate` is ignored, there are no date ranges, and the shared determinism check from
  `tests/support/` must pass.
- Stream id `ico`. Subpath `czech-test-data/ico`, exports `createIco` and `validateIco`. CLI command `ico`.
- Reason code union, in precedence order: `'letters' | 'badFormat' | 'wrongLength' | 'badChecksum'`.
- Edge variants: `leadingZeros`, `checkDigitZero`, `checkDigitOne`. Invalid variants: `badChecksum`,
  `wrongLength`, `letters` (section 4).
- **Shared helper and size.** bankAccount (next) needs a weighted mod-11 sum with weights `6, 3, 7, 9, 10, 5, 8, 4,
  2, 1`, right-aligned, with the rule "sum ≡ 0 (mod 11)". IČO needs weights `8…2` and the `(11 − a) mod 10` rule.
  The common part is only the weighted digit sum. Proposal: `weightedSum(digits: string, weights: readonly
  number[]): number` in `src/core/` (equal lengths, `Σ digit[i] · weights[i]`). Each identifier keeps its own
  modulus rule. The core has about 120 B of headroom (1.88 / 2 kB). A helper of this size should cost well under
  100 B min+gzip, but this needs measuring. Where it lives is open question 9. The checksum rule itself
  (`(11 − a) % 10`) stays in `src/ico/`, because `dic` reuses it through the IČO validator, not through the core.

---

## 9. Decisions (approved 2026-10-07: every recommendation below was accepted)

1. **`checkDigitOne` means `a = 0` only, or any IČO ending in `1`?** Recommendation: **`a = 0` only**. That is the
   wrap-around `11 → 1` that breaks naive validators (and the MV 1999 rule). `a = 10` gives `1` by the ordinary
   formula and tests nothing special.
2. **IČO shorter than 8 digits** (`177041`, `1569651`): `wrongLength` or pad with zeros and accept? Recommendation:
   **`wrongLength`, no padding**. ARES rejects them (HTTP 400), its schema is `^\d{8}$`, and the library uses strict
   input everywhere else. The `wrongLength` variant then also tests the "IČO stored as a number" bug.
3. **`badFormat` as an extra reason code (no variant)** for spaces, hyphens, U+00A0, full-width digits and
   leading or trailing spaces. Recommendation: **yes**, as in birthNumber. The alternative is to report these as
   `wrongLength`, which would mislead (for example, `001 77 041` has 8 digits). Grouped input like `001 77 041` is
   **not** accepted, because no official grouping exists.
4. **Plain generator first digit.** Recommendation: **`d1` from 1–9**, so plain values never start with `0` and
   leading zeros come only from the `leadingZeros` variant. The alternative, `d1` from 0–9, is closer to reality
   (ROS assigns `0…` numbers), but about 10 % of plain values would then hit the zero bug at random, depending on
   the seed.
5. **`leadingZeros` count.** Recommendation: **`k = int(1, 4)`** zeros, then a non-zero digit. This matches the real
   range `01569651` … `00006947`.
6. **`wrongLength` shape.** Recommendation: draw 7 digits (a valid IČO with one leading zero removed) or 9 digits (a
   valid IČO + 1 random digit), 50/50. A simpler alternative is always 7 random digits.
7. **Letters for `letters`.** Recommendation: **`AOl`** (look-alikes for 0 and 1, as in birthNumber and phone), any
   of the 8 positions. The alternative is `A`–`Z` as in postalCode.
8. **`checkDigitZero` / `checkDigitOne` generation by rejection sampling** (redraw the whole base until `a` fits,
   about 11 draws on average). Recommendation: **yes**. It is simple to specify and to check independently. The
   alternative is to solve for `d7`.
9. **Where `weightedSum` lives.** Recommendation: **in `src/core/` now**, used by IČO and later by bankAccount. Core
   rules section 5 says "when the second identifier needs them", but bankAccount is the very next identifier and the
   signature above fits both. Measure the size. If the core goes over 2 kB, keep the sum local in `src/ico/` and move
   it when bankAccount arrives.
10. **Base `0000000`** (`00000001` passes the algorithm). Recommendation: **valid**, because no source excludes it.
    The generators do not produce it on purpose. With option 4 they cannot produce it at all.
