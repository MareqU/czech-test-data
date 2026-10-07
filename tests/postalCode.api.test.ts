// Public API of postalCode (PSČ) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/postalCode.md sections 8 and 9 (no options, reason codes, variant names, stream id postalCode).
import fc from 'fast-check';
import { afterEach, describe, expectTypeOf, it } from 'vitest';
import { createPostalCode, validatePostalCode } from '../src/postalCode/index.js';
import type { PostalCodeEdgeVariant, PostalCodeInvalidVariant, PostalCodeReason } from '../src/postalCode/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import type { Cz } from '../src/index.js';
import { restoreClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly PostalCodeEdgeVariant[] = ['withoutSpace', 'nonGeographic'];
const INVALID_VARIANTS: readonly PostalCodeInvalidVariant[] = ['wrongLength', 'letters', 'badFormat', 'foreignRange'];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/postalCode.md sections 8 and 9)', () => {
  it('declares the reason codes and the variant names', () => {
    expectTypeOf<PostalCodeReason>().toEqualTypeOf<'letters' | 'badFormat' | 'wrongLength' | 'foreignRange'>();
    expectTypeOf<PostalCodeEdgeVariant>().toEqualTypeOf<'withoutSpace' | 'nonGeographic'>();
    expectTypeOf<PostalCodeInvalidVariant>().toEqualTypeOf<'wrongLength' | 'letters' | 'badFormat' | 'foreignRange'>();
    expectTypeOf<PostalCodeInvalidVariant>().toExtend<PostalCodeReason>();
  });

  it('takes no generator options and types the functions', () => {
    type GeneratorArgs = Parameters<ReturnType<typeof createPostalCode>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ region: 1 }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[]>().toExtend<Parameters<typeof createPostalCode>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createPostalCode>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validatePostalCode>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validatePostalCode>>();
    expectTypeOf(validatePostalCode).returns.toEqualTypeOf<ValidationResult<PostalCodeReason>>();
    expectTypeOf(createPostalCode).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly PostalCodeEdgeVariant[]>();
    expectTypeOf(createPostalCode).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly PostalCodeInvalidVariant[]>();
  });

  it('types cz.postalCode like createPostalCode and cz.validate.postalCode like validatePostalCode', () => {
    expectTypeOf<Cz['postalCode']>().toEqualTypeOf<ReturnType<typeof createPostalCode>>();
    expectTypeOf<Cz['validate']['postalCode']>().returns.toEqualTypeOf<ValidationResult<PostalCodeReason>>();
  });
});

describeApiContract({
  id: 'postalCode',
  create: createPostalCode,
  onCz: (cz) => cz.postalCode,
  validateOnCz: (cz, value) => cz.validate.postalCode(value),
  validate: (value, referenceDate) => validatePostalCode(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '623 00',
  validateInput: fc.string({ maxLength: 8 }),
  validateCases: [['948 01', { valid: false, reason: 'foreignRange' }]],
});
