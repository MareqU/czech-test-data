// Determinism of ico (IČO) – docs/rules/core.md section 2 (same seed + same calls = same output;
// snapshot seeds 0, 1, 42, 4294967295) and amendment A3; docs/rules/ico.md section 8 (no date
// dependence). The snapshot values cannot be derived from the rules (they depend on how many draws the
// generator spends), so they are filled by the main session after the implementation passes. vitest.config.ts
// sets `update: 'none'`, so values are recorded only with -u.
import { describe, expect, it } from 'vitest';
import { createIco } from '../src/ico/index.js';
import type { IcoEdgeVariant, IcoInvalidVariant } from '../src/ico/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

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

describeDeterminismContract({
  create: createIco,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 8)',
  a3: {
    create: createIco,
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
          "leadingZeros: 00206831",
          "checkDigitZero: 89539290",
          "checkDigitOne: 32022221",
        ],
        "invalid": [
          "badChecksum: 43454314",
          "wrongLength: 7172931",
          "letters: 9946693l",
        ],
        "plain": [
          "81368160",
          "80692133",
          "76271242",
          "23762373",
          "70416222",
        ],
        "plainAgain": [
          "78454514",
          "91138299",
        ],
        "randomEdge": [
          "03616673",
          "74114981",
          "22881361",
        ],
        "randomInvalid": [
          "703193169",
          "5097461",
          "69037690",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "leadingZeros: 00060674",
          "checkDigitZero: 42217580",
          "checkDigitOne: 51440661",
        ],
        "invalid": [
          "badChecksum: 89420247",
          "wrongLength: 889745967",
          "letters: 26O86211",
        ],
        "plain": [
          "43523153",
          "13518356",
          "95468943",
          "47544970",
          "37297368",
        ],
        "plainAgain": [
          "21568316",
          "62221698",
        ],
        "randomEdge": [
          "02288800",
          "41003781",
          "01976478",
        ],
        "randomInvalid": [
          "23584178",
          "38599l56",
          "8171041",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "leadingZeros: 00002208",
          "checkDigitZero: 51237920",
          "checkDigitOne: 80650121",
        ],
        "invalid": [
          "badChecksum: 77111183",
          "wrongLength: 441346651",
          "letters: 12A78119",
        ],
        "plain": [
          "74494066",
          "65313763",
          "81334435",
          "39928977",
          "72928026",
        ],
        "plainAgain": [
          "53844149",
          "93552335",
        ],
        "randomEdge": [
          "50449711",
          "97398390",
          "88890660",
        ],
        "randomInvalid": [
          "63494537",
          "72644617",
          "A4389518",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "leadingZeros: 00004405",
          "checkDigitZero: 83319310",
          "checkDigitOne: 93057661",
        ],
        "invalid": [
          "badChecksum: 15614631",
          "wrongLength: 116821240",
          "letters: 2158A734",
        ],
        "plain": [
          "95076166",
          "93539053",
          "62552911",
          "43194818",
          "26948575",
        ],
        "plainAgain": [
          "86391542",
          "50673009",
        ],
        "randomEdge": [
          "63070880",
          "26007240",
          "80884610",
        ],
        "randomInvalid": [
          "114630583",
          "650l8126",
          "1793022O",
        ],
      }
    `);
  });
});
