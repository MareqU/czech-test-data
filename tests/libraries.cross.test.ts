// Cross-check against independent npm validators (docs/spec.md, "Křížová kontrola"): the same inputs go to our
// validator and to another library, and the verdicts are compared. The other libraries are not a source of truth.
// Every disagreement in EXPECTED was investigated by hand and has its reason; any other one fails the run and must
// be investigated the same way, never "fixed" automatically. An expected disagreement that disappears is fine.
// No maintained npm validator exists for IČO, bank account, the 18-digit EAN or EIC; bank account checksums are
// covered through the IBAN (ibantools checks the Czech BBAN). Run with `npm run test:cross`, not part of `npm test`.
import * as ibantools from 'ibantools';
import { isValidPhoneNumber } from 'libphonenumber-js/max';
import { rodnecislo } from 'rodnecislo';
import validator from 'validator';
import { describe, expect, it } from 'vitest';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';

const SEEDS = 1000;

type Id = 'birthNumber' | 'dic' | 'iban' | 'phone' | 'postalCode';

const LIBRARIES: Readonly<Record<Id, Readonly<Record<string, (value: string) => boolean>>>> = {
  birthNumber: { rodnecislo: (value) => rodnecislo(value).isValid() },
  dic: { 'validator.isVAT': (value) => validator.isVAT(value, 'CZ') },
  iban: {
    ibantools: (value) => ibantools.isValidIBAN(ibantools.electronicFormatIBAN(value) ?? ''),
    'validator.isIBAN': (value) => validator.isIBAN(value.replaceAll(' ', '')),
  },
  phone: { 'libphonenumber-js': (value) => isValidPhoneNumber(value, 'CZ') },
  postalCode: { 'validator.isPostalCode': (value) => validator.isPostalCode(value, 'CZ') },
};

// Key: `<id> <library> <case>`, case being `valid`, `edge:<variant>` or `invalid:<variant>`.
const EXPECTED: Readonly<Record<string, string>> = {
  'dic validator.isVAT edge:lowercasePrefix': 'regex with upper-case CZ only; the variant is marked disputed',
  'dic validator.isVAT invalid:missingPrefix': 'treats the CZ prefix as optional',
  'dic validator.isVAT invalid:badInnerChecksum': 'checks the shape only, no checksum',
  'iban ibantools invalid:wrongCountry': 'a Slovak IBAN is a valid IBAN; ours validates Czech IBANs only',
  'iban ibantools invalid:zeroNumber': 'an all-zero number passes mod 11, which is what the variant tests',
  'iban ibantools invalid:unknownBankCode': 'no list of Czech bank codes',
  'iban validator.isIBAN invalid:wrongCountry': 'a Slovak IBAN is a valid IBAN; ours validates Czech IBANs only',
  'iban validator.isIBAN invalid:badChecksumPrefix': 'checks mod 97 only, not the Czech BBAN mod 11',
  'iban validator.isIBAN invalid:badChecksumNumber': 'checks mod 97 only, not the Czech BBAN mod 11',
  'iban validator.isIBAN invalid:zeroNumber': 'checks mod 97 only, not the Czech BBAN',
  'iban validator.isIBAN invalid:unknownBankCode': 'no list of Czech bank codes',
  'phone libphonenumber-js edge:newMobileRange':
    'its metadata lacks most of 706–719 (mobile since 2022), the reason this edge variant exists',
  'phone libphonenumber-js invalid:wrongCountryCode': 'a valid foreign number; ours validates Czech numbers only',
  'phone libphonenumber-js invalid:unknownPrefix':
    'accepts 20x as Praha; the ČTÚ table for ITU lists 20 as reserved (docs/rules/phone.md, decision 9)',
  'phone libphonenumber-js invalid:specialPrefix':
    'counts premium rate and free phone numbers as valid; ours treats them as not subscriber numbers',
  'postalCode validator.isPostalCode invalid:foreignRange': 'checks the shape only, not the Czech ranges',
};

// The parts of an identifier generator this file uses, with variant names widened to strings.
interface Generator {
  (): string;
  readonly edgeVariants: readonly string[];
  readonly invalidVariants: readonly string[];
  readonly edge: (variant: string) => string;
  readonly invalid: (variant: string) => string;
}

function variantOf<Variant extends string>(variants: readonly Variant[], name: string): Variant {
  const variant = variants.find((candidate) => candidate === name);
  if (variant === undefined) {
    throw new RangeError(`no variant ${name}`);
  }
  return variant;
}

function widen<Edge extends string, Invalid extends string>(generator: {
  (): string;
  readonly edgeVariants: readonly Edge[];
  readonly invalidVariants: readonly Invalid[];
  readonly edge: (variant?: Edge) => string;
  readonly invalid: (variant?: Invalid) => string;
}): Generator {
  return Object.assign(() => generator(), {
    edgeVariants: generator.edgeVariants,
    invalidVariants: generator.invalidVariants,
    edge: (name: string) => generator.edge(variantOf(generator.edgeVariants, name)),
    invalid: (name: string) => generator.invalid(variantOf(generator.invalidVariants, name)),
  });
}

const GENERATORS: Readonly<Record<Id, (cz: Cz) => Generator>> = {
  birthNumber: (cz) => widen(cz.birthNumber),
  dic: (cz) => widen(cz.dic),
  iban: (cz) => widen(cz.iban),
  phone: (cz) => widen(cz.phone),
  postalCode: (cz) => widen(cz.postalCode),
};

const IDS = Object.keys(LIBRARIES) as Id[];

function caseNames(generator: Generator): string[] {
  return [
    'valid',
    ...generator.edgeVariants.map((variant) => `edge:${variant}`),
    ...generator.invalidVariants.map((variant) => `invalid:${variant}`),
  ];
}

function draw(generator: Generator, name: string): string {
  const [kind, variant = ''] = name.split(':');
  if (kind === 'edge') {
    return generator.edge(variant);
  }
  return kind === 'invalid' ? generator.invalid(variant) : generator();
}

// A fresh instance per value, so every value is the first draw of its seed whatever the test order.
// No referenceDate: rodnecislo checks future dates against the real today, so ours must use today too.
function generatorOf(id: Id, seed: number): { generator: Generator; validate: Cz['validate'][Id] } {
  const cz = createCz({ seed });
  return { generator: GENERATORS[id](cz), validate: cz.validate[id] };
}

describe.each(IDS)('%s', (id) => {
  describe.each(Object.entries(LIBRARIES[id]))('%s', (library, theirs) => {
    it.each(caseNames(generatorOf(id, 0).generator))('%s', (name) => {
      const disagreements: string[] = [];
      for (let seed = 0; seed < SEEDS; seed++) {
        const { generator, validate } = generatorOf(id, seed);
        const value = draw(generator, name);
        if (validate(value).valid !== theirs(value)) {
          disagreements.push(value);
        }
      }
      if (!(`${id} ${library} ${name}` in EXPECTED)) {
        expect(disagreements, `${String(disagreements.length)}/${String(SEEDS)} disagree`).toEqual([]);
      }
    });
  });
});

describe('EXPECTED', () => {
  it('names only identifiers, libraries and cases that exist', () => {
    const known = new Set(
      IDS.flatMap((id) =>
        Object.keys(LIBRARIES[id]).flatMap((library) =>
          caseNames(generatorOf(id, 0).generator).map((name) => `${id} ${library} ${name}`),
        ),
      ),
    );
    expect(Object.keys(EXPECTED).filter((key) => !known.has(key))).toEqual([]);
  });
});
