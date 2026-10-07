// Generator of valid postal codes (PSČ) – docs/rules/postalCode.md sections 8 (decision 7) and 9.
import type { Random } from '../core/random.js';

/** Digits of a code in the Czech zones 1–7: `d1` uniform 1–7, `d2`–`d5` uniform 0–9, no exclusions. */
export function drawDigits(random: Random): string {
  return `${String(random.int(1, 7))}${random.digits(4)}`;
}

/**
 * Official written form `NNN NN`: one space after the 3rd digit (UPU sheet for the Czech Republic, 02/2018,
 * https://www.upu.int/UPU/media/upu/PostalEntitiesFiles/addressingUnit/czeEn.pdf).
 */
export function formatPostalCode(digits: string): string {
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/** Generates a valid postal code (poštovní směrovací číslo) in the form `NNN NN`. */
export function generate(random: Random): string {
  return formatPostalCode(drawDigits(random));
}
