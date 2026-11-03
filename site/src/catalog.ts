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

/** Texts of the identifier's own page, written into its static HTML for search engines. */
export interface PageInfo {
  readonly title: string;
  readonly description: string;
  readonly h1: string;
  readonly intro: string;
}

export interface IdentifierInfo {
  readonly id: IdentifierId;
  /** CLI name (kebab-case). */
  readonly cli: string;
  /** Directory of the identifier's page (Czech, no diacritics), e.g. `rodne-cislo` for /rodne-cislo/. */
  readonly slug: string;
  readonly label: string;
  /** Name in the navigation. */
  readonly short: string;
  readonly page: PageInfo;
  readonly hint: string;
  /** A valid sample for the validator field. */
  readonly sample: string;
  readonly warning?: string;
  /** Whether values depend on `referenceDate`, so the date field and the snippet show it. */
  readonly dateDependent: boolean;
  readonly options: readonly OptionInfo[];
  readonly edge: Readonly<Record<string, string>>;
  readonly invalid: Readonly<Record<string, string>>;
  /** Short Czech name of every edge and invalid variant, for the variant picker. */
  readonly titles: Readonly<Record<string, string>>;
  /** Every reason code of the validator. */
  readonly reasons: Readonly<Record<string, string>>;
  /** Edge variants that are valid only by some readings of the rules. */
  readonly disputed: readonly string[];
  /** The valid values that open the form-check kit (1–2), with the generator options for each. */
  readonly kit: readonly KitValid[];
}

/** A plain valid value of the form-check kit, e.g. a man's and a woman's birth number. */
export interface KitValid {
  readonly title: string;
  readonly text: string;
  readonly options: Readonly<Record<string, string>>;
}

const KIT_PLAIN: readonly KitValid[] = [{ title: 'Platné', text: 'Obyčejná platná hodnota.', options: {} }];

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
const ONE_LETTER = 'Jedna číslice je nahrazená písmenem, které se plete s číslicí (A, O nebo l).';

const birthNumber: IdentifierInfo = {
  id: 'birthNumber',
  cli: 'birth-number',
  label: 'Rodné číslo',
  slug: 'rodne-cislo',
  short: 'Rodné číslo',
  page: {
    title: 'Generátor rodného čísla – platná, hraniční i neplatná RČ',
    description: 'Vygenerujte platné, hraniční i schválně chybné rodné číslo pro testy: měsíc +20, narození před rokem 1954, 29. února. Validátor řekne, co je špatně.',
    h1: 'Generátor rodného čísla',
    intro: 'Rodné číslo má víc výjimek, než si většina formulářů myslí. Devět číslic u lidí narozených před rokem 1954, měsíc zvýšený o 20 nebo 70, nula místo kontrolní číslice. Tady je dostanete všechny, i s vysvětlením.',
  },
  hint: 'RRMMDD/XXXX, před rokem 1954 RRMMDD/XXX. Ženy mají měsíc zvýšený o 50.',
  sample: '905501/2582',
  warning: REAL_PERSON,
  dateDependent: true,
  options: [
    GENDER,
    { kind: 'date', key: 'birthDate', cli: 'birth-date', label: 'Datum narození', min: '1854-01-01', max: '2053-12-31' },
  ],
  edge: {
    pre1954: 'Narozen před rokem 1954: jen devět číslic a žádný kontrolní součet. Formulář, který chce vždy deset, se diví.',
    mod11Exception: 'Zbytek po dělení 11 vyšel 10, tak se na konec napsala nula. Číslo pak není dělitelné 11, a přesto je platné (vydávalo se do roku 1985).',
    'month+20': 'Muž s měsícem zvýšeným o 20. Legální od roku 2004, když v daném dni dojdou čísla. Spousta validátorů o tom pořád neví.',
    'month+70': 'Žena s měsícem zvýšeným o 70 (50 za ženu a 20 navíc). Platné od roku 2004.',
    leapDay: 'Narozen 29. února přestupného roku. Zvládne to vaše kontrola data?',
    withoutSlash: 'Bez lomítka. Lidé ho tak píšou běžně, formulář by to měl zvládnout.',
  } satisfies Record<BirthNumberEdgeVariant, string>,
  invalid: {
    badChecksum: 'Datum sedí, jen číslo není dělitelné 11. Klasický překlep v jedné číslici.',
    impossibleDate: 'Neexistující datum, například měsíc 13, den 32 nebo 30. února.',
    wrongLength: 'Jiný počet číslic než 9 nebo 10.',
    letters: LETTERS,
    futureDate: 'Narodí se teprve v budoucnu. Formulář by neměl věřit cestovatelům v čase.',
  } satisfies Record<BirthNumberInvalidVariant, string>,
  titles: {
    pre1954: 'Před rokem 1954',
    mod11Exception: 'Výjimka zbytku 10',
    'month+20': 'Měsíc +20',
    'month+70': 'Měsíc +70',
    leapDay: '29. února',
    withoutSlash: 'Bez lomítka',
    badChecksum: 'Špatný součet',
    impossibleDate: 'Neexistující datum',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    futureDate: 'Datum v budoucnu',
  } satisfies Record<BirthNumberEdgeVariant | BirthNumberInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Nepovolené znaky nebo lomítko na špatném místě.',
    wrongLength: 'Jiný počet číslic než 9 nebo 10.',
    impossibleDate: 'Neexistující datum narození.',
    badChecksum: 'Číslo není dělitelné 11.',
    futureDate: 'Datum narození je v budoucnosti.',
  } satisfies Record<BirthNumberReason, string>,
  disputed: [],
  kit: [
    { title: 'Platné (muž)', text: 'Obyčejné rodné číslo muže.', options: { gender: 'male' } },
    { title: 'Platné (žena)', text: 'Obyčejné rodné číslo ženy, měsíc zvýšený o 50.', options: { gender: 'female' } },
  ],
};

const ico: IdentifierInfo = {
  id: 'ico',
  cli: 'ico',
  label: 'IČO',
  slug: 'ico',
  short: 'IČO',
  page: {
    title: 'Generátor IČO – platné i neplatné IČO pro testy',
    description: 'Platné, hraniční i neplatné IČO pro testování formulářů: IČO s nulou na začátku, kontrolní číslice 0 a 1, špatný součet. Každá chyba s vysvětlením.',
    h1: 'Generátor IČO',
    intro: 'IČO má osm číslic a poslední je kontrolní. Zní to jednoduše, dokud nepřijde IČO s nulou na začátku, kterou Excel sežere, nebo kontrolní číslice, která přeteče z 11 na 1.',
  },
  hint: 'Identifikační číslo osoby: 8 číslic, poslední je kontrolní (vážený součet mod 11).',
  sample: '25596641',
  dateDependent: false,
  options: [],
  edge: {
    leadingZeros: 'Začíná nulou. Excel ji rád sežere a z IČO je najednou sedm číslic.',
    checkDigitZero: 'Kontrolní číslice vyšla 10, takže se píše 0. Kdo zapomněl na modulo, má problém.',
    checkDigitOne: 'Kontrolní číslice vyšla 11, takže se píše 1. Naivní výpočet „11 − součet“ tady selže.',
  } satisfies Record<IcoEdgeVariant, string>,
  invalid: {
    badChecksum: 'Osm číslic, jen ta poslední nesedí. Překlep, jaký udělá každý.',
    wrongLength: 'Jen číslice, ale jiný počet než 8.',
    letters: LETTERS,
  } satisfies Record<IcoInvalidVariant, string>,
  titles: {
    leadingZeros: 'Nula na začátku',
    checkDigitZero: 'Kontrolní 0',
    checkDigitOne: 'Kontrolní 1',
    badChecksum: 'Špatný součet',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
  } satisfies Record<IcoEdgeVariant | IcoInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Jiné znaky než číslice, například mezera nebo pomlčka.',
    wrongLength: 'Jiný počet číslic než 8.',
    badChecksum: 'Špatná kontrolní číslice.',
  } satisfies Record<IcoReason, string>,
  disputed: [],
  kit: KIT_PLAIN,
};

const dic: IdentifierInfo = {
  id: 'dic',
  cli: 'dic',
  label: 'DIČ',
  slug: 'dic',
  short: 'DIČ',
  page: {
    title: 'Generátor DIČ – platné i neplatné DIČ pro testy',
    description: 'DIČ firmy i fyzické osoby, malé „cz“, cizí předpona, chybný součet. Platné, hraniční i neplatné DIČ s vysvětlením.',
    h1: 'Generátor DIČ',
    intro: 'DIČ je CZ a za ním IČO, rodné číslo nebo přidělené číslo. Zdědí tak záludnosti obou a přidá vlastní, třeba skupinu plátců DPH nebo malé „cz“.',
  },
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
    fromIco: 'CZ a IČO, typické DIČ firmy.',
    fromBirthNumber: 'CZ a rodné číslo, typické DIČ živnostníka.',
    lowercasePrefix: 'Platné DIČ s malým „cz“. Sporné: ARES používá velké CZ, VIES přijme i malé.',
    pre1954: 'CZ a devítimístné rodné číslo staršího živnostníka. Formulář, který čeká 8 nebo 10 číslic, ho odmítne.',
    vatGroup: 'DIČ skupiny plátců DPH, začíná CZ699. Vzácné, ale skutečné.',
  } satisfies Record<DicEdgeVariant, string>,
  invalid: {
    missingPrefix: 'Platná vnitřní část bez předpony CZ.',
    foreignPrefix: 'Předpona jiného státu EU s platnou českou vnitřní částí.',
    badInnerChecksum: 'CZ + vnitřní část se špatným kontrolním součtem.',
  } satisfies Record<DicInvalidVariant, string>,
  titles: {
    fromIco: 'Z IČO',
    fromBirthNumber: 'Z rodného čísla',
    lowercasePrefix: 'Malé cz',
    pre1954: 'RČ před rokem 1954',
    vatGroup: 'Skupina DPH',
    missingPrefix: 'Bez CZ',
    foreignPrefix: 'Cizí předpona',
    badInnerChecksum: 'Špatný součet',
  } satisfies Record<DicEdgeVariant | DicInvalidVariant, string>,
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
  kit: KIT_PLAIN,
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
  slug: 'cislo-uctu',
  short: 'Číslo účtu',
  page: {
    title: 'Generátor čísla účtu – platné i neplatné bankovní účty',
    description: 'Česká čísla účtů s předčíslím i bez, s nulami, nejkratší i nejdelší, se špatným součtem nebo neznámým kódem banky. Kontrola podle vyhlášky ČNB.',
    h1: 'Generátor čísla účtu',
    intro: 'Číslo účtu má předčíslí, číslo a kód banky. Předčíslí i číslo zvlášť procházejí kontrolou modulo 11 a kód banky musí být v číselníku ČNB, který tu máme přibalený.',
  },
  hint: '[předčíslí-]číslo/kód banky. Předčíslí i číslo zvlášť procházejí váženým součtem mod 11.',
  sample: '19-2000145399/0800',
  dateDependent: false,
  options: [BANK_CODE, WITH_PREFIX],
  edge: {
    withPrefix: 'S nenulovým předčíslím o 2 až 6 číslicích.',
    maxLength: 'Nejdelší možný účet: předčíslí 6 a číslo 10 číslic. Vejde se do vašeho pole?',
    minLength: 'Nejkratší možný účet: dvě číslice a kód banky. Ano, i to je platné číslo účtu.',
    withLeadingZeros: 'Doplněné nulami na 10 číslic. Pořád je to stejný účet, jen zapsaný delší.',
    zeroPrefix: 'Předčíslí 000000. Vznikne, když někdo převede IBAN zpátky na účet a nuly neodstraní.',
  } satisfies Record<BankAccountEdgeVariant, string>,
  invalid: {
    badChecksumPrefix: 'Předčíslí neprojde kontrolou mod 11, zbytek je platný.',
    badChecksumNumber: 'Číslo neprojde kontrolou mod 11.',
    unknownBankCode: UNKNOWN_BANK_CODE,
    wrongLength: 'Některá část má špatnou délku.',
    letters: ONE_LETTER,
    zeroNumber: 'Samé nuly. Projdou naivní kontrolou mod 11, přitom takový účet neexistuje.',
  } satisfies Record<BankAccountInvalidVariant, string>,
  titles: {
    withPrefix: 'S předčíslím',
    maxLength: 'Nejdelší',
    minLength: 'Nejkratší',
    withLeadingZeros: 'S nulami',
    zeroPrefix: 'Předčíslí 000000',
    badChecksumPrefix: 'Špatné předčíslí',
    badChecksumNumber: 'Špatné číslo',
    unknownBankCode: 'Neznámá banka',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    zeroNumber: 'Samé nuly',
  } satisfies Record<BankAccountEdgeVariant | BankAccountInvalidVariant, string>,
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
  kit: KIT_PLAIN,
};

const iban: IdentifierInfo = {
  id: 'iban',
  cli: 'iban',
  label: 'IBAN',
  slug: 'iban',
  short: 'IBAN',
  page: {
    title: 'Generátor IBAN – český IBAN platný i neplatný pro testy',
    description: 'Český IBAN s mezerami, malými písmeny, předčíslím, špatnými kontrolními číslicemi nebo slovenskou předponou. Kontroluje se i účet uvnitř.',
    h1: 'Generátor českého IBAN',
    intro: 'Český IBAN má 24 znaků a uvnitř skrývá celé číslo účtu. Může projít kontrolou mod 97 a stejně být neplatný, když neprojde účet uvnitř.',
  },
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
    withSpaces: 'Po čtyřech znacích, tak jak ho lidé opisují z faktury.',
    lowercase: 'Malými písmeny („cz…“). Sporné: oficiální zdroje vyžadují velká písmena.',
    withPrefix: 'IBAN účtu s předčíslím.',
    checkDigitsLeadingZero: 'Kontrolní číslice začínají nulou. Kdo je převede na číslo, nulu ztratí.',
  } satisfies Record<IbanEdgeVariant, string>,
  invalid: {
    badChecksum: 'Špatné kontrolní číslice (mod 97).',
    wrongCountry: 'Stejný účet jako slovenský IBAN. Obecně platný, ale český formulář by ho měl odmítnout.',
    wrongLength: 'Účet bez doplnění nulami, takže IBAN je kratší než 24 znaků.',
    letters: 'Jeden znak je nahrazený písmenem.',
    badChecksumPrefix: 'Předčíslí uvnitř neprojde kontrolou mod 11.',
    badChecksumNumber: 'Číslo účtu uvnitř neprojde kontrolou mod 11.',
    zeroNumber: 'Číslo účtu uvnitř je ze samých nul.',
    unknownBankCode: UNKNOWN_BANK_CODE,
  } satisfies Record<IbanInvalidVariant, string>,
  titles: {
    withSpaces: 'S mezerami',
    lowercase: 'Malá písmena',
    withPrefix: 'S předčíslím',
    checkDigitsLeadingZero: 'Kontrolní s nulou',
    badChecksum: 'Špatný součet',
    wrongCountry: 'Slovenský',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    badChecksumPrefix: 'Špatné předčíslí',
    badChecksumNumber: 'Špatné číslo účtu',
    zeroNumber: 'Samé nuly',
    unknownBankCode: 'Neznámá banka',
  } satisfies Record<IbanEdgeVariant | IbanInvalidVariant, string>,
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
  kit: KIT_PLAIN,
};

const phone: IdentifierInfo = {
  id: 'phone',
  cli: 'phone',
  label: 'Telefon',
  slug: 'telefon',
  short: 'Telefon',
  page: {
    title: 'Generátor telefonního čísla – české mobily, pevné linky i neplatná čísla',
    description: 'Česká telefonní čísla podle číslovacího plánu ČTÚ: mobily včetně řady 71x, pevné linky, VoIP i neplatné předvolby a délky.',
    h1: 'Generátor telefonního čísla',
    intro: 'Česká čísla mají předvolbu +420 a devět číslic. Která řada je mobilní, určuje číslovací plán, a ten se mění: řada 71x je mobilní teprve od roku 2022.',
  },
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
    prefix00: '00420 místo +420. Starší zápis, pořád běžný.',
    newMobileRange: 'Řada 706 až 719 je mobilní teprve od roku 2022. Starší knihovny ji pořád neznají.',
    voip: 'Číslo VoIP začínající 910. Patří lidem a firmám, tak ho nezahazujte.',
  } satisfies Record<PhoneEdgeVariant, string>,
  invalid: {
    wrongLength: '8 nebo 10 číslic místo 9.',
    letters: ONE_LETTER,
    wrongCountryCode: 'Platné národní číslo s předvolbou jiného státu.',
    unknownPrefix: 'Číslo z rezervovaného nebo nepřiděleného rozsahu.',
    specialPrefix: 'Linka 800, 900 a podobné. Nepatří žádnému člověku, do kontaktního formuláře nepatří.',
  } satisfies Record<PhoneInvalidVariant, string>,
  titles: {
    withoutSpaces: 'Bez mezer',
    withoutCountryCode: 'Bez +420',
    digitsOnly: 'Jen číslice',
    prefix00: '00420',
    newMobileRange: 'Mobil 71x',
    voip: 'VoIP 910',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    wrongCountryCode: 'Cizí předvolba',
    unknownPrefix: 'Nepřidělená řada',
    specialPrefix: 'Linka 800 a 900',
  } satisfies Record<PhoneEdgeVariant | PhoneInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Nepovolené znaky (pomlčky, závorky) nebo mezery na špatném místě.',
    wrongCountryCode: 'Předvolba jiného státu než +420.',
    wrongLength: 'Jiný počet číslic než 9.',
    unknownPrefix: 'Rezervovaný nebo nepřidělený rozsah.',
    specialPrefix: 'Zvláštní číslo, které nepatří účastníkovi.',
  } satisfies Record<PhoneReason, string>,
  disputed: [],
  kit: [
    { title: 'Platný mobil', text: 'Obyčejné mobilní číslo.', options: {} },
    { title: 'Platná pevná linka', text: 'Obyčejné číslo pevné linky.', options: { type: 'fixed' } },
  ],
};

const postalCode: IdentifierInfo = {
  id: 'postalCode',
  cli: 'postal-code',
  label: 'PSČ',
  slug: 'psc',
  short: 'PSČ',
  page: {
    title: 'Generátor PSČ – platná i neplatná PSČ pro testy',
    description: 'PSČ s mezerou i bez, neadresná PSČ, slovenské rozsahy, špatná délka. Kontrola tvaru PSČ.',
    h1: 'Generátor PSČ',
    intro: 'PSČ má pět číslic, mezeru po třetí a žádný kontrolní součet. Kontroluje se jen tvar: většina vygenerovaných PSČ v seznamu České pošty není, ale tvarem projdou.',
  },
  hint: '5 číslic ve tvaru 123 45. Kontroluje se jen tvar, ne existence v seznamu České pošty.',
  sample: '110 00',
  dateDependent: false,
  options: [],
  edge: {
    withoutSpace: 'Bez mezery, tak jak ho lidé často píšou.',
    nonGeographic: 'Z celostátního rozsahu 20x–24x (například 225 99), který neodpovídá žádnému kraji.',
  } satisfies Record<PostalCodeEdgeVariant, string>,
  invalid: {
    wrongLength: 'Jiný počet číslic než 5.',
    letters: LETTERS,
    badFormat: '5 číslic, ale špatný oddělovač nebo mezera na špatném místě.',
    foreignRange: 'Začíná 0, 8 nebo 9. To je Slovensko.',
  } satisfies Record<PostalCodeInvalidVariant, string>,
  titles: {
    withoutSpace: 'Bez mezery',
    nonGeographic: 'Neadresné',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    badFormat: 'Špatný tvar',
    foreignRange: 'Slovenské',
  } satisfies Record<PostalCodeEdgeVariant | PostalCodeInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Špatný oddělovač nebo mezera na špatném místě.',
    wrongLength: 'Jiný počet číslic než 5.',
    foreignRange: 'Slovenský rozsah (začíná 0, 8 nebo 9).',
  } satisfies Record<PostalCodeReason, string>,
  disputed: [],
  kit: KIT_PLAIN,
};

const LDS = 'Odběrné místo v lokální distribuční soustavě.';

const ean: IdentifierInfo = {
  id: 'ean',
  cli: 'ean',
  label: 'EAN (elektřina)',
  slug: 'ean',
  short: 'EAN',
  page: {
    title: 'Generátor EAN odběrného místa elektřiny',
    description: 'EAN odběrného místa elektřiny (18 číslic, 8591824…) pro testy: ČEZ, EG.D, PRE, lokální distribuční soustavy i neplatné kódy.',
    h1: 'Generátor EAN odběrného místa',
    intro: 'EAN odběrného místa najdete na faktuře za elektřinu: 18 číslic začínajících 8591824 a na konci kontrolní číslice podle GS1.',
  },
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
  titles: {
    checkDigitZero: 'Kontrolní 0',
    lds: 'Lokální soustava',
    badChecksum: 'Špatný součet',
    wrongLength: 'Špatná délka',
    letters: 'Písmeno',
    wrongPrefix: 'Cizí prefix',
  } satisfies Record<EanEdgeVariant | EanInvalidVariant, string>,
  reasons: {
    letters: LETTERS,
    badFormat: 'Jiné znaky než číslice.',
    wrongLength: 'Jiný počet číslic než 18.',
    wrongPrefix: 'Nezačíná 8591824.',
    badChecksum: 'Špatná kontrolní číslice.',
  } satisfies Record<EanReason, string>,
  disputed: [],
  kit: KIT_PLAIN,
};

const eic: IdentifierInfo = {
  id: 'eic',
  cli: 'eic',
  label: 'EIC (plyn)',
  slug: 'eic',
  short: 'EIC',
  page: {
    title: 'Generátor EIC kódu odběrného místa plynu',
    description: 'EIC kód odběrného místa plynu (16 znaků, 27ZG…) pro testy, včetně lokálních distribučních soustav a neplatných kódů.',
    h1: 'Generátor EIC kódu',
    intro: 'EIC kód odběrného místa plynu má 16 znaků, začíná 27ZG a končí kontrolním znakem podle ENTSO-E. Vygenerované kódy jsou jen testovací, nepatří skutečným odběrným místům.',
  },
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
    badChecksum: 'Poslední znak nesedí s výpočtem podle ENTSO-E. Kdo kontroluje jen délku a začátek 27ZG, nic nepozná.',
    wrongLength: '15 znaků (chybí kontrolní) nebo 17.',
    wrongPrefix: 'Platný EIC, ale jiného typu než odběrné místo plynu (místo 27ZG například 27XG).',
    dashCheckCharacter: 'Kontrolní znak „-“, který norma zakazuje; projde naivní kontrolou.',
  } satisfies Record<EicInvalidVariant, string>,
  titles: {
    checkCharacterDigit: 'Kontrolní číslice',
    lds: 'Lokální soustava',
    badChecksum: 'Špatný kontrolní znak',
    wrongLength: 'Špatná délka',
    wrongPrefix: 'Jiný typ kódu',
    dashCheckCharacter: 'Pomlčka na konci',
  } satisfies Record<EicEdgeVariant | EicInvalidVariant, string>,
  reasons: {
    badFormat: 'Nepovolené znaky, například malá písmena nebo mezery.',
    wrongLength: 'Jiný počet znaků než 16.',
    wrongPrefix: 'Nezačíná 27ZG.',
    dashCheckCharacter: 'Kontrolní znak „-“ je zakázaný.',
    badChecksum: 'Špatný kontrolní znak.',
  } satisfies Record<EicReason, string>,
  disputed: [],
  kit: KIT_PLAIN,
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
