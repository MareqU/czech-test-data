// Oracle and fixtures for phone (telefonní číslo), written from docs/rules/phone.md sections 2, 3 and 8 only.
import fc from 'fast-check';

/** Mobile prefixes of the plain generator (rules section 8). */
export const MOBILE_PREFIXES: readonly string[] = [
  '601', '602', '603', '604', '605', '606', '607', '608', '702', '703', '704', '705', '72', '73', '77', '79',
];

/** Fixed-line prefixes of the plain generator (rules section 8). */
export const FIXED_PREFIXES: readonly string[] = [
  '2', '31', '32', '35', '37', '38', '39', '41', '46', '47', '48', '49', '51', '53', '54', '55', '56', '57', '58', '59',
];

/** The emergency SMS number: inside mobile `72`, but `specialPrefix` and never generated (decision 6). */
export const EMERGENCY_SMS = '720000112';

export type PhoneClass = 'valid' | 'specialPrefix' | 'unknownPrefix';

function between(value: number, low: number, high: number): boolean {
  return value >= low && value <= high;
}

const FIXED_TWO_DIGIT = ['31', '32', '35', '37', '38', '39', '41', '46', '47', '48', '49', '51', '53', '54', '55', '56', '57', '58', '59'];
const MOBILE_TWO_DIGIT = ['72', '73', '77', '79'];
const SPECIAL_TWO_DIGIT = ['93', '95', '96'];
const SPECIAL_THREE_DIGIT = [700, 800, 900, 905, 906, 908, 909, 970, 971, 972, 973, 974, 976, 977, 980, 983, 989];

function isValidRange(national: string): boolean {
  const p2 = national.slice(0, 2);
  const n3 = Number(national.slice(0, 3));
  const fixed = (national.startsWith('2') && p2 !== '20') || FIXED_TWO_DIGIT.includes(p2);
  const mobile = between(n3, 601, 608) || between(n3, 702, 719) || MOBILE_TWO_DIGIT.includes(p2);
  return fixed || mobile || n3 === 910;
}

function isSpecialRange(national: string): boolean {
  const n3 = Number(national.slice(0, 3));
  return (
    national === EMERGENCY_SMS ||
    between(n3, 610, 614) ||
    between(n3, 810, 849) ||
    SPECIAL_THREE_DIGIT.includes(n3) ||
    SPECIAL_TWO_DIGIT.includes(national.slice(0, 2))
  );
}

/** Range classification of nine national digits (rules sections 3.1 to 3.3, decisions 3, 6 and 9). */
export function classify(national: string): PhoneClass {
  if (national === EMERGENCY_SMS) {
    return 'specialPrefix';
  }
  if (isValidRange(national)) {
    return 'valid';
  }
  return isSpecialRange(national) ? 'specialPrefix' : 'unknownPrefix';
}

/** Every national prefix of the valid ranges, for building valid numbers (generator prefixes, `706`–`719`, `910`). */
export const VALID_PREFIXES: readonly string[] = [
  ...MOBILE_PREFIXES,
  ...FIXED_PREFIXES,
  ...Array.from({ length: 14 }, (_, index) => String(706 + index)),
  '910',
];

/** Nine digits in a valid range (section 3.1; `20…` and the emergency SMS number are excluded). */
export const validNationalArb: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...VALID_PREFIXES), fc.stringMatching(/^[0-9]{9}$/))
  .map(([prefix, rest]) => prefix + rest.slice(prefix.length))
  .filter((national) => national !== EMERGENCY_SMS && classify(national) === 'valid');

/** Groups nine digits as `ddd ddd ddd`. */
export function grouped(national: string): string {
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** The eight accepted shapes of rules section 2 (plus the two national ones) for nine digits. */
export function acceptedShapes(national: string): string[] {
  const shapes = [national, grouped(national)];
  for (const prefix of ['+420', '00420']) {
    for (const separator of ['', ' ']) {
      shapes.push(prefix + separator + national, prefix + separator + grouped(national));
    }
  }
  return shapes;
}

/** Digits of a phone value without prefix and country code: the last nine digits. */
export function nationalDigits(value: string): string {
  return value.replaceAll(/\D/g, '').slice(-9);
}
