// Determinism of ean – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot seeds 0,
// 1, 42, 4294967295) and amendment A3; docs/rules/ean.md section 9 (no date dependence, draw order). The snapshot
// values cannot be derived from the rules (they depend on the draw order), so they are filled by the main session
// after the implementation passes.
import { describe, expect, it } from 'vitest';
import { createEan } from '../src/ean/index.js';
import type { EanEdgeVariant, EanInvalidVariant } from '../src/ean/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly EanEdgeVariant[] = ['checkDigitZero', 'lds'];
const INVALID_VARIANTS: readonly EanInvalidVariant[] = ['badChecksum', 'wrongLength', 'letters', 'wrongPrefix'];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createEan({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    cez: draw(2, () => generator({ distributor: 'cez' })),
    egd: draw(2, () => generator({ distributor: 'egd' })),
    pre: draw(2, () => generator({ distributor: 'pre' })),
    lds: draw(2, () => generator({ distributor: 'lds' })),
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

describeDeterminismContract({
  create: createEan,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createEan,
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
        "cez": [
          "859182400675176012",
          "859182400602628966",
        ],
        "edge": [
          "checkDigitZero: 859182400715107730",
          "lds: 859182406230722380",
        ],
        "egd": [
          "859182400142397995",
          "859182400288333635",
        ],
        "invalid": [
          "badChecksum: 859182400692802537",
          "wrongLength: 85918240083377608",
          "letters: 8591824001618033l4",
          "wrongPrefix: 859415800170318194",
        ],
        "lds": [
          "859182408540989279",
          "859182406170888887",
        ],
        "plain": [
          "859182400648634969",
          "859182400871082292",
          "859182400584812377",
          "859182400410534954",
          "859182400866091698",
        ],
        "plainAgain": [
          "859182400481630029",
          "859182400655050103",
        ],
        "pre": [
          "859182400368610960",
          "859182400323362538",
        ],
        "randomEdge": [
          "859182400218738080",
          "859182400727294930",
          "859182405570225568",
        ],
        "randomInvalid": [
          "859182400801286339",
          "859182400369329522",
          "8591824004l3552658",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "cez": [
          "859182400660328525",
          "859182400877769173",
        ],
        "edge": [
          "checkDigitZero: 859182400717740980",
          "lds: 859182403110770202",
        ],
        "egd": [
          "859182400140726155",
          "859182400162618261",
        ],
        "invalid": [
          "badChecksum: 859182400578315110",
          "wrongLength: 85918240023228341",
          "letters: 85918O400817723722",
          "wrongPrefix: 859647000411100985",
        ],
        "lds": [
          "859182407180050011",
          "859182408060016769",
        ],
        "plain": [
          "859182400299065433",
          "859182400766608378",
          "859182400663597713",
          "859182400562791151",
          "859182400892650227",
        ],
        "plainAgain": [
          "859182400686738483",
          "859182400390496594",
        ],
        "pre": [
          "859182400379517180",
          "859182400378152276",
        ],
        "randomEdge": [
          "859182406280249936",
          "859182400321224180",
          "859182400375889410",
        ],
        "randomInvalid": [
          "859853100541546116",
          "8591824l0355106506",
          "859182400395748769",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "cez": [
          "859182400505161461",
          "859182400581591046",
        ],
        "edge": [
          "checkDigitZero: 859182400339015800",
          "lds: 859182408930171826",
        ],
        "egd": [
          "859182400132571947",
          "859182400231362811",
        ],
        "invalid": [
          "badChecksum: 859182400387155131",
          "wrongLength: 85918240072771063",
          "letters: 8591824005036365O0",
          "wrongPrefix: 859982300867844113",
        ],
        "lds": [
          "859182406010511852",
          "859182406700416481",
        ],
        "plain": [
          "859182400230881702",
          "859182400590658228",
          "859182400403963426",
          "859182400256502216",
          "859182400184047537",
        ],
        "plainAgain": [
          "859182400252725473",
          "859182400819149902",
        ],
        "pre": [
          "859182400329616703",
          "859182400397439303",
        ],
        "randomEdge": [
          "859182400513284510",
          "859182403870863862",
          "859182406150847644",
        ],
        "randomInvalid": [
          "8591824007216118878",
          "859182400697689154",
          "859085700786479025",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "cez": [
          "859182400816803050",
          "859182400736816796",
        ],
        "edge": [
          "checkDigitZero: 859182400746337380",
          "lds: 859182408370892534",
        ],
        "egd": [
          "859182400157755001",
          "859182400172564343",
        ],
        "invalid": [
          "badChecksum: 859182400821046385",
          "wrongLength: 85918240077787459",
          "letters: 859182A00186596835",
          "wrongPrefix: 859504600792532496",
        ],
        "lds": [
          "859182405080992547",
          "859182404210110929",
        ],
        "plain": [
          "859182400426314250",
          "859182400818449775",
          "859182400297139327",
          "859182400544079451",
          "859182400454741394",
        ],
        "plainAgain": [
          "859182400731675039",
          "859182400122812456",
        ],
        "pre": [
          "859182400374107089",
          "859182400368694977",
        ],
        "randomEdge": [
          "859182407920157130",
          "859182400418814980",
          "859182400430885340",
        ],
        "randomInvalid": [
          "859182400O26745476",
          "859495000877325778",
          "85918240028037357O",
        ],
      }
    `);
  });
});
