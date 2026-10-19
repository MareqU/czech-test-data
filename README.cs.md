# czech-test-data

[English](README.md) · **Česky**

Platná, hraniční a nevalidní česká testovací data pro automatické testy: rodné číslo, IČO, DIČ, číslo účtu, IBAN,
telefonní číslo, PSČ, EAN odběrného místa elektřiny a EIC odběrného místa plynu.

- **Pojmenované hraniční a nevalidní varianty.** Z `ico.invalid('badChecksum')` je jasné, co test ověřuje; z náhodného
  řetězce ne.
- **Validátory, které řeknou proč.** `{ valid: false, reason: 'badChecksum' }` a každá nevalidní varianta selže
  s důvodem stejného jména.
- **Seed.** Stejný seed dává stejné hodnoty, takže selhaný běh jde zopakovat.
- **Malá.** Žádné runtime závislosti, tree-shaking, celá knihovna pod 10 kB (minifikováno + gzip), žádný přístup
  k síti.
- **Knihovna i CLI** v jednom balíčku. Typy pro TypeScript, ESM i CommonJS.

SPZ a VIN jsou plánované pro v1.1.

> **Stav:** ve vývoji, zatím není na npm.

> **Upozornění:** náhodně vygenerované platné rodné číslo nebo telefonní číslo může patřit skutečnému člověku.
> V Česku neexistuje fiktivní rozsah telefonních čísel, takže na vygenerovaná čísla nikdy nevolejte ani nepište SMS.
> Vygenerovaná data používejte jen v testovacích systémech.

## Obsah

- [Instalace](#instalace)
- [Rychlý start](#rychlý-start)
- [Hraniční a nevalidní hodnoty](#hraniční-a-nevalidní-hodnoty)
- [Příklady: Playwright, Cypress, Vitest](#příklady)
- [Validátory](#validátory)
- [Seed a reprodukovatelnost](#seed-a-reprodukovatelnost)
- [Import jednoho identifikátoru](#import-jednoho-identifikátoru)
- [CLI](#cli)
- [Identifikátory](#identifikátory)
- [Omezení](#omezení)

## Instalace

```bash
npm install --save-dev czech-test-data
```

Vyžaduje Node.js 22.12 nebo novější. Samotná knihovna nepoužívá žádná API Node.js, takže běží i v prohlížeči
a ve specifikacích Cypressu.

## Rychlý start

```ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

cz.birthNumber({ gender: 'female', birthDate: '1990-05-01' }); // '905501/2582'
cz.ico(); // '74494066'
cz.dic({ from: 'ico' }); // 'CZ69210187'
cz.bankAccount({ bankCode: '0800', withPrefix: true }); // '985217-9389366/0800'
cz.iban(); // 'CZ6030300000000766074070'
cz.phone(); // '+420 606 367 819'
cz.postalCode(); // '514 24'
cz.ean(); // '859182400230881702'
cz.eic(); // '27ZG400Z9190764L'

cz.birthNumber.edge('month+20'); // platná, ale neobvyklá hodnota
cz.birthNumber.invalid('badChecksum'); // nevalidní hodnota

cz.validate.ico('25596641'); // { valid: true }
cz.validate.birthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }
```

## Hraniční a nevalidní hodnoty

Každý identifikátor má tři druhy hodnot:

| Volání | Co dostanete |
| --- | --- |
| `cz.ico()` | platnou, běžnou hodnotu |
| `cz.ico.edge('checkDigitZero')` | **platnou** hodnotu, se kterou si skutečný kód často neporadí |
| `cz.ico.invalid('badChecksum')` | **nevalidní** hodnotu s právě jednou pojmenovanou chybou |

Bez názvu varianty dostanete náhodnou: `cz.ico.edge()`, `cz.ico.invalid()`. Názvy jsou za běhu dostupné jako
`cz.ico.edgeVariants` a `cz.ico.invalidVariants` a v TypeScriptu je neznámý název chybou typu.

**Každá nevalidní varianta je zároveň kód důvodu.** `cz.validate.ico(cz.ico.invalid('letters'))` vrátí
`{ valid: false, reason: 'letters' }`, takže negativní test může ověřit přesně tu chybu, kterou má aplikace ukázat.

Na hraničních variantách aplikace padají nejčastěji. Několik příkladů:

| Varianta | Proč na ní záleží |
| --- | --- |
| `ico.edge('leadingZeros')` | `00177041` rozbije kód, který ukládá IČO jako číslo |
| `ico.edge('checkDigitOne')` | kontrolní číslice přeteče z 11 na 1; naivní implementace `11 − součet` ji odmítne |
| `birthNumber.edge('pre1954')` | devítimístná rodná čísla lidí narozených před rokem 1954 nemají kontrolní součet |
| `birthNumber.edge('month+20')` | od roku 2004 může být měsíc zvýšený o 20 (muži) nebo o 70 (ženy) |
| `birthNumber.edge('mod11Exception')` | zbytek 10 s kontrolní číslicí 0, vydávané do roku 1985 |
| `bankAccount.edge('withLeadingZeros')` | `0000123457/0800` je stejný účet jako `123457/0800` |
| `iban.edge('checkDigitsLeadingZero')` | kontrolní číslice `02`–`09` se ztratí, když se čtou jako číslo |
| `phone.edge('newMobileRange')` | `+420 71x` je mobilní teprve od roku 2022; starší validátory ho odmítnou |

Úplné seznamy jsou v sekci [Identifikátory](#identifikátory).

<a id="příklady"></a>

## Příklady: Playwright, Cypress, Vitest

### Playwright

```ts
import { test, expect } from '@playwright/test';
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

test('formulář firmy přijme IČO s úvodní nulou', async ({ page }) => {
  await page.goto('/firmy/nova');
  await page.getByLabel('IČO').fill(cz.ico.edge('leadingZeros'));
  await page.getByRole('button', { name: 'Uložit' }).click();
  await expect(page.getByText('Firma uložena')).toBeVisible();
});

for (const variant of cz.ico.invalidVariants) {
  test(`formulář firmy odmítne IČO: ${variant}`, async ({ page }) => {
    await page.goto('/firmy/nova');
    await page.getByLabel('IČO').fill(cz.ico.invalid(variant));
    await page.getByRole('button', { name: 'Uložit' }).click();
    await expect(page.getByText('Neplatné IČO')).toBeVisible();
  });
}
```

### Cypress

```ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

describe('registrace', () => {
  it('přijme rodné číslo člověka narozeného 29. února', () => {
    cy.visit('/registrace');
    cy.get('[name=birthNumber]').type(cz.birthNumber.edge('leapDay'));
    cy.contains('button', 'Registrovat').click();
    cy.contains('Vítejte').should('be.visible');
  });

  cz.birthNumber.invalidVariants.forEach((variant) => {
    it(`odmítne rodné číslo: ${variant}`, () => {
      cy.visit('/registrace');
      cy.get('[name=birthNumber]').type(cz.birthNumber.invalid(variant));
      cy.contains('button', 'Registrovat').click();
      cy.contains('Neplatné rodné číslo').should('be.visible');
    });
  });
});
```

### Vitest nebo Jest: test vlastního validátoru

```ts
import { describe, expect, it } from 'vitest';
import { createCz } from 'czech-test-data';
import { isValidIco } from '../src/ico.js'; // váš kód

const cz = createCz({ seed: 42 });

describe('isValidIco', () => {
  it.each(cz.ico.edgeVariants)('přijme %s', (variant) => {
    expect(isValidIco(cz.ico.edge(variant))).toBe(true);
  });

  it.each(cz.ico.invalidVariants)('odmítne %s', (variant) => {
    expect(isValidIco(cz.ico.invalid(variant))).toBe(false);
  });
});
```

## Validátory

`cz.validate.<identifikátor>(hodnota)` vrací `{ valid: true }` nebo `{ valid: false, reason }`. Validátory kvůli
vstupu nikdy nevyhodí výjimku; výsledek dostane jakýkoli řetězec včetně prázdného. Když má hodnota víc chyb, důvod
určí první kontrola, která selže (pořadí je popsané v TSDoc každého validátoru).

Validátory kontrolují oficiální pravidla formátu a kontrolního součtu, ne existenci: platné IČO nemusí být v ARES,
platný účet nemusí v bance existovat. Každý identifikátor má validátor i jako samostatnou funkci, například
`validateIco` z `czech-test-data/ico`.

## Seed a reprodukovatelnost

- `createCz({ seed })` přijímá celé číslo od 0 do 2³² − 1. Bez seedu se použije náhodný a je dostupný jako
  `cz.seed`, takže ho můžete zalogovat a selhaný běh zopakovat.
- Stejná hlavní verze balíčku + stejný seed + stejné pořadí volání = stejné hodnoty. Změna výstupu pro stejný seed je
  breaking change (nová hlavní verze), s jedinou výjimkou: v minor verzi mohou přibýt hraniční nebo nevalidní
  varianty. To může změnit, co vrátí `edge()` a `invalid()` bez názvu varianty a `all` v CLI, a také všechny další
  hodnoty téhož identifikátoru. Když variantu pojmenujete, například `cz.ico.edge('leadingZeros')`, hodnoty zůstanou
  stejné.
- Každý identifikátor má vlastní proud: další volání `cz.phone()` nezmění, co vrátí `cz.ico()`.
- Pravidla závislá na datu (například budoucí datum narození) používají `referenceDate`, výchozí je dnešek v UTC
  a je dostupný jako `cz.referenceDate`. Ve snapshot testech ho zafixujte:
  `createCz({ seed: 42, referenceDate: '2026-01-01' })`.

## Import jednoho identifikátoru

Každý identifikátor má vlastní vstupní bod se samostatným generátorem a validátorem. Se stejným seedem dávají
přesně stejné hodnoty jako `createCz`:

```ts
import { createIco, validateIco } from 'czech-test-data/ico';

const ico = createIco({ seed: 42 });
ico(); // '74494066', stejně jako createCz({ seed: 42 }).ico()
ico.invalid('badChecksum');
validateIco('25596641'); // { valid: true }
```

Vstupní body: `czech-test-data/birthNumber`, `/ico`, `/dic`, `/bankAccount`, `/iban`, `/phone`, `/postalCode`,
`/ean`, `/eic`. Použijte je, když záleží na velikosti bundlu: `createCz` obsahuje všech devět identifikátorů (asi
8 kB, minifikováno + gzip), jeden podimport má nejvýš 2 kB nad sdíleným jádrem o velikosti 2,5 kB. Tyto rozpočty
hlídá CI.

## CLI

```bash
npx czech-test-data birth-number --count 5 --gender female
npx czech-test-data ico --invalid all --format json
npx czech-test-data bank-account --seed 42 --format csv
npx czech-test-data validate ico 25596641 00177041
cat hodnoty.txt | npx czech-test-data validate birth-number
```

| Volba | Význam |
| --- | --- |
| `-n, --count N` | počet hodnot, 1–10000 (výchozí 1) |
| `-s, --seed N` | seed; bez něj se náhodný seed vypíše na stderr |
| `--reference-date D` | „dnešek“ jako `YYYY-MM-DD` (výchozí dnešek v UTC) |
| `-f, --format F` | `text`, `json` nebo `csv` (výchozí `text`) |
| `--edge VARIANTA` | hraniční varianta, `all` nebo `random` |
| `--invalid VARIANTA` | nevalidní varianta, `all` nebo `random` |

Volby generátoru se píšou v kebab case: `--gender`, `--birth-date`, `--bank-code`, `--with-prefix` a tak dále.
`czech-test-data <identifikátor> --help` vypíše volby a varianty jednoho identifikátoru.

`validate` čte hodnoty z argumentů, nebo ze standardního vstupu po jedné na řádek, a ke každé vypíše výsledek.
Návratový kód: 0, když jsou všechny hodnoty platné, 1, když je aspoň jedna nevalidní, 2 při chybném použití.

## Identifikátory

Názvy v CLI jsou v kebab case (`birth-number`, `bank-account`, `postal-code`), v knihovně v camel case.
Varianty označené jako **sporné** jsou podle některých výkladů pravidel platné a podle jiných ne; použijte je, jen
pokud je má vaše aplikace přijímat. Jsou součástí `edgeVariants`, náhodného `edge()` bez názvu i `--edge all` v CLI.

### Rodné číslo – `birthNumber`

Formát `RRMMDD/XXXX`, před rokem 1954 `RRMMDD/XXX`. Právní základ: § 13 zákona č. 133/2000 Sb.

- Volby: `gender` (`'male'` nebo `'female'`), `birthDate` (`YYYY-MM-DD`, 1854–2053).
- Hraniční: `pre1954`, `mod11Exception`, `month+20`, `month+70`, `leapDay`, `withoutSlash`.
- Nevalidní: `badChecksum`, `impossibleDate`, `wrongLength`, `letters`, `futureDate`.
- Další důvody: `badFormat`.

### IČO – `ico`

Identifikační číslo osoby, 8 číslic s kontrolní číslicí podle váženého součtu mod 11.

- Volby: žádné.
- Hraniční: `leadingZeros`, `checkDigitZero`, `checkDigitOne`.
- Nevalidní: `badChecksum`, `wrongLength`, `letters`.
- Další důvody: `badFormat`.

### DIČ – `dic`

Daňové identifikační číslo: `CZ` + IČO, `CZ` + rodné číslo bez lomítka, nebo přidělené číslo.

- Volby: `from: 'ico'`, nebo DIČ z rodného čísla s volitelnými `gender` a `birthDate` (od roku 1900).
- Hraniční: `fromIco`, `fromBirthNumber`, `lowercasePrefix` (**sporné**: směrnice EU o DPH (čl. 215) i ARES
  používají `CZ`, VIES přijme i `cz`), `pre1954`, `vatGroup`.
- Nevalidní: `missingPrefix`, `foreignPrefix`, `badInnerChecksum`.
- Další důvody: `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `futureDate`.

### Číslo účtu – `bankAccount`

`[předčíslí-]číslo/kód banky`; předčíslí i číslo zvlášť projdou váženým součtem mod 11, kód banky musí být
v přibaleném číselníku ČNB.

- Volby: `bankCode` (výchozí: jedna z velkých bank), `withPrefix` (výchozí `false`).
- Hraniční: `withPrefix`, `maxLength`, `minLength`, `withLeadingZeros`, `zeroPrefix`.
- Nevalidní: `badChecksumPrefix`, `badChecksumNumber`, `unknownBankCode`, `wrongLength`, `letters`, `zeroNumber`.
- Další důvody: `badFormat`.

### IBAN – `iban`

Český IBAN, 24 znaků: `CZ` + kontrolní číslice + kód banky + předčíslí + číslo. Platný musí být i účet uvnitř.

- Volby: `account` (platné tuzemské číslo účtu k převodu), nebo `bankCode` a `withPrefix` jako u `bankAccount`.
- Hraniční: `withSpaces`, `lowercase` (**sporné**: oficiální zdroje vyžadují velká písmena), `withPrefix`,
  `checkDigitsLeadingZero`.
- Nevalidní: `badChecksum`, `wrongCountry`, `wrongLength`, `letters`, `badChecksumPrefix`, `badChecksumNumber`,
  `zeroNumber`, `unknownBankCode`.
- Další důvody: `badFormat`.

### Telefonní číslo – `phone`

`+420` a 9 číslic podle číslovacího plánu ČTÚ.

- Volby: `type` (`'mobile'`, výchozí, nebo `'fixed'`).
- Hraniční: `withoutSpaces`, `withoutCountryCode`, `digitsOnly`, `prefix00`, `newMobileRange`, `voip` (`910`;
  některé validátory ho vedou jako samostatný typ VoIP).
- Nevalidní: `wrongLength`, `letters`, `wrongCountryCode`, `unknownPrefix`, `specialPrefix` (čísla se zvláštním
  tarifem, bezplatné linky a podobně).
- Další důvody: `badFormat`.

### PSČ – `postalCode`

Poštovní směrovací číslo, 5 číslic ve tvaru `123 45`.

- Volby: žádné.
- Hraniční: `withoutSpace`, `nonGeographic`.
- Nevalidní: `wrongLength`, `letters`, `badFormat`, `foreignRange` (slovenské rozsahy).

### EAN odběrného místa elektřiny – `ean`

18 číslic začínajících `8591824`, kontrolní číslice podle GS1.

- Volby: `distributor` (`'cez'`, `'egd'`, `'pre'` nebo `'lds'` pro lokální distribuční soustavu).
- Hraniční: `checkDigitZero`, `lds`.
- Nevalidní: `badChecksum`, `wrongLength`, `letters`, `wrongPrefix`.
- Další důvody: `badFormat`.

### EIC odběrného místa plynu – `eic`

16 znaků začínajících `27ZG`, kontrolní znak podle ENTSO-E.

- Volby: žádné.
- Hraniční: `checkCharacterDigit`, `lds`.
- Nevalidní: `badChecksum`, `wrongLength`, `wrongPrefix`, `dashCheckCharacter`.
- Další důvody: `badFormat`.

Pravidla, oficiální zdroje a známé vzorky každého identifikátoru jsou v [`docs/rules/`](docs/rules/) (anglicky).

## Omezení

- **Skuteční lidé.** Vygenerované platné rodné číslo nebo telefonní číslo může existovat; viz upozornění nahoře.
- **Skutečná nestandardní rodná čísla.** Validátory se řídí oficiálními pravidly. Několik legálně přidělených
  rodných čísel je porušuje (například číslo nedělitelné 11), takže validací neprojdou, i když existují.
- **PSČ** mají správný tvar, ale většina z nich v seznamu České pošty neexistuje.
- **Kódy EIC** jsou testovací data, ne kódy přidělené skutečným odběrným místům. Nepoužívejte je ve skutečné výměně dat.
- **Kódy bank** jsou přibalený snapshot číselníku ČNB (verze 255, platná od 1. 10. 2026). Knihovna nikdy nejde
  na síť, takže novější kódy bank budou až do dalšího vydání `unknownBankCode`. Aktualizované kódy bank vycházejí
  v minor verzích: mění výsledky validátoru, nikdy vygenerované hodnoty.
- **Chybové hlášky** (texty vyhozených chyb a hlášek CLI) nejsou součástí API a mohou se změnit v jakékoli verzi.

## Licence

[MIT](LICENSE)
