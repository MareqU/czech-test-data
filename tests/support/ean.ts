// Independent oracle for ean, written from docs/rules/ean.md only (sections 2 and 9), never from src/.
import fc from 'fast-check';

export type EanOracleReason = 'letters' | 'badFormat' | 'wrongLength' | 'wrongPrefix' | 'badChecksum';

export type EanOracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: EanOracleReason };

export const PREFIX = '8591824';

/** GS1 check digit of 17 data digits (section 2.1): weight 3 at odd positions, 1 at even, `(10 - S % 10) % 10`. */
export function checkDigit(body17: string): number {
  const sum = body17.split('').reduce((total, ch, index) => total + (index % 2 === 0 ? 3 : 1) * Number(ch), 0);
  return (10 - (sum % 10)) % 10;
}

/** The same check digit through the shortcut of section 2.2 (prefix contributes 95), for the prefix `8591824`. */
export function shortcutCheckDigit(body17: string): number {
  const tail = body17.slice(7);
  const sum = tail.split('').reduce((total, ch, index) => total + (index % 2 === 0 ? 1 : 3) * Number(ch), 0);
  return (((5 - sum) % 10) + 10) % 10;
}

/** Appends the GS1 check digit to 17 digits. */
export function withCheckDigit(body17: string): string {
  return `${body17}${String(checkDigit(body17))}`;
}

/** The EAN rules of section 2.4, in precedence order. */
export function oracleEan(value: string): EanOracleResult {
  if (/\p{L}/u.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (!/^[0-9]*$/.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== 18) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (!value.startsWith(PREFIX)) {
    return { valid: false, reason: 'wrongPrefix' };
  }
  if (checkDigit(value.slice(0, 17)) !== Number(value[17])) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}

const digit = fc.constantFrom(...'0123456789'.split(''));
const digits = (length: number): fc.Arbitrary<string> =>
  fc.array(digit, { minLength: length, maxLength: length }).map((a) => a.join(''));

/** Values around the interesting boundaries: right/wrong check digit, wrong prefix, lengths, letters, separators. */
export const structuredEanArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.oneof({ weight: 4, arbitrary: fc.constant(PREFIX) }, { weight: 1, arbitrary: digits(7) }),
    digits(10),
    fc.boolean(),
    fc.constantFrom('plain', 'plain', 'short', 'long', 'letter', 'space', 'hyphen', 'fullWidth'),
  )
  .map(([prefix, rest, wrongCheck, shape]) => {
    const body = `${prefix}${rest}`;
    const correct = checkDigit(body);
    const value = `${body}${String(wrongCheck ? (correct + 1) % 10 : correct)}`;
    switch (shape) {
      case 'short':
        return value.slice(0, 17);
      case 'long':
        return `${value}0`;
      case 'letter':
        return `${value.slice(0, 5)}O${value.slice(6)}`;
      case 'space':
        return `${value.slice(0, 9)} ${value.slice(9)}`;
      case 'hyphen':
        return `${value.slice(0, 7)}-${value.slice(7)}`;
      case 'fullWidth':
        return value.replace('5', String.fromCharCode(0xff15));
      default:
        return value;
    }
  });
