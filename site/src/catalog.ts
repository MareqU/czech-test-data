// Czech texts of the web tool: names, hints, generator options and the meaning of every variant and reason code.
// Only the site needs them, so they live here and not in the library (no API change, docs/rules/core.md A5).
// The `satisfies` clauses make the build fail when the library adds a variant or reason without a text here.
import type { BankAccountEdgeVariant, BankAccountInvalidVariant, BankAccountReason } from 'czech-test-data/bankAccount';
import type { BirthNumberEdgeVariant, BirthNumberInvalidVariant, BirthNumberReason } from 'czech-test-data/birthNumber';
import type { DicEdgeVariant, DicInvalidVariant, DicReason } from 'czech-test-data/dic';
import type { EanEdgeVariant, EanInvalidVariant, EanReason } from 'czech-test-data/ean';
import type { EicEdgeVariant, EicInvalidVariant, EicReason } from 'czech-test-data/eic';
import type { IbanEdgeVariant, IbanInvalidVariant, IbanReason } from 'czech-test-data/iban';
import type { IcoEdgeVariant, IcoInvalidVariant, IcoReason } from 'czech-test-data/ico';
import type { PhoneEdgeVariant, PhoneInvalidVariant, PhoneReason } from 'czech-test-data/phone';
import type { PostalCodeEdgeVariant, PostalCodeInvalidVariant, PostalCodeReason } from 'czech-test-data/postalCode';

/** Library id of an identifier, as on `createCz()`. */
export type IdentifierId =
  | 'birthNumber'
  | 'ico'
  | 'dic'
  | 'bankAccount'
  | 'iban'
  | 'phone'
  | 'postalCode'
  | 'ean'
  | 'eic';

interface OptionBase {
  /** Library option name, also the URL parameter. */
  readonly key: string;
  /** CLI option name without `--`. */
  readonly cli: string;
  readonly label: string;
  /** When this option has a value (or exactly `onlyFor`), the listed options are disabled. */
  readonly excludes?: { readonly keys: readonly string[]; readonly onlyFor?: string };
}

/** A generator option; the empty string always means "not given" (the library default). */
export type OptionInfo =
  | (OptionBase & { readonly kind: 'select'; readonly choices: readonly (readonly [value: string, label: string])[] })
  | (OptionBase & { readonly kind: 'date'; readonly min: string; readonly max: string })
  | (OptionBase & { readonly kind: 'text'; readonly placeholder: string })
  | (OptionBase & { readonly kind: 'checkbox' });

export interface IdentifierInfo {
  readonly id: IdentifierId;
  /** CLI name (kebab-case). */
  readonly cli: string;
  readonly label: string;
  readonly hint: string;
  /** A valid sample for the validator field. */
  readonly sample: string;
  readonly warning?: string;
  /** Whether values depend on `referenceDate`, so the date field and the snippet show it. */
  readonly dateDependent: boolean;
  readonly options: readonly OptionInfo[];
  readonly edge: Readonly<Record<string, string>>;
  readonly invalid: Readonly<Record<string, string>>;
  /** Every reason code of the validator. */
  readonly reasons: Readonly<Record<string, string>>;
  /** Edge variants that are valid only by some readings of the rules. */
  readonly disputed: readonly string[];
}

const GENDER: OptionInfo = {
  kind: 'select',
  key: 'gender',
  cli: 'gender',
  label: 'Pohlaví',
  choices: [
    ['', 'náhodně'],
    ['male', 'muž'],
    ['female', 'žena'],
  ],
};

const REAL_PERSON = 'Platné rodné číslo může patřit skutečnému člověku. Používejte ho jen v testovacích systémech.';

const LETTERS = 'Obsahuje písmeno.';
const ONE_LETTER = 'Jedna číslice je nahrazená písmenem.';

const birthNumber: IdentifierInfo = {
  id: 'birthNumber',
  cli: 'birth-number',
  label: 'Rodné číslo',
  hint: 'RRMMDD/XXXX, před rokem 1954 RRMMDD/XXX. Ženy mají měsíc zvýšený o 50.',
  sample: '905501/2582',
  warning: REAL_PERSON,
  dateDependent: true,
  options: [
    GENDER,
    { kind: 'date', key: 'birthDate', cli: 'birth-date', label: 'Datum narození', min: '1854-01-01', max: '2053-12-31' },
  ],
  edge: {
    pre1954: 'Narozen před rokem 1954: devítimístné číslo, které nemá kontrolní součet.',
    mod11Exception: 'Zbytek po dělení 11 je 10 a poslední číslice 0. Vydávalo se do roku 1985, číslo není dělitelné 11.',
    'month+20': 'Muž s měsícem zvýšeným o 20, možné od roku 2004.',
    'month+70': 'Žena s měsícem zvýšeným o 70, možné od roku 2004.',
    leapDay: 'Narozen 29. února přestupného roku.',
    withoutSlash: 'Platné číslo zapsané bez lomítka.',
  } satisfies Record<BirthNumberEdgeVariant, string>,
  invalid: {
    badChecksum: 'Desetimístné číslo s platným datem, které není dělitelné 11.',
    impossibleDate: 'Neexistující datum, například měsíc 13, den 32 nebo 30. února.',
    wrongLength: 'Jiný počet číslic než 9 nebo 10.',
    letters: LETTERS,
    futureDate: 'Datum narození je v budoucnosti (vůči referenčnímu datu).',
  } satisfies Record<BirthNumberInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Nepovolené znaky nebo lomítko na špatném místě.',
    wrongLength: 'Jiný počet číslic než 9 nebo 10.',
    impossibleDate: 'Neexistující datum narození.',
    badChecksum: 'Číslo není dělitelné 11.',
    futureDate: 'Datum narození je v budoucnosti.',
  } satisfies Record<BirthNumberReason, string>,
  disputed: [],
};

const ico: IdentifierInfo = {
  id: 'ico',
  cli: 'ico',
  label: 'IČO',
  hint: 'Identifikační číslo osoby: 8 číslic, poslední je kontrolní (vážený součet mod 11).',
  sample: '25596641',
  dateDependent: false,
  options: [],
  edge: {
    leadingZeros: 'Začíná nulou, například 00177041. Rozbije aplikace, které IČO ukládají jako číslo.',
    checkDigitZero: 'Kontrolní číslice 0, výpočet přeteče z 10 na 0.',
    checkDigitOne: 'Kontrolní číslice 1, výpočet přeteče z 11 na 1. Naivní výpočet „11 − součet“ ji odmítne.',
  } satisfies Record<IcoEdgeVariant, string>,
  invalid: {
    badChecksum: 'Osm číslic, ale špatná kontrolní číslice.',
    wrongLength: 'Jen číslice, ale jiný počet než 8.',
    letters: LETTERS,
  } satisfies Record<IcoInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Jiné znaky než číslice, například mezera nebo pomlčka.',
    wrongLength: 'Jiný počet číslic než 8.',
    badChecksum: 'Špatná kontrolní číslice.',
  } satisfies Record<IcoReason, string>,
  disputed: [],
};

const dic: IdentifierInfo = {
  id: 'dic',
  cli: 'dic',
  label: 'DIČ',
  hint: 'Daňové identifikační číslo: CZ + IČO, CZ + rodné číslo bez lomítka, nebo přidělené číslo.',
  sample: 'CZ25596641',
  warning: 'DIČ fyzické osoby obsahuje rodné číslo, které může patřit skutečnému člověku.',
  dateDependent: true,
  options: [
    {
      kind: 'select',
      key: 'from',
      cli: 'from',
      label: 'Z čeho',
      choices: [
        ['', 'náhodně'],
        ['ico', 'z IČO'],
        ['birthNumber', 'z rodného čísla'],
      ],
      excludes: { keys: ['gender', 'birthDate'], onlyFor: 'ico' },
    },
    GENDER,
    { kind: 'date', key: 'birthDate', cli: 'birth-date', label: 'Datum narození', min: '1900-01-01', max: '2053-12-31' },
  ],
  edge: {
    fromIco: 'CZ + IČO (právnická osoba).',
    fromBirthNumber: 'CZ + desetimístné rodné číslo (fyzická osoba).',
    lowercasePrefix: 'Platné DIČ s malým „cz“. Sporné: ARES používá velké CZ, VIES přijme i malé.',
    pre1954: 'CZ + devítimístné rodné číslo. Rozbije aplikace, které čekají jen 8 nebo 10 číslic.',
    vatGroup: 'Přidělené číslo skupiny plátců DPH, začíná CZ699.',
  } satisfies Record<DicEdgeVariant, string>,
  invalid: {
    missingPrefix: 'Platná vnitřní část bez předpony CZ.',
    foreignPrefix: 'Předpona jiného státu EU s platnou českou vnitřní částí.',
    badInnerChecksum: 'CZ + vnitřní část se špatným kontrolním součtem.',
  } satisfies Record<DicInvalidVariant, string>,
  reasons: {
    missingPrefix: 'Chybí předpona CZ.',
    foreignPrefix: 'Předpona jiného státu než CZ.',
    letters: 'Vnitřní část obsahuje písmeno.',
    badFormat: 'Nepovolené znaky ve vnitřní části.',
    wrongLength: 'Vnitřní část nemá 8 až 10 číslic.',
    impossibleDate: 'Rodné číslo uvnitř má neexistující datum.',
    badInnerChecksum: 'Vnitřní část má špatný kontrolní součet.',
    futureDate: 'Rodné číslo uvnitř má datum narození v budoucnosti.',
  } satisfies Record<DicReason, string>,
  disputed: ['lowercasePrefix'],
};

const BANK_CODE: OptionInfo = {
  kind: 'text',
  key: 'bankCode',
  cli: 'bank-code',
  label: 'Kód banky',
  placeholder: 'např. 0800',
};
const WITH_PREFIX: OptionInfo = { kind: 'checkbox', key: 'withPrefix', cli: 'with-prefix', label: 'S předčíslím' };
const UNKNOWN_BANK_CODE = 'Kód banky, který v číselníku ČNB není.';

const bankAccount: IdentifierInfo = {
  id: 'bankAccount',
  cli: 'bank-account',
  label: 'Číslo účtu',
  hint: '[předčíslí-]číslo/kód banky. Předčíslí i číslo zvlášť procházejí váženým součtem mod 11.',
  sample: '19-2000145399/0800',
  dateDependent: false,
  options: [BANK_CODE, WITH_PREFIX],
  edge: {
    withPrefix: 'S nenulovým předčíslím o 2 až 6 číslicích.',
    maxLength: 'Nejdelší tvar: předčíslí 6 a číslo 10 číslic.',
    minLength: 'Nejkratší tvar: číslo o 2 číslicích bez předčíslí.',
    withLeadingZeros: 'Číslo doplněné zleva nulami na 10 číslic; je to stejný účet jako bez nul.',
    zeroPrefix: 'Předčíslí ze samých nul (000000-), jak vznikne naivním převodem z IBANu.',
  } satisfies Record<BankAccountEdgeVariant, string>,
  invalid: {
    badChecksumPrefix: 'Předčíslí neprojde kontrolou mod 11, zbytek je platný.',
    badChecksumNumber: 'Číslo neprojde kontrolou mod 11.',
    unknownBankCode: UNKNOWN_BANK_CODE,
    wrongLength: 'Některá část má špatnou délku.',
    letters: ONE_LETTER,
    zeroNumber: 'Číslo ze samých nul; projde naivní kontrolou mod 11.',
  } satisfies Record<BankAccountInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Chybí kód banky za lomítkem nebo jsou použité jiné oddělovače než - a /.',
    wrongLength: 'Některá část má špatnou délku.',
    badChecksumPrefix: 'Předčíslí neprojde kontrolou mod 11.',
    badChecksumNumber: 'Číslo neprojde kontrolou mod 11.',
    zeroNumber: 'Číslo je ze samých nul.',
    unknownBankCode: UNKNOWN_BANK_CODE,
  } satisfies Record<BankAccountReason, string>,
  disputed: [],
};

const iban: IdentifierInfo = {
  id: 'iban',
  cli: 'iban',
  label: 'IBAN',
  hint: 'CZ + 2 kontrolní číslice + kód banky + předčíslí + číslo, celkem 24 znaků.',
  sample: 'CZ6508000000192000145399',
  dateDependent: false,
  options: [
    {
      kind: 'text',
      key: 'account',
      cli: 'account',
      label: 'Převést účet',
      placeholder: 'např. 19-2000145399/0800',
      excludes: { keys: ['bankCode', 'withPrefix'] },
    },
    BANK_CODE,
    WITH_PREFIX,
  ],
  edge: {
    withSpaces: 'Tištěná podoba ve skupinách po 4 znacích.',
    lowercase: 'Malými písmeny („cz…“). Sporné: oficiální zdroje vyžadují velká písmena.',
    withPrefix: 'IBAN účtu s předčíslím.',
    checkDigitsLeadingZero: 'Kontrolní číslice 02 až 09; nula se ztratí, když se čtou jako číslo.',
  } satisfies Record<IbanEdgeVariant, string>,
  invalid: {
    badChecksum: 'Špatné kontrolní číslice (mod 97).',
    wrongCountry: 'Stejný účet jako slovenský IBAN: obecně platný IBAN, ale ne český.',
    wrongLength: 'Účet bez doplnění nulami, takže IBAN je kratší než 24 znaků.',
    letters: 'Jeden znak je nahrazený písmenem.',
    badChecksumPrefix: 'Předčíslí uvnitř neprojde kontrolou mod 11.',
    badChecksumNumber: 'Číslo účtu uvnitř neprojde kontrolou mod 11.',
    zeroNumber: 'Číslo účtu uvnitř je ze samých nul.',
    unknownBankCode: UNKNOWN_BANK_CODE,
  } satisfies Record<IbanInvalidVariant, string>,
  reasons: {
    badFormat: 'Nepovolené znaky nebo špatně rozdělené skupiny.',
    wrongCountry: 'Jiná země než CZ.',
    letters: 'Písmeno tam, kde mají být číslice.',
    wrongLength: 'Jiná délka než 24 znaků.',
    badChecksum: 'Špatné kontrolní číslice (mod 97).',
    badChecksumPrefix: 'Předčíslí uvnitř neprojde kontrolou mod 11.',
    badChecksumNumber: 'Číslo účtu uvnitř neprojde kontrolou mod 11.',
    zeroNumber: 'Číslo účtu uvnitř je ze samých nul.',
    unknownBankCode: UNKNOWN_BANK_CODE,
  } satisfies Record<IbanReason, string>,
  disputed: ['lowercase'],
};

const phone: IdentifierInfo = {
  id: 'phone',
  cli: 'phone',
  label: 'Telefon',
  hint: '+420 a 9 číslic podle číslovacího plánu ČTÚ.',
  sample: '+420 601 123 456',
  warning: 'V Česku neexistuje fiktivní rozsah čísel. Na vygenerovaná čísla nevolejte ani nepište SMS.',
  dateDependent: false,
  options: [
    {
      kind: 'select',
      key: 'type',
      cli: 'type',
      label: 'Typ',
      choices: [
        ['', 'mobil (výchozí)'],
        ['fixed', 'pevná linka'],
      ],
    },
  ],
  edge: {
    withoutSpaces: 'Bez mezer: +420601123456.',
    withoutCountryCode: 'Bez předvolby: 601 123 456.',
    digitsOnly: 'Jen 9 číslic: 601123456.',
    prefix00: '00420 místo +420.',
    newMobileRange: 'Řada 706–719, mobilní teprve od roku 2022. Starší validátory ji odmítají.',
    voip: 'Číslo VoIP začínající 910.',
  } satisfies Record<PhoneEdgeVariant, string>,
  invalid: {
    wrongLength: '8 nebo 10 číslic místo 9.',
    letters: ONE_LETTER,
    wrongCountryCode: 'Platné národní číslo s předvolbou jiného státu.',
    unknownPrefix: 'Číslo z rezervovaného nebo nepřiděleného rozsahu.',
    specialPrefix: 'Zvláštní číslo, které nepatří účastníkovi: bezplatná linka 800, audiotex 900 a podobně.',
  } satisfies Record<PhoneInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Nepovolené znaky (pomlčky, závorky) nebo mezery na špatném místě.',
    wrongCountryCode: 'Předvolba jiného státu než +420.',
    wrongLength: 'Jiný počet číslic než 9.',
    unknownPrefix: 'Rezervovaný nebo nepřidělený rozsah.',
    specialPrefix: 'Zvláštní číslo, které nepatří účastníkovi.',
  } satisfies Record<PhoneReason, string>,
  disputed: [],
};

const postalCode: IdentifierInfo = {
  id: 'postalCode',
  cli: 'postal-code',
  label: 'PSČ',
  hint: '5 číslic ve tvaru 123 45. Kontroluje se jen tvar, ne existence v seznamu České pošty.',
  sample: '110 00',
  dateDependent: false,
  options: [],
  edge: {
    withoutSpace: 'Bez mezery: 11000.',
    nonGeographic: 'Z celostátního rozsahu 20x–24x (například 225 99), který neodpovídá žádnému kraji.',
  } satisfies Record<PostalCodeEdgeVariant, string>,
  invalid: {
    wrongLength: 'Jiný počet číslic než 5.',
    letters: LETTERS,
    badFormat: '5 číslic, ale špatný oddělovač nebo mezera na špatném místě.',
    foreignRange: 'Začíná 0, 8 nebo 9, což jsou slovenské rozsahy.',
  } satisfies Record<PostalCodeInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Špatný oddělovač nebo mezera na špatném místě.',
    wrongLength: 'Jiný počet číslic než 5.',
    foreignRange: 'Slovenský rozsah (začíná 0, 8 nebo 9).',
  } satisfies Record<PostalCodeReason, string>,
  disputed: [],
};

const LDS = 'Odběrné místo v lokální distribuční soustavě.';

const ean: IdentifierInfo = {
  id: 'ean',
  cli: 'ean',
  label: 'EAN (elektřina)',
  hint: 'EAN odběrného místa: 18 číslic začínajících 8591824, kontrolní číslice podle GS1.',
  sample: '859182400800000007',
  dateDependent: false,
  options: [
    {
      kind: 'select',
      key: 'distributor',
      cli: 'distributor',
      label: 'Distributor',
      choices: [
        ['', 'velcí distributoři (výchozí)'],
        ['cez', 'ČEZ Distribuce'],
        ['egd', 'EG.D'],
        ['pre', 'PREdistribuce'],
        ['lds', 'lokální distribuční soustava'],
      ],
    },
  ],
  edge: {
    checkDigitZero: 'Kontrolní číslice 0.',
    lds: LDS,
  } satisfies Record<EanEdgeVariant, string>,
  invalid: {
    badChecksum: 'Špatná kontrolní číslice.',
    wrongLength: '17 číslic (chybí kontrolní) nebo 19.',
    letters: ONE_LETTER,
    wrongPrefix: 'Jiný prefix než 8591824, se správně přepočtenou kontrolní číslicí.',
  } satisfies Record<EanInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Jiné znaky než číslice.',
    wrongLength: 'Jiný počet číslic než 18.',
    wrongPrefix: 'Nezačíná 8591824.',
    badChecksum: 'Špatná kontrolní číslice.',
  } satisfies Record<EanReason, string>,
  disputed: [],
};

const eic: IdentifierInfo = {
  id: 'eic',
  cli: 'eic',
  label: 'EIC (plyn)',
  hint: 'EIC kód odběrného místa plynu: 16 znaků začínajících 27ZG, kontrolní znak podle ENTSO-E.',
  sample: '27ZG400Z9190764L',
  warning: 'Jsou to testovací data, ne kódy přidělené skutečným odběrným místům.',
  dateDependent: false,
  options: [],
  edge: {
    checkCharacterDigit: 'Kontrolní znak je číslice, ne písmeno.',
    lds: LDS,
  } satisfies Record<EicEdgeVariant, string>,
  invalid: {
    badChecksum: 'Špatný kontrolní znak.',
    wrongLength: '15 znaků (chybí kontrolní) nebo 17.',
    wrongPrefix: 'Platný EIC, ale jiného typu než odběrné místo plynu (místo 27ZG například 27XG).',
    dashCheckCharacter: 'Kontrolní znak „-“, který norma zakazuje; projde naivní kontrolou.',
  } satisfies Record<EicInvalidVariant, string>,
  reasons: {
    badFormat: 'Nepovolené znaky, například malá písmena nebo mezery.',
    wrongLength: 'Jiný počet znaků než 16.',
    wrongPrefix: 'Nezačíná 27ZG.',
    dashCheckCharacter: 'Kontrolní znak „-“ je zakázaný.',
    badChecksum: 'Špatný kontrolní znak.',
  } satisfies Record<EicReason, string>,
  disputed: [],
};

/** All identifiers in the order of the page. */
export const IDENTIFIERS: readonly IdentifierInfo[] = [
  birthNumber,
  ico,
  dic,
  bankAccount,
  iban,
  phone,
  postalCode,
  ean,
  eic,
];

/** The identifier with this id; `IDENTIFIERS` covers every `IdentifierId`. */
export function infoOf(id: IdentifierId): IdentifierInfo {
  const info = IDENTIFIERS.find((candidate) => candidate.id === id);
  if (info === undefined) {
    throw new RangeError(`unknown identifier ${id}`);
  }
  return info;
}
