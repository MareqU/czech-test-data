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
  // As in birthNumber: every fixed birthDate of firstOutputs lies before these reference dates.
  repeatDates: dateArb('2004-04-01', '2053-12-30'),
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
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "fromIco: CZ82669198",
          "fromBirthNumber: CZ0508310341",
          "lowercasePrefix: cz74448595",
          "pre1954: CZ031110410",
          "vatGroup: CZ699781850",
        ],
        "invalid": [
          "missingPrefix: 5804238462",
          "foreignPrefix: LT9112137320",
          "badInnerChecksum: CZ9152162835",
        ],
        "options": [
          "CZ64740099",
          "CZ7460180189",
          "CZ9005010663",
          "CZ500715006",
        ],
        "plain": [
          "CZ9808266743",
          "CZ2006185434",
          "CZ60815736",
          "CZ74850962",
          "CZ2062083177",
        ],
        "plainAgain": [
          "CZ7752136964",
          "CZ81063814",
        ],
        "randomEdge": [
          "CZ70198829",
          "cz46622667",
          "CZ29583730",
        ],
        "randomInvalid": [
          "8560232461",
          "CZ8405214802",
          "CZ12177760",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "fromIco: CZ95116974",
          "fromBirthNumber: CZ9151074086",
          "lowercasePrefix: cz1112277309",
          "pre1954: CZ041116499",
          "vatGroup: CZ699639231",
        ],
        "invalid": [
          "missingPrefix: 72798904",
          "foreignPrefix: DE1810286390",
          "badInnerChecksum: CZ21531393",
        ],
        "options": [
          "CZ14334356",
          "CZ1458129123",
          "CZ9005013732",
          "CZ505715431",
        ],
        "plain": [
          "CZ51968789",
          "CZ42162629",
          "CZ0904070222",
          "CZ98772198",
          "CZ87731711",
        ],
        "plainAgain": [
          "CZ77901061",
          "CZ59635789",
        ],
        "randomEdge": [
          "CZ265813553",
          "CZ66364574",
          "CZ699181330",
        ],
        "randomInvalid": [
          "9759205500",
          "PT95947345",
          "CZ8703031440",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "fromIco: CZ98661566",
          "fromBirthNumber: CZ9506060498",
          "lowercasePrefix: cz66577250",
          "pre1954: CZ400923320",
          "vatGroup: CZ699238121",
        ],
        "invalid": [
          "missingPrefix: 7157218035",
          "foreignPrefix: BG5611150061",
          "badInnerChecksum: CZ6612312006",
        ],
        "options": [
          "CZ56717849",
          "CZ8154056383",
          "CZ9005019815",
          "CZ500715837",
        ],
        "plain": [
          "CZ72101865",
          "CZ41816714",
          "CZ6351125517",
          "CZ6905047787",
          "CZ60492660",
        ],
        "plainAgain": [
          "CZ26020238",
          "CZ8360126764",
        ],
        "randomEdge": [
          "CZ59109238",
          "CZ285905337",
          "CZ8157230246",
        ],
        "randomInvalid": [
          "18340547",
          "CZ76635688",
          "CZ85826965",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "fromIco: CZ37475151",
          "fromBirthNumber: CZ6854081388",
          "lowercasePrefix: cz33326827",
          "pre1954: CZ160914152",
          "vatGroup: CZ699283163",
        ],
        "invalid": [
          "missingPrefix: 5512290894",
          "foreignPrefix: LV86239902",
          "badInnerChecksum: CZ37258784",
        ],
        "options": [
          "CZ26247577",
          "CZ7462106938",
          "CZ9005016460",
          "CZ505715032",
        ],
        "plain": [
          "CZ55693784",
          "CZ7157090457",
          "CZ48360589",
          "CZ64697851",
          "CZ53509714",
        ],
        "plainAgain": [
          "CZ8810036433",
          "CZ61052167",
        ],
        "randomEdge": [
          "CZ8704110239",
          "cz18849903",
          "cz29917662",
        ],
        "randomInvalid": [
          "5711041413",
          "ES34895736",
          "LU0559113379",
        ],
      }
    `);
  });
});
