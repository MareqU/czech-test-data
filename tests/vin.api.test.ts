// Public API of vin (VIN, identifikační číslo vozidla) and its place in createCz – docs/rules/core.md sections 2, 3
// and 5 and docs/rules/vin.md section 9 (no options, reason codes, variant names, stream id vin).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createVin, validateVin } from '../src/vin/index.js';
import type { VinEdgeVariant, VinGenerator, VinInvalidVariant, VinReason } from '../src/vin/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly VinEdgeVariant[] = ['checkDigitX', 'smallManufacturer', 'noModelYear'];
const INVALID_VARIANTS: readonly VinInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'forbiddenLetter',
  'nonNumericSerial',
];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/vin.md section 9)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<VinReason>().toEqualTypeOf<
      'badFormat' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial' | 'badChecksum'
    >();
    expectTypeOf<VinEdgeVariant>().toEqualTypeOf<'checkDigitX' | 'smallManufacturer' | 'noModelYear'>();
    expectTypeOf<VinInvalidVariant>().toEqualTypeOf<
      'badChecksum' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial'
    >();
    expectTypeOf<VinInvalidVariant>().toExtend<VinReason>();
  });

  it('takes no generator options (decision 9) and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createVin>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ wmi: 'TMB' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ modelYear: 2026 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<ReturnType<typeof createVin>>().toEqualTypeOf<VinGenerator>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createVin>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createVin>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateVin>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateVin>>();
    expectTypeOf(validateVin).returns.toEqualTypeOf<ValidationResult<VinReason>>();
    expectTypeOf(createVin).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly VinEdgeVariant[]>();
    expectTypeOf(createVin).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly VinInvalidVariant[]>();
  });

  it('types cz.vin like createVin and cz.validate.vin like validateVin', () => {
    expectTypeOf<Cz['vin']>().toEqualTypeOf<ReturnType<typeof createVin>>();
    expectTypeOf<Cz['validate']['vin']>().returns.toEqualTypeOf<ValidationResult<VinReason>>();
  });
});

const charArb = fc.constantFrom(...'1G4AH59H45TMBJRXIOQa -'.split(''));

describeApiContract({
  id: 'vin',
  create: createVin,
  onCz: (cz) => cz.vin,
  validateOnCz: (cz, value) => cz.validate.vin(value),
  validate: (value, referenceDate) => validateVin(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '1G4AH59H45G118341',
  validateInput: fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.array(charArb, { maxLength: 20 }).map((chars) => chars.join('')),
  ),
  validateCases: [
    ['TMBJR8NX4PY123456', { valid: false, reason: 'badChecksum' }],
    ['1G4AH59H45G118341', { valid: true }],
  ],
});
