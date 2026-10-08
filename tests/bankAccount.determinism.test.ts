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
  it('pins the first outputs for seed 0', () => {
    expect(firstOutputs(0)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withPrefix: 81998-1544393003/3030",
          "maxLength: 409973-3276349143/3030",
          "minLength: 35/0800",
          "withLeadingZeros: 0096133990/2700",
          "zeroPrefix: 000000-5360048/0300",
        ],
        "invalid": [
          "badChecksumPrefix: 627-739917327/0300",
          "badChecksumNumber: 5548150687/6210",
          "unknownBankCode: 4428351360/9999",
          "wrongLength: 9/0800",
          "letters: 370A505/6210",
          "zeroNumber: 0000000000/5500",
        ],
        "plain": [
          "65914153/6210",
          "1858156/0100",
          "493274236/5500",
          "5503168/3030",
          "4147202/0100",
        ],
        "plainAgain": [
          "4602445478/2700",
          "701106/0600",
        ],
        "randomEdge": [
          "000000-4455614824/5500",
          "0000046295/0800",
          "0000050753/0800",
        ],
        "randomInvalid": [
          "47-106227/3030",
          "0000000000/2700",
          "296737/2020",
        ],
        "withBankCode": [
          "7211837806/0800",
          "34980-68284097/8620",
        ],
        "withPrefix": [
          "412435-699867731/0100",
          "132361-7782156/2010",
          "926065-62066902/3030",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 1', () => {
    expect(firstOutputs(1)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withPrefix: 559672-82361167/0600",
          "maxLength: 323862-4222218118/6210",
          "minLength: 43/0600",
          "withLeadingZeros: 0009455255/3030",
          "zeroPrefix: 000000-8936625477/5500",
        ],
        "invalid": [
          "badChecksumPrefix: 1727-61150117/0300",
          "badChecksumNumber: 984540/5500",
          "unknownBankCode: 9642112849/6100",
          "wrongLength: 97916943284/6210",
          "letters: 27A010/0600",
          "zeroNumber: 0000000000/0600",
        ],
        "plain": [
          "389466/3030",
          "395674439/5500",
          "171475/0800",
          "873078501/2010",
          "248025922/0600",
        ],
        "plainAgain": [
          "612958383/3030",
          "377252945/5500",
        ],
        "randomEdge": [
          "261657-9108874392/5500",
          "741474-3196836996/6210",
          "0580997969/0100",
        ],
        "randomInvalid": [
          "67005463/0000",
          "0000000000/0800",
          "984889473/6210",
        ],
        "withBankCode": [
          "8491043/0800",
          "94-84899999/8620",
        ],
        "withPrefix": [
          "17400-782348/0600",
          "39650-7779344/2010",
          "672149-726042859/2010",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 42', () => {
    expect(firstOutputs(42)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withPrefix: 35-76242903/3030",
          "maxLength: 703187-5491492195/2700",
          "minLength: 27/5500",
          "withLeadingZeros: 0000607574/2700",
          "zeroPrefix: 000000-88190485/0800",
        ],
        "invalid": [
          "badChecksumPrefix: 70378-734565/5500",
          "badChecksumNumber: 954245434/3030",
          "unknownBankCode: 543243957/2020",
          "wrongLength: 78834882580/0800",
          "letters: 9373A9/2010",
          "zeroNumber: 0000000000/3030",
        ],
        "plain": [
          "9852166386/0600",
          "973435406/5500",
          "8447122/0600",
          "906347/0600",
          "681432/0100",
        ],
        "plainAgain": [
          "903381/0600",
          "672251275/5500",
        ],
        "randomEdge": [
          "138544-3236870719/6210",
          "282925-4897412613/6210",
          "0053788081/0600",
        ],
        "randomInvalid": [
          "6238428311/3O30",
          "5770581/9999",
          "873829933/5500",
        ],
        "withBankCode": [
          "645853705/0800",
          "975-79116275/8620",
        ],
        "withPrefix": [
          "959-6896346/0300",
          "772-28917435/2700",
          "614635-143327238/6210",
        ],
      }
    `);
  });

  it('pins the first outputs for seed 4294967295', () => {
    expect(firstOutputs(4294967295)).toMatchInlineSnapshot(`
      {
        "edge": [
          "withPrefix: 342-7486058/6210",
          "maxLength: 785426-6754995160/2010",
          "minLength: 43/2700",
          "withLeadingZeros: 0000426386/5500",
          "zeroPrefix: 000000-8166514315/0100",
        ],
        "invalid": [
          "badChecksumPrefix: 9303-3126647866/5500",
          "badChecksumNumber: 7507855/2010",
          "unknownBankCode: 675227/9999",
          "wrongLength: 6/2010",
          "letters: 505674/010A",
          "zeroNumber: 0000000000/5500",
        ],
        "plain": [
          "821749/2700",
          "2327851826/2010",
          "1052929/0600",
          "5168195/5500",
          "660375/0300",
        ],
        "plainAgain": [
          "916982198/5500",
          "22931578/3030",
        ],
        "randomEdge": [
          "0000000633/2010",
          "0000036097/6210",
          "259637-700856168/0300",
        ],
        "randomInvalid": [
          "984-500786257/0100",
          "55-91403787/5500",
          "84701837/0100",
        ],
        "withBankCode": [
          "463987585/0800",
          "32619-86638100/8620",
        ],
        "withPrefix": [
          "932-1087339/0300",
          "106307-2327488/2700",
          "748-309835612/2700",
        ],
      }
    `);
  });
});
