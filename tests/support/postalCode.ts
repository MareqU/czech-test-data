// Independent oracle for postalCode (PSČ), written from docs/rules/postalCode.md only (section 2 with the
// decisions of section 8), never from src/.

/** The reason codes of section 2 in the precedence order `letters` → `badFormat` → `wrongLength` → `foreignRange`. */
export type OracleReason = 'letters' | 'badFormat' | 'wrongLength' | 'foreignRange';

export type OracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: OracleReason };

/** The whole algorithm of section 2: letters, characters, space position, digit count, leading digit. */
export function oracleValidate(value: string): OracleResult {
  if (/\p{L}/u.test(value)) {
    return { valid: false, reason: 'letters' };
  }
  if (/[^0-9 ]/.test(value)) {
    return { valid: false, reason: 'badFormat' };
  }
  const spaces = value.split(' ').length - 1;
  if (spaces > 1 || (spaces === 1 && value.indexOf(' ') !== 3)) {
    return { valid: false, reason: 'badFormat' };
  }
  const digits = value.replace(' ', '');
  if (digits.length !== 5) {
    return { valid: false, reason: 'wrongLength' };
  }
  if (/^[089]/.test(digits)) {
    return { valid: false, reason: 'foreignRange' };
  }
  return { valid: true };
}
