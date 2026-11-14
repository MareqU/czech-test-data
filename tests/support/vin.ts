// Independent oracle for vin, written from docs/rules/vin.md only (sections 1.5, 2 and 9), never from src/.
import fc from 'fast-check';

export type VinOracleReason = 'badFormat' | 'wrongLength' | 'forbiddenLetter' | 'nonNumericSerial' | 'badChecksum';

export type VinOracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: VinOracleReason };

export const WMI = 'TMB';
export const SMALL_WMI = 'TM9';
/** The 23 letters a VIN may contain (section 1.2, 49 CFR 565.13(g)): A-Z without I, O, Q. */
export const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
export const ALPHABET = `${LETTERS}0123456789`;
/** Position 10 of a plain VIN: the 30 US model year codes (section 1.3). */
export const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';
export const CHECK = '0123456789X';
export const FORBIDDEN = 'IOQ';
/** Weights of positions 1-17; position 9, the check digit itself, has weight 0 (section 2.1, step 2). */
export const WEIGHTS: readonly number[] = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
/** Letters of each transliteration value 1-9 (section 2.1, step 1); digits keep their own value. */
export const VALUE_ROWS: Readonly<Record<number, string>> = {
  1: 'AJ',
  2: 'BKS',
  3: 'CLT',
  4: 'DMU',
  5: 'ENV',
  6: 'FW',
  7: 'GPX',
  8: 'HY',
  9: 'RZ',
};

/** Character classes of the frozen alphabets, for the shape checks of the generator tests. */
export const ALPHABET_CLASS = '[A-HJ-NPR-Z0-9]';
export const YEAR_CLASS = '[A-HJ-NPRSTV-Y1-9]';
export const LETTER_CLASS = '[A-HJ-NPR-Z]';

/** Transliteration value of one allowed character (section 2.1, step 1). */
export function valueOf(char: string): number {
  if (/^[0-9]$/.test(char)) {
    return Number(char);
  }
  const row = Object.entries(VALUE_ROWS).find(([, letters]) => letters.includes(char));
  if (row === undefined) {
    throw new Error(`no transliteration value for ${char}`);
  }
  return Number(row[0]);
}

/** Weighted sum of 17 allowed characters (section 2.1, steps 1-3); whatever stands at position 9 counts 0. */
export function weightedSum(vin: string): number {
  return vin.split('').reduce((total, char, index) => total + (WEIGHTS[index] ?? 0) * (index === 8 ? 0 : valueOf(char)), 0);
}

/** The check character a 17-character VIN must have at position 9 (section 2.1, step 4). */
export function checkChar(vin: string): string {
  return CHECK.charAt(weightedSum(vin) % 11);
}

/** `vin` with position 9 set to the check character of its other 16 positions. */
export function withCheck(vin: string): string {
  return `${vin.slice(0, 8)}${checkChar(vin)}${vin.slice(9)}`;
}

/** The VIN rules of section 2.5, in precedence order (decision 4). */
export function oracleVin(input: string): VinOracleResult {
  if (!/^[0-9A-Z]*$/.test(input)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (input.length !== 17) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (/[IOQ]/.test(input)) {
    return { valid: false, reason: 'forbiddenLetter' };
  }
  if (!/^[0-9]{4}$/.test(input.slice(13))) {
    return { valid: false, reason: 'nonNumericSerial' };
  }
  if (input.charAt(8) !== checkChar(input)) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}

const alphabetChar = fc.constantFrom(...ALPHABET.split(''));
const digitChar = fc.constantFrom(...'0123456789'.split(''));
const chars = (arbitrary: fc.Arbitrary<string>, length: number): fc.Arbitrary<string> =>
  fc.array(arbitrary, { minLength: length, maxLength: length }).map((list) => list.join(''));

/**
 * Valid VINs of any content the rules allow: any alphabet character at positions 1-8 and 10-13 (letters included),
 * digits at 14-17, the computed check character at 9.
 */
export const validVinArb: fc.Arbitrary<string> = fc
  .tuple(chars(alphabetChar, 8), chars(alphabetChar, 4), chars(digitChar, 4))
  .map(([head, middle, serial]) => withCheck(`${head}0${middle}${serial}`));

/** Replaces the character at `index`. */
export function replaceAt(value: string, index: number, char: string): string {
  return `${value.slice(0, index)}${char}${value.slice(index + 1)}`;
}

export const NBSP = String.fromCharCode(0xa0);

/** The ASCII characters of `ascii` as their full-width forms (U+FF01 ...). */
export const toFullWidth = (ascii: string): string =>
  ascii
    .split('')
    .map((char) => String.fromCharCode(char.charCodeAt(0) + 0xfee0))
    .join('');

/** Check character `check` of 'right' (computed), 'wrong' (the next one) or 'letter' (any allowed letter). */
function withCheckFault(vin: string, check: string, letter: string): string {
  if (check === 'wrong') {
    return replaceAt(vin, 8, CHECK.charAt((CHECK.indexOf(vin.charAt(8)) + 1) % 11));
  }
  return check === 'letter' ? replaceAt(vin, 8, letter) : vin;
}

/** One forbidden letter anywhere, or one letter in the serial with the check digit kept or recomputed. */
function withLetterFault(vin: string, fault: string, index: number, replacement: string): string {
  if (fault === 'forbidden') {
    return replaceAt(vin, index, replacement);
  }
  if (fault === 'none') {
    return vin;
  }
  const value = replaceAt(vin, 13 + (index % 4), replacement);
  return fault === 'serialRechecked' ? withCheck(value) : value;
}

/** Distorts the value of a VIN the way a typo or a paste would. */
function withShape(value: string, shape: string): string {
  switch (shape) {
    case 'short':
      return value.slice(0, 16);
    case 'long':
      return `${value}0`;
    case 'lower':
      return value.toLowerCase();
    case 'space':
      return `${value.slice(0, 8)} ${value.slice(8)}`;
    case 'star':
      return replaceAt(value, 8, '*');
    case 'nbsp':
      return `${value.slice(0, 8)}${NBSP}${value.slice(8)}`;
    case 'fullWidth':
      return `${toFullWidth(value.charAt(0))}${value.slice(1)}`;
    default:
      return value;
  }
}

/** Values around the rules: right / wrong / letter check character, forbidden letters, serial letters, bad shapes. */
export const structuredVinArb: fc.Arbitrary<string> = fc
  .tuple(
    validVinArb,
    fc.constantFrom('right', 'right', 'wrong', 'letter'),
    fc.constantFrom('none', 'none', 'forbidden', 'serial', 'serialRechecked'),
    fc.integer({ min: 0, max: 16 }),
    fc.constantFrom(...FORBIDDEN.split('')),
    fc.constantFrom(...LETTERS.split('')),
    fc.constantFrom('plain', 'plain', 'plain', 'short', 'long', 'lower', 'space', 'star', 'nbsp', 'fullWidth'),
  )
  .map(([valid, check, fault, index, forbidden, letter, shape]) =>
    withShape(
      withLetterFault(withCheckFault(valid, check, letter), fault, index, fault === 'forbidden' ? forbidden : letter),
      shape,
    ),
  );
