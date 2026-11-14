---
name: czech-test-data
description: Generate valid, edge-case and invalid Czech test data – rodné číslo (birth number), IČO, DIČ, bank account (číslo účtu), IBAN, phone number, PSČ (postal code), electricity EAN, gas EIC, VIN – and validate such values. Use whenever a test, fixture, seed script, mock or form needs a Czech identifier; never make one up by hand.
---

# Czech test data

Most Czech identifiers carry a checksum, so numbers you invent are usually invalid, and "invalid" values you invent
are often invalid for the wrong reason. Get them from `czech-test-data` (npm library and CLI, zero dependencies).

## Generate values (CLI, Node.js 22.12+, no install needed)

```bash
npx czech-test-data ico                                   # one valid IČO
npx czech-test-data birth-number --count 5 --gender female
npx czech-test-data ico --edge all --format json          # every valid edge case: [{ value, kind, variant }]
npx czech-test-data ico --invalid all --format json       # every invalid variant, one value each
npx czech-test-data bank-account --invalid badChecksumNumber --seed 42
npx czech-test-data ico --help                            # options and variant names of one identifier
```

Identifiers: `birth-number`, `ico`, `dic`, `bank-account`, `iban`, `phone`, `postal-code`, `ean`, `eic`, `vin`.
Pass `--seed N` when the values end up in a fixture or a test, so they can be generated again.

## Validate values

```bash
npx czech-test-data validate ico 06541186 25596641
```

Prints each value with `valid` or the reason (for example `badChecksum`). Exit code 0 when all values are valid,
1 when any is invalid. Values can also come from stdin, one per line.

## In test code

Prefer the library over pasted values when the project runs JavaScript or TypeScript tests:

```ts
import { createCz } from 'czech-test-data';

const cz = createCz({ seed: 42 });
cz.ico(); // valid
cz.ico.edge('leadingZeros'); // valid edge case: IČO starting with zeros
cz.ico.invalid('badChecksum'); // invalid, and cz.validate.ico() says 'badChecksum'
```

Install it as a dev dependency: `npm install --save-dev czech-test-data`.

## Rules

- Edge variants are valid and the application should accept them; invalid variants should be rejected. Two edge
  variants are disputed, valid only by some readings of the rules: `dic` `lowercasePrefix` and `iban` `lowercase`.
  Use them only when the specification says how to treat them; `--edge all` includes them.
- A generated valid birth number or phone number may belong to a real person. Use the data only in test systems
  and never call or text generated phone numbers.
- Values that depend on "today" (birth numbers, DIČ from a birth number) use the current UTC date; pass
  `--reference-date YYYY-MM-DD` (or `referenceDate` in `createCz`) to keep a fixture stable over time.
