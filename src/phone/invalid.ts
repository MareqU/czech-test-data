// Invalid variants of the phone number (telefonní číslo) – docs/rules/phone.md section 4 (one fault each).
// Each variant name is the reason code the validator returns for its values. Reserved and special ranges:
// ČTÚ communication to the ITU of 5. 1. 2023 (https://www.itu.int/oth/T0202000035/en).
import type { Random } from '../core/random.js';
import type { IdentifierVariant } from '../core/types.js';
import { drawMobile, drawNational, formatPhone, group, MOBILE_PREFIXES, range } from './generate.js';

/**
 * Names of the invalid variants (neplatné varianty telefonního čísla); each is also a reason code of the validator.
 */
export type PhoneInvalidVariant = 'wrongLength' | 'letters' | 'wrongCountryCode' | 'unknownPrefix' | 'specialPrefix';

// Look-alikes of mobile and fixed ranges that are reserved (section 3.3).
const UNKNOWN_PREFIXES: readonly string[] = ['600', '609', ...range(62, 69), '74', '75', '76', '78', '20', '30', '40', '50'];
// Uncontested special ranges (section 4): freephone, shared cost, universal numbers, premium rate.
const SPECIAL_PREFIXES: readonly string[] = [
  '800', ...range(810, 819), ...range(830, 839), ...range(840, 849), '900', '905', '906', '908', '909',
];
// None of these starts with 420.
const OTHER_COUNTRY_CODES: readonly string[] = ['421', '49', '48', '43', '1'];
const LETTERS: readonly string[] = ['A', 'O', 'l'];
// Character indexes of the nine national digits in `+420 ddd ddd ddd`.
const DIGIT_POSITIONS: readonly number[] = [5, 6, 7, 9, 10, 11, 13, 14, 15];

/** 8 or 10 national digits, no spaces, so the length is the only fault. */
function wrongLength(random: Random): string {
  const length = random.pick([8, 10]);
  const prefix = random.pick(MOBILE_PREFIXES);
  return `+420${prefix}${random.digits(length - prefix.length)}`;
}

function letters(random: Random): string {
  const value = formatPhone(drawMobile(random));
  const position = random.pick(DIGIT_POSITIONS);
  return `${value.slice(0, position)}${random.pick(LETTERS)}${value.slice(position + 1)}`;
}

function wrongCountryCode(random: Random): string {
  return `+${random.pick(OTHER_COUNTRY_CODES)} ${group(drawMobile(random))}`;
}

/** Invalid variants by name; each value has exactly one fault. */
export const invalid: Readonly<Record<PhoneInvalidVariant, IdentifierVariant>> = {
  wrongLength,
  letters,
  wrongCountryCode,
  unknownPrefix: (random: Random) => formatPhone(drawNational(random, UNKNOWN_PREFIXES)),
  specialPrefix: (random: Random) => formatPhone(drawNational(random, SPECIAL_PREFIXES)),
};
