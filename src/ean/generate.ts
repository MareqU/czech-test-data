// Generator of the Czech electricity EAN (EAN odběrného místa), draw order fixed by docs/rules/ean.md section 9.
// Structure: OTE, "Registrace LDS a přidělení EAN odběrným místům" (fixed part 8591824, network number, 5 digits,
// check digit); 18 digits by vyhláška č. 408/2015 Sb., § 16 odst. 2 (https://www.zakonyprolidi.cz/cs/2015-408);
// check digit: GS1 mod 10 with weights 3 and 1 (GS1 Syntax Engine, lint_csum.c), confirmed by OTE's worked values.
import { weightedSum } from '../core/checksum.js';
import type { Random } from '../core/random.js';

/** Distributor whose number range the generator draws from: ČEZ Distribuce, EG.D, PREdistribuce or a local system. */
export type EanDistributor = 'cez' | 'egd' | 'pre' | 'lds';

/** Options of the EAN generator. */
export interface EanOptions {
  /** Restricts position 10 (or the network, for `lds`); by default the three big distributors by market share. */
  readonly distributor?: EanDistributor;
}

/** Fixed part (pevná část EAN): GS1 Czech Republic `859` + OTE `1824`. */
export const PREFIX = '8591824';

// 17 data digits, the rightmost has weight 3 (GS1 rule for every key length).
const WEIGHTS: readonly number[] = Array.from({ length: 17 }, (_, i) => (i % 2 === 0 ? 3 : 1));

// Position 10 of the big distributors (OTE číselník sítí, ČEZ Distribuce); the default repeats the digits by share.
const DIGITS: Readonly<Record<string, readonly number[]>> = {
  egd: [1, 2],
  pre: [3],
  cez: [4, 5, 6, 7, 8],
  default: [1, 2, 3, 4, 5, 6, 7, 8],
};

/** The GS1 check digit of a 17-digit body. */
export function checkDigitOf(body: string): number {
  return (10 - (weightedSum(body, WEIGHTS) % 10)) % 10;
}

/** Appends the check digit to a 17-digit body. */
export function withCheckDigit(body: string): string {
  return `${body}${String(checkDigitOf(body))}`;
}

/** Generates a valid EAN: 18 digits, no separators. */
export function generate(random: Random, options: EanOptions): string {
  const { distributor } = options;
  if (distributor === 'lds') {
    // Networks 0300–0999 are all allocated in the OTE číselník sítí.
    return withCheckDigit(`${PREFIX}${String(random.int(300, 999)).padStart(4, '0')}0${random.digits(5)}`);
  }
  const key = distributor ?? 'default';
  if (!Object.hasOwn(DIGITS, key)) {
    throw new RangeError(`distributor must be one of: cez, egd, pre, lds, got ${JSON.stringify(distributor)}`);
  }
  const position10 = random.pick(DIGITS[key] ?? []);
  return withCheckDigit(`${PREFIX}00${String(position10)}${random.digits(7)}`);
}
