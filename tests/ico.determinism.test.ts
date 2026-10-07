// Determinism of ico (IČO) – docs/rules/core.md section 2 (same seed + same calls = same output;
// snapshot seeds 0, 1, 42, 4294967295) and amendment A3; docs/rules/ico.md section 8 (no date
// dependence). The snapshot values cannot be derived from the rules (they depend on how many draws the
// generator spends), so they are filled by the main session after the implementation passes. vitest.config.ts
// sets `update: 'none'`, so values are recorded only with -u.
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIco } from '../src/ico/index.js';
import type { IcoEdgeVariant, IcoInvalidVariant } from '../src/ico/index.js';
import { expectSameOutputForLaterReferenceDates } from './support/determinism.js';
import { dateArb, draw, restoreClock, seedArb, setClock } from './support/helpers.js';

const PROPERTY_RUNS = 200;
const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly IcoEdgeVariant[] = ['leadingZeros', 'checkDigitZero', 'checkDigitOne'];
const INVALID_VARIANTS: readonly IcoInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createIco({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

afterEach(() => {
  restoreClock();
  vi.restoreAllMocks();
});

describe('same seed + same calls = same output (docs/rules/core.md section 2)', () => {
  it('repeats the whole call sequence for every seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        expect(firstOutputs(seed)).toEqual(firstOutputs(seed));
      }),
      { numRuns: PROPERTY_RUNS },
    );
  });

  it('gives different values for different seeds', () => {
    const firstValues = new Set(Array.from({ length: 100 }, (_, seed) => createIco({ seed })()));
    expect(firstValues.size).toBeGreaterThan(90);
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

describe('shared A3 check: the referenceDate never changes the output (no date dependence, section 8)', () => {
  it('gives identical plain, edge and invalid values for any two referenceDates', () => {
    expectSameOutputForLaterReferenceDates({
      create: createIco,
      plain: (generator) => generator(),
      laterReferenceDates: dateArb('1900-01-01', '2099-12-31'),
      fixedPair: ['1900-01-01', '2099-12-31'],
      dateDependentInvalidVariants: [],
    });
  });
});

describe('seed snapshots (referenceDate 2026-10-05) – filled by the main session after the implementation passes', () => {
  it('pins the first outputs for seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot();
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot();
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot();
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot();
  });
});
