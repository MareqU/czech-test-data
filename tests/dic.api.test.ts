// Public API of dic (DIČ) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/dic.md sections 4 and 8 (options, reason codes, variant names, stream id dic) and 9.
import fc from 'fast-check';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createDic, validateDic } from '../src/dic/index.js';
import type { DicEdgeVariant, DicInvalidVariant, DicOptions, DicReason } from '../src/dic/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { dateArb, restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-07';

const EDGE_VARIANTS: readonly DicEdgeVariant[] = ['fromIco', 'fromBirthNumber', 'lowercasePrefix', 'pre1954', 'vatGroup'];
const INVALID_VARIANTS: readonly DicInvalidVariant[] = ['missingPrefix', 'foreignPrefix', 'badInnerChecksum'];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/dic.md sections 2.1, 4 and 8)', () => {
  it('declares the reason codes in precedence order and the variant names', () => {
    expectTypeOf<DicReason>().toEqualTypeOf<
      | 'missingPrefix'
      | 'foreignPrefix'
      | 'letters'
      | 'badFormat'
      | 'wrongLength'
      | 'impossibleDate'
      | 'badInnerChecksum'
      | 'futureDate'
    >();
    expectTypeOf<DicEdgeVariant>().toEqualTypeOf<
      'fromIco' | 'fromBirthNumber' | 'lowercasePrefix' | 'pre1954' | 'vatGroup'
    >();
    expectTypeOf<DicInvalidVariant>().toEqualTypeOf<'missingPrefix' | 'foreignPrefix' | 'badInnerChecksum'>();
    expectTypeOf<DicInvalidVariant>().toExtend<DicReason>();
  });

  it('takes the discriminated options of section 8: from ico alone, or birthNumber with gender and birthDate', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createDic>>;
    expectTypeOf<DicOptions>().toExtend<
      | { readonly from: 'ico' }
      | { readonly from?: 'birthNumber'; readonly gender?: 'male' | 'female'; readonly birthDate?: string }
    >();
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'ico' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'birthNumber' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ gender: 'female' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'birthNumber'; gender: 'male'; birthDate: string }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'ico'; gender: 'male' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'ico'; birthDate: string }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ from: 'phone' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ gender: 'other' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ birthDate: number }]>().not.toExtend<GeneratorArgs>();
  });

  it('types createDic(options?: SettingsOptions) and validateDic(value, { referenceDate? })', () => {
    expectTypeOf<[]>().toExtend<Parameters<typeof createDic>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createDic>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateDic>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateDic>>();
    expectTypeOf(validateDic).returns.toEqualTypeOf<ValidationResult<DicReason>>();
    expectTypeOf(createDic).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly DicEdgeVariant[]>();
    expectTypeOf(createDic).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly DicInvalidVariant[]>();
  });

  it('types cz.dic like createDic and cz.validate.dic like validateDic', () => {
    expectTypeOf<Cz['dic']>().toEqualTypeOf<ReturnType<typeof createDic>>();
    expectTypeOf<Cz['validate']['dic']>().returns.toEqualTypeOf<ValidationResult<DicReason>>();
    expectTypeOf<[string]>().toExtend<Parameters<Cz['validate']['dic']>>();
  });
});

describeApiContract({
  id: 'dic',
  create: createDic,
  onCz: (cz) => cz.dic,
  validateOnCz: (cz, value) => cz.validate.dic(value),
  validate: (value, referenceDate) => validateDic(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: 'CZ00177041',
  validateInput: fc.oneof(fc.string({ maxLength: 14 }), fc.stringMatching(/^[Cc][Zz][0-9]{7,11}$/)),
  validateCases: [
    ['CZ00177040', { valid: false, reason: 'badInnerChecksum' }],
    ['CZ3001010111', { valid: false, reason: 'futureDate' }],
    ['CZ699000797', { valid: true }],
  ],
  extraSteps: fc.oneof(
    fc.constant((generator: ReturnType<typeof createDic>) => generator({ from: 'ico' })),
    fc
      .record({ gender: fc.constantFrom<'male' | 'female'>('male', 'female'), birthDate: dateArb('1900-01-01', REFERENCE_DATE) })
      .map((options) => (generator: ReturnType<typeof createDic>) => generator(options)),
  ),
});

describe('cz.validate.dic uses the referenceDate of cz (docs/rules/core.md section 3, dic.md section 2.1)', () => {
  it('rejects a birth number after cz.referenceDate as futureDate and accepts cz.referenceDate itself', () => {
    expect(createCz({ seed: 42, referenceDate: '2026-10-04' }).validate.dic('CZ2610040081')).toEqual({ valid: true });
    expect(createCz({ seed: 42, referenceDate: '2026-10-04' }).validate.dic('CZ2610050091')).toEqual({
      valid: false,
      reason: 'futureDate',
    });
    expect(createCz({ seed: 42, referenceDate: '2026-10-05' }).validate.dic('CZ2610050091')).toEqual({ valid: true });
  });

  it('equals validateDic with { referenceDate: cz.referenceDate } for any value', () => {
    fc.assert(
      fc.property(
        dateArb('1900-01-01', '2099-12-31'),
        fc.oneof(fc.string({ maxLength: 14 }), fc.stringMatching(/^CZ[0-9]{8,10}$/)),
        (referenceDate, value) => {
          expect(createCz({ seed: 1, referenceDate }).validate.dic(value)).toEqual(validateDic(value, { referenceDate }));
        },
      ),
      { numRuns: 200 },
    );
  });
});
