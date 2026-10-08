// Specification of weightedSum – docs/rules/core.md section 5 (src/core/checksum.ts): Σ digit · weight with the
// digits right-aligned to the weights; a shorter input counts as left-padded with zeros (ico review N2).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { weightedSum } from '../src/core/checksum.js';

const ICO_WEIGHTS = [8, 7, 6, 5, 4, 3, 2];
const BANK_WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

describe('weightedSum', () => {
  it.each([
    ['0017704', ICO_WEIGHTS, 77, 'equal lengths (IČO base 0017704: 6 + 35 + 28 + 8)'],
    ['1000000', ICO_WEIGHTS, 8, 'first weight'],
    ['0077628031', BANK_WEIGHTS, 253, 'full 10 digits (bank account number of the worked example)'],
    ['77628031', BANK_WEIGHTS, 253, 'shorter input equals its left-padded form'],
    ['13717', BANK_WEIGHTS, 66, '5-digit prefix uses 5, 8, 4, 2, 1'],
    ['19', BANK_WEIGHTS, 11, '2 digits use 2, 1'],
    ['1', BANK_WEIGHTS, 1, 'one digit is weighted by the last weight, not the first'],
    ['10', BANK_WEIGHTS, 2, 'weights are aligned to the right end'],
    ['', BANK_WEIGHTS, 0, 'empty digits'],
    ['', ICO_WEIGHTS, 0, 'empty digits'],
    ['9999999999', BANK_WEIGHTS, 9 * 55, 'all nines'],
  ])('weights the digits %j right-aligned (case %#)', (digits, weights, expected) => {
    expect(weightedSum(digits, weights)).toBe(expected);
  });

  it('a shorter input gives the same sum as the same input left-padded with zeros', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9]{0,10}$/), (digits) => {
        expect(weightedSum(digits, BANK_WEIGHTS)).toBe(weightedSum(digits.padStart(10, '0'), BANK_WEIGHTS));
      }),
      { numRuns: 300 },
    );
  });

  it('equals the plain index-by-index sum for inputs as long as the weights', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9]{7}$/), (digits) => {
        const expected = ICO_WEIGHTS.reduce((sum, weight, i) => sum + Number(digits.charAt(i)) * weight, 0);
        expect(weightedSum(digits, ICO_WEIGHTS)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });
});
