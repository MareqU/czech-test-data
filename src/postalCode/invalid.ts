// Invalid variants of the postal code (PSČ) – docs/rules/postalCode.md section 4 (one fault each).
// Each variant name is the reason code the validator returns for its values.
import type { Random } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { drawDigits, formatPostalCode } from './generate.js';

/**
 * Names of the invalid variants (neplatné varianty PSČ); each is also a reason code of the validator.
 */
export type PostalCodeInvalidVariant = 'wrongLength' | 'letters' | 'badFormat' | 'foreignRange';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Character positions of the digits in `NNN NN` (the space is at index 3).
const DIGIT_POSITIONS: readonly number[] = [0, 1, 2, 4, 5];

// Wrong separators or spaces around a valid 5-digit code (section 4 and the clarification in section 9).
const BAD_FORMATS: readonly ((digits: string) => string)[] = [
  (d) => `${d.slice(0, 4)} ${d.slice(4)}`,
  (d) => `${d.slice(0, 2)} ${d.slice(2)}`,
  (d) => `${d.slice(0, 1)} ${d.slice(1)}`,
  (d) => `${d.slice(0, 3)}-${d.slice(3)}`,
  (d) => `${d.slice(0, 3)}  ${d.slice(3)}`,
  (d) => ` ${d}`,
  (d) => `${d} `,
];

/** 4 or 6 digits, with or without the correctly placed space, so the length is the only fault. */
function wrongLength(random: Random): string {
  const digits = random.int(0, 1) === 0 ? drawDigits(random).slice(0, 4) : `${drawDigits(random)}${random.digits(1)}`;
  return random.int(0, 1) === 0 ? digits : `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Exactly one digit of a valid `NNN NN` replaced with an ASCII letter. */
function letters(random: Random): string {
  const value = formatPostalCode(drawDigits(random));
  const position = random.pick(DIGIT_POSITIONS);
  return `${value.slice(0, position)}${LETTERS.charAt(random.int(0, LETTERS.length - 1))}${value.slice(position + 1)}`;
}

/** Invalid variants by name. */
export const invalid: Readonly<Record<PostalCodeInvalidVariant, IdentifierVariant>> = {
  wrongLength,
  letters,
  badFormat: (random) => random.pick(BAD_FORMATS)(drawDigits(random)),
  // Slovak zones 8, 9 and 0 share the format (Česká pošta, Poštovní podmínky, Příloha č. 3: 948 01 Lučenec,
  // https://www.ceskaposta.cz/documents/d/guest/postovni-podminky-zakladni-postovni-sluzby).
  foreignRange: (random) => formatPostalCode(`${String(random.pick([0, 8, 9]))}${random.digits(4)}`),
};
