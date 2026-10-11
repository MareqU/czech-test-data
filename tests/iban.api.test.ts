// Public API of iban (číslo účtu ve formátu IBAN) and its place in createCz – docs/rules/core.md sections 2, 3
// and 5 and docs/rules/iban.md section 9 (options, reason codes, variant names, stream id iban).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createIban, validateIban } from '../src/iban/index.js';
import type { IbanEdgeVariant, IbanInvalidVariant, IbanReason } from '../src/iban/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly IbanEdgeVariant[] = ['withSpaces', 'lowercase', 'withPrefix', 'checkDigitsLeadingZero'];
const INVALID_VARIANTS: readonly IbanInvalidVariant[] = [
  'badChecksum',
  'wrongCountry',
  'wrongLength',
  'letters',
  'badChecksumPrefix',
  'badChecksumNumber',
  'zeroNumber',
  'unknownBankCode',
];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/iban.md section 9)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<IbanReason>().toEqualTypeOf<
      | 'badFormat'
      | 'wrongCountry'
      | 'letters'
      | 'wrongLength'
      | 'badChecksum'
      | 'badChecksumPrefix'
      | 'badChecksumNumber'
      | 'zeroNumber'
      | 'unknownBankCode'
    >();
    expectTypeOf<IbanEdgeVariant>().toEqualTypeOf<
      'withSpaces' | 'lowercase' | 'withPrefix' | 'checkDigitsLeadingZero'
    >();
    expectTypeOf<IbanInvalidVariant>().toEqualTypeOf<
      | 'badChecksum'
      | 'wrongCountry'
      | 'wrongLength'
      | 'letters'
      | 'badChecksumPrefix'
      | 'badChecksumNumber'
      | 'zeroNumber'
      | 'unknownBankCode'
    >();
    expectTypeOf<IbanInvalidVariant>().toExtend<IbanReason>();
  });

  it('takes the optional options bankCode, withPrefix and account (strings and boolean) and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createIban>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ bankCode: string; withPrefix: boolean }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ account: string }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ withPrefix: 'yes' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ bankCode: 800 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ account: 19 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createIban>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createIban>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateIban>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateIban>>();
    expectTypeOf(validateIban).returns.toEqualTypeOf<ValidationResult<IbanReason>>();
    expectTypeOf(createIban).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly IbanEdgeVariant[]>();
    expectTypeOf(createIban).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly IbanInvalidVariant[]>();
  });

  it('types cz.iban like createIban and cz.validate.iban like validateIban', () => {
    expectTypeOf<Cz['iban']>().toEqualTypeOf<ReturnType<typeof createIban>>();
    expectTypeOf<Cz['validate']['iban']>().returns.toEqualTypeOf<ValidationResult<IbanReason>>();
  });
});

const charArb = fc.constantFrom(...'CZcz0123456789 SKAO'.split(''));

describeApiContract({
  id: 'iban',
  create: createIban,
  onCz: (cz) => cz.iban,
  validateOnCz: (cz, value) => cz.validate.iban(value),
  validate: (value, referenceDate) => validateIban(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: 'CZ5508000000001234567899',
  validateInput: fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.array(charArb, { maxLength: 26 }).map((chars) => chars.join('')),
  ),
  validateCases: [
    ['CZ0708000000001234567890', { valid: false, reason: 'badChecksumNumber' }],
    ['CZ65 0800 0000 1920 0014 5399', { valid: true }],
  ],
  extraSteps: fc.oneof(
    fc.constant((generator: ReturnType<typeof createIban>) => generator({ withPrefix: true })),
    fc.constant((generator: ReturnType<typeof createIban>) => generator({ account: '19-2000145399/0800' })),
    fc
      .constantFrom('0100', '0800', '8620')
      .map(
        (bankCode) => (generator: ReturnType<typeof createIban>) =>
          generator({ bankCode, withPrefix: bankCode === '0800' }),
      ),
  ),
});
