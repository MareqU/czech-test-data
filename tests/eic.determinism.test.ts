// Determinism of eic – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot seeds 0,
// 1, 42, 4294967295) and amendment A3; docs/rules/eic.md section 9 (no date dependence, draw order). The snapshot
// values cannot be derived from the rules (they depend on the draw order), so they are filled by the main session
// after the implementation passes.
import { describe, expect, it } from 'vitest';
import { createEic } from '../src/eic/index.js';
import type { EicEdgeVariant, EicInvalidVariant } from '../src/eic/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly EicEdgeVariant[] = ['checkCharacterDigit', 'lds'];
const INVALID_VARIANTS: readonly EicInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'wrongPrefix',
  'dashCheckCharacter',
];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createEic({ seed, referenceDate });
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
  create: createEic,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createEic,
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
          "checkCharacterDigit: 27ZG900Z45193422",
          "lds: 27ZG232Z6722717F",
        ],
        "invalid": [
          "badChecksum: 27ZG100Z59344043",
          "wrongLength: 27ZG500Z4750204W0",
          "wrongPrefix: 27YG300Z27768715",
          "dashCheckCharacter: 27ZG200Z9397852-",
        ],
        "plain": [
          "27ZG200Z2192799Z",
          "27ZG600Z36303216",
          "27ZG500Z8115546D",
          "27ZG600Z5407237D",
          "27ZG700Z91471490",
        ],
        "plainAgain": [
          "27ZG600Z1055738V",
          "27ZG100Z3823907D",
        ],
        "randomEdge": [
          "27ZG620Z64891098",
          "27ZG456Z7903189O",
          "27ZG672Z82526156",
        ],
        "randomInvalid": [
          "27ZG500Z0858785",
          "27ZG100Z8357257G",
          "27ZG500Z53683128",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkCharacterDigit: 27ZG500Z44203001",
          "lds: 27ZG571Z5164009P",
        ],
        "invalid": [
          "badChecksum: 27ZG700Z7637778F",
          "wrongLength: 27ZG500Z457862499",
          "wrongPrefix: 27YG200Z00622787",
          "dashCheckCharacter: 27ZG600Z0891370-",
        ],
        "plain": [
          "27ZG900Z8484448I",
          "27ZG400Z5631292R",
          "27ZG300Z8680916F",
          "27ZG600Z51017563",
          "27ZG500Z1195616Q",
        ],
        "plainAgain": [
          "27ZG300Z5689072K",
          "27ZG500Z3826503B",
        ],
        "randomEdge": [
          "27ZG955Z6646829S",
          "27ZG600Z76403037",
          "27ZG234Z4527844U",
        ],
        "randomInvalid": [
          "27ZG200Z8822105O",
          "27ZG700Z5066607J",
          "27ZG300Z5717311-",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkCharacterDigit: 27ZG300Z81128285",
          "lds: 27ZG594Z55917859",
        ],
        "invalid": [
          "badChecksum: 27ZG900Z0472059X",
          "wrongLength: 27ZG400Z2756061",
          "wrongPrefix: 27WG500Z1249002W",
          "dashCheckCharacter: 27ZG200Z9958697-",
        ],
        "plain": [
          "27ZG400Z9190764L",
          "27ZG200Z1797967I",
          "27ZG500Z9815437Z",
          "27ZG900Z66121862",
          "27ZG400Z3598452K",
        ],
        "plainAgain": [
          "27ZG900Z3203152Z",
          "27ZG500Z9088830W",
        ],
        "randomEdge": [
          "27ZG500Z20492554",
          "27ZG939Z20896694",
          "27ZG664Z1215861A",
        ],
        "randomInvalid": [
          "27ZG600Z07948348",
          "27ZG700Z7686149-",
          "27ZG400Z7413238J",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkCharacterDigit: 27ZG900Z65320000",
          "lds: 27ZG270Z6341821H",
        ],
        "invalid": [
          "badChecksum: 27ZG200Z2687665T",
          "wrongLength: 27ZG200Z6594710",
          "wrongPrefix: 27XG900Z02979683",
          "dashCheckCharacter: 27ZG200Z2719020-",
        ],
        "plain": [
          "27ZG200Z4543802G",
          "27ZG500Z9391852U",
          "27ZG500Z8793257E",
          "27ZG900Z53589260",
          "27ZG200Z75165140",
        ],
        "plainAgain": [
          "27ZG700Z90087395",
          "27ZG400Z7343439C",
        ],
        "randomEdge": [
          "27ZG467Z6804294G",
          "27ZG500Z01409511",
          "27ZG900Z68174444",
        ],
        "randomInvalid": [
          "27ZG600Z9528422-",
          "27ZG500Z7522093",
          "27TG300Z2780302R",
        ],
      }
    `);
  });
});
