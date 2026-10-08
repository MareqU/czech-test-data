// Determinism of bankAccount – docs/rules/core.md section 2 (same seed + same calls = same output; snapshot
// seeds 0, 1, 42, 4294967295) and amendment A3; docs/rules/bankAccount.md section 9 (no date dependence, draw
// order, frozen generator codes: a snapshot update never changes seeded output). The snapshot values cannot be
// derived from the rules (they depend on the draw order), so they are filled by the main session after the
// implementation passes. vitest.config.ts sets `update: 'none'`, so values are recorded only with -u.
import { describe, expect, it } from 'vitest';
import { createBankAccount } from '../src/bankAccount/index.js';
import type { BankAccountEdgeVariant, BankAccountInvalidVariant } from '../src/bankAccount/index.js';
import { describeDeterminismContract } from './support/identifierContract.js';
import { dateArb, draw } from './support/helpers.js';

const SNAPSHOT_REFERENCE_DATE = '2026-10-05';

/** Variant order of section 4 of the rules, so named calls run in a fixed order. */
const EDGE_VARIANTS: readonly BankAccountEdgeVariant[] = [
  'withPrefix',
  'maxLength',
  'minLength',
  'withLeadingZeros',
  'zeroPrefix',
];
const INVALID_VARIANTS: readonly BankAccountInvalidVariant[] = [
  'badChecksumPrefix',
  'badChecksumNumber',
  'unknownBankCode',
  'wrongLength',
  'letters',
  'zeroNumber',
];

/** A fixed call sequence covering every kind of call, recorded in call order. */
function firstOutputs(seed: number, referenceDate = SNAPSHOT_REFERENCE_DATE): Record<string, readonly string[]> {
  const generator = createBankAccount({ seed, referenceDate });
  return {
    plain: draw(5, () => generator()),
    withPrefix: draw(3, () => generator({ withPrefix: true })),
    withBankCode: [generator({ bankCode: '0800' }), generator({ bankCode: '8620', withPrefix: true })],
    edge: EDGE_VARIANTS.map((variant) => `${variant}: ${generator.edge(variant)}`),
    randomEdge: draw(3, () => generator.edge()),
    invalid: INVALID_VARIANTS.map((variant) => `${variant}: ${generator.invalid(variant)}`),
    randomInvalid: draw(3, () => generator.invalid()),
    plainAgain: draw(2, () => generator()),
  };
}

describeDeterminismContract({
  create: createBankAccount,
  firstOutputs,
  snapshotReferenceDate: SNAPSHOT_REFERENCE_DATE,
  minDistinctFirstValues: 90,
  a3Title: 'shared A3 check: the referenceDate never changes the output (no date dependence, section 9)',
  a3: {
    create: createBankAccount,
    plain: (generator) => generator(),
    laterReferenceDates: dateArb('1900-01-01', '2099-12-31'),
    fixedPair: ['1900-01-01', '2099-12-31'],
    dateDependentInvalidVariants: [],
  },
});

describe('a given bankCode does not draw (section 9): the rest of the value is the same for any code', () => {
  it('draws the same number as without the option except for the code draw', () => {
    // plain: number first, then the code draw; with bankCode nothing is drawn for the code, so the next value
    // continues from a stream position one draw earlier -> the first numbers are identical.
    for (const seed of [0, 1, 42, 4294967295]) {
      const withOption = createBankAccount({ seed })({ bankCode: '0800' });
      const without = createBankAccount({ seed })();
      expect(withOption.split('/')[0]).toBe(without.split('/')[0]);
    }
  });
});

describe('seed snapshots (referenceDate 2026-10-05) – filled by the main session after the implementation passes', () => {
  it.each([0, 1, 42, 4294967295])('pins the first outputs for seed %d', (seed) => {
    expect(firstOutputs(seed)).toMatchInlineSnapshot();
  });
});
