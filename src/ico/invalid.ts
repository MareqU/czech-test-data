// Invalid variants of the IČO (one fault each) – docs/rules/ico.md section 4.
// Each variant name is the reason code the validator returns for its values.
import { replaceDigitWithLetter } from '../core/letters.js';
import type { Random } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { generate, leadingZerosBase, withCheckDigit } from './generate.js';

/** Names of the invalid variants (neplatné varianty IČO); each is also a reason code of the validator. */
export type IcoInvalidVariant = 'badChecksum' | 'wrongLength' | 'letters';

// Look-alikes of 0 and 1, as in birthNumber and phone.
const LETTERS = 'AOl';
const POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7];

/** A valid IČO whose last digit is replaced by a different digit, drawn uniformly. */
function badChecksum(random: Random): string {
  const value = generate(random);
  const correct = Number(value.charAt(7));
  const drawn = random.int(0, 8);
  return `${value.slice(0, 7)}${String(drawn >= correct ? drawn + 1 : drawn)}`;
}

/** 7 digits (a valid IČO with one leading zero removed, the "stored as a number" bug) or 9 digits. */
function wrongLength(random: Random): string {
  if (random.int(0, 1) === 0) {
    return withCheckDigit(leadingZerosBase(random, 1)).slice(1);
  }
  return `${generate(random)}${random.digits(1)}`;
}

/** Invalid variants by name. */
export const invalid: Readonly<Record<IcoInvalidVariant, IdentifierVariant>> = {
  badChecksum,
  wrongLength,
  letters: (random) => replaceDigitWithLetter(random, generate(random), POSITIONS, LETTERS),
};
