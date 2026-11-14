// Determinism of vin – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot seeds 0,
// 1, 42, 4294967295) and amendment A3; docs/rules/vin.md section 9 (no date dependence, draw order). The snapshot
// values cannot be derived from the rules (they depend on the draw order), so they are filled by the main session
// after the implementation passes.
import { describe, expect, it } from 'vitest';
import { createVin } from '../src/vin/index.js';
import type { VinEdgeVariant, VinInvalidVariant } from '../src/vin/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly VinEdgeVariant[] = ['checkDigitX', 'smallManufacturer', 'noModelYear'];
const INVALID_VARIANTS: readonly VinInvalidVariant[] = [
  'badChecksum',
  'wrongLength',
  'forbiddenLetter',
  'nonNumericSerial',
];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createVin({ seed, referenceDate });
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
  create: createVin,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createVin,
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
          "checkDigitX: TMBMJRYKX69194825",
          "smallManufacturer: TM9CZLC0XS1EP0179",
          "noModelYear: TMB490DJ904465136",
        ],
        "invalid": [
          "badChecksum: TMBRNP9NXJ4779758",
          "wrongLength: TMBWPLGA7K271963",
          "forbiddenLetter: TMB51ZI47S6232757",
          "nonNumericSerial: TMB2DCCA5A995248R",
        ],
        "plain": [
          "TMBXM05H758615946",
          "TMBZNU418T4837160",
          "TMB8ZRR51Y5375311",
          "TMB1LLL06V7264881",
          "TMB3CVX46D6586152",
        ],
        "plainAgain": [
          "TMB4Y19A285300858",
          "TMBBPMJEX19502873",
        ],
        "randomEdge": [
          "TMBC8LBRXE5885238",
          "TMBZMKMNX77375084",
          "TMBFZCFXXC8852948",
        ],
        "randomInvalid": [
          "TMB7AL6C072799Q31",
          "TMB84RNW1434749I6",
          "TMBRC1R411720790I",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkDigitX: TMBN2WEYXA1921848",
          "smallManufacturer: TM9047A2X72BJ5978",
          "noModelYear: TMBHAJ55800896445",
        ],
        "invalid": [
          "badChecksum: TMB173TH5P6000243",
          "wrongLength: TMB31T7SX563603356",
          "forbiddenLetter: TMBDV3LSXM0O47015",
          "nonNumericSerial: TMB56HKG0E285558J",
        ],
        "plain": [
          "TMBFJDU91L5083775",
          "TMBJGLLL4J4198518",
          "TMB5KR2N0H7008809",
          "TMBTUUZV660850456",
          "TMBH66PM646148590",
        ],
        "plainAgain": [
          "TMBHPDU58F7892011",
          "TMB8K9H97G9306834",
        ],
        "randomEdge": [
          "TMBP068M401304614",
          "TMB3TX9V801625042",
          "TMBC26E5XE7580516",
        ],
        "randomInvalid": [
          "TMBKHG217X48978683",
          "TMBJ5RR93Y0376135",
          "TMB7C1E7XL2976M57",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkDigitX: TMB8FE9CX92112995",
          "smallManufacturer: TM9YTD8Z184UF6451",
          "noModelYear: TMB11HUG308599775",
        ],
        "invalid": [
          "badChecksum: TMBAB9JL5R6689363",
          "wrongLength: TMBTMHU97396157359",
          "forbiddenLetter: TMBE4M8Z06Q221492",
          "nonNumericSerial: TMB3MB5E0A165556T",
        ],
        "plain": [
          "TMBCAYKU964616807",
          "TMBS62EV6P7383760",
          "TMBP34RS1C2085862",
          "TMBYAUMY0K2900895",
          "TMB7GYM89C9808467",
        ],
        "plainAgain": [
          "TMBCCJGG2H6472562",
          "TMBWMVLR5C3240542",
        ],
        "randomEdge": [
          "TM9FTLA7X42AU4469",
          "TMBYRTY2XS6654696",
          "TM9PHYM9753LR1427",
        ],
        "randomInvalid": [
          "TMBWVZE93Y289532Q",
          "TMBPP3EP9R192544",
          "TMB4RZMH8G548F730",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "checkDigitX: TMBWNM6NXB5319823",
          "smallManufacturer: TM9PCSSU2R7KJ9534",
          "noModelYear: TMB0U5CY307016770",
        ],
        "invalid": [
          "badChecksum: TMB4AZAA4F0030306",
          "wrongLength: TMBTUUY7XH151886",
          "forbiddenLetter: TOB4VGFE1A0658541",
          "nonNumericSerial: TMBZ671B1D737158C",
        ],
        "plain": [
          "TMB8X8ZE0G6674572",
          "TMB5XFMS7E5484095",
          "TMBR3BXN113684522",
          "TMB2BYHZ1L0794385",
          "TMBAYV528X2204452",
        ],
        "plainAgain": [
          "TMB8JTV5372410960",
          "TMB0UJB2534628416",
        ],
        "randomEdge": [
          "TMB9R8G2004270132",
          "TM9B15K94H9TH2573",
          "TM98B7AMX38PA2398",
        ],
        "randomInvalid": [
          "TMBE5RMM1N37I0973",
          "TMBX1TJM0N01495F3",
          "TMBCVPW08T910859A",
        ],
      }
    `);
  });
});
