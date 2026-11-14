// Generator of the VIN (identifikační číslo vozidla), draw order fixed by docs/rules/vin.md section 9.
// Check digit: Commission Implementing Regulation (EU) 2021/535, Annex II, Part 2, Section C, and 49 CFR 565.15(c)
// (the same transliteration and weights): https://eur-lex.europa.eu/eli/reg_impl/2021/535/oj,
// https://www.law.cornell.edu/cfr/text/49/565.15
// Letters I, O, Q are never used: 2021/535 Annex II, Part 2, Section A, point 2.8; 49 CFR 565.13(g).
// WMI TMB = Škoda Auto: Škoda Storyboard, "Co vše prozradí VIN?" (13. 6. 2023),
// https://www.skoda-storyboard.com/cs/skoda-svet-cs/inovace-a-technologie/technologie-cs/co-vse-prozradi-vin/
import { weightedSum } from '../core/checksum.js';
import type { Random } from '../core/random.js';

const WMI = 'TMB';
// Third character 9 = manufacturer under 500 vehicles a year (2021/535 point 2.2.3); positions 12–14 then belong
// to the manufacturer identifier, so 12–13 may be letters.
const SMALL_WMI = 'TM9';

/** The 23 letters a VIN may contain: A–Z without I, O, Q (49 CFR 565.13(g)). Order frozen. */
export const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const ALPHABET = `${LETTERS}0123456789`;
// The 30 model year codes of 49 CFR 565.15(d), Table VII; every code is a valid year in some cycle, so the
// generator does not depend on the date. The EU does not regulate position 10.
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

/** Check characters by remainder: `X` stands for 10 (2021/535 Section C). */
export const CHECK = '0123456789X';
/** Letters no VIN contains. */
export const FORBIDDEN = 'IOQ';

// Transliteration by index: `index % 10` is the value of the character (A–H 1–8, J–N 1–5, P 7, R 9, S–Z 2–9),
// the dots hold the places of I, O, Q (Section C, table).
const TRANSLITERATION = '0123456789.ABCDEFGH..JKLMN.P.R..STUVWXYZ';
// Positions 1–17; position 9, the check digit itself, weighs 0 (Section C).
const WEIGHTS: readonly number[] = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const MODULUS = 11;

/** The check character a 17-character VIN of allowed characters must have at position 9; what stands there is ignored. */
export function checkChar(vin: string): string {
  const values = Array.from(vin, (char) => TRANSLITERATION.indexOf(char) % 10).join('');
  return CHECK.charAt(weightedSum(values, WEIGHTS) % MODULUS);
}

/** `vin` with position 9 set to the check character of its other 16 positions. */
export function withCheck(vin: string): string {
  return `${vin.slice(0, 8)}${checkChar(vin)}${vin.slice(9)}`;
}

/** `count` characters of `chars`, one `int` draw each. */
function drawChars(random: Random, chars: string, count: number): string {
  let result = '';
  for (let i = 0; i < count; i += 1) {
    result += chars.charAt(random.int(0, chars.length - 1));
  }
  return result;
}

/** Generates a valid VIN: `TMB`, 5 VDS characters, check digit, year code, plant digit, 6 serial digits. */
export function generate(random: Random): string {
  const vds = drawChars(random, ALPHABET, 5);
  const year = drawChars(random, YEAR_CODES, 1);
  return withCheck(`${WMI}${vds}0${year}${random.digits(7)}`);
}

/** Generates a valid VIN of a small manufacturer: `TM9`, letters at positions 12–13, digits at 14–17. */
export function generateSmallManufacturer(random: Random): string {
  const vds = drawChars(random, ALPHABET, 5);
  const year = drawChars(random, YEAR_CODES, 1);
  const plant = random.digits(1);
  const code = `${drawChars(random, LETTERS, 2)}${random.digits(1)}`;
  return withCheck(`${SMALL_WMI}${vds}0${year}${plant}${code}${random.digits(3)}`);
}
