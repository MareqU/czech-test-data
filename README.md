# czech-test-data

**English** · [Česky](README.cs.md)

Valid, edge-case and invalid Czech test data for automated tests: rodné číslo (birth number), IČO, DIČ,
bank account, IBAN, phone number, PSČ (postal code), electricity EAN and gas EIC.

- **Named edge and invalid variants.** `ico.invalid('badChecksum')` says what your test checks; a random string does not.
- **Validators that say why.** `{ valid: false, reason: 'badChecksum' }`, and every invalid variant fails with
  the reason of the same name.
- **Seeded.** The same seed gives the same values, so a failing run can be reproduced.
- **Small.** Zero runtime dependencies, tree-shakeable, under 10 kB min+gzip for everything, no network access.
- **Library and CLI** in one package. TypeScript types included, ESM and CommonJS.

License plates (SPZ) and VIN are planned for v1.1.

> **Status:** under development, not published on npm yet.

> **Warning:** a randomly generated valid birth number (rodné číslo) or phone number may belong to a real
> person. No fictional phone range exists in Czechia, so never call or text generated numbers. Use the generated
> data only in test systems.

## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Edge cases and invalid values](#edge-cases-and-invalid-values)
- [Examples: Playwright, Cypress, Vitest](#examples)
- [Validators](#validators)
- [Seeds and reproducibility](#seeds-and-reproducibility)
- [Importing one identifier](#importing-one-identifier)
- [CLI](#cli)
- [Identifiers](#identifiers)
- [Limitations](#limitations)

## Install

```bash
npm install --save-dev czech-test-data
```

Requires Node.js 22.12 or later. The library itself uses no Node.js APIs, so it also runs in browsers and in
Cypress specs.

## Quick start

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

cz.birthNumber.edge('month+20'); // a valid but unusual value
cz.birthNumber.invalid('badChecksum'); // an invalid value

cz.validate.ico('25596641'); // { valid: true }
cz.validate.birthNumber('9055011234'); // { valid: false, reason: 'badChecksum' }
```

## Edge cases and invalid values

Every identifier has three kinds of values:

| Call | What you get |
| --- | --- |
| `cz.ico()` | a valid, typical value |
| `cz.ico.edge('checkDigitZero')` | a **valid** value that real-world code often gets wrong |
| `cz.ico.invalid('badChecksum')` | an **invalid** value with exactly one named fault |

Omit the variant name to get a random one: `cz.ico.edge()`, `cz.ico.invalid()`. The names are available at
runtime as `cz.ico.edgeVariants` and `cz.ico.invalidVariants`, and in TypeScript an unknown name is a type error.

**Each invalid variant is also a reason code.** `cz.validate.ico(cz.ico.invalid('letters'))` returns
`{ valid: false, reason: 'letters' }`, so a negative test can check the exact error your application should show.

Edge variants are where applications usually break. A few examples:

| Variant | Why it matters |
| --- | --- |
| `ico.edge('leadingZeros')` | `00177041` breaks code that stores IČO as a number |
| `ico.edge('checkDigitOne')` | check digit wraps from 11 to 1; naive `11 − sum` implementations reject it |
| `birthNumber.edge('pre1954')` | 9-digit birth numbers of people born before 1954 have no checksum |
| `birthNumber.edge('month+20')` | since 2004 the month can be increased by 20 (men) or 70 (women) |
| `birthNumber.edge('mod11Exception')` | remainder 10 with check digit 0, issued until 1985 |
| `bankAccount.edge('withLeadingZeros')` | `0000123457/0800`: the same account as `123457/0800` |
| `iban.edge('checkDigitsLeadingZero')` | check digits `02`–`09` get lost when parsed as a number |
| `phone.edge('newMobileRange')` | `+420 71x` is mobile only since 2022; older validators reject it |

The full lists are in [Identifiers](#identifiers).

<a id="examples"></a>

## Examples: Playwright, Cypress, Vitest

### Playwright

```ts
import { test, expect } from '@playwright/test';
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

test('company form accepts an IČO with a leading zero', async ({ page }) => {
  await page.goto('/company/new');
  await page.getByLabel('IČO').fill(cz.ico.edge('leadingZeros'));
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Company saved')).toBeVisible();
});

for (const variant of cz.ico.invalidVariants) {
  test(`company form rejects IČO: ${variant}`, async ({ page }) => {
    await page.goto('/company/new');
    await page.getByLabel('IČO').fill(cz.ico.invalid(variant));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Invalid IČO')).toBeVisible();
  });
}
```

### Cypress

```ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });

describe('registration', () => {
  it('accepts a birth number of someone born on 29 February', () => {
    cy.visit('/register');
    cy.get('[name=birthNumber]').type(cz.birthNumber.edge('leapDay'));
    cy.contains('button', 'Register').click();
    cy.contains('Welcome').should('be.visible');
  });

  cz.birthNumber.invalidVariants.forEach((variant) => {
    it(`rejects a birth number: ${variant}`, () => {
      cy.visit('/register');
      cy.get('[name=birthNumber]').type(cz.birthNumber.invalid(variant));
      cy.contains('button', 'Register').click();
      cy.contains('Invalid birth number').should('be.visible');
    });
  });
});
```

### Vitest or Jest: test your own validator

```ts
import { describe, expect, it } from 'vitest';
import { createCz } from 'czech-test-data';
import { isValidIco } from '../src/ico.js'; // your code

const cz = createCz({ seed: 42 });

describe('isValidIco', () => {
  it.each(cz.ico.edgeVariants)('accepts %s', (variant) => {
    expect(isValidIco(cz.ico.edge(variant))).toBe(true);
  });

  it.each(cz.ico.invalidVariants)('rejects %s', (variant) => {
    expect(isValidIco(cz.ico.invalid(variant))).toBe(false);
  });
});
```

## Validators

`cz.validate.<identifier>(value)` returns `{ valid: true }` or `{ valid: false, reason }`. Validators never throw
on their input; any string, including an empty one, gets a result. When a value has several faults, the first
failing check gives the reason (the order is documented in the TSDoc of each validator).

Validators check the official format and checksum rules, not existence: a valid IČO need not be in ARES, a valid
account need not exist at the bank. Each identifier is also exported as a standalone function, e.g. `validateIco`
from `czech-test-data/ico`.

## Seeds and reproducibility

- `createCz({ seed })` takes an integer from 0 to 2³² − 1. Without a seed, a random one is used and exposed as
  `cz.seed`, so you can log it and reproduce a failing run.
- Same package major version + same seed + same sequence of calls = same values. A change of output for the same
  seed is a breaking change (major version), with one exception: a minor version may add edge or invalid variants.
  That can change what `edge()` and `invalid()` without a variant name and the CLI's `all` return, and every later
  value of the same identifier. Name the variant, as in `cz.ico.edge('leadingZeros')`, and the values stay stable.
- Each identifier has its own stream: extra `cz.phone()` calls do not change what `cz.ico()` returns.
- Date-dependent rules (future birth dates, for example) use `referenceDate`, by default today in UTC and exposed
  as `cz.referenceDate`. Pin it in snapshot tests: `createCz({ seed: 42, referenceDate: '2026-01-01' })`.

## Importing one identifier

Each identifier has its own entry point with a standalone generator and validator. They give exactly the same
values as `createCz` with the same seed:

```ts
import { createIco, validateIco } from 'czech-test-data/ico';

const ico = createIco({ seed: 42 });
ico(); // '74494066', same as createCz({ seed: 42 }).ico()
ico.invalid('badChecksum');
validateIco('25596641'); // { valid: true }
```

Entry points: `czech-test-data/birthNumber`, `/ico`, `/dic`, `/bankAccount`, `/iban`, `/phone`, `/postalCode`,
`/ean`, `/eic`. Import from them when bundle size matters: `createCz` contains all nine identifiers (about 8 kB
min+gzip), while one subpath is at most 2 kB on top of a 2.5 kB shared core. These budgets are enforced in CI.

## CLI

```bash
npx czech-test-data birth-number --count 5 --gender female
npx czech-test-data ico --invalid all --format json
npx czech-test-data bank-account --seed 42 --format csv
npx czech-test-data validate ico 25596641 00177041
cat values.txt | npx czech-test-data validate birth-number
```

| Option | Meaning |
| --- | --- |
| `-n, --count N` | number of values, 1–10000 (default 1) |
| `-s, --seed N` | seed; without it a random seed is printed to stderr |
| `--reference-date D` | "today" as `YYYY-MM-DD` (default today, UTC) |
| `-f, --format F` | `text`, `json` or `csv` (default `text`) |
| `--edge VARIANT` | an edge variant, `all` or `random` |
| `--invalid VARIANT` | an invalid variant, `all` or `random` |

Generator options are written in kebab case: `--gender`, `--birth-date`, `--bank-code`, `--with-prefix` and so on.
`czech-test-data <identifier> --help` lists the options and variants of one identifier.

`validate` reads values from the arguments, or from stdin one per line, and prints each value with its result.
Exit code: 0 when all values are valid, 1 when at least one is invalid, 2 on a usage error.

## Identifiers

CLI names are in kebab case (`birth-number`, `bank-account`, `postal-code`), library names in camel case.
Variants marked **disputed** are valid by some readings of the rules and invalid by others; use them only if your
application is meant to accept them. They are included in `edgeVariants`, in `edge()` without a name and in the CLI's
`--edge all`.

### Birth number (rodné číslo) – `birthNumber`

Format `RRMMDD/XXXX`, before 1954 `RRMMDD/XXX`. Legal basis: § 13 of Act No. 133/2000 Sb.

- Options: `gender` (`'male'` or `'female'`), `birthDate` (`YYYY-MM-DD`, 1854–2053).
- Edge: `pre1954`, `mod11Exception`, `month+20`, `month+70`, `leapDay`, `withoutSlash`.
- Invalid: `badChecksum`, `impossibleDate`, `wrongLength`, `letters`, `futureDate`.
- Other reasons: `badFormat`.

### IČO – `ico`

Company identification number (identifikační číslo osoby), 8 digits with a weighted mod 11 check digit.

- Options: none.
- Edge: `leadingZeros`, `checkDigitZero`, `checkDigitOne`.
- Invalid: `badChecksum`, `wrongLength`, `letters`.
- Other reasons: `badFormat`.

### DIČ – `dic`

Tax identification number: `CZ` + IČO, `CZ` + birth number without the slash, or an assigned number.

- Options: `from: 'ico'`, or a birth number DIČ with optional `gender` and `birthDate` (from 1900).
- Edge: `fromIco`, `fromBirthNumber`, `lowercasePrefix` (**disputed**: the EU VAT Directive (Art. 215) and ARES use
  `CZ`, VIES also accepts `cz`), `pre1954`, `vatGroup`.
- Invalid: `missingPrefix`, `foreignPrefix`, `badInnerChecksum`.
- Other reasons: `letters`, `badFormat`, `wrongLength`, `impossibleDate`, `futureDate`.

### Bank account (číslo účtu) – `bankAccount`

`[prefix-]number/bankCode`; prefix and number each pass a weighted mod 11 check, the bank code must be in the
bundled ČNB list.

- Options: `bankCode` (default: one of the large banks), `withPrefix` (default `false`).
- Edge: `withPrefix`, `maxLength`, `minLength`, `withLeadingZeros`, `zeroPrefix`.
- Invalid: `badChecksumPrefix`, `badChecksumNumber`, `unknownBankCode`, `wrongLength`, `letters`, `zeroNumber`.
- Other reasons: `badFormat`.

### IBAN – `iban`

Czech IBAN, 24 characters: `CZ` + check digits + bank code + prefix + number. The embedded account must be
valid as well.

- Options: `account` (a valid national account to convert), or `bankCode` and `withPrefix` as for `bankAccount`.
- Edge: `withSpaces`, `lowercase` (**disputed**: the official sources require upper case), `withPrefix`,
  `checkDigitsLeadingZero`.
- Invalid: `badChecksum`, `wrongCountry`, `wrongLength`, `letters`, `badChecksumPrefix`, `badChecksumNumber`,
  `zeroNumber`, `unknownBankCode`.
- Other reasons: `badFormat`.

### Phone number (telefonní číslo) – `phone`

`+420` and 9 digits, by the ČTÚ numbering plan.

- Options: `type` (`'mobile'`, the default, or `'fixed'`).
- Edge: `withoutSpaces`, `withoutCountryCode`, `digitsOnly`, `prefix00`, `newMobileRange`, `voip` (`910`; some
  validators treat it as a separate VoIP type).
- Invalid: `wrongLength`, `letters`, `wrongCountryCode`, `unknownPrefix`, `specialPrefix` (premium rate, free
  phone and similar numbers).
- Other reasons: `badFormat`.

### Postal code (PSČ) – `postalCode`

5 digits, written `123 45`.

- Options: none.
- Edge: `withoutSpace`, `nonGeographic`.
- Invalid: `wrongLength`, `letters`, `badFormat`, `foreignRange` (Slovak ranges).

### Electricity EAN (EAN odběrného místa) – `ean`

18 digits starting with `8591824`, GS1 check digit.

- Options: `distributor` (`'cez'`, `'egd'`, `'pre'` or `'lds'` for a local distribution system).
- Edge: `checkDigitZero`, `lds`.
- Invalid: `badChecksum`, `wrongLength`, `letters`, `wrongPrefix`.
- Other reasons: `badFormat`.

### Gas EIC (EIC kód odběrného místa plynu) – `eic`

16 characters starting with `27ZG`, ENTSO-E check character.

- Options: none.
- Edge: `checkCharacterDigit`, `lds`.
- Invalid: `badChecksum`, `wrongLength`, `wrongPrefix`, `dashCheckCharacter`.
- Other reasons: `badFormat`.

The rules, official sources and known samples of every identifier are in [`docs/rules/`](docs/rules/).

## Limitations

- **Real people.** A generated valid birth number or phone number may exist; see the warning at the top.
- **Real but non-standard birth numbers.** Validators follow the official rules. A few legally assigned birth
  numbers break them (for example a number that is not divisible by 11), so they fail validation even though they
  exist.
- **Postal codes** are well-formed, but most of them do not exist in the Česká pošta list.
- **EIC codes** are test data, not codes allocated to real supply points. Do not use them in real data exchange.
- **Bank codes** are a bundled snapshot of the ČNB list (version 255, valid from 2026-10-01). The library never
  goes online, so newer bank codes count as `unknownBankCode` until the next release. Updated bank codes come in
  minor versions: they change validator results, never generated values.
- **Error messages** (texts of thrown errors and CLI messages) are not part of the API and may change in any version.

## License

[MIT](LICENSE)
