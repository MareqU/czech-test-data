// Determinism of postalCode (PSČ) – docs/rules/core.md section 2 (same seed + same calls = same output;
// snapshot seeds 0, 1, 42, 4294967295) and amendment A3; docs/rules/postalCode.md section 9 (no date
// dependence). The snapshot values cannot be derived from the rules (they depend on how many draws the
// generator spends), so they are filled by the main session after the implementation passes. vitest.config.ts
// sets `update: 'none'`, so values are recorded only with -u.
import { describe, expect, it } from 'vitest';
import { createPostalCode } from '../src/postalCode/index.js';
import type { PostalCodeEdgeVariant, PostalCodeInvalidVariant } from '../src/postalCode/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly PostalCodeEdgeVariant[] = ['withoutSpace', 'nonGeographic'];
const INVALID_VARIANTS: readonly PostalCodeInvalidVariant[] = ['wrongLength', 'letters', 'badFormat', 'foreignRange'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createPostalCode({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

describeDeterminismContract({
  create: createPostalCode,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createPostalCode,
    plain: (generator) => generator(),
    laterReferenceDates: dateArb('1900-01-01', '2099-12-31'),
    fixedPair: ['1900-01-01', '2099-12-31'],
    dateDependentInvalidVariants: [],
  },
});

describe('seed snapshots (referenceDate 2026-10-05) – filled by the main session after the implementation passes', () => {
  it('pins the first outputs for seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpace: 73175",
          "nonGeographic: 206 68",
        ],
        "invalid": [
          "wrongLength: 323 2",
          "letters: 208 B8",
          "badFormat: 2 7320",
          "foreignRange: 939 66",
        ],
        "plain": [
          "261 26",
          "142 87",
          "534 17",
          "429 90",
          "202 04",
        ],
        "plainAgain": [
          "144 77",
          "695 29",
        ],
        "randomEdge": [
          "226 84",
          "217 51",
          "205 21",
        ],
        "randomInvalid": [
          "480 9R",
          "D74 08",
          "41U 96",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpace: 16698",
          "nonGeographic: 218 98",
        ],
        "invalid": [
          "wrongLength: 7245",
          "letters: 174 0C",
          "badFormat: 600  61",
          "foreignRange: 046 29",
        ],
        "plain": [
          "365 80",
          "150 02",
          "619 34",
          "374 46",
          "724 45",
        ],
        "plainAgain": [
          "113 34",
          "346 64",
        ],
        "randomEdge": [
          "213 16",
          "64574",
          "67177",
        ],
        "randomInvalid": [
          "37506 ",
          "3555",
          "902 95",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpace: 58867",
          "nonGeographic: 208 16",
        ],
        "invalid": [
          "wrongLength: 7243",
          "letters: 20S 24",
          "badFormat: 686-39",
          "foreignRange: 957 09",
        ],
        "plain": [
          "514 24",
          "433 25",
          "128 64",
          "391 09",
          "296 92",
        ],
        "plainAgain": [
          "581 24",
          "405 86",
        ],
        "randomEdge": [
          "63615",
          "77276",
          "38143",
        ],
        "randomInvalid": [
          "57V 39",
          "367913",
          "378 1",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withoutSpace: 68439",
          "nonGeographic: 207 95",
        ],
        "invalid": [
          "wrongLength: 657 7",
          "letters: B33 22",
          "badFormat: 561  30",
          "foreignRange: 931 75",
        ],
        "plain": [
          "600 38",
          "414 09",
          "799 46",
          "116 23",
          "595 06",
        ],
        "plainAgain": [
          "435 41",
          "684 03",
        ],
        "randomEdge": [
          "217 49",
          "36930",
          "212 84",
        ],
        "randomInvalid": [
          "852 36",
          "38A 76",
          "933 87",
        ],
      }
    `);
  });
});
