# Changelog

All notable changes to this package. The project follows [semantic versioning](https://semver.org/) with the
determinism contract from the README: a change of output for the same seed is a major version, except that a minor
version may add edge or invalid variants.

## 1.0.0

First stable release.

### Identifiers

Each with a generator, named edge and invalid variants, and a validator that returns a reason code:

- birth number (rodné číslo) – `birthNumber`
- IČO – `ico`
- DIČ – `dic`
- bank account (číslo účtu) – `bankAccount`, with a bundled snapshot of the ČNB bank codes (ČKPS version 255,
  valid from 2026-10-01)
- IBAN – `iban`
- phone number – `phone`
- postal code (PSČ) – `postalCode`
- electricity EAN (EAN odběrného místa) – `ean`
- gas EIC (EIC kód odběrného místa plynu) – `eic`

### Library

- `createCz({ seed, referenceDate })` with all identifiers, and one subpath per identifier
  (`czech-test-data/ico`, …) with `create<Id>` and `validate<Id>`.
- Seeded and deterministic: one PRNG stream per identifier, the same seed gives the same values.
- Zero runtime dependencies, no network access, ESM and CommonJS, TypeScript types. Node.js 22.12 or later.

### CLI

- `czech-test-data <identifier>` generates valid, edge (`--edge`) or invalid (`--invalid`) values as text, JSON or
  CSV; `czech-test-data validate <identifier>` validates arguments or stdin. Exit codes 0, 1 and 2.

### Notes

- Disputed variants: dic `lowercasePrefix` and iban `lowercase` are valid by some readings of the rules only.
- Generated EIC codes are test data, not codes allocated to real supply points.
