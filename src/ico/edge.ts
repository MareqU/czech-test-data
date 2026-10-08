// Edge variants of the IČO (valid but unusual) – docs/rules/ico.md section 4.
import type { IdentifierVariant } from '../core/types.js';
import { drawBase, leadingZerosBase, remainderOf, withCheckDigit } from './generate.js';

/**
 * Names of the edge variants (okrajové případy IČO): `leadingZeros` starts with `0`, `checkDigitZero` has
 * the wrap-around remainder 1 (check digit 0), `checkDigitOne` the wrap-around remainder 0 (check digit 1).
 */
export type IcoEdgeVariant = 'leadingZeros' | 'checkDigitZero' | 'checkDigitOne';

// Rejection sampling: about 11 draws on average (decision 8).
function withRemainder(remainder: number): IdentifierVariant {
  return (random) => {
    let base = drawBase(random);
    while (remainderOf(base) !== remainder) {
      base = drawBase(random);
    }
    return withCheckDigit(base);
  };
}

/** Edge variants by name. */
export const edge: Readonly<Record<IcoEdgeVariant, IdentifierVariant>> = {
  // Real examples 01569651 … 00006947 (ARES, checked 2026-10-07).
  leadingZeros: (random) => withCheckDigit(leadingZerosBase(random, random.int(1, 4))),
  // a = 1 gives (11 − 1) mod 10 = 0, e.g. 48136450 Česká národní banka (ARES).
  checkDigitZero: withRemainder(1),
  // a = 0 gives 11 mod 10 = 1, e.g. 00177041 Škoda Auto (ARES); a = 10 is not a wrap-around.
  checkDigitOne: withRemainder(0),
};
