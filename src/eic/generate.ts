// Generator of the Czech gas supply point EIC (EIC kód odběrného místa plynu), draw order fixed by
// docs/rules/eic.md section 9.
// Check character: ENTSO-E, EIC Data Exchange Implementation Guide v1.2, § 5.3 (weights 16..2, mod 37; the check
// character is never "-"): https://eepublicdownloads.entsoe.eu/clean-documents/EDI/Library/cim_based/EIC_Data_Exchange_IG_v1.2.pdf
// Never-"-" rule for Czech gas codes: ERÚ grid code appendix "EIC kódy" (the DSO skips the sequence number),
// https://eru.gov.cz/sites/default/files/obsah/prilohy/rpdsrwegasnetp5eic.pdf
import type { Random } from '../core/random.js';

/**
 * Fixed prefix (pevný prefix): LIO 27, object type Z (measurement point), G (gas series managed by OTE).
 * Source: ERÚ grid code appendix "EIC kódy", https://eru.gov.cz/sites/default/files/obsah/prilohy/rpdsrwegasnetp5eic.pdf
 */
export const PREFIX = '27ZG';
const POINT_TYPE = 'Z';
// Position 5 = first digit of the 3-digit distribution system code (100 PPD, 200–700 GasNet, 900 E.ON/EG.D in the
// same ERÚ appendix); 8 is unused in every source. Order frozen.
const REGION_DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 9];
const BIG_DSO_SUFFIX = '00';
const MAX_LDS = 99;

/** Index = character value (0–9, A–Z, "-" = 36), as in ENTSO-E IG § 5.3 step 2. */
export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-';
/** Check value that would be the forbidden "-". */
export const DASH = 36;

/** Check value (0–36) of a 15-character body: `(37 - S mod 37) mod 37`, equal to ENTSO-E's `36 - ((S - 1) mod 37)`. */
export function checkValue(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += (16 - i) * ALPHABET.indexOf(body.charAt(i));
  }
  return (37 - (sum % 37)) % 37;
}

/** Appends the check character to a body whose check value is not 36. */
export function withCheck(body: string): string {
  return `${body}${ALPHABET.charAt(checkValue(body))}`;
}

/** Draws a 15-character body; `lds` gives a local distribution system (region digit + number 01–99). */
export function drawBody(random: Random, lds: boolean): string {
  const region = String(random.pick(REGION_DIGITS));
  const system = lds ? String(random.int(1, MAX_LDS)).padStart(2, '0') : BIG_DSO_SUFFIX;
  return `${PREFIX}${region}${system}${POINT_TYPE}${random.digits(7)}`;
}

/** Generates a valid EIC: 16 characters, no separators. Retries like OTE skipping a sequence number. */
export function generate(random: Random, lds = false): string {
  let body = drawBody(random, lds);
  while (checkValue(body) === DASH) {
    body = drawBody(random, lds);
  }
  return withCheck(body);
}
