// Public API of bankAccount (číslo účtu) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/bankAccount.md section 9 (options, reason codes, variant names, stream id bankAccount).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createBankAccount, validateBankAccount } from '../src/bankAccount/index.js';
import type { BankAccountEdgeVariant, BankAccountInvalidVariant, BankAccountReason } from '../src/bankAccount/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly BankAccountEdgeVariant[] = [
  'withPrefix',
  'maxLength',
  'minLength',
  'withLeadingZeros',
  'zeroPrefix',
];
const INVALID_VARIANTS: readonly BankAccountInvalidVariant[] = [
  'badChecksumPrefix',
  'badChecksumNumber',
  'unknownBankCode',
  'wrongLength',
  'letters',
  'zeroNumber',
];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/bankAccount.md section 9)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<BankAccountReason>().toEqualTypeOf<
      | 'letters'
      | 'badFormat'
      | 'wrongLength'
      | 'badChecksumPrefix'
      | 'badChecksumNumber'
      | 'zeroNumber'
      | 'unknownBankCode'
    >();
    expectTypeOf<BankAccountEdgeVariant>().toEqualTypeOf<
      'withPrefix' | 'maxLength' | 'minLength' | 'withLeadingZeros' | 'zeroPrefix'
    >();
    expectTypeOf<BankAccountInvalidVariant>().toEqualTypeOf<
      'badChecksumPrefix' | 'badChecksumNumber' | 'unknownBankCode' | 'wrongLength' | 'letters' | 'zeroNumber'
    >();
    expectTypeOf<BankAccountInvalidVariant>().toExtend<BankAccountReason>();
  });

  it('takes the optional options bankCode (string) and withPrefix (boolean) and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createBankAccount>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ bankCode: string; withPrefix: boolean }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ bankCode: string }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ withPrefix: true }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ withPrefix: 'yes' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ bankCode: 800 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createBankAccount>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createBankAccount>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateBankAccount>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateBankAccount>>();
    expectTypeOf(validateBankAccount).returns.toEqualTypeOf<ValidationResult<BankAccountReason>>();
    expectTypeOf(createBankAccount)
      .returns.toHaveProperty('edgeVariants')
      .toEqualTypeOf<readonly BankAccountEdgeVariant[]>();
    expectTypeOf(createBankAccount)
      .returns.toHaveProperty('invalidVariants')
      .toEqualTypeOf<readonly BankAccountInvalidVariant[]>();
  });

  it('types cz.bankAccount like createBankAccount and cz.validate.bankAccount like validateBankAccount', () => {
    expectTypeOf<Cz['bankAccount']>().toEqualTypeOf<ReturnType<typeof createBankAccount>>();
    expectTypeOf<Cz['validate']['bankAccount']>().returns.toEqualTypeOf<ValidationResult<BankAccountReason>>();
  });
});

const charArb = fc.constantFrom(...'0123456789-/ AO'.split(''));

describeApiContract({
  id: 'bankAccount',
  create: createBankAccount,
  onCz: (cz) => cz.bankAccount,
  validateOnCz: (cz, value) => cz.validate.bankAccount(value),
  validate: (value, referenceDate) => validateBankAccount(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '1234567899/0800',
  validateInput: fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.array(charArb, { maxLength: 22 }).map((chars) => chars.join('')),
  ),
  validateCases: [
    ['1234567890/0800', { valid: false, reason: 'badChecksumNumber' }],
    ['13717-77628031/0710', { valid: true }],
  ],
  extraSteps: fc.oneof(
    fc.constant((generator: ReturnType<typeof createBankAccount>) => generator({ withPrefix: true })),
    fc
      .constantFrom('0100', '0800', '8620')
      .map(
        (bankCode) => (generator: ReturnType<typeof createBankAccount>) =>
          generator({ bankCode, withPrefix: bankCode === '0800' }),
      ),
  ),
});
