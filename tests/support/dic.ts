// Independent oracle for DIČ, written from docs/rules/dic.md only (sections 1, 2, 4 and 9 with the approved
// decisions), never from src/. The inner IČO and birth-number parts use the oracles of tests/support/ico.ts and
// tests/support/birthNumber.ts; the assigned-number check digit and the prefix/reason precedence are computed here.
import { oracleValidate as birthNumberOracle } from './birthNumber.js';
import { checkDigitOf as icoCheckDigitOf, oracleValidate as icoOracle } from './ico.js';
import { createReferenceRandom, referenceStreamSeed } from './reference.js';
import type { ReferenceRandom } from './reference.js';

/** The reason codes in the precedence order of decision 6. */
export const DIC_REASONS = [
  'missingPrefix',
  'foreignPrefix',
  'letters',
  'badFormat',
  'wrongLength',
  'impossibleDate',
  'badInnerChecksum',
  'futureDate',
] as const;

export type OracleReason = (typeof DIC_REASONS)[number];

export type OracleResult = { readonly valid: true } | { readonly valid: false; readonly reason: OracleReason };

/** The 26 VAT prefixes of the other EU member states, alphabetical, Greece as EL (decision 11). */
export const FOREIGN_PREFIXES: readonly string[] = [
  'AT', 'BE', 'BG', 'CY', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
];

/** `S mod 11` of `d2…d8` of an assigned number with the weights 8, 7, 6, 5, 4, 3, 2 (the leading 6 is not used). */
export function assignedRemainder(first8: string): number {
  let sum = 0;
  for (let i = 1; i < 8; i += 1) {
    sum += Number(first8.charAt(i)) * (9 - i);
  }
  return sum % 11;
}

/** The one valid check digit of an assigned number whose first eight digits are `first8`: `(a + 8) mod 10`. */
export function assignedCheckDigit(first8: string): number {
  return (assignedRemainder(first8) + 8) % 10;
}

function assignedOracle(inner: string): boolean {
  return Number(inner.charAt(8)) === assignedCheckDigit(inner);
}

interface Fault {
  readonly valid: false;
  readonly reason: OracleReason;
}

/** Steps 2–4: letters, other characters, length. */
function syntaxFault(inner: string): Fault | undefined {
  if (/\p{L}/u.test(inner)) {
    return { valid: false, reason: 'letters' };
  }
  if (/[^0-9]/.test(inner)) {
    return { valid: false, reason: 'badFormat' };
  }
  return inner.length < 8 || inner.length > 10 ? { valid: false, reason: 'wrongLength' } : undefined;
}

/** Step 5 for 9 or 10 digits that are a birth number (decisions 3 and 4 already applied). */
function birthNumberResult(inner: string, referenceDate: string): OracleResult {
  const result = birthNumberOracle(inner, referenceDate);
  if (result.valid) {
    return { valid: true };
  }
  const { reason } = result;
  return { valid: false, reason: reason === 'impossibleDate' || reason === 'futureDate' ? reason : 'badInnerChecksum' };
}

/** Steps 2–5 of section 2.1 for an inner part that follows the prefix. */
function innerOracle(inner: string, referenceDate: string): OracleResult {
  const fault = syntaxFault(inner);
  if (fault !== undefined) {
    return fault;
  }
  const checked =
    inner.length === 8 ? icoOracle(inner).valid : inner.length === 9 && inner.startsWith('6') ? assignedOracle(inner) : undefined;
  if (checked === undefined) {
    return birthNumberResult(inner, referenceDate);
  }
  return checked ? { valid: true } : { valid: false, reason: 'badInnerChecksum' };
}

/** The whole algorithm of section 2.1 with the precedence of decision 6. */
export function oracleValidate(value: string, referenceDate: string): OracleResult {
  if (/^[Cc][Zz]/.test(value)) {
    return innerOracle(value.slice(2), referenceDate);
  }
  if (/^\p{L}\p{L}/u.test(value)) {
    return { valid: false, reason: 'foreignPrefix' };
  }
  if (value === '' || /^[0-9]/.test(value)) {
    return { valid: false, reason: 'missingPrefix' };
  }
  return { valid: false, reason: 'badFormat' };
}

/** The random stream of the `dic` identifier (docs/rules/core.md section 2). */
export function referenceDicRandom(seed: number): ReferenceRandom {
  return createReferenceRandom(referenceStreamSeed(seed, 'dic'));
}

/** The 8 digits the plain ico generator draws from `random`: `d1 = int(1, 9)`, `digits(6)`, check digit. */
export function referenceIco(random: ReferenceRandom): string {
  const base = `${String(random.int(1, 9))}${random.digits(6)}`;
  return `${base}${String(icoCheckDigitOf(base))}`;
}

/** The `vatGroup` inner part: `699`, `digits(5)`, check digit of section 2.4. */
export function referenceVatGroup(random: ReferenceRandom): string {
  const first8 = `699${random.digits(5)}`;
  return `${first8}${String(assignedCheckDigit(first8))}`;
}
