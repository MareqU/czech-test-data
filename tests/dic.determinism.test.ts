// Determinism of dic (DIČ) – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot seeds
// 0, 1, 42, 4294967295) and amendment A3; docs/rules/dic.md sections 4 and 8 (dic stream, birth-number paths
// use birthNumber's fixed date ranges cut by referenceDate; no invalid variant depends on the date).
// The snapshot values cannot be derived from the rules (they depend on how many draws the inner generators
// spend), so they are filled by the main session after the implementation passes. vitest.config.ts sets
// `update: 'none'`, so values are recorded only with -u.
import { describe, expect, it } from 'vitest';
import { createDic } from '../src/dic/index.js';
import type { DicEdgeVariant, DicInvalidVariant } from '../src/dic/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-07';

/** Variant order of section 8 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly DicEdgeVariant[] = ['fromIco', 'fromBirthNumber', 'lowercasePrefix', 'pre1954', 'vatGroup'];
const INVALID_VARIANTS: readonly DicInvalidVariant[] = ['missingPrefix', 'foreignPrefix', 'badInnerChecksum'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createDic({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    options: [
      generator({ from: 'ico' }),
      generator({ gender: 'female' }),
      generator({ gender: 'male', birthDate: '1990-05-01' }),
      generator({ birthDate: '1950-07-15' }),
    ],
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

describeDeterminismContract({
  create: createDic,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  repeatDates: dateArb('1954-01-01', '2099-12-31'),
  minDistinctFirstValues: 95,
  a3Title: 'shared A3 check: referenceDates after the fixed ranges do not change the output',
  a3: {
    create: createDic,
    plain: (generator) => generator(),
    // After 2025-12-31, the end of every fixed range of the inner birth-number paths.
    laterReferenceDates: dateArb('2026-01-01', '2099-12-31'),
    fixedPair: ['2026-01-01', '2099-12-31'],
    dateDependentInvalidVariants: [],
  },
});

describe('seed snapshots (referenceDate 2026-10-07) – filled by the main session after the implementation passes', () => {
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
