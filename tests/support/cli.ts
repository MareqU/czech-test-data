// Shared fixtures for the CLI tests (docs/rules/cli.md): one table row per identifier, the library as oracle
// (section 2.3) and independent renderers of the output formats (sections 3 and 4).
import { createBankAccount, validateBankAccount } from '../../src/bankAccount/index.js';
import { createBirthNumber, validateBirthNumber } from '../../src/birthNumber/index.js';
import { createDic, validateDic } from '../../src/dic/index.js';
import { createEan, validateEan } from '../../src/ean/index.js';
import { createEic, validateEic } from '../../src/eic/index.js';
import { createIban, validateIban } from '../../src/iban/index.js';
import { createIco, validateIco } from '../../src/ico/index.js';
import { createPhone, validatePhone } from '../../src/phone/index.js';
import { createPostalCode, validatePostalCode } from '../../src/postalCode/index.js';
import type { SettingsOptions, ValidationResult, ValidatorOptions } from '../../src/index.js';

export const SEED = 42;
export const REFERENCE_DATE = '2026-10-05';

type Options = Readonly<Record<string, unknown>>;

/** What the CLI needs from a library generator, loosely typed so one table fits every identifier. */
export interface LibraryGenerator {
  readonly generate: (options?: Options) => string;
  readonly edge: (variant?: string) => string;
  readonly invalid: (variant?: string) => string;
  readonly edgeVariants: readonly string[];
  readonly invalidVariants: readonly string[];
}

export interface CliIdentifier {
  /** kebab-case CLI name (section 1). */
  readonly id: string;
  readonly create: (settings: SettingsOptions) => LibraryGenerator;
  readonly validate: (value: string, options?: ValidatorOptions) => ValidationResult<string>;
  /** Generator option mapping (section 2.2): CLI arguments and the API options they stand for. */
  readonly mapping?: {
    readonly args: readonly string[];
    readonly options: Options;
  };
  /** Generator options of the identifier as listed in `<id> --help`. */
  readonly helpOptions: readonly string[];
}

interface AnyGenerator {
  (options?: Options): string;
  readonly edge: (variant?: string) => string;
  readonly invalid: (variant?: string) => string;
  readonly edgeVariants: readonly string[];
  readonly invalidVariants: readonly string[];
}

/** The typed generators are narrower than this loose shape, hence the cast at the one place it is needed. */
function lib(generator: unknown): LibraryGenerator {
  const g = generator as AnyGenerator;
  return {
    generate: (options) => (options === undefined ? g() : g(options)),
    edge: (variant) => (variant === undefined ? g.edge() : g.edge(variant)),
    invalid: (variant) => (variant === undefined ? g.invalid() : g.invalid(variant)),
    edgeVariants: g.edgeVariants,
    invalidVariants: g.invalidVariants,
  };
}

export const IDENTIFIERS: readonly CliIdentifier[] = [
  {
    id: 'birth-number',
    create: (s) => lib(createBirthNumber(s)),
    validate: validateBirthNumber,
    mapping: {
      args: ['--gender', 'female', '--birth-date', '1990-05-17'],
      options: { gender: 'female', birthDate: '1990-05-17' },
    },
    helpOptions: ['--gender', '--birth-date'],
  },
  {
    id: 'ico',
    create: (s) => lib(createIco(s)),
    validate: validateIco,
    helpOptions: [],
  },
  {
    id: 'dic',
    create: (s) => lib(createDic(s)),
    validate: validateDic,
    mapping: {
      args: ['--from', 'birthNumber', '--gender', 'male'],
      options: { from: 'birthNumber', gender: 'male' },
    },
    helpOptions: ['--from', '--gender', '--birth-date'],
  },
  {
    id: 'bank-account',
    create: (s) => lib(createBankAccount(s)),
    validate: validateBankAccount,
    mapping: {
      args: ['--bank-code', '0800', '--with-prefix'],
      options: { bankCode: '0800', withPrefix: true },
    },
    helpOptions: ['--bank-code', '--with-prefix'],
  },
  {
    id: 'iban',
    create: (s) => lib(createIban(s)),
    validate: validateIban,
    mapping: {
      args: ['--account', '19-2000145399/0800'],
      options: { account: '19-2000145399/0800' },
    },
    helpOptions: ['--account', '--bank-code', '--with-prefix'],
  },
  {
    id: 'phone',
    create: (s) => lib(createPhone(s)),
    validate: validatePhone,
    mapping: { args: ['--type', 'fixed'], options: { type: 'fixed' } },
    helpOptions: ['--type'],
  },
  {
    id: 'postal-code',
    create: (s) => lib(createPostalCode(s)),
    validate: validatePostalCode,
    helpOptions: [],
  },
  {
    id: 'ean',
    create: (s) => lib(createEan(s)),
    validate: validateEan,
    mapping: {
      args: ['--distributor', 'pre'],
      options: { distributor: 'pre' },
    },
    helpOptions: ['--distributor'],
  },
  {
    id: 'eic',
    create: (s) => lib(createEic(s)),
    validate: validateEic,
    helpOptions: [],
  },
];

export interface GeneratedRecord {
  readonly value: string;
  readonly kind: 'valid' | 'edge' | 'invalid';
  readonly variant?: string;
}

export type Mode = 'valid' | 'edge' | 'invalid';

/**
 * Expected records for a run (section 2.3). `variant` is undefined for valid values, `'random'`, `'all'` or a name.
 */
export function expectedRecords(
  entry: CliIdentifier,
  run: {
    mode: Mode;
    variant?: string | undefined;
    count: number;
    options?: Options;
  },
): GeneratedRecord[] {
  const { mode, variant, count, options } = run;
  const settings: SettingsOptions = {
    seed: SEED,
    referenceDate: REFERENCE_DATE,
  };
  const generator = entry.create(settings);
  const records: GeneratedRecord[] = [];
  const repeat = (make: () => string, name?: string): void => {
    for (let i = 0; i < count; i += 1) {
      const value = make();
      records.push(name === undefined ? { value, kind: mode } : { value, kind: mode, variant: name });
    }
  };
  if (mode === 'valid') {
    repeat(() => generator.generate(options));
  } else {
    const call = mode === 'edge' ? generator.edge : generator.invalid;
    const names = mode === 'edge' ? generator.edgeVariants : generator.invalidVariants;
    if (variant === 'random') repeat(() => call());
    else if (variant === 'all') for (const name of names) repeat(() => call(name), name);
    else repeat(() => call(variant), variant);
  }
  return records;
}

export function csvField(field: string): string {
  return /[",\r\n]/u.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

export function csvRows(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => `${row.map(csvField).join(',')}\n`).join('');
}

export type Format = 'text' | 'json' | 'csv';

export function renderGenerated(records: readonly GeneratedRecord[], format: Format): string {
  if (format === 'text') return records.map((r) => `${r.value}\n`).join('');
  if (format === 'json') return `${JSON.stringify(records, null, 2)}\n`;
  return csvRows([['value', 'kind', 'variant'], ...records.map((r) => [r.value, r.kind, r.variant ?? ''])]);
}

export interface ValidatedRecord {
  readonly value: string;
  readonly valid: boolean;
  readonly reason?: string;
}

export function renderValidated(records: readonly ValidatedRecord[], format: Format): string {
  if (format === 'text') {
    return records.map((r) => `${r.value}\t${r.valid ? 'valid' : `invalid\t${r.reason ?? ''}`}\n`).join('');
  }
  if (format === 'json') return `${JSON.stringify(records, null, 2)}\n`;
  return csvRows([['value', 'valid', 'reason'], ...records.map((r) => [r.value, String(r.valid), r.reason ?? ''])]);
}

/** Runs the library validator the way the contract describes (section 4). */
export function expectedValidation(
  entry: CliIdentifier,
  values: readonly string[],
  referenceDate: string = REFERENCE_DATE,
): ValidatedRecord[] {
  return values.map((value) => {
    const result = entry.validate(value, { referenceDate });
    return result.valid ? { value, valid: true } : { value, valid: false, reason: result.reason };
  });
}

/** A mix of valid, edge and invalid values from the library, for validate tests. */
export function sampleValues(entry: CliIdentifier): string[] {
  const generator = entry.create({ seed: 1, referenceDate: REFERENCE_DATE });
  return [
    generator.generate(),
    generator.invalid(generator.invalidVariants[0]),
    generator.edge(generator.edgeVariants[0]),
  ];
}
