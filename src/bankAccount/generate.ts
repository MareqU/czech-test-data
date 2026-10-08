// Generator of the bank account number (číslo účtu), draw order fixed by docs/rules/bankAccount.md section 9.
// Check: vyhláška č. 169/2011 Sb., Příloha (https://www.zakonyprolidi.cz/cs/2011-169); weights apply from the right.
import { weightedSum } from '../core/checksum.js';
import type { Random } from '../core/random.js';
import { BANK_CODES } from './bankCodes.js';

/**
 * Options of the bank account generator.
 */
export interface BankAccountOptions {
  /** A kód platebního styku (bank code) from the bundled ČNB snapshot; default: a large bank, drawn. */
  readonly bankCode?: string;
  /** Adds a prefix (předčíslí) of 2–6 digits; default `false`. */
  readonly withPrefix?: boolean;
}

// Frozen: a snapshot update must never change seeded output.
const GENERATOR_BANK_CODES: readonly string[] = ['0100', '0300', '0600', '0800', '2010', '2700', '3030', '5500', '6210'];
const WEIGHTS: readonly number[] = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];
const MODULUS = 11;

/** True if the part (prefix or number) satisfies the mod 11 rule of the decree. */
export function isValidPart(part: string): boolean {
  return weightedSum(part, WEIGHTS) % MODULUS === 0;
}

/** True if `code` is in the bundled ČNB snapshot (whole token). */
export function isKnownBankCode(code: string): boolean {
  // The 4-digit check stops a run like '0100 0300' from matching as one token.
  return /^\d{4}$/.test(code) && ` ${BANK_CODES} `.includes(` ${code} `);
}

/** A bank code of the frozen generator list. */
export function drawCode(random: Random): string {
  return random.pick(GENERATOR_BANK_CODES);
}

/** A valid part of `length` significant digits (2–10): first digit 1–9, the last digit completes the sum. */
export function part(random: Random, length: number): string {
  for (;;) {
    const head = `${String(random.int(1, 9))}${random.digits(length - 2)}`;
    // The last weight is 1, so the digit equals the missing remainder; 10 is no digit, so draw again.
    const last = (MODULUS - (weightedSum(`${head}0`, WEIGHTS) % MODULUS)) % MODULUS;
    if (last < 10) {
      return `${head}${String(last)}`;
    }
  }
}

/** Generates a valid account `[prefix-]number/code`, no leading zeros, no spaces. */
export function generate(random: Random, options: BankAccountOptions): string {
  const { bankCode, withPrefix } = options;
  if (bankCode !== undefined && (typeof bankCode !== 'string' || !isKnownBankCode(bankCode))) {
    throw new RangeError(`bankCode must be a code from the bundled ČNB list, got ${JSON.stringify(bankCode)}`);
  }
  if (withPrefix !== undefined && typeof withPrefix !== 'boolean') {
    throw new RangeError(`withPrefix must be a boolean, got ${JSON.stringify(withPrefix)}`);
  }
  const prefix = withPrefix === true ? `${part(random, random.int(2, 6))}-` : '';
  const number = part(random, random.int(6, 10));
  return `${prefix}${number}/${bankCode ?? drawCode(random)}`;
}
