// Public API of ico (IČO) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/ico.md section 8 (no options, reason codes, variant names, stream id ico).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createIco, validateIco } from '../src/ico/index.js';
import type { IcoEdgeVariant, IcoInvalidVariant, IcoReason } from '../src/ico/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly IcoEdgeVariant[] = ['leadingZeros', 'checkDigitZero', 'checkDigitOne'];
const INVALID_VARIANTS: readonly IcoInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters'];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/ico.md section 8)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<IcoReason>().toEqualTypeOf<'letters' | 'badFormat' | 'wrongLength' | 'badChecksum'>();
    expectTypeOf<IcoEdgeVariant>().toEqualTypeOf<'leadingZeros' | 'checkDigitZero' | 'checkDigitOne'>();
    expectTypeOf<IcoInvalidVariant>().toEqualTypeOf<'badChecksum' | 'wrongLength' | 'letters'>();
    expectTypeOf<IcoInvalidVariant>().toExtend<IcoReason>();
  });

  it('takes no generator options and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createIco>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ region: 1 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createIco>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createIco>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateIco>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateIco>>();
    expectTypeOf(validateIco).returns.toEqualTypeOf<ValidationResult<IcoReason>>();
    expectTypeOf(createIco).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly IcoEdgeVariant[]>();
    expectTypeOf(createIco).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly IcoInvalidVariant[]>();
  });

  it('types cz.ico like createIco and cz.validate.ico like validateIco', () => {
    expectTypeOf<Cz['ico']>().toEqualTypeOf<ReturnType<typeof createIco>>();
    expectTypeOf<Cz['validate']['ico']>().returns.toEqualTypeOf<ValidationResult<IcoReason>>();
  });
});

describeApiContract({
  id: 'ico',
  create: createIco,
  onCz: (cz) => cz.ico,
  validateOnCz: (cz, value) => cz.validate.ico(value),
  validate: (value, referenceDate) => validateIco(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '00177041',
  validateInput: fc.string({ maxLength: 10 }),
  validateCases: [['00177040', { valid: false, reason: 'badChecksum' }]],
});
