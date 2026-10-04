# Knihovna českých testovacích dat — zadání v1

Stav k 4. 10. 2026 · Marek

## Cíl a rozsah v1

TypeScript knihovna a CLI, které generují platná, ale neexistující česká testovací data a zároveň záměrně hraniční a nevalidní hodnoty pro negativní testy. Cílový uživatel je vývojář nebo tester, který píše testy v Playwrightu, Cypressu, Vitestu nebo Jestu.

Hlavní rozdíl proti existujícím nástrojům: všechny české identifikátory na jednom místě, deterministický seed a režim hraničních a nevalidních hodnot. Referenční inspirace je Ruby gem cz_faker (eManPrague), kód se nepřebírá, slouží jen ke křížové kontrole výsledků.

**V rozsahu v1:**

- Rodné číslo, IČO, DIČ, číslo účtu, IBAN, telefon, PSČ, EAN odběrného místa elektřiny a EIC plynu.
- Validátor ke každému typu, který vrací i důvod nevalidity.
- Režim hraničních a nevalidních hodnot.
- Seed pro reprodukovatelné výstupy.
- CLI v tomže balíčku.

**Mimo rozsah v1:**

- SPZ a VIN (v1.1, až po ověření pravidel v oficiálních zdrojích).
- Integrace s Fakerem. Knihovna je záměrně nezávislá.
- Jména a adresy (pokrývá je česká lokalizace Fakeru).
- Webová stránka (nanejvýš později jako demo a dokumentace).

## Identifikátory a pravidla

Pravidla níže jsou pracovní; před implementací každé ověř v uvedeném oficiálním zdroji a odkaz dej do komentáře v kódu.

| Typ | Formát | Kontrola | Ověřit v |
| --- | --- | --- | --- |
| Rodné číslo | RRMMDD/XXXX, před rokem 1954 RRMMDD/XXX | Od 1954 celé číslo dělitelné 11; výjimka: zbytek prvních 9 číslic po dělení 11 je 10, pak kontrolní číslice 0 (čísla vydaná do 1985). Ženy měsíc +50, od 2004 možný měsíc +20 (muži) a +70 (ženy) | Zákon o evidenci obyvatel |
| IČO | 8 číslic | Váhy 8–2 na prvních 7 číslicích, a = součet mod 11; kontrolní číslice = (11 − a) mod 10 | ARES, metodika MŠ |
| DIČ | CZ + IČO, CZ + rodné číslo, nebo CZ + číslo přidělené finančním úřadem | Podle typu podkladu | Finanční správa |
| Číslo účtu | Předčíslí max. 6 číslic, základní část 2–10 číslic, kód banky 4 číslice | Každá část zvlášť mod 11 s váhami 6, 3, 7, 9, 10, 5, 8, 4, 2, 1 (zarovnáno vpravo); kód banky z číselníku ČNB | Vyhláška ČNB, číselník kódů bank |
| IBAN | CZ + 2 kontrolní číslice + kód banky + předčíslí (6) + číslo (10) | ISO 13616, mod 97 | ČNB |
| Telefon | +420 a 9 číslic | Mobilní prefixy 6xx a 7xx, pevné podle oblastí | ČTÚ, číslovací plán |
| PSČ | 5 číslic, formát „123 45“ | Jen formát, nebo existující PSČ ze seznamu | Česká pošta |
| EAN (elektřina) | 18 číslic, český prefix | Kontrolní číslice podle GS1 (váhy 3 a 1, mod 10); prefix ověřit | OTE, GS1 Czech Republic |
| EIC (plyn) | 16 znaků, český prefix | Kontrolní znak podle algoritmu EIC; prefix ověřit | OTE, ENTSO-E |

Generované hodnoty musí být vnitřně konzistentní: rodné číslo odpovídá zadanému datu narození a pohlaví, DIČ fyzické osoby odpovídá jejímu rodnému číslu, IBAN odpovídá číslu účtu.

## Hraniční a nevalidní hodnoty

Tohle je hlavní přidaná hodnota knihovny. Každý typ má pojmenované varianty, aby test říkal, co přesně ověřuje.

| Typ | Platné hraniční | Nevalidní |
| --- | --- | --- |
| Rodné číslo | `pre1954` (9 číslic), `mod11Exception` (zbytek 10, koncová 0), `month+20`, `month+70`, `leapDay`, `withoutSlash` | `badChecksum`, `impossibleDate` (měsíc 13, den 32), `wrongLength`, `letters`, `futureDate` |
| IČO | `leadingZeros`, `checkDigitZero`, `checkDigitOne` | `badChecksum`, `wrongLength`, `letters` |
| DIČ | `fromIco`, `fromRc`, `lowercasePrefix` (podle toho, jestli to aplikace má akceptovat) | `missingPrefix`, `foreignPrefix`, `badInnerChecksum` |
| Číslo účtu | `withPrefix`, `maxLength`, `minLength`, `withLeadingZeros` | `badChecksumPrefix`, `badChecksumNumber`, `unknownBankCode` |
| IBAN | `withSpaces`, `lowercase` | `badChecksum`, `wrongCountry`, `wrongLength` |

Každá nevalidní varianta musí selhat ve validátoru s očekávaným důvodem, nejen „nevalidní“. Varianty, které jsou platné jen podle některých výkladů (například malá písmena v DIČ), jsou v dokumentaci označené jako sporné.

## API a CLI

Návrh API, ne finální podoba. Prioritou je čitelnost v testu. Balíček se jmenuje `czech-test-data` (na npm volný k 4. 10. 2026).

**Konvence pojmenování:** anglický název tam, kde existuje zavedený anglický termín, jinak český; vždy bez diakritiky. Proto `birthNumber`, `bankAccount`, `postalCode`, `phone`, `iban`, `ean`, `eic`, ale `ico` a `dic`. Obecné pojmy a kódy důvodů jsou anglicky (`edge`, `invalid`, `validate`, `badChecksum`). Bez aliasů; český význam je v TSDoc komentáři.

```ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

cz.birthNumber({ gender: 'female', birthDate: '1990-05-01' }); // '905501/XXXX'
cz.birthNumber.edge('month+20');
cz.birthNumber.invalid('badChecksum');

cz.ico();
cz.dic({ from: 'ico' });
cz.bankAccount({ bankCode: '0800', withPrefix: true });
cz.iban();
cz.ean();
cz.eic();

cz.validate.birthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }
```

Knihovna je záměrně nezávislá na Fakeru. Generátory přijímají `gender` a `birthDate`, aby si uživatel mohl data sladit se jmény z jakéhokoli zdroje.

CLI:

```bash
npx czech-test-data birth-number --count 10 --gender female
npx czech-test-data ico --invalid badChecksum --format json
npx czech-test-data bank-account --seed 42 --format csv
```

## Testovací strategie

Knihovna pro testery musí být sama otestovaná lépe než kód, který s ní lidé testují.

- **Property-based testy** (fast-check): každá vygenerovaná platná hodnota projde validátorem, každá nevalidní varianta selže s očekávaným důvodem, a to pro tisíce seedů.
- **Známé vzorky:** ručně ověřené hodnoty z oficiálních zdrojů a dokumentace (například veřejná IČO z ARES) jako pevné testovací případy pro validátory.
- **Křížová kontrola:** samostatná sada, která porovná výsledky validátorů s existujícími npm balíčky a s Ruby gemem cz_faker na stejných vstupech. Neshody se zkoumají ručně, ne automaticky opravují.
- **Determinismus:** snapshot test, že stejný seed dává stejné výstupy napříč verzemi; změna je breaking change.
- **Konzistence:** rodné číslo odpovídá datu narození a pohlaví, IBAN odpovídá číslu účtu.
- **CLI:** end-to-end testy spouštějící binárku a kontrolující výstup ve všech formátech.
- **Cíl pokrytí:** 100 % větví u validátorů, protože právě tam se schovávají hraniční případy.

## Technická rozhodnutí

- **Jazyk a formát:** TypeScript, výstup ESM i CommonJS, typy součástí balíčku. Podpora aktuálních LTS verzí Node.js.
- **Žádné runtime závislosti** a žádná integrace s Fakerem.
- **Vlastní seedovaný generátor náhodných čísel** (například mulberry32), ne `Math.random`, aby seed fungoval všude stejně.
- **Číselník kódů bank** jako vestavěný snapshot z veřejného seznamu ČNB s datem stažení, plus skript na aktualizaci. Knihovna nikdy nevolá síť.
- **Tree-shaking:** každý identifikátor jako samostatný modul, aby si uživatel natáhl jen to, co používá.
- **CI na GitHubu:** testy, lint, kontrola typů a publikace na npm s provenance při tagu verze.
- **Verzování:** semver; změna výstupu pro stejný seed je major verze.
- **Upozornění v README:** náhodně vygenerované platné rodné číslo může patřit skutečnému člověku; data jsou jen pro testovací systémy.

## Plán práce

Odhad pro práci po večerech a o víkendech: zhruba 5–7 víkendů do vydání v1.0. Každý identifikátor probíhá stejnou linkou: pravidla, schválení, testy, implementace, review.

**Definice hotového pro každý identifikátor:** pravidla mají odkaz na oficiální zdroj, property testy procházejí, validátor má 100 % pokrytí větví, každá nevalidní varianta vrací očekávaný důvod, seed snapshot je uložený.

**M0 · Příprava (1 večer)**

- [ ] Repo na GitHubu, TypeScript, build ESM + CJS, Vitest, fast-check, ESLint.
- [ ] CI: testy, lint, typy, pokrytí.
- [ ] CLAUDE.md z tohoto zadání a definice agentů v `.claude/agents/`.

**M1 · Jádro (1 víkend)**

- [ ] Seedovaný generátor náhodných čísel a `createCz({ seed })`.
- [ ] Společné typy: výsledek validátoru s důvodem, názvy variant.
- [ ] Šablona modulu identifikátoru (generátor, validátor, edge, invalid).

**M2 · Osoby (1–2 víkendy)**

- [ ] Rodné číslo (nejtěžší, první na řadě, otestuje celou linku).
- [ ] DIČ, telefon, PSČ.

**M3 · Firmy a finance (1 víkend)**

- [ ] IČO.
- [ ] Číslo účtu, číselník kódů bank ČNB a skript na jeho aktualizaci.
- [ ] IBAN.

**M4 · Energetika (1 víkend)**

- [ ] EAN odběrného místa elektřiny.
- [ ] EIC plynu.

**M5 · CLI a dokumentace (1 víkend)**

- [ ] CLI s formáty text, JSON, CSV.
- [ ] README zaměřené na hraniční a nevalidní data, příklady pro Playwright a Cypress.

**M6 · Vydání v1.0**

- [ ] Publikace na npm s provenance.
- [ ] Oznámení v českých testerských a vývojářských komunitách, sledování stažení a issues.

**M7 · v1.1**

- [ ] SPZ a VIN podle stejné linky.

## Architektura agentů

Claude Code s projektovými subagenty v `.claude/agents/`. Hlavní session (ty a Claude Code) řídí linku a volá subagenty postupně. Subagenti nemohou spouštět další subagenty a mezi voláními si nic nepamatují, takže si práci předávají výhradně přes soubory v repu.

Linka pro každý identifikátor:

1. rules-researcher: pravidla, zdroje a vzorky → `docs/rules/`
2. **Marek schválí pravidla** (bez schválení se nepíše test ani kód)
3. test-writer: testy podle pravidel → `tests/`
4. implementer: kód, dokud testy neprojdou → `src/`
5. reviewer: jen čte, kontroluje pravidla ↔ testy ↔ kód; blocker nálezy vrací implementerovi
6. Marek merguje, další identifikátor

| Agent | Úkol | Smí | Nesmí | Výstup |
| --- | --- | --- | --- | --- |
| rules-researcher | Najde pravidla v oficiálních zdrojích, sepíše je s odkazy a přidá známé platné a neplatné vzorky | Číst web, psát do `docs/rules/` | Sahat do `src/` a `tests/` | `docs/rules/<id>.md` |
| test-writer | Napíše testy podle schválených pravidel: vzorky, property testy, hraniční a nevalidní varianty | Psát do `tests/`, spouštět testy | Sahat do `src/` | `tests/<id>.test.ts` |
| implementer | Napíše kód, dokud testy neprojdou, a opraví nálezy z review | Psát do `src/`, spouštět testy | Měnit testy a pravidla | `src/<id>/` |
| reviewer | Zkontroluje správnost (shoda pravidel, testů a kódu, pokrytí, determinismus) i kvalitu a udržitelnost kódu podle checklistu níže | Jen číst, spouštět testy, lint a statickou analýzu | Cokoli upravovat | `docs/reviews/<id>.md` s nálezy podle závažnosti |

Klíčové principy:

- **Testy a kód píše jiný agent.** Kdyby jeden agent psal obojí, testy by jen potvrdily jeho vlastní omyly. Test-writer je nezávislé orákulum.
- **Lidská brána je u pravidel, ne u kódu.** Chybné pravidlo udělá z knihovny pro testery past; kód naopak kontrolují testy a reviewer.
- **Omezení nástrojů** přes pole `tools` ve frontmatteru agenta. Zákaz zápisu do `tests/` pro implementera je dobré vynutit i hookem; přesnou konfiguraci ověř v dokumentaci hooků Claude Code.
- **Paralelní práce:** zatímco implementer dělá aktuální identifikátor, rules-researcher může připravovat pravidla pro další.
- **Kvalita kódu nejdřív strojově, pak úsudkem.** „Best practices“ bez měřítek vedou k nekonečnému vylepšování. Vše, co jde zkontrolovat nástrojem, hlídá CI; reviewer posuzuje jen to, co nástroj neumí.

**Checklist kvality pro reviewera**

Strojově v CI (reviewer jen ověří, že prošlo):

- [ ] TypeScript ve striktním režimu bez `any` a bez potlačených chyb.
- [ ] ESLint se striktními pravidly pro TypeScript, limit cyklomatické složitosti a délky funkcí.
- [ ] Žádné nepoužívané exporty a soubory (například nástrojem knip).
- [ ] Veřejné API zdokumentované v TSDoc.

Úsudkem reviewera:

- [ ] Modul odpovídá šabloně z M1 (generátor, validátor, edge, invalid) a je konzistentní s ostatními.
- [ ] Žádná duplicita mezi moduly; sdílená logika (například vážené součty mod 11) je ve společné utilitě.
- [ ] Názvy a struktura jsou čitelné bez komentářů; komentáře vysvětlují proč, ne co, a odkazují na pravidla.
- [ ] API je pohodlné v testu a odpovídá návrhu v sekci API a CLI.
- [ ] Testy jsou čitelné jako specifikace, ne jen pokrývají řádky.

**Závažnost nálezů:** `blocker` (chyba správnosti nebo porušení šablony, vrací se implementerovi), `should-fix` (opraví se v rámci stejného identifikátoru, pokud je to levné), `nit` (jen zaznamenat, linku nezdržuje). Bez těchto úrovní by se smyčka review a oprav nikdy neukončila.

## Otevřené otázky

- [x] Název balíčku: `czech-test-data` (volný na npm k 4. 10. 2026); stejný název repa na GitHubu.
- [x] Konvence pojmenování v kódu: viz sekce API a CLI.
- [x] Licence: MIT (soubor `LICENSE` v repu a `"license": "MIT"` v package.json).
- [x] Česká lokalizace Fakeru: jména, adresy, telefony, názvy firem; žádné identifikátory. Knihovna jde bez Fakeru.
- [ ] Ověření pravidel každého identifikátoru v oficiálním zdroji před implementací.
- [ ] v1.1: SPZ a VIN; později případně číslo datové schránky.
- [ ] Webová stránka jen jako demo a dokumentace, ne samostatný produkt; webových generátorů už existuje dost.
