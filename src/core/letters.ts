// Shared letter fault of the `letters` reason (core rules, section 4): Unicode letters only, so any
// other foreign character stays `badFormat` in the validators.
import type { Random } from './random.js';

const LETTER = /\p{L}/u;

/** True if `value` contains at least one Unicode letter. */
export function hasLetter(value: string): boolean {
  return LETTER.test(value);
}

/**
 * Replaces the character at one of `positions` with one of `letters`; the position is drawn first, then the letter.
 *
 * @param random - The identifier's PRNG.
 * @param value - A valid value.
 * @param positions - Indexes of the digits that may be replaced.
 * @param letters - Candidate letters, one character each.
 */
export function replaceDigitWithLetter(
  random: Random,
  value: string,
  positions: readonly number[],
  letters: string,
): string {
  const position = random.pick(positions);
  return `${value.slice(0, position)}${letters.charAt(random.int(0, letters.length - 1))}${value.slice(position + 1)}`;
}
