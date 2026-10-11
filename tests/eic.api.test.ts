// Public API of eic (EIC kód odběrného místa plynu) and its place in createCz – docs/rules/core.md sections 2, 3
// and 5 and docs/rules/eic.md section 9 (no options, reason codes, variant names, stream id eic).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createEic, validateEic } from '../src/eic/index.js';
import type { EicEdgeVariant, EicGenerator, EicInvalidVariant, EicReason } from '../src/eic/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly EicEdgeVariant[] = ['checkCharacterDigit', 'lds'];
const INVALID_VARIANTS: readonly EicInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'wrongPrefix',
  'dashCheckCharacter',
];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/eic.md section 9)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<EicReason>().toEqualTypeOf<
      'badFormat' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter' | 'badChecksum'
    >();
    expectTypeOf<EicEdgeVariant>().toEqualTypeOf<'checkCharacterDigit' | 'lds'>();
    expectTypeOf<EicInvalidVariant>().toEqualTypeOf<
      'badChecksum' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter'
    >();
    expectTypeOf<EicInvalidVariant>().toExtend<EicReason>();
  });

  it('takes no generator options (decision 8) and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createEic>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ distributor: 'cez' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ lds: true }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<ReturnType<typeof createEic>>().toEqualTypeOf<EicGenerator>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createEic>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createEic>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateEic>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateEic>>();
    expectTypeOf(validateEic).returns.toEqualTypeOf<ValidationResult<EicReason>>();
    expectTypeOf(createEic).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly EicEdgeVariant[]>();
    expectTypeOf(createEic).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly EicInvalidVariant[]>();
  });

  it('types cz.eic like createEic and cz.validate.eic like validateEic', () => {
    expectTypeOf<Cz['eic']>().toEqualTypeOf<ReturnType<typeof createEic>>();
    expectTypeOf<Cz['validate']['eic']>().returns.toEqualTypeOf<ValidationResult<EicReason>>();
  });
});

const charArb = fc.constantFrom(...'27ZG0123456789AKXz- '.split(''));

describeApiContract({
  id: 'eic',
  create: createEic,
  onCz: (cz) => cz.eic,
  validateOnCz: (cz, value) => cz.validate.eic(value),
  validate: (value, referenceDate) => validateEic(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '27ZG100Z0000001K',
  validateInput: fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.array(charArb, { maxLength: 20 }).map((chars) => chars.join('')),
  ),
  validateCases: [
    ['27ZG100Z0000037-', { valid: false, reason: 'dashCheckCharacter' }],
    ['27ZG100Z0000001K', { valid: true }],
  ],
});
