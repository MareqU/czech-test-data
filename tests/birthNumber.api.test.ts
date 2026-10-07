// Public API of birthNumber (rodné číslo) and its place in createCz – docs/rules/core.md sections 2, 3 and 5
// (module template, one stream per identifier, cz.validate uses the instance's referenceDate) and
// docs/rules/birthNumber.md sections 8 and 9 (options, reason codes, variant names).
import fc from 'fast-check';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createBirthNumber, validateBirthNumber } from '../src/birthNumber/index.js';
import type {
  BirthNumberEdgeVariant,
  BirthNumberInvalidVariant,
  BirthNumberOptions,
  BirthNumberReason,
} from '../src/birthNumber/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { dateArb, restoreClock, seedArb, setClock } from './support/helpers.js';
import { describeApiContract } from './support/identifierContract.js';

const PROPERTY_RUNS = 200;
const REFERENCE_DATE = '2026-10-05';

const EDGE_VARIANTS: readonly BirthNumberEdgeVariant[] = ['pre1954', 'mod11Exception', 'month+20', 'month+70', 'leapDay', 'withoutSlash'];
const INVALID_VARIANTS: readonly BirthNumberInvalidVariant[] = ['badChecksum', 'impossibleDate', 'wrongLength', 'letters', 'futureDate'];

afterEach(() => {
  restoreClock();
});

describe('types (docs/rules/core.md section 5, docs/rules/birthNumber.md sections 8 and 9)', () => {
  it('declares the reason codes: the five invalid variants plus badFormat', () => {
    expectTypeOf<BirthNumberReason>().toEqualTypeOf<
      'letters' | 'badFormat' | 'wrongLength' | 'impossibleDate' | 'badChecksum' | 'futureDate'
    >();
  });

  it('declares the edge and invalid variant names', () => {
    expectTypeOf<BirthNumberEdgeVariant>().toEqualTypeOf<
      'pre1954' | 'mod11Exception' | 'month+20' | 'month+70' | 'leapDay' | 'withoutSlash'
    >();
    expectTypeOf<BirthNumberInvalidVariant>().toEqualTypeOf<
      'badChecksum' | 'impossibleDate' | 'wrongLength' | 'letters' | 'futureDate'
    >();
    expectTypeOf<BirthNumberInvalidVariant>().toExtend<BirthNumberReason>();
  });

  it('declares the options { gender?: male | female; birthDate?: string }, both optional', () => {
    expectTypeOf<keyof BirthNumberOptions>().toEqualTypeOf<'gender' | 'birthDate'>();
    expectTypeOf<BirthNumberOptions>().toExtend<{ gender?: 'male' | 'female'; birthDate?: string }>();
    expectTypeOf<{ gender?: 'male' | 'female'; birthDate?: string }>().toExtend<BirthNumberOptions>();
    type GeneratorArgs = Parameters<ReturnType<typeof createBirthNumber>>;
    expectTypeOf<[]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ gender: 'female' }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ gender: 'male'; birthDate: string }]>().toExtend<GeneratorArgs>();
    expectTypeOf<[{ gender: 'other' }]>().not.toExtend<GeneratorArgs>();
    expectTypeOf<[{ birthDate: number }]>().not.toExtend<GeneratorArgs>();
  });

  it('types createBirthNumber(options?: SettingsOptions) and validateBirthNumber(value, { referenceDate? })', () => {
    expectTypeOf<[]>().toExtend<Parameters<typeof createBirthNumber>>();
    expectTypeOf<[SettingsOptions]>().toExtend<Parameters<typeof createBirthNumber>>();
    expectTypeOf<[string]>().toExtend<Parameters<typeof validateBirthNumber>>();
    expectTypeOf<[string, { referenceDate: string }]>().toExtend<Parameters<typeof validateBirthNumber>>();
    expectTypeOf(validateBirthNumber).returns.toEqualTypeOf<ValidationResult<BirthNumberReason>>();
    expectTypeOf(createBirthNumber).returns.toHaveProperty('edgeVariants').toEqualTypeOf<readonly BirthNumberEdgeVariant[]>();
    expectTypeOf(createBirthNumber).returns.toHaveProperty('invalidVariants').toEqualTypeOf<readonly BirthNumberInvalidVariant[]>();
  });

  it('types cz.birthNumber like createBirthNumber and cz.validate.birthNumber like validateBirthNumber', () => {
    expectTypeOf<Cz['birthNumber']>().toEqualTypeOf<ReturnType<typeof createBirthNumber>>();
    expectTypeOf<Cz['validate']['birthNumber']>().returns.toEqualTypeOf<ValidationResult<BirthNumberReason>>();
    expectTypeOf<[string]>().toExtend<Parameters<Cz['validate']['birthNumber']>>();
  });
});

describeApiContract({
  id: 'birthNumber',
  create: createBirthNumber,
  onCz: (cz) => cz.birthNumber,
  validateOnCz: (cz, value) => cz.validate.birthNumber(value),
  validate: (value, referenceDate) => validateBirthNumber(value, { referenceDate }),
  referenceDate: REFERENCE_DATE,
  edgeVariants: EDGE_VARIANTS,
  invalidVariants: INVALID_VARIANTS,
  validSample: '905501/1251',
  validateInput: fc.oneof(fc.string({ maxLength: 12 }), fc.stringMatching(/^[0-9]{6}\/?[0-9]{3,4}$/)),
  validateCases: [
    ['261005/0091', { valid: true }],
    ['261006/0101', { valid: false, reason: 'futureDate' }],
  ],
  extraSteps: fc
    .record({ gender: fc.constantFrom<'male' | 'female'>('male', 'female'), birthDate: dateArb('1854-01-01', REFERENCE_DATE) })
    .map((options) => (generator: ReturnType<typeof createBirthNumber>) => generator(options)),
});

describe('cz.validate.birthNumber uses the referenceDate of cz (docs/rules/core.md section 3)', () => {
  it('rejects the day after cz.referenceDate as futureDate and accepts cz.referenceDate itself', () => {
    const cz = createCz({ seed: 42, referenceDate: '2026-10-04' });
    expect(cz.validate.birthNumber('261004/0081')).toEqual({ valid: true });
    expect(cz.validate.birthNumber('261005/0091')).toEqual({ valid: false, reason: 'futureDate' });
    expect(createCz({ seed: 42, referenceDate: '2026-10-05' }).validate.birthNumber('261005/0091')).toEqual({ valid: true });
  });

  it('keeps the instance date when the clock moves on', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    const cz = createCz({ seed: 42 });
    expect(cz.referenceDate).toBe('2026-10-04');
    setClock('2026-10-07T12:00:00Z', 'UTC');
    expect(cz.validate.birthNumber('261005/0091')).toEqual({ valid: false, reason: 'futureDate' });
    expect(validateBirthNumber('261005/0091')).toEqual({ valid: true });
  });

  it('equals validateBirthNumber with { referenceDate: cz.referenceDate } for any value', () => {
    fc.assert(
      fc.property(
        dateArb('1854-01-01', '2099-12-31'),
        fc.oneof(fc.string({ maxLength: 12 }), fc.stringMatching(/^[0-9]{6}\/?[0-9]{3,4}$/)),
        (referenceDate, value) => {
          const cz = createCz({ seed: 42, referenceDate });
          expect(cz.validate.birthNumber(value)).toEqual(validateBirthNumber(value, { referenceDate }));
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('agrees with cz.birthNumber.invalid(futureDate) and the valid values on the same instance', () => {
    fc.assert(
      fc.property(seedArb, dateArb('2004-04-01', '2053-12-30'), (seed, referenceDate) => {
        const cz = createCz({ seed, referenceDate });
        expect(cz.validate.birthNumber(cz.birthNumber.invalid('futureDate'))).toEqual({ valid: false, reason: 'futureDate' });
        expect(cz.validate.birthNumber(cz.birthNumber())).toEqual({ valid: true });
        expect(cz.validate.birthNumber(cz.birthNumber.edge())).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});
