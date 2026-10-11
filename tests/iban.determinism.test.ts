// Determinism of iban – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot seeds 0,
// 1, 42, 4294967295) and amendment A3; docs/rules/iban.md section 9 (no date dependence, draw order, the account
// option draws nothing). The snapshot values cannot be derived from the rules (they depend on the draw order), so
// they are filled by the main session after the implementation passes.
import { describe, expect, it } from 'vitest';
import { createIban } from '../src/iban/index.js';
import type { IbanEdgeVariant, IbanInvalidVariant } from '../src/iban/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly IbanEdgeVariant[] = ['withSpaces', 'lowercase', 'withPrefix', 'checkDigitsLeadingZero'];
const INVALID_VARIANTS: readonly IbanInvalidVariant[] = [
  'badChecksum',
  'wrongCountry',
  'wrongLength',
  'letters',
  'badChecksumPrefix',
  'badChecksumNumber',
  'zeroNumber',
  'unknownBankCode',
];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createIban({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    withPrefix: draw(3, () => generator({ withPrefix: true })),
    withBankCode: [generator({ bankCode: '0800' }), generator({ bankCode: '8620', withPrefix: true })],
    withAccount: [generator({ account: '19-2000145399/0800' }), generator({ account: '13717-77628031/0710' })],
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

describeDeterminismContract({
  create: createIban,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createIban,
    plain: (generator) => generator(),
    laterReferenceDates: dateArb('1900-01-01', '2099-12-31'),
    fixedPair: ['1900-01-01', '2099-12-31'],
    dateDependentInvalidVariants: [],
  },
});

describe('the account option draws nothing (section 9)', () => {
  it('leaves the stream where it was', () => {
    for (const seed of [0, 1, 42, 4294967295]) {
      const converting = createIban({ seed });
      converting({ account: '19-2000145399/0800' });
      converting({ account: '178124-4159/0710' });
      const untouched = createIban({ seed });
      expect(draw(3, () => converting())).toEqual(draw(3, () => untouched()));
    }
  });
});

describe('seed snapshots (referenceDate 2026-10-05) – filled by the main session after the implementation passes', () => {
  it('pins the first outputs for seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withSpaces: CZ44 3030 0000 0000 8817 9964",
          "lowercase: cz8827000000001810466448",
          "withPrefix: CZ0406000000430032956787",
          "checkDigitsLeadingZero: CZ0627000000000000933409",
        ],
        "invalid": [
          "badChecksum: CZ7408000000001494876516",
          "wrongCountry: SK6908000000000080854267",
          "wrongLength: CZ3201003974708",
          "letters: CZ250600000000l068606404",
          "badChecksumPrefix: CZ4503000004230006172583",
          "badChecksumNumber: CZ6703000000000085953298",
          "zeroNumber: CZ6108000000000000000000",
          "unknownBankCode: CZ0799990000000000255425",
        ],
        "plain": [
          "CZ3606000000000000134391",
          "CZ8206000000000000492463",
          "CZ0903000000000000797654",
          "CZ0227000000000000350414",
          "CZ0903000000000245243086",
        ],
        "plainAgain": [
          "CZ0803000000007709660630",
          "CZ2662100000000336942552",
        ],
        "randomEdge": [
          "cz5162100000003911121472",
          "CZ77 6210 0000 0000 8663 1873",
          "CZ2920100088621032839884",
        ],
        "randomInvalid": [
          "CZ7100000000000561808333",
          "CZ7201000000001414469356",
          "CZ930800608454",
        ],
        "withAccount": [
          "CZ6508000000192000145399",
          "CZ7907100137170077628031",
        ],
        "withBankCode": [
          "CZ1508000000000000224995",
          "CZ1286200021109448912965",
        ],
        "withPrefix": [
          "CZ2427000007644616072326",
          "CZ1930300000190053085853",
          "CZ3906000006840081682671",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withSpaces: CZ16 3030 0000 0000 8780 8570",
          "lowercase: cz5255000000000008099359",
          "withPrefix: CZ7220100074210045738973",
          "checkDigitsLeadingZero: CZ0455000000006949415664",
        ],
        "invalid": [
          "badChecksum: CZ1855000000002547020434",
          "wrongCountry: SK6703000000000909237173",
          "wrongLength: CZ890800879932",
          "letters: CZA620100000000002641776",
          "badChecksumPrefix: CZ1203000008580007196261",
          "badChecksumNumber: CZ5003000000004137423220",
          "zeroNumber: CZ4803000000000000000000",
          "unknownBankCode: CZ8140000000000042898437",
        ],
        "plain": [
          "CZ0930300000000354854740",
          "CZ5003000000000045955169",
          "CZ4101000000000000880191",
          "CZ8401000000008359308016",
          "CZ4727000000000003965764",
        ],
        "plainAgain": [
          "CZ4955000000000344157562",
          "CZ9106000000000000302084",
        ],
        "randomEdge": [
          "CZ0220100000000000450618",
          "CZ9006000039300003558464",
          "CZ71 5500 0000 0000 0033 0093",
        ],
        "randomInvalid": [
          "CZ2855000000000000000000",
          "CZ2020100000000006461369",
          "CZ4361000000000900050556",
        ],
        "withAccount": [
          "CZ6508000000192000145399",
          "CZ7907100137170077628031",
        ],
        "withBankCode": [
          "CZ2908000000000000720219",
          "CZ5186200005370000477554",
        ],
        "withPrefix": [
          "CZ8808000764510000878278",
          "CZ8355004013578931723959",
          "CZ1520100099109234343066",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withSpaces: CZ49 2010 0000 0000 7343 4803",
          "lowercase: cz2401000000000000784079",
          "withPrefix: CZ0420100001150000436023",
          "checkDigitsLeadingZero: CZ0827000000000087011561",
        ],
        "invalid": [
          "badChecksum: CZ9208000000000000415767",
          "wrongCountry: SK5430300000000248394939",
          "wrongLength: CZ200300173091",
          "letters: CZ6101l00000002789203225",
          "badChecksumPrefix: CZ0401000002710033514868",
          "badChecksumNumber: CZ2320100000000772894511",
          "zeroNumber: CZ9127000000000000000000",
          "unknownBankCode: CZ1599990000000000674224",
        ],
        "plain": [
          "CZ6030300000000766074070",
          "CZ3627000000000734124926",
          "CZ2701000000002213775781",
          "CZ0862100000000003737497",
          "CZ8362100000000000252101",
        ],
        "plainAgain": [
          "CZ3662100000004775904193",
          "CZ5301000000000000749898",
        ],
        "randomEdge": [
          "CZ07 3030 0000 0000 9694 6617",
          "CZ35 0800 0000 0000 0799 0940",
          "CZ1603000001900005875383",
        ],
        "randomInvalid": [
          "CZ0406000000000000800892",
          "CZ0401000000000000000000",
          "CZ8630300000000000000000",
        ],
        "withAccount": [
          "CZ6508000000192000145399",
          "CZ7907100137170077628031",
        ],
        "withBankCode": [
          "CZ2308000000000067096457",
          "CZ5686200006410037966554",
        ],
        "withPrefix": [
          "CZ8555002941680007190716",
          "CZ6906000004730078750848",
          "CZ0208000000430245401195",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withSpaces: CZ27 0800 0000 0058 4462 9688",
          "lowercase: cz2155000000000003413265",
          "withPrefix: CZ5206000000510000337535",
          "checkDigitsLeadingZero: CZ0927000000001702425390",
        ],
        "invalid": [
          "badChecksum: CZ1155000000000578014839",
          "wrongCountry: SK1806000000000000381544",
          "wrongLength: CZ3720105202648780",
          "letters: CZ062010000000703233O312",
          "badChecksumPrefix: CZ3108000227590054199211",
          "badChecksumNumber: CZ3620100000000000224384",
          "zeroNumber: CZ2855000000000000000000",
          "unknownBankCode: CZ4920200000000868091066",
        ],
        "plain": [
          "CZ5930300000000000683948",
          "CZ6927000000000638909520",
          "CZ0508000000000083911343",
          "CZ9230300000000863851046",
          "CZ0220100000004341971671",
        ],
        "plainAgain": [
          "CZ8727000000000012764593",
          "CZ4230300000000004412934",
        ],
        "randomEdge": [
          "CZ0406000000000159508877",
          "CZ23 6210 0000 0067 6475 4985",
          "CZ42 6210 0000 0081 4660 9077",
        ],
        "randomInvalid": [
          "CZ4120100004160001320671",
          "CZ0408000000171685054996",
          "CZ5100000000009913930318",
        ],
        "withAccount": [
          "CZ6508000000192000145399",
          "CZ7907100137170077628031",
        ],
        "withBankCode": [
          "CZ5408000000000000460488",
          "CZ0486200044310927954563",
        ],
        "withPrefix": [
          "CZ1106000026040835692703",
          "CZ5120100000190000348701",
          "CZ1630300044318697981430",
        ],
      }
    `);
  });
});
