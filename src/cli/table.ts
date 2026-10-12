// The CLI's view of the library: one row per identifier (contract: cli.md sections 1, 2.2 and 6).
import { createBankAccount, validateBankAccount } from '../bankAccount/index.js';
import { createBirthNumber, validateBirthNumber } from '../birthNumber/index.js';
import { createDic, validateDic } from '../dic/index.js';
import { createEan, validateEan } from '../ean/index.js';
import { createEic, validateEic } from '../eic/index.js';
import { createIban, validateIban } from '../iban/index.js';
import { createIco, validateIco } from '../ico/index.js';
import { createPhone, validatePhone } from '../phone/index.js';
import { createPostalCode, validatePostalCode } from '../postalCode/index.js';
import type { SettingsOptions, ValidationResult, ValidatorOptions } from '../index.js';

/** Generator options as the CLI passes them on: the library checks names and values itself. */
export type GeneratorOptions = Readonly<Record<string, string | boolean>>;

/** What the CLI needs from any generator, loosely typed so one table fits every identifier. */
export interface LooseGenerator {
  (options?: GeneratorOptions): string;
  readonly seed: number;
  readonly referenceDate: string;
  readonly edge: (variant?: string) => string;
  readonly invalid: (variant?: string) => string;
  readonly edgeVariants: readonly string[];
  readonly invalidVariants: readonly string[];
}

/** One identifier as the CLI sees it. */
export interface CliIdentifier {
  /** kebab-case CLI name. */
  readonly id: string;
  /** Czech meaning, shown in the help. */
  readonly czech: string;
  readonly create: (settings: SettingsOptions) => LooseGenerator;
  readonly validate: (value: string, options?: ValidatorOptions) => ValidationResult<string>;
  /** Generator options: CLI option name (without `--`) to API option name. */
  readonly options: Readonly<Record<string, string>>;
}

// The typed generators are narrower than the loose shape; this is the one place that bridges them.
function loose(generator: unknown): LooseGenerator {
  return generator as LooseGenerator;
}

const PERSON = { gender: 'gender', 'birth-date': 'birthDate' };
const BANK = { 'bank-code': 'bankCode', 'with-prefix': 'withPrefix' };

/** All identifiers, in the order the help lists them. */
export const IDENTIFIERS: readonly CliIdentifier[] = [
  { id: 'birth-number', czech: 'rodné číslo', create: (s) => loose(createBirthNumber(s)), validate: validateBirthNumber, options: PERSON },
  { id: 'ico', czech: 'IČO', create: (s) => loose(createIco(s)), validate: validateIco, options: {} },
  { id: 'dic', czech: 'DIČ', create: (s) => loose(createDic(s)), validate: validateDic, options: { from: 'from', ...PERSON } },
  { id: 'bank-account', czech: 'číslo bankovního účtu', create: (s) => loose(createBankAccount(s)), validate: validateBankAccount, options: BANK },
  { id: 'iban', czech: 'IBAN', create: (s) => loose(createIban(s)), validate: validateIban, options: { account: 'account', ...BANK } },
  { id: 'phone', czech: 'telefonní číslo', create: (s) => loose(createPhone(s)), validate: validatePhone, options: { type: 'type' } },
  { id: 'postal-code', czech: 'PSČ', create: (s) => loose(createPostalCode(s)), validate: validatePostalCode, options: {} },
  { id: 'ean', czech: 'EAN odběrného místa', create: (s) => loose(createEan(s)), validate: validateEan, options: { distributor: 'distributor' } },
  { id: 'eic', czech: 'EIC kód odběrného místa plynu', create: (s) => loose(createEic(s)), validate: validateEic, options: {} },
];
