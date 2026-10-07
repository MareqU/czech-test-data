// Generator of the phone number (telefonní číslo) – docs/rules/phone.md section 8 (generator contract) and
// decisions 1, 2, 5, 6 and 9. Numbering plan: vyhláška č. 117/2007 Sb., o číslovacích plánech sítí a služeb
// elektronických komunikací (https://www.zakonyprolidi.cz/cs/2007-117), ČTÚ communication to the ITU of 5. 1. 2023
// (https://www.itu.int/oth/T0202000035/en).
import type { Random } from '../core/random.js';

/**
 * Options of the phone generator: `type` picks mobile (default) or fixed-line numbers.
 */
export interface PhoneOptions {
  /** `'mobile'` (default; mobilní číslo) or `'fixed'` (pevná linka). */
  readonly type?: 'mobile' | 'fixed';
}

// Mobile ranges in use since 2011; 706–719 (mobile only since 4. 2. 2022) are left to the edge variant
// newMobileRange because libphonenumber-based validators reject most of them (section 3.5).
/** Prefixes of the plain mobile generator (internal). */
export const MOBILE_PREFIXES: readonly string[] = [
  '601', '602', '603', '604', '605', '606', '607', '608', '702', '703', '704', '705', '72', '73', '77', '79',
];
// Area codes of the public fixed network (section 3.1); `20…` is reserved, hence the redraw below (decision 9).
const FIXED_PREFIXES: readonly string[] = [
  '2', '31', '32', '35', '37', '38', '39', '41', '46', '47', '48', '49', '51', '53', '54', '55', '56', '57', '58', '59',
];
// § 26a of the decree (since 1. 1. 2024): emergency SMS for roaming users, never a subscriber number (decision 6).
/** The emergency SMS number: valid-looking mobile, but `specialPrefix` (internal). */
export const EMERGENCY_SMS = '720000112';

/** Integers `from` to `to` as strings, both inclusive. */
export function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

/** Nine national digits for a random prefix of `prefixes`; the digits after the prefix are free. */
export function drawNational(random: Random, prefixes: readonly string[]): string {
  const prefix = random.pick(prefixes);
  return prefix + random.digits(9 - prefix.length);
}

/** `ddd ddd ddd`, the usual Czech grouping (section 1). */
export function group(national: string): string {
  return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** Default output format `+420 ddd ddd ddd` (decision 2). */
export function formatPhone(national: string): string {
  return `+420 ${group(national)}`;
}

/** A mobile national number, never the emergency SMS number. */
export function drawMobile(random: Random): string {
  let national = drawNational(random, MOBILE_PREFIXES);
  while (national === EMERGENCY_SMS) {
    national = drawNational(random, MOBILE_PREFIXES);
  }
  return national;
}

function drawFixed(random: Random): string {
  let national = drawNational(random, FIXED_PREFIXES);
  while (national.startsWith('20')) {
    national = drawNational(random, FIXED_PREFIXES);
  }
  return national;
}

/**
 * Generates a valid phone number `+420 ddd ddd ddd`.
 *
 * @throws RangeError naming `type` for a value other than `'mobile'` or `'fixed'`.
 */
export function generate(random: Random, options: PhoneOptions): string {
  // Widened to unknown: a default applies to undefined only, so null from untyped callers still throws.
  const { type = 'mobile' }: { readonly type?: unknown } = options;
  if (type !== 'mobile' && type !== 'fixed') {
    throw new RangeError(`type must be 'mobile' or 'fixed', got ${String(type)}`);
  }
  return formatPhone(type === 'mobile' ? drawMobile(random) : drawFixed(random));
}
