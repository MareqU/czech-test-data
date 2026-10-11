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
