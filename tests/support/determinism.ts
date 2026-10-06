// Shared determinism check of amendment A3 (docs/rules/core.md section 3), required for every identifier:
// the same seed with two different reference dates after the identifier's fixed date ranges gives the same
// plain values, edge values and date-independent invalid values.
import fc from 'fast-check';
import { expect } from 'vitest';
import type { IdentifierGenerator, Settings, SettingsOptions } from '../../src/core/types.js';
import { draw, seedArb } from './helpers.js';

/** How the shared check drives one identifier. */
export interface ReferenceDateCheck<Options extends object, EdgeVariant extends string, InvalidVariant extends string> {
  /** The standalone `create<Id>` of the identifier (or anything taking the same settings). */
  readonly create: (settings: SettingsOptions) => IdentifierGenerator<Options, EdgeVariant, InvalidVariant>;
  /** One plain (valid) value, e.g. `(generator) => generator()`; identifiers with required options pass them here. */
  readonly plain: (generator: IdentifierGenerator<Options, EdgeVariant, InvalidVariant>) => string;
  /** Reference dates after the end of every fixed date range of the identifier's rules. */
  readonly laterReferenceDates: fc.Arbitrary<string>;
  /** Two fixed reference dates after the fixed ranges, checked on top of the random ones. */
  readonly fixedPair: readonly [string, string];
  /** Invalid variants whose output may depend on the reference date (e.g. `futureDate`); never called. */
  readonly dateDependentInvalidVariants: readonly InvalidVariant[];
  readonly numRuns?: number;
}

/**
 * Runs one fixed call sequence and records every value: plain values, each edge variant by name, random
 * edge variants, each date-independent invalid variant by name, then plain values again (so a variant
 * that consumed a date-dependent number of draws would show up in the stream position).
 */
function recordCallSequence<Options extends object, EdgeVariant extends string, InvalidVariant extends string>(
  check: ReferenceDateCheck<Options, EdgeVariant, InvalidVariant>,
  settings: Settings,
): string[] {
  const generator = check.create(settings);
  const values = draw(5, () => check.plain(generator));
  for (const variant of generator.edgeVariants) {
    values.push(...draw(2, () => generator.edge(variant)));
  }
  values.push(...draw(5, () => generator.edge()));
  for (const variant of generator.invalidVariants) {
    if (!check.dateDependentInvalidVariants.includes(variant)) {
      values.push(...draw(2, () => generator.invalid(variant)));
    }
  }
  values.push(...draw(5, () => check.plain(generator)));
  return values;
}

/**
 * Asserts the A3 determinism contract: for every seed, two reference dates after the fixed date ranges give
 * the same plain values, edge values and date-independent invalid values.
 */
export function expectSameOutputForLaterReferenceDates<
  Options extends object,
  EdgeVariant extends string,
  InvalidVariant extends string,
>(check: ReferenceDateCheck<Options, EdgeVariant, InvalidVariant>): void {
  const [first, second] = check.fixedPair;
  for (const seed of [0, 1, 42, 4294967295]) {
    expect(recordCallSequence(check, { seed, referenceDate: first })).toEqual(
      recordCallSequence(check, { seed, referenceDate: second }),
    );
  }
  fc.assert(
    fc.property(seedArb, check.laterReferenceDates, check.laterReferenceDates, (seed, a, b) => {
      expect(recordCallSequence(check, { seed, referenceDate: a })).toEqual(
        recordCallSequence(check, { seed, referenceDate: b }),
      );
    }),
    { numRuns: check.numRuns ?? 200 },
  );
}
