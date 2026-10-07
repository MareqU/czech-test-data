// Independent oracle for IČO, written from docs/rules/ico.md only (section 2 with the decisions of section 9),
// never from src/.

/** The reason codes of section 2 in the precedence order `letters` → `badFormat` → `wrongLength` → `badChecksum`. */
export type OracleReason = 'letters' | 'badFormat' | 'wrongLength' | 'badChecksum';

export type OracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: OracleReason };

/** `S mod 11` of the first seven digits with the weights 8, 7, 6, 5, 4, 3, 2 (the `a` of section 2). */
export function remainderOf(base: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i += 1) {
    sum += Number(base.charAt(i)) * (8 - i);
  }
  return sum % 11;
}

/** The one valid check digit of a 7-digit base: `(11 − a) mod 10`. */
export function checkDigitOf(base: string): number {
  return (11 - remainderOf(base)) % 10;
}

/** The whole algorithm of section 2: letters, characters, length, check digit. */
export function oracleValidate(value: string): OracleResult {
  if (/\p{L}/u.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (/[^0-9]/.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  if (value.length !== 8) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (Number(value.charAt(7)) !== checkDigitOf(value)) {
    return { valid: false, reason: 'badChecksum' };
  }
  return { valid: true };
}
