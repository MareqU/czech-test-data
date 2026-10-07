// Generator of valid IČO – docs/rules/ico.md sections 2 and 8, decisions 4 and 8.
import { weightedSum } from '../core/checksum.js';
import type { Random } from '../core/random.js';

// Weights for d1–d7 and the rule d8 = (11 − S mod 11) mod 10: no reachable official text states it, it is
// confirmed by ARES records for every remainder (docs/rules/ico.md sections 2, 3.3 and 5).
const WEIGHTS: readonly number[] = [8, 7, 6, 5, 4, 3, 2];
const MODULUS = 11;

/** Remainder `a` = S mod 11 of a 7-digit base. */
export function remainderOf(base: string): number {
  return weightedSum(base, WEIGHTS) % MODULUS;
}

/** The one valid check digit of a 7-digit base. */
export function checkDigitOf(base: string): number {
  return (MODULUS - remainderOf(base)) % 10;
}

/** Appends the check digit to a 7-digit base. */
export function withCheckDigit(base: string): string {
  return `${base}${String(checkDigitOf(base))}`;
}

/** A 7-digit base with `d1` uniform 1–9, so plain values never start with a zero. */
export function drawBase(random: Random): string {
  return `${String(random.int(1, 9))}${random.digits(6)}`;
}

/** A 7-digit base of `zeros` zeros, one digit 1–9, then random digits. */
export function leadingZerosBase(random: Random, zeros: number): string {
  return `${'0'.repeat(zeros)}${String(random.int(1, 9))}${random.digits(6 - zeros)}`;
}

/** Generates a valid IČO: 8 digits, no separators. */
export function generate(random: Random): string {
  return withCheckDigit(drawBase(random));
}
