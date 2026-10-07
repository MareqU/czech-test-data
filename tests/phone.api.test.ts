// Public API of phone (telefonní číslo) and its place in createCz – docs/rules/core.md sections 2, 3 and 5,
// docs/rules/phone.md sections 4, 8 and 9 (options, reason codes, variant names).
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { createPhone, validatePhone } from '../src/phone/index.js';
import type { PhoneEdgeVariant, PhoneInvalidVariant, PhoneOptions, PhoneReason } from '../src/phone/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { describeApiContract } from './support/identifierContract.js';

const PROPERTY_RUNS = 200;
const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly PhoneEdgeVariant[] = ['withoutSpaces', 'withoutCountryCode', 'digitsOnly', 'prefix00', 'newMobileRange', 'voip'];
const INVALID_VARIANTS: readonly PhoneInvalidVariant[] = ['wrongLength', 'letters', 'wrongCountryCode', 'unknownPrefix', 'specialPrefix'];

describe('types (docs/rules/phone.md sections 4 and 8)', () => {
  it('declares the six reason codes: the five invalid variants plus badFormat', () => {
    expectTypeOf<PhoneReason>().toEqualTypeOf<
      'letters' | 'badFormat' | 'wrongCountryCode' | 'wrongLength' | 'unknownPrefix' | 'specialPrefix'
    >();
    expectTypeOf<PhoneInvalidVariant>().toEqualTypeOf<
      'wrongLength' | 'letters' | 'wrongCountryCode' | 'unknownPrefix' | 'specialPrefix'
    >();
    expectTypeOf<PhoneInvalidVariant>().toExtend<PhoneReason>();
  });

  it('declares the edge variant names', () => {
    expectTypeOf<PhoneEdgeVariant>().toEqualTypeOf<
      'withoutSpaces' | 'withoutCountryCode' | 'digitsOnly' | 'prefix00' | 'newMobileRange' | 'voip'
    >();
  });

  it("declares the option { type?: 'mobile' | 'fixed' }, optional, and no format option", () => {
    expectTypeOf<keyof PhoneOptions>().toEqualTypeOf<'type'>();
    type GeneratorArgs = Parameters<ReturnType<typeof createPhone>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'fixed' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'mobile' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ type: 'voip' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ format: 'e164' }]>().not.toExtend<GeneratorArgs>();
  });

  it('types createPhone(options?: SettingsOptions) and validatePhone(value)', () => {
    expectTypeOf<[]>().toExtend<Parameters<typeof createPhone>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createPhone>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validatePhone>>();
    expectTypeOf(validatePhone).returns.toEqualTypeOf<ValidationResult<PhoneReason>>();
    expectTypeOf(createPhone).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly PhoneEdgeVariant[]>();
    expectTypeOf(createPhone).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly PhoneInvalidVariant[]>();
  });

  it('types cz.phone like createPhone and cz.validate.phone like validatePhone', () => {
    expectTypeOf<Cz['phone']>().toEqualTypeOf<ReturnType<typeof createPhone>>();
    expectTypeOf<Cz['validate']['phone']>().returns.toEqualTypeOf<ValidationResult<PhoneReason>>();
    expectTypeOf<[string]>().toExtend<Parameters<Cz['validate']['phone']>>();
  });
});

describe('phone ignores the date (docs/rules/phone.md section 8)', () => {
  it('validatePhone gives the same result with any referenceDate', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (value) => {
        expect(validatePhone(value, { referenceDate: '1990-01-01' })).toEqual(validatePhone(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describeApiContract({
  id: 'phone',
  create: createPhone,
  onCz: (cz) => cz.phone,
  validateOnCz: (cz, value) => cz.validate.phone(value),
  validate: (value) => validatePhone(value),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '+420 601 123 456',
  validateInput: fc.string({ maxLength: 20 }),
  validateCases: [
    ['+420 601 123 456', { valid: true }],
    ['+421 601 123 456', { valid: false, reason: 'wrongCountryCode' }],
    ['+420 900 123 456', { valid: false, reason: 'specialPrefix' }],
  ],
  extraSteps: fc
    .constantFrom<'mobile' | 'fixed'>('mobile', 'fixed')
    .map((type) => (generator: ReturnType<typeof createPhone>) => generator({ type })),
});
