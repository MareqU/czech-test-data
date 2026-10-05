// Specification of the identifier module template – docs/rules/core.md sections 2, 4, 5 and 6:
// create(settings), streams, variants. The context, the public validate and the options typing
// (amendments A1, A2) are specified in core.context.test.ts and core.options.test.ts.
// The core has no real identifiers yet, so two dummy identifiers are defined here. Their generators,
// edge and invalid variants consume exactly one uint32() (or none), so every expected value can be
// computed independently from the reference stream seeded with streamSeed(seed, id); the random variant
// choice uses the frozen pick algorithm, which tests/support/reference.ts reproduces.
import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { defineIdentifier } from '../src/core/identifier.js';
import type { Random } from '../src/core/random.js';
import type { IdentifierContext, NoOptions, ValidationResult } from '../src/core/types.js';
import { IMPOSSIBLE_DATES, MALFORMED_DATES, calendarDateArb, draw, seedArb } from './support/helpers.js';
import {
  createReferenceRandom,
  pad10,
  referenceStreamSeed,
  referenceUint32s,
} from './support/reference.js';
import type { ReferenceRandom } from './support/reference.js';

const PROPERTY_RUNS = 500;

/** The reference date of every generator in this file; the dummies here do not depend on it. */
const REFERENCE_DATE = '2026-10-05';

type Generate<Options> = (random: Random, options: Options, context: IdentifierContext) => string;

// --- Dummy identifier "dummyCode": a prefix letter D or E followed by 10 digits. ---------------------

type DummyEdgeVariant = 'smallest' | 'largest' | 'prefixE';
type DummyInvalidVariant = 'missingPrefix' | 'wrongLength' | 'letters';

interface DummyOptions {
  readonly prefix?: 'D' | 'E';
}

/** Every invalid variant name is also a reason code (docs/rules/core.md section 4). */
function validateDummyCode(value: string): ValidationResult<DummyInvalidVariant> {
  if (!value.startsWith('D') && !value.startsWith('E')) {
    return { valid: false, reason: 'missingPrefix' };
  }
  if (value.length !== 11) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!/^[DE][0-9]{10}$/.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  return { valid: true };
}

/** The dummy variants only draw uint32(), so they run on the core stream and on the reference alike. */
interface Uint32Source {
  uint32(): number;
}

/** `options` is always an object: `{}` when the caller passes none (section 5). */
function generateDummyCode(random: Uint32Source, options: DummyOptions): string {
  return `${options.prefix ?? 'D'}${pad10(random.uint32())}`;
}

const dummyEdge: Record<DummyEdgeVariant, (random: Uint32Source) => string> = {
  smallest: () => 'D0000000000',
  largest: () => 'D4294967295',
  prefixE: (random) => `E${pad10(random.uint32())}`,
};

const dummyInvalid: Record<DummyInvalidVariant, (random: Uint32Source) => string> = {
  missingPrefix: (random) => pad10(random.uint32()),
  wrongLength: (random) => `D${pad10(random.uint32())}0`,
  letters: (random) => `D${pad10(random.uint32()).slice(0, 9)}X`,
};

// Key order of the objects above; the variant lists "come from the keys" (section 5).
const EDGE_NAMES: readonly DummyEdgeVariant[] = ['smallest', 'largest', 'prefixE'];
const INVALID_NAMES: readonly DummyInvalidVariant[] = ['missingPrefix', 'wrongLength', 'letters'];

const dummyCode = defineIdentifier({
  id: 'dummyCode',
  generate: generateDummyCode,
  validate: validateDummyCode,
  edge: dummyEdge,
  invalid: dummyInvalid,
});

type DummyGenerator = ReturnType<typeof dummyCode.create>;

/** A dummyCode generator for `seed`, created through the resolved settings like createCz does. */
function createDummyCode(seed: number): DummyGenerator {
  return dummyCode.create({ seed, referenceDate: REFERENCE_DATE });
}

// --- Dummy identifier "otherCode": a plain uint32 in decimal. ----------------------------------------

const generateOtherCode: Generate<NoOptions> = (random) => String(random.uint32());

const otherCode = defineIdentifier({
  id: 'otherCode',
  generate: generateOtherCode,
  validate: (value: string): ValidationResult<'empty'> =>
    value === '' ? { valid: false, reason: 'empty' } : { valid: true },
  edge: { zero: (): string => '0' },
  invalid: { empty: (): string => '' },
});

function createOtherCode(seed: number): ReturnType<typeof otherCode.create> {
  return otherCode.create({ seed, referenceDate: REFERENCE_DATE });
}

// --- Helpers ---------------------------------------------------------------------------------------

/** The first `count` values of dummyCode's generate() for `seed`, from the reference stream. */
function referenceDummyCodes(seed: number, count: number): string[] {
  return referenceUint32s(referenceStreamSeed(seed, 'dummyCode'), count).map((value) => `D${pad10(value)}`);
}

type Step = 'generate' | 'randomEdge' | 'randomInvalid';
const stepArb = fc.constantFrom<Step>('generate', 'randomEdge', 'randomInvalid');

function runStep(generator: DummyGenerator, step: Step): string {
  if (step === 'randomEdge') {
    return generator.edge();
  }
  if (step === 'randomInvalid') {
    return generator.invalid();
  }
  return generator();
}

/** What the contract says a step does: pick(variantList) from the identifier's stream, then call it. */
function replayStep(random: ReferenceRandom, step: Step): string {
  if (step === 'randomEdge') {
    return dummyEdge[random.pick(EDGE_NAMES)](random);
  }
  if (step === 'randomInvalid') {
    return dummyInvalid[random.pick(INVALID_NAMES)](random);
  }
  return generateDummyCode(random, {});
}

// --- Specification ---------------------------------------------------------------------------------

describe('defineIdentifier – variant lists', () => {
  it('lists the edge variants from the keys of `edge`, in definition order', () => {
    expect(createDummyCode(42).edgeVariants).toEqual(['smallest', 'largest', 'prefixE']);
  });

  it('lists the invalid variants from the keys of `invalid`, in definition order', () => {
    expect(createDummyCode(42).invalidVariants).toEqual(['missingPrefix', 'wrongLength', 'letters']);
  });

  it('lists the same variants for every seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDummyCode(seed);
        expect(generator.edgeVariants).toEqual(EDGE_NAMES);
        expect(generator.invalidVariants).toEqual(INVALID_NAMES);
      }),
      { numRuns: 50 },
    );
  });

  it('freezes both variant lists', () => {
    const generator = createDummyCode(42);
    expect(Object.isFrozen(generator.edgeVariants)).toBe(true);
    expect(Object.isFrozen(generator.invalidVariants)).toBe(true);
  });

  it('types the variant lists as readonly lists of the variant names', () => {
    const generator = createDummyCode(42);
    expectTypeOf(generator.edgeVariants).toExtend<readonly DummyEdgeVariant[]>();
    expectTypeOf(generator.edgeVariants).not.toExtend<unknown[]>();
    expectTypeOf<(typeof generator.edgeVariants)[number]>().toEqualTypeOf<DummyEdgeVariant>();
    expectTypeOf(generator.invalidVariants).toExtend<readonly DummyInvalidVariant[]>();
    expectTypeOf(generator.invalidVariants).not.toExtend<unknown[]>();
    expectTypeOf<(typeof generator.invalidVariants)[number]>().toEqualTypeOf<DummyInvalidVariant>();
  });
});

describe('defineIdentifier – generator', () => {
  // Determinism snapshot: reference SplitMix32 seeded with streamSeed(seed, 'dummyCode'),
  // where fnv1a32('dummyCode') = 3753732162.
  it.each([
    { seed: 0, expected: ['D2902614109', 'D1330945042', 'D1933560818'] },
    { seed: 42, expected: ['D1865729689', 'D1197986093', 'D2480414034'] },
  ])('produces the pinned first values for seed $seed', ({ seed, expected }) => {
    const generator = createDummyCode(seed);
    expect(draw(3, () => generator())).toEqual(expected);
  });

  it("draws from the identifier's own stream seeded with streamSeed(seed, id)", () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const generator = createDummyCode(seed);
        expect(draw(6, () => generator())).toEqual(referenceDummyCodes(seed, 6));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('passes the options to generate', () => {
    const generator = createDummyCode(42);
    expect(generator({ prefix: 'E' })).toBe('E1865729689');
    expect(generator({})).toBe('D1197986093');
  });

  it('does not expose validate on the generator', () => {
    const generator = createDummyCode(42);
    expect(generator).not.toHaveProperty('validate');
    expect(Object.hasOwn(generator, 'validate')).toBe(false);
    expectTypeOf(generator).not.toHaveProperty('validate');
  });

  it('returns plain strings that pass the validator', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const value = createDummyCode(seed)();
        expect(typeof value).toBe('string');
        expect(validateDummyCode(value)).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('produces different values for different seeds', () => {
    fc.assert(
      fc.property(seedArb, seedArb, (a, b) => {
        fc.pre(a !== b);
        expect(createDummyCode(a)()).not.toBe(createDummyCode(b)());
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives every generator created from the factory its own stream', () => {
    const advanced = createDummyCode(42);
    const untouched = createDummyCode(42);
    draw(10, () => advanced());
    advanced.edge();
    advanced.invalid();
    expect(untouched()).toBe('D1865729689');
  });

  it('gives the same values for the same seed whatever the reference date (the dummies do not use it)', () => {
    fc.assert(
      fc.property(seedArb, calendarDateArb, calendarDateArb, (seed, a, b) => {
        const onA = dummyCode.create({ seed, referenceDate: a });
        const onB = dummyCode.create({ seed, referenceDate: b });
        expect([onA(), onA.edge(), onA.invalid(), onA()]).toEqual([onB(), onB.edge(), onB.invalid(), onB()]);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('defineIdentifier – create(settings)', () => {
  it('exposes the seed and reference date it was created with', () => {
    fc.assert(
      fc.property(seedArb, calendarDateArb, (seed, referenceDate) => {
        const generator = dummyCode.create({ seed, referenceDate });
        expect(generator.seed).toBe(seed);
        expect(generator.referenceDate).toBe(referenceDate);
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('types .seed as number and .referenceDate as string', () => {
    const generator = createDummyCode(42);
    expectTypeOf(generator.seed).toEqualTypeOf<number>();
    expectTypeOf(generator.referenceDate).toEqualTypeOf<string>();
  });

  it.each([
    { name: 'a negative seed', seed: -1 },
    { name: 'a fractional seed', seed: 1.5 },
    { name: 'NaN', seed: Number.NaN },
    { name: '2^32', seed: 2 ** 32 },
  ])('throws RangeError naming the seed for $name', ({ seed }) => {
    expect(() => dummyCode.create({ seed, referenceDate: REFERENCE_DATE })).toThrow(RangeError);
    expect(() => dummyCode.create({ seed, referenceDate: REFERENCE_DATE })).toThrow(/seed/);
  });

  it.each(MALFORMED_DATES)('throws RangeError naming referenceDate for the malformed date %j', (referenceDate) => {
    expect(() => dummyCode.create({ seed: 42, referenceDate })).toThrow(RangeError);
    expect(() => dummyCode.create({ seed: 42, referenceDate })).toThrow(/referenceDate/);
  });

  it.each(IMPOSSIBLE_DATES)('throws RangeError naming referenceDate for the impossible date $date ($why)', ({ date }) => {
    expect(() => dummyCode.create({ seed: 42, referenceDate: date })).toThrow(RangeError);
    expect(() => dummyCode.create({ seed: 42, referenceDate: date })).toThrow(/referenceDate/);
  });

  it('types the generator as returning string', () => {
    const generator = createDummyCode(42);
    expectTypeOf(generator).toBeCallableWith();
    expectTypeOf(generator).toBeCallableWith({ prefix: 'E' });
    expectTypeOf(generator).returns.toEqualTypeOf<string>();
    expectTypeOf(generator.edge()).toEqualTypeOf<string>();
    expectTypeOf(generator.invalid()).toEqualTypeOf<string>();
  });
});

describe('defineIdentifier – edge(name) and invalid(name)', () => {
  it('calls exactly the named variant with the identifier stream, in call order', () => {
    // Seed 42, stream outputs: 1865729689, 1197986093, 2480414034, 3601634478, 4256552064, 3452251651.
    // Variants with a fixed value ('smallest', 'largest') consume nothing from the stream.
    const generator = createDummyCode(42);
    expect([
      generator(),
      generator.edge('smallest'),
      generator.invalid('missingPrefix'),
      generator({ prefix: 'E' }),
      generator.edge('prefixE'),
      generator.invalid('wrongLength'),
      generator.invalid('letters'),
      generator.edge('largest'),
    ]).toEqual([
      'D1865729689',
      'D0000000000',
      '1197986093',
      'E2480414034',
      'E3601634478',
      'D42565520640',
      'D345225165X',
      'D4294967295',
    ]);
  });

  it.each(EDGE_NAMES)('edge(%s) passes the validator for every seed', (name) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(validateDummyCode(createDummyCode(seed).edge(name))).toEqual({ valid: true });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each(INVALID_NAMES)('invalid(%s) fails the validator with exactly that reason for every seed', (name) => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(validateDummyCode(createDummyCode(seed).invalid(name))).toEqual({ valid: false, reason: name });
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it.each(['noSuchVariant', '', 'toString', 'constructor', '__proto__', 'hasOwnProperty', 'missingPrefix'])(
    'edge(%j) throws RangeError naming the unknown variant',
    (name) => {
      const generator = createDummyCode(42);
      expect(() => generator.edge(name as never)).toThrow(RangeError);
      expect(() => generator.edge(name as never)).toThrow(name);
    },
  );

  it.each(['noSuchVariant', '', 'toString', 'constructor', '__proto__', 'hasOwnProperty', 'smallest'])(
    'invalid(%j) throws RangeError naming the unknown variant',
    (name) => {
      const generator = createDummyCode(42);
      expect(() => generator.invalid(name as never)).toThrow(RangeError);
      expect(() => generator.invalid(name as never)).toThrow(name);
    },
  );

  it('accepts only declared variant names at the type level', () => {
    const generator = createDummyCode(42);
    expectTypeOf(generator.edge('smallest')).toEqualTypeOf<string>();
    expectTypeOf(generator.invalid('letters')).toEqualTypeOf<string>();
    expectTypeOf<'noSuchVariant'>().not.toExtend<Parameters<typeof generator.edge>[0]>();
    expectTypeOf<'smallest'>().not.toExtend<Parameters<typeof generator.invalid>[0]>();
  });
});

describe('defineIdentifier – edge() and invalid() without an argument', () => {
  // Determinism snapshot: frozen pick over the definition-order variant lists, on the reference stream
  // streamSeed(seed, 'dummyCode'). Fixed-value variants ('smallest', 'largest') draw nothing after the pick.
  it.each([
    {
      seed: 0,
      edges: ['D4294967295', 'D4294967295', 'E4033303209', 'D0000000000'],
      invalids: ['0981131553', 'D27571472500', 'D37976389930', 'D38719562140'],
      next: 'D0047674032',
    },
    {
      seed: 42,
      edges: ['D4294967295', 'E2480414034', 'D0000000000', 'D0000000000'],
      invalids: ['D31144995550', '3089449473', '2089816205', '4292514774'],
      next: 'D0969505726',
    },
  ])('produces the pinned random edge and invalid values for seed $seed', ({ seed, edges, invalids, next }) => {
    const generator = createDummyCode(seed);
    expect(draw(4, () => generator.edge())).toEqual(edges);
    expect(draw(4, () => generator.invalid())).toEqual(invalids);
    expect(generator()).toBe(next);
  });

  it("picks the variant with pick(variantList) from the identifier's stream, then calls it", () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { maxLength: 30 }), (seed, steps) => {
        const generator = createDummyCode(seed);
        const replay = createReferenceRandom(referenceStreamSeed(seed, 'dummyCode'));
        for (const step of steps) {
          expect(runStep(generator, step)).toBe(replayStep(replay, step));
        }
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('chooses the same variants for the same seed', () => {
    fc.assert(
      fc.property(seedArb, fc.array(stepArb, { maxLength: 30 }), (seed, steps) => {
        const first = createDummyCode(seed);
        const second = createDummyCode(seed);
        expect(steps.map((step) => runStep(first, step))).toEqual(steps.map((step) => runStep(second, step)));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('eventually chooses every edge variant, and each result passes the validator', () => {
    const generator = createDummyCode(42);
    const values = draw(200, () => generator.edge());
    for (const value of values) {
      expect(validateDummyCode(value)).toEqual({ valid: true });
    }
    expect(values).toContain('D0000000000');
    expect(values).toContain('D4294967295');
    expect(values.some((value) => value.startsWith('E'))).toBe(true);
  });

  it('eventually chooses every invalid variant, and each result fails with one of their reasons', () => {
    const generator = createDummyCode(42);
    const reasons = new Set(
      draw(200, () => {
        const result = validateDummyCode(generator.invalid());
        expect(result.valid).toBe(false);
        return result.valid ? undefined : result.reason;
      }),
    );
    expect([...reasons].sort()).toEqual([...INVALID_NAMES].sort());
  });
});

describe('defineIdentifier – independent streams per identifier', () => {
  // Reference SplitMix32 seeded with streamSeed(seed, 'otherCode'), fnv1a32('otherCode') = 3352280324.
  it.each([
    { seed: 0, expected: ['1884211652', '2806086945', '38363979'] },
    { seed: 42, expected: ['4281008545', '2664181147', '3041983364'] },
  ])('gives a second identifier its own pinned values for seed $seed', ({ seed, expected }) => {
    const other = createOtherCode(seed);
    expect(draw(3, () => other())).toEqual(expected);
  });

  it('leaves one identifier unchanged no matter how often another one from the same seed is called', () => {
    const callCounts = fc.array(fc.nat({ max: 5 }), { minLength: 6, maxLength: 6 });
    fc.assert(
      fc.property(seedArb, callCounts, (seed, counts) => {
        const dummy = createDummyCode(seed);
        const other = createOtherCode(seed);
        const values = counts.map((count) => {
          for (let i = 0; i < count; i += 1) {
            other();
            other.edge();
            other.invalid();
          }
          return dummy();
        });
        expect(values).toEqual(referenceDummyCodes(seed, 6));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('keeps both identifiers on their own reference streams when their calls interleave', () => {
    fc.assert(
      fc.property(seedArb, fc.array(fc.boolean(), { maxLength: 30 }), (seed, schedule) => {
        const dummy = createDummyCode(seed);
        const other = createOtherCode(seed);
        const dummyValues: string[] = [];
        const otherValues: string[] = [];
        for (const callDummy of schedule) {
          if (callDummy) {
            dummyValues.push(dummy());
          } else {
            otherValues.push(other());
          }
        }
        expect(dummyValues).toEqual(referenceDummyCodes(seed, dummyValues.length));
        const otherStream = referenceUint32s(referenceStreamSeed(seed, 'otherCode'), otherValues.length);
        expect(otherValues).toEqual(otherStream.map(String));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('ValidationResult', () => {
  it('is either { valid: true } or { valid: false, reason } with a reason from the union', () => {
    expectTypeOf<{ valid: true }>().toExtend<ValidationResult<'badChecksum'>>();
    expectTypeOf<{ valid: false; reason: 'badChecksum' }>().toExtend<ValidationResult<'badChecksum'>>();
    expectTypeOf<{ valid: false; reason: 'letters' }>().not.toExtend<ValidationResult<'badChecksum'>>();
    expectTypeOf<{ valid: false }>().not.toExtend<ValidationResult<'badChecksum'>>();
  });

  it('narrows to the reason union when valid is false', () => {
    function reasonOf(result: ValidationResult<'badChecksum' | 'wrongLength'>): string | undefined {
      if (result.valid) {
        return undefined;
      }
      expectTypeOf(result.reason).toEqualTypeOf<'badChecksum' | 'wrongLength'>();
      return result.reason;
    }
    expect(reasonOf({ valid: false, reason: 'wrongLength' })).toBe('wrongLength');
    expect(reasonOf({ valid: true })).toBeUndefined();
  });
});
