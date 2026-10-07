// Contract checks shared by every identifier's public API and determinism tests (docs/rules/core.md
// sections 2, 3 and 5). Each identifier calls these once and keeps only what is specific to it
// (types, options, reason codes, seed snapshots) in its own file.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineIdentifier } from '../../src/core/identifier.js';
import type { Random } from '../../src/core/random.js';
import type { NoOptions, SettingsOptions, ValidationResult } from '../../src/core/types.js';
import { createCz } from '../../src/index.js';
import type { Cz } from '../../src/index.js';
import { expectSameOutputForLaterReferenceDates } from './determinism.js';
import type { ReferenceDateCheck } from './determinism.js';
import { draw, restoreClock, seedArb, setClock } from './helpers.js';

const PROPERTY_RUNS = 200;

/** The part of an identifier generator the contract drives. */
export interface ContractGenerator<EdgeVariant extends string, InvalidVariant extends string> {
  (): string;
  readonly seed: number;
  readonly referenceDate: string;
  readonly edge: (variant?: EdgeVariant) => string;
  readonly invalid: (variant?: InvalidVariant) => string;
  readonly edgeVariants: readonly EdgeVariant[];
  readonly invalidVariants: readonly InvalidVariant[];
}

/** How the shared API checks drive one identifier. */
export interface ApiContract<
  Generator extends ContractGenerator<EdgeVariant, InvalidVariant>,
  EdgeVariant extends string,
  InvalidVariant extends string,
> {
  /** Standalone `create<Id>`. */
  readonly create: (settings?: SettingsOptions) => Generator;
  /** The identifier's generator on a `cz` instance. */
  readonly onCz: (cz: Cz) => Generator;
  /** The identifier's validator on a `cz` instance. */
  readonly validateOnCz: (cz: Cz, value: string) => unknown;
  /** Standalone validator called the way `cz.validate` is (with the instance's reference date). */
  readonly validate: (value: string, referenceDate: string) => unknown;
  /** Key of the identifier on `cz`. */
  readonly id: string;
  readonly referenceDate: string;
  readonly edgeVariants: readonly EdgeVariant[];
  readonly invalidVariants: readonly InvalidVariant[];
  /** A valid value, used to exercise the validator on a busy instance. */
  readonly validSample: string;
  /** Arbitrary input strings for the `cz.validate` equivalence property. */
  readonly validateInput: fc.Arbitrary<string>;
  /** Fixed `cz.validate` cases (value, expected result). */
  readonly validateCases: readonly (readonly [string, unknown])[];
  /** Calls with identifier-specific options, added to the random call sequences. */
  readonly extraSteps?: fc.Arbitrary<(generator: Generator) => string>;
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

/** Every other identifier generator on `cz`: plain, edge and invalid calls. */
function otherIdentifierCalls(cz: Cz, id: string): (() => string)[] {
  const calls: (() => string)[] = [];
  for (const [key, value] of Object.entries(cz as unknown as Record<string, unknown>)) {
    if (key !== id && typeof value === 'function' && 'edge' in value && 'invalid' in value) {
      const generator = value as unknown as () => string;
      const { edge, invalid } = value as { edge: () => string; invalid: () => string };
      calls.push(generator, edge, invalid);
    }
  }
  return calls;
}

/** Registers the settings and cz checks of docs/rules/core.md sections 2, 3 and 5 for one identifier. */
export function describeApiContract<
  Generator extends ContractGenerator<EdgeVariant, InvalidVariant>,
  EdgeVariant extends string,
  InvalidVariant extends string,
>(contract: ApiContract<Generator, EdgeVariant, InvalidVariant>): void {
  const { create, onCz, id, referenceDate: REFERENCE_DATE } = contract;
  const sorted = (names: readonly string[]): string[] => [...names].sort();

  const stepArb: fc.Arbitrary<(generator: Generator) => string> = fc.oneof(
    fc.constant((generator: Generator) => generator()),
    fc
      .option(fc.constantFrom(...contract.edgeVariants), { nil: undefined })
      .map((variant) => (generator: Generator) => generator.edge(variant)),
    fc
      .option(fc.constantFrom(...contract.invalidVariants), { nil: undefined })
      .map((variant) => (generator: Generator) => generator.invalid(variant)),
    ...(contract.extraSteps ? [contract.extraSteps] : []),
  );

  afterEach(() => {
    restoreClock();
  });

  describe(`create settings of ${id} (docs/rules/core.md section 3)`, () => {
    it('echoes the resolved seed and referenceDate and lists the variants', () => {
      const generator = create({ seed: 42, referenceDate: REFERENCE_DATE });
      expect(generator.seed).toBe(42);
      expect(generator.referenceDate).toBe(REFERENCE_DATE);
      expect(sorted(generator.edgeVariants)).toEqual(sorted(contract.edgeVariants));
      expect(sorted(generator.invalidVariants)).toEqual(sorted(contract.invalidVariants));
    });

    it('defaults referenceDate to the current UTC date and the seed to one that reproduces the values', () => {
      setClock('2026-10-04T23:30:00Z', 'Europe/Prague');
      const generator = create();
      expect(generator.referenceDate).toBe('2026-10-04');
      expect(Number.isInteger(generator.seed)).toBe(true);
      const first = draw(3, () => generator());
      const again = create({ seed: generator.seed, referenceDate: generator.referenceDate });
      expect(draw(3, () => again())).toEqual(first);
    });

    it.each([-1, 1.5, Number.NaN, 2 ** 32])('throws RangeError naming seed for the seed %d', (seed) => {
      expect(() => create({ seed })).toThrow(RangeError);
      expect(() => create({ seed })).toThrow(/seed/);
    });

    it.each(['2026-02-30', '2026-10-5', ''])('throws RangeError naming referenceDate for %j', (referenceDate) => {
      expect(() => create({ seed: 42, referenceDate })).toThrow(RangeError);
      expect(() => create({ seed: 42, referenceDate })).toThrow(/referenceDate/);
    });

    it('throws RangeError naming the variant for an unknown edge or invalid variant', () => {
      const generator = create({ seed: 1 });
      expect(() => generator.edge('nope' as EdgeVariant)).toThrow(RangeError);
      expect(() => generator.edge('nope' as EdgeVariant)).toThrow(/nope/);
      expect(() => generator.invalid('nope' as InvalidVariant)).toThrow(RangeError);
      expect(() => generator.invalid('nope' as InvalidVariant)).toThrow(/nope/);
    });
  });

  describe(`cz.${id} (docs/rules/core.md sections 2 and 3)`, () => {
    it('echoes the seed, referenceDate and variants of cz', () => {
      const generator = onCz(createCz({ seed: 42, referenceDate: REFERENCE_DATE }));
      expect(generator.seed).toBe(42);
      expect(generator.referenceDate).toBe(REFERENCE_DATE);
      expect(sorted(generator.edgeVariants)).toEqual(sorted(contract.edgeVariants));
      expect(sorted(generator.invalidVariants)).toEqual(sorted(contract.invalidVariants));
    });

    it('gives the same values as the standalone create for the same settings and the same calls', () => {
      fc.assert(
        fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 15 }), (seed, steps) => {
          const cz = createCz({ seed, referenceDate: REFERENCE_DATE });
          const standalone = create({ seed, referenceDate: REFERENCE_DATE });
          expect(steps.map((step) => step(onCz(cz)))).toEqual(steps.map((step) => step(standalone)));
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('is not affected by calls of other identifiers, validators or other cz instances', () => {
      fc.assert(
        fc.property(seedArb, fc.array(stepArb, { minLength: 1, maxLength: 10 }), (seed, steps) => {
          const settings = { seed, referenceDate: REFERENCE_DATE };
          const quiet = createCz(settings);
          const busy = createCz(settings);
          const twin = createCz(settings);
          const other = otherIdentifier.create({ seed: busy.seed, referenceDate: busy.referenceDate });
          const expected = steps.map((step) => step(onCz(quiet)));
          const actual = steps.map((step) => {
            for (const call of otherIdentifierCalls(busy, id)) {
              call();
            }
            other();
            other.edge();
            contract.validateOnCz(busy, contract.validSample);
            step(onCz(twin));
            return step(onCz(busy));
          });
          expect(actual).toEqual(expected);
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('cz.validate equals the standalone validator for any value', () => {
      const cz = createCz({ seed: 42, referenceDate: REFERENCE_DATE });
      fc.assert(
        fc.property(contract.validateInput, (value) => {
          expect(contract.validateOnCz(cz, value)).toEqual(contract.validate(value, REFERENCE_DATE));
        }),
        { numRuns: PROPERTY_RUNS },
      );
      for (const [value, expected] of contract.validateCases) {
        expect(contract.validateOnCz(cz, value)).toEqual(expected);
      }
    });
  });
}

/** How the shared determinism checks drive one identifier. */
export interface DeterminismContract<
  Generator extends ContractGenerator<EdgeVariant, InvalidVariant>,
  EdgeVariant extends string,
  InvalidVariant extends string,
  Options extends object,
> {
  readonly create: (settings?: SettingsOptions) => Generator;
  /** The fixed call sequence of the identifier (its seed snapshots record the same). */
  readonly firstOutputs: (seed: number, referenceDate?: string) => Record<string, readonly string[]>;
  readonly snapshotReferenceDate: string;
  /** Reference dates for the repeat property; omit to repeat with the snapshot date only. */
  readonly repeatDates?: fc.Arbitrary<string>;
  /** Of 100 consecutive seeds, at least this many first values must differ (exclusive). */
  readonly minDistinctFirstValues: number;
  /** The A3 check and its description. */
  readonly a3Title: string;
  readonly a3: ReferenceDateCheck<Options, EdgeVariant, InvalidVariant>;
}

/** Registers the determinism checks of docs/rules/core.md section 2 and amendment A3 for one identifier. */
export function describeDeterminismContract<
  Generator extends ContractGenerator<EdgeVariant, InvalidVariant>,
  EdgeVariant extends string,
  InvalidVariant extends string,
  Options extends object,
>(contract: DeterminismContract<Generator, EdgeVariant, InvalidVariant, Options>): void {
  const { firstOutputs, snapshotReferenceDate } = contract;

  afterEach(() => {
    restoreClock();
    vi.restoreAllMocks();
  });

  describe('same seed + same calls = same output (docs/rules/core.md section 2)', () => {
    it('repeats the whole call sequence for every seed', () => {
      fc.assert(
        fc.property(seedArb, contract.repeatDates ?? fc.constant(snapshotReferenceDate), (seed, referenceDate) => {
          expect(firstOutputs(seed, referenceDate)).toEqual(firstOutputs(seed, referenceDate));
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('gives different values for different seeds', () => {
      const firstValues = new Set(
        Array.from({ length: 100 }, (_, seed) => contract.create({ seed, referenceDate: snapshotReferenceDate })()),
      );
      expect(firstValues.size).toBeGreaterThan(contract.minDistinctFirstValues);
    });

    it('does not read the clock when referenceDate is given', () => {
      setClock('2026-10-05T12:00:00Z', 'Europe/Prague');
      const before = firstOutputs(42);
      setClock('2045-03-01T23:59:59Z', 'America/Los_Angeles');
      expect(firstOutputs(42)).toEqual(before);
    });

    it('never uses Math.random', () => {
      const mathRandom = vi.spyOn(Math, 'random');
      firstOutputs(42);
      firstOutputs(7, '2010-01-01');
      expect(mathRandom).not.toHaveBeenCalled();
    });
  });

  describe(contract.a3Title, () => {
    it('gives the same plain values, edge values and date-independent invalid values for any two later referenceDates', () => {
      expectSameOutputForLaterReferenceDates(contract.a3);
    });
  });
}
