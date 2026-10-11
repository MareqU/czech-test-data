// Independent oracle for eic, written from docs/rules/eic.md only (sections 2 and 9), never from src/.
import fc from 'fast-check';

export type EicOracleReason = 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'dashCheckCharacter' | 'badChecksum';

export type EicOracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: EicOracleReason };

export const PREFIX = '27ZG';
export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-';
export const OTHER_TYPES = ['X', 'Y', 'W', 'T', 'V', 'A'] as const;

const value = (char: string): number => ALPHABET.indexOf(char);

/** Weighted sum of the first 15 characters, weights 16 … 2 (section 2.1, steps 1-5). */
export function weightedSum(body15: string): number {
  return body15.split('').reduce((total, ch, index) => total + (16 - index) * value(ch), 0);
}

/** Check value 0-36 of 15 characters: `(37 - S mod 37) mod 37` (section 9); 36 means `-`, which is forbidden. */
export function checkValue(body15: string): number {
  return (37 - (weightedSum(body15) % 37)) % 37;
}

/** The same check value through the ENTSO-E formula `36 - ((S - 1) mod 37)` of section 2.1 step 6. */
export function entsoeCheckValue(body15: string): number {
  return 36 - ((((weightedSum(body15) - 1) % 37) + 37) % 37);
}

/** Appends the check character to 15 characters; the body must not have the check value 36. */
export function withCheckCharacter(body15: string): string {
  return `${body15}${ALPHABET.charAt(checkValue(body15))}`;
}

/** Pure ENTSO-E validity of 16 characters (closed form, weight 1 for the check character), no Czech rules. */
export function isEntsoeValid(value16: string): boolean {
  return (
    value16.length === 16 &&
    /^[0-9A-Z-]*$/.test(value16) &&
    (weightedSum(value16.slice(0, 15)) + value(value16.charAt(15))) % 37 === 0
  );
}

/** The EIC rules of section 2.4, in precedence order. */
export function oracleEic(input: string): EicOracleResult {
  if (!/^[0-9A-Z-]*$/.test(input)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (input.length !== 16) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!input.startsWith(PREFIX)) {
    return { valid: false, reason: 'wrongPrefix' };
  }
  if (input.endsWith('-')) {
    return { valid: false, reason: 'dashCheckCharacter' };
  }
  if (!isEntsoeValid(input)) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}

const alphabetChar = fc.constantFrom(...ALPHABET.split(''));
const middle = (length: number): fc.Arbitrary<string> =>
  fc.array(alphabetChar, { minLength: length, maxLength: length }).map((chars) => chars.join(''));

/** Values around the rules: right / wrong / dash check character, other prefixes, wrong lengths, bad characters. */
export const structuredEicArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.oneof(
      { weight: 5, arbitrary: fc.constant(PREFIX) },
      { weight: 1, arbitrary: fc.constantFrom('27XG', '21Y-', '10X-') },
      { weight: 1, arbitrary: middle(4) },
    ),
    middle(11),
    fc.constantFrom('right', 'right', 'wrong', 'dash'),
    fc.integer({ min: 1, max: 36 }),
    fc.constantFrom('plain', 'plain', 'plain', 'short', 'long', 'lower', 'space', 'star', 'nbsp', 'fullWidth'),
  )
  .map(([prefix, rest, check, offset, shape]) => {
    const body = `${prefix}${rest}`;
    const correct = checkValue(body);
    const last = check === 'dash' ? '-' : ALPHABET.charAt(check === 'right' ? correct % 36 : (correct + offset) % 36);
    const full = `${body}${last}`;
    switch (shape) {
      case 'short':
        return full.slice(0, 15);
      case 'long':
        return `${full}0`;
      case 'lower':
        return full.toLowerCase();
      case 'space':
        return `${full.slice(0, 8)} ${full.slice(8)}`;
      case 'star':
        return `${full.slice(0, 15)}*`;
      case 'nbsp':
        return `${full.slice(0, 8)}${String.fromCharCode(0xa0)}${full.slice(8)}`;
      case 'fullWidth':
        return full.replace('2', String.fromCharCode(0xff12));
      default:
        return full;
    }
  });
