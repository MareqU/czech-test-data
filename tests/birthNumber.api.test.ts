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
import { defineIdentifier } from '../src/core/identifier.js';
import type { Random } from '../src/core/random.js';
import type { NoOptions, SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { dateArb, draw, restoreClock, seedArb, setClock } from './support/helpers.js';

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

describe('createBirthNumber settings (docs/rules/core.md section 3)', () => {
  it('echoes the resolved seed and referenceDate', () => {
    const generator = createBirthNumber({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(generator.seed).toBe(42);
    expect(generator.referenceDate).toBe(REFERENCE_DATE);
  });

  it('defaults referenceDate to the current UTC date and the seed to a random seed that reproduces the values', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    const generator = createBirthNumber();
    expect(generator.referenceDate).toBe('2026-10-04');
    expect(Number.isInteger(generator.seed)).toBe(true);
    const first = draw(3, () => generator());
    const again = createBirthNumber({ seed: generator.seed, referenceDate: generator.referenceDate });
    expect(draw(3, () => again())).toEqual(first);
  });

  it.each([-1, 1.5, Number.NaN, 2 ** 32])('throws RangeError naming seed for the seed %d', (seed) => {
    expect(() => createBirthNumber({ seed })).toThrow(RangeError);
    expect(() => createBirthNumber({ seed })).toThrow(/seed/);
  });

  it.each(['2026-02-30', '2026-10-5', ''])('throws RangeError naming referenceDate for %j', (referenceDate) => {
    expect(() => createBirthNumber({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => createBirthNumber({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });
});

// --- cz.birthNumber versus createBirthNumber ------------------------------------------------------------

type Step =
  | { readonly kind: 'plain' }
  | { readonly kind: 'options'; readonly options: BirthNumberOptions }
  | { readonly kind: 'edge'; readonly variant: BirthNumberEdgeVariant | undefined }
  | { readonly kind: 'invalid'; readonly variant: BirthNumberInvalidVariant | undefined };

const stepArb: fc.Arbitrary<Step> = fc.oneof(
  fc.constant<Step>({ kind: 'plain' }),
  fc
    .record({ gender: fc.constantFrom<'male' | 'female'>('male', 'female'), birthDate: dateArb('1854-01-01', REFERENCE_DATE) })
    .map((options): Step => ({ kind: 'options', options })),
  fc.option(fc.constantFrom(...EDGE_VARIANTS), { nil: undefined }).map((variant): Step => ({ kind: 'edge', variant })),
  fc.option(fc.constantFrom(...INVALID_VARIANTS), { nil: undefined }).map((variant): Step => ({ kind: 'invalid', variant })),
);

type BirthNumberGenerator = ReturnType<typeof createBirthNumber>;

function runStep(generator: BirthNumberGenerator, step: Step): string {
  switch (step.kind) {
    case 'plain':
      return generator();
    case 'options':
      return generator(step.options);
    case 'edge':
      return generator.edge(step.variant);
    case 'invalid':
      return generator.invalid(step.variant);
  }
}

/** The `.edge()` and `.invalid()` of every identifier generator on `cz` other than birthNumber (none in M2). */
function otherIdentifierCalls(cz: Cz): (() => string)[] {
  const calls: (() => string)[] = [];
  for (const [key, value] of Object.entries(cz as unknown as Record<string, unknown>)) {
    if (key !== 'birthNumber' && typeof value === 'function' && 'edge' in value && 'invalid' in value) {
      const { edge, invalid } = value as { edge: () => string; invalid: () => string };
      calls.push(edge, invalid);
    }
  }
  return calls;
}

const generateOther: (random: Random, options: NoOptions) => string = (random) => String(random.uint32());

/** A stand-in for a future identifier, created from the same resolved settings as cz (core stream rule). */
const otherIdentifier = defineIdentifier({
  id: 'otherIdentifier',
  generate: generateOther,
  validate: (): ValidationResult<'never'> => ({ valid: true }),
  edge: { one: (random: Random): string => String(random.uint32()) },
  invalid: { never: (random: Random): string => String(random.uint32()) },
});

describe('cz.birthNumber (docs/rules/core.md sections 2 and 3)', () => {
  it('gives the same values as createBirthNumber for the same settings and the same calls', () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 15 }), (seed, steps) => {
        const cz = createCz({ seed, referenceDate: REFERENCE_DATE });
        const standalone = createBirthNumber({ seed, referenceDate: REFERENCE_DATE });
        expect(steps.map((step) => runStep(cz.birthNumber, step))).toEqual(steps.map((step) => runStep(standalone, step)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('echoes the seed and referenceDate of cz', () => {
    const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(cz.birthNumber.seed).toBe(42);
    expect(cz.birthNumber.referenceDate).toBe(REFERENCE_DATE);
    expect([...cz.birthNumber.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
    expect([...cz.birthNumber.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it('is not affected by calls of other identifiers, validators or other cz instances', () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 10 }), (seed, steps) => {
        const settings = { seed, referenceDate: REFERENCE_DATE };
        const quiet = createCz(settings);
        const busy = createCz(settings);
        const twin = createCz(settings);
        const other = otherIdentifier.create({ seed: busy.seed, referenceDate: busy.referenceDate });
        const expected = steps.map((step) => runStep(quiet.birthNumber, step));
        const actual = steps.map((step) => {
          for (const call of otherIdentifierCalls(busy)) {
            call();
          }
          other();
          other.edge();
          busy.validate.birthNumber('905501/1251');
          runStep(twin.birthNumber, step);
          return runStep(busy.birthNumber, step);
        });
        expect(actual).toEqual(expected);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
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
