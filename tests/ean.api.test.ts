// Public API of ean (EAN odběrného místa elektřiny) and its place in createCz – docs/rules/core.md sections 2, 3
// and 5 and docs/rules/ean.md section 9 (options, reason codes, variant names, stream id ean).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createEan, validateEan } from '../src/ean/index.js';
import type { EanDistributor, EanEdgeVariant, EanInvalidVariant, EanOptions, EanReason } from '../src/ean/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly EanEdgeVariant[] = ['checkDigitZero', 'lds'];
const INVALID_VARIANTS: readonly EanInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters', 'wrongPrefix'];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/ean.md section 9)', () => {
  it('declares the reason codes, the variant names and the distributors', () => {
    expectTypeOf<EanReason>().toEqualTypeOf<'letters' | 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'badChecksum'>();
    expectTypeOf<EanEdgeVariant>().toEqualTypeOf<'checkDigitZero' | 'lds'>();
    expectTypeOf<EanInvalidVariant>().toEqualTypeOf<'badChecksum' | 'wrongLength' | 'letters' | 'wrongPrefix'>();
    expectTypeOf<EanInvalidVariant>().toExtend<EanReason>();
    expectTypeOf<EanDistributor>().toEqualTypeOf<'cez' | 'egd' | 'pre' | 'lds'>();
  });

  it('takes the optional option distributor and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createEan>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ distributor: 'cez' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ distributor: 'other' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<{ distributor: 'lds' }>().toExtend<EanOptions>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createEan>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createEan>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateEan>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateEan>>();
    expectTypeOf(validateEan).returns.toEqualTypeOf<ValidationResult<EanReason>>();
    expectTypeOf(createEan).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly EanEdgeVariant[]>();
    expectTypeOf(createEan).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly EanInvalidVariant[]>();
  });

  it('types cz.ean like createEan and cz.validate.ean like validateEan', () => {
    expectTypeOf<Cz['ean']>().toEqualTypeOf<ReturnType<typeof createEan>>();
    expectTypeOf<Cz['validate']['ean']>().returns.toEqualTypeOf<ValidationResult<EanReason>>();
  });
});

const charArb = fc.constantFrom(...'8591824 0123456789AO'.split(''));

describeApiContract({
  id: 'ean',
  create: createEan,
  onCz: (cz) => cz.ean,
  validateOnCz: (cz, value) => cz.validate.ean(value),
  validate: (value, referenceDate) => validateEan(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '859182412340000003',
  validateInput: fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.array(charArb, { maxLength: 22 }).map((chars) => chars.join('')),
  ),
  validateCases: [
    ['859182500512345677', { valid: false, reason: 'wrongPrefix' }],
    ['859182412340000003', { valid: true }],
  ],
  extraSteps: fc
    .constantFrom('cez', 'egd', 'pre', 'lds')
    .map((distributor) => (generator: ReturnType<typeof createEan>) => generator({ distributor })),
});
