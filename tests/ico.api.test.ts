// Public API of ico (IČO) and its place in createCz – docs/rules/core.md sections 2, 3 and 5 and
// docs/rules/ico.md section 8 (no options, reason codes, variant names, stream id ico).
import fc from 'fast-check';
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest';
import { createIco, validateIco } from '../src/ico/index.js';
import type { IcoEdgeVariant, IcoInvalidVariant, IcoReason } from '../src/ico/index.js';
import type { SettingsOptions, ValidationResult } from '../src/core/types.js';
import { createCz } from '../src/index.js';
import type { Cz } from '../src/index.js';
import { draw, restoreClock, seedArb, setClock } from './support/helpers.js';

const PROPERTY_RUNS = 200;
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

describe('createIco settings (docs/rules/core.md section 3)', () => {
  it('echoes the resolved seed and referenceDate', () => {
    const generator = createIco({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(generator.seed).toBe(42);
    expect(generator.referenceDate).toBe(REFERENCE_DATE);
  });

  it('defaults referenceDate to the current UTC date and the seed to one that reproduces the values', () => {
    setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
    const generator = createIco();
    expect(generator.referenceDate).toBe('2026-10-04');
    const first = draw(3, () => generator());
    const again = createIco({ seed: generator.seed, referenceDate: generator.referenceDate });
    expect(draw(3, () => again())).toEqual(first);
  });

  it.each([-1, 1.5, Number.NaN, 2 ** 32])('throws RangeError naming seed for the seed %d', (seed) => {
    expect(() => createIco({ seed })).toThrow(RangeError);
    expect(() => createIco({ seed })).toThrow(/seed/);
  });

  it.each(['2026-02-30', '2026-10-5', ''])('throws RangeError naming referenceDate for %j', (referenceDate) => {
    expect(() => createIco({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => createIco({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });

  it('throws RangeError naming the variant for an unknown edge or invalid variant', () => {
    const generator = createIco({ seed: 1 });
    expect(() => generator.edge('nope' as IcoEdgeVariant)).toThrow(RangeError);
    expect(() => generator.edge('nope' as IcoEdgeVariant)).toThrow(/nope/);
    expect(() => generator.invalid('nope' as IcoInvalidVariant)).toThrow(/nope/);
  });
});

describe('cz.ico (docs/rules/core.md sections 2 and 3)', () => {
  it('echoes the seed, referenceDate and variants of cz', () => {
    const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
    expect(cz.ico.seed).toBe(42);
    expect(cz.ico.referenceDate).toBe(REFERENCE_DATE);
    expect([...cz.ico.edgeVariants].sort()).toEqual([...EDGE_VARIANTS].sort());
    expect([...cz.ico.invalidVariants].sort()).toEqual([...INVALID_VARIANTS].sort());
  });

  it('gives the same values as createIco for the same settings and the same calls', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const cz = createCz({ seed, referenceDate: REFERENCE_DATE });
        const standalone = createIco({ seed, referenceDate: REFERENCE_DATE });
        const run = (g: typeof standalone): string[] => [
          g(),
          g.edge(),
          g.edge('checkDigitOne'),
          g.invalid(),
          g.invalid('letters'),
          g(),
        ];
        expect(run(cz.ico)).toEqual(run(standalone));
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
        const expected = draw(6, () => quiet.ico());
        const actual = draw(6, () => {
          busy.birthNumber();
          busy.birthNumber.invalid();
          busy.validate.ico('00177041');
          createCz(settings).ico();
          return busy.ico();
        });
        expect(actual).toEqual(expected);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('cz.validate.ico equals validateIco for any value', () => {
    const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
    fc.assert(
      fc.property(fc.string({ maxLength: 10 }), (value) => {
        expect(cz.validate.ico(value)).toEqual(validateIco(value));
      }),
      { numRuns: PROPERTY_RUNS },
    );
    expect(cz.validate.ico('00177040')).toEqual({ valid: false, reason: 'badChecksum' });
  });
});
