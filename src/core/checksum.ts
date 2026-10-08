// Shared weighted digit sum for the mod 11 checksums (IČO, bank account); each identifier keeps its modulus rule.

/**
 * Sum of digit · weight with `digits` aligned to the right end of `weights`; shorter `digits` count as
 * left-padded with zeros. Not checked: `digits` is ASCII `0-9` and not longer than `weights`.
 *
 * @param digits - A string of ASCII digits.
 * @param weights - Weights, the last one belongs to the last digit.
 */
export function weightedSum(digits: string, weights: readonly number[]): number {
  const padded = digits.padStart(weights.length, '0');
  return weights.reduce((sum, weight, i) => sum + weight * Number(padded.charAt(i)), 0);
}
