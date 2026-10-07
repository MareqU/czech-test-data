// Public API of postalCode (PSČ) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/postalCode.md sections 8 and 9 (no options, reason codes, variant names, stream id postalCode).
import fc from 'fast-check';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createPostalCode, validatePostalCode } from '../src/postalCode/index.js';
import type { PostalCodeEdgeVariant, PostalCodeInvalidVariant, PostalCodeReason } from '../src/postalCode/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { draw, restoreClock, seedArb, setClock } from './support/helpers.js';

const PROPERTY_RUNS = 200;
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

describe('createPostalCode settings (docs/rules/core.md section 3)', () => {
  it('echoes the resolved seed and referenceDate', () => {
    const generator = createPostalCode({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(generator.seed).toBe(42);
    expect(generator.referenceDate).toBe(REFERENCE_DATE);
  });

  it('defaults referenceDate to the current UTC date and the seed to one that reproduces the values', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    const generator = createPostalCode();
    expect(generator.referenceDate).toBe('2026-10-04');
    const first = draw(3, () => generator());
    const again = createPostalCode({ seed: generator.seed, referenceDate: generator.referenceDate });
    expect(draw(3, () => again())).toEqual(first);
  });

  it.each([-1, 1.5, Number.NaN, 2 ** 32])('throws RangeError naming seed for the seed %d', (seed) => {
    expect(() => createPostalCode({ seed })).toThrow(RangeError);
    expect(() => createPostalCode({ seed })).toThrow(/seed/);
  });

  it.each(['2026-02-30', '2026-10-5', ''])('throws RangeError naming referenceDate for %j', (referenceDate) => {
    expect(() => createPostalCode({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => createPostalCode({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });

  it('throws RangeError naming the variant for an unknown edge or invalid variant', () => {
    const generator = createPostalCode({ seed: 1 });
    expect(() => generator.edge('nope' as PostalCodeEdgeVariant)).toThrow(RangeError);
    expect(() => generator.edge('nope' as PostalCodeEdgeVariant)).toThrow(/nope/);
    expect(() => generator.invalid('nope' as PostalCodeInvalidVariant)).toThrow(/nope/);
  });
});

describe('cz.postalCode (docs/rules/core.md sections 2 and 3)', () => {
  it('echoes the seed, referenceDate and variants of cz', () => {
    const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(cz.postalCode.seed).toBe(42);
    expect(cz.postalCode.referenceDate).toBe(REFERENCE_DATE);
    expect([...cz.postalCode.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
    expect([...cz.postalCode.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it('gives the same values as createPostalCode for the same settings and the same calls', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const cz = createCz({ seed, referenceDate: REFERENCE_DATE });
        const standalone = createPostalCode({ seed, referenceDate: REFERENCE_DATE });
        const run = (g: typeof standalone): string[] => [
          g(),
          g.edge(),
          g.edge('withoutSpace'),
          g.invalid(),
          g.invalid('badFormat'),
          g(),
        ];
        expect(run(cz.postalCode)).toEqual(run(standalone));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('is not affected by calls of birthNumber, validators or other cz instances', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const settings = { seed, referenceDate: REFERENCE_DATE };
        const quiet = createCz(settings);
        const busy = createCz(settings);
        const expected = draw(6, () => quiet.postalCode());
        const actual = draw(6, () => {
          busy.birthNumber();
          busy.birthNumber.invalid();
          busy.validate.postalCode('623 00');
          createCz(settings).postalCode();
          return busy.postalCode();
        });
        expect(actual).toEqual(expected);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('cz.validate.postalCode equals validatePostalCode for any value', () => {
    const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
    fc.assert(
      fc.property(fc.string({ maxLength: 8 }), (value) => {
        expect(cz.validate.postalCode(value)).toEqual(validatePostalCode(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
    expect(cz.validate.postalCode('948 01')).toEqual({ valid: false, reason: 'foreignRange' });
  });
});
