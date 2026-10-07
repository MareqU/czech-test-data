// Shared weighted digit sum for the mod 11 checksums (IČO, bank account); each identifier keeps its modulus rule.

/**
 * Sum of `digit[i] · weights[i]` over the digits of `digits`; both must have the same length.
 *
 * @param digits - A string of ASCII digits.
 * @param weights - One weight per digit.
 */
export function weightedSum(digits: string, weights: readonly number[]): number {
  return weights.reduce((sum, weight, i) => sum + weight * Number(digits.charAt(i)), 0);
}
